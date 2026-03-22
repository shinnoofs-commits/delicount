'use client';

import { useState, useMemo, useEffect } from "react"
import { Loader2, Sun, CloudRain, Save, Info, Zap, LayoutGrid, Edit3, Clock } from "lucide-react"
import type { Product, DailyProduction, DisplayTimeSlot } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useProducts } from "@/contexts/product-context"
import { useStores } from "@/contexts/store-context"
import { useAdmin } from "@/hooks/use-admin"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

const daysOfWeek: (keyof DailyProduction)[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'holiday'];
const dayLabels: Record<keyof DailyProduction, string> = {
  mon: '月',
  tue: '火',
  wed: '水',
  thu: '木',
  fri: '金',
  sat: '土',
  sun: '日',
  holiday: '祝',
};

const timeSlotOptions: DisplayTimeSlot[] = ['10:00', '12:00', '15:00'];
const TARGET_CATEGORIES = ['弁当', '丼ぶり', '温惣菜', '揚げ物', '冷惣菜', 'おこわ'];

export default function ProductionPlanningClient() {
  const { stores, loading: storesLoading } = useStores();
  const { isAdmin } = useAdmin();
  const { products: allProducts, updateSchedules, loading: productsLoading } = useProducts();
  
  const [managedStoreId, setManagedStoreId] = useState<string | undefined>(undefined);
  const [weatherPattern, setWeatherPattern] = useState<'sunny' | 'rainy'>('sunny');
  const [viewMode, setViewMode] = useState<'edit' | 'summary'>('summary');
  const [schedules, setSchedules] = useState<Record<string, Partial<DailyProduction>>>({});
  const [timeSlotsState, setTimeSlotsState] = useState<Record<string, DisplayTimeSlot[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!managedStoreId && stores.length > 0) {
      setManagedStoreId(stores[0].id);
    }
  }, [stores, managedStoreId]);

  const products = useMemo(() => {
    if (!managedStoreId) return [];
    return allProducts.filter(p => p.storeId === managedStoreId);
  }, [allProducts, managedStoreId]);

  const categories = useMemo(() => {
    const existingCats = new Set(products.map(p => p.category));
    return TARGET_CATEGORIES.filter(cat => existingCats.has(cat));
  }, [products]);

  const [activeCategory, setActiveCategory] = useState<string>('');

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  useEffect(() => {
    const initialSchedules: Record<string, Partial<DailyProduction>> = {};
    const initialTimeSlots: Record<string, DisplayTimeSlot[]> = {};
    
    products.forEach(product => {
      const patternData = weatherPattern === 'sunny' ? product.dailyProductionSunny : product.dailyProductionRainy;
      initialSchedules[product.id] = patternData || { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, holiday: 0 };
      initialTimeSlots[product.id] = product.displayTimeSlots || [];
    });
    
    setSchedules(initialSchedules);
    setTimeSlotsState(initialTimeSlots);
  }, [products, weatherPattern]);

  const handleScheduleChange = (productId: string, day: keyof DailyProduction, value: string) => {
    const numValue = parseInt(value, 10);
    setSchedules(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [day]: isNaN(numValue) ? 0 : numValue,
      }
    }));
  };

  const handleBulkChange = (productId: string, value: string) => {
    const numValue = parseInt(value, 10);
    const val = isNaN(numValue) ? 0 : numValue;
    setSchedules(prev => ({
      ...prev,
      [productId]: {
        mon: val,
        tue: val,
        wed: val,
        thu: val,
        fri: val,
        sat: val,
        sun: val,
        holiday: val,
      }
    }));
  };

  const handleTimeSlotToggle = (productId: string, slot: DisplayTimeSlot) => {
    setTimeSlotsState(prev => {
      const current = prev[productId] || [];
      const next = current.includes(slot)
        ? current.filter(s => s !== slot)
        : [...current, slot];
      return { ...prev, [productId]: next };
    });
  };

  const handleSave = async () => {
    if (!managedStoreId) return;
    setIsSaving(true);
    try {
      await updateSchedules(managedStoreId, schedules, weatherPattern, timeSlotsState);
    } finally {
      setIsSaving(false);
    }
  };

  if (storesLoading || productsLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4">
          <div className="space-y-1">
            <CardTitle>製造計画</CardTitle>
            <CardDescription>曜日・天気別の製造予定数と、陳列時間帯を確認・設定します。</CardDescription>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center p-1 bg-muted rounded-md mr-2">
                <Button 
                    variant={viewMode === 'summary' ? "default" : "ghost"} 
                    size="sm" 
                    className="h-8 text-xs px-3"
                    onClick={() => setViewMode('summary')}
                >
                    <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                    一覧表示
                </Button>
                <Button 
                    variant={viewMode === 'edit' ? "default" : "ghost"} 
                    size="sm" 
                    className="h-8 text-xs px-3"
                    onClick={() => setViewMode('edit')}
                >
                    <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                    編集
                </Button>
            </div>

            {isAdmin && stores.length > 0 && (
              <Select value={managedStoreId} onValueChange={setManagedStoreId}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="店舗を選択" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map(store => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {viewMode === 'edit' && (
                <Button onClick={handleSave} size="sm" className="h-9" disabled={isSaving || !managedStoreId}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    計画を保存
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center p-1 bg-muted rounded-lg w-fit mx-auto">
            <Button
              variant={weatherPattern === 'sunny' ? "default" : "ghost"}
              onClick={() => setWeatherPattern('sunny')}
              className="px-8"
              size="sm"
            >
              <Sun className="h-4 w-4 mr-2 text-yellow-500" />
              晴れの日
            </Button>
            <Button
              variant={weatherPattern === 'rainy' ? "default" : "ghost"}
              onClick={() => setWeatherPattern('rainy')}
              className="px-8"
              size="sm"
            >
              <CloudRain className="h-4 w-4 mr-2 text-blue-500" />
              雨の日
            </Button>
          </div>

          {viewMode === 'edit' ? (
            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap bg-transparent p-0 gap-1">
                {categories.map(cat => (
                    <TabsTrigger 
                    key={cat} 
                    value={cat}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border rounded-md"
                    >
                    {cat}
                    </TabsTrigger>
                ))}
                </TabsList>
                {categories.map(cat => (
                <TabsContent key={cat} value={cat} className="pt-4">
                    <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[200px] sticky left-0 bg-muted/50 z-10 border-r">商品名</TableHead>
                            <TableHead className="w-[160px] text-center bg-muted/20">陳列時間</TableHead>
                            {daysOfWeek.map(day => (
                            <TableHead key={day} className="text-center w-[60px]">{dayLabels[day]}</TableHead>
                            ))}
                            <TableHead className="text-center w-[100px] bg-accent/10 border-l">
                            <div className="flex items-center justify-center gap-1">
                                <Zap className="h-3 w-3 text-accent" />
                                <span>一括</span>
                            </div>
                            </TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {products.filter(p => p.category === cat).map(product => (
                            <TableRow key={product.id}>
                            <TableCell className="font-medium sticky left-0 bg-background z-10 border-r">{product.name}</TableCell>
                            <TableCell className="bg-muted/5">
                                <div className="flex gap-2 justify-center">
                                    {timeSlotOptions.map(slot => (
                                        <div key={slot} className="flex flex-col items-center gap-1">
                                            <Checkbox 
                                                checked={(timeSlotsState[product.id] || []).includes(slot)}
                                                onCheckedChange={() => handleTimeSlotToggle(product.id, slot)}
                                                className="h-4 w-4"
                                            />
                                            <span className="text-[10px] font-bold opacity-70">{slot}</span>
                                        </div>
                                    ))}
                                </div>
                            </TableCell>
                            {daysOfWeek.map(day => (
                                <TableCell key={day} className="p-1">
                                <Input
                                    type="number"
                                    className="text-center h-8 px-1"
                                    value={schedules[product.id]?.[day] ?? 0}
                                    onChange={(e) => handleScheduleChange(product.id, day, e.target.value)}
                                    min="0"
                                />
                                </TableCell>
                            ))}
                            <TableCell className="p-1 bg-accent/5 border-l">
                                <Input
                                    type="number"
                                    placeholder="全曜日"
                                    className="text-center h-8 px-1 border-accent/20 focus-visible:ring-accent"
                                    onChange={(e) => handleBulkChange(product.id, e.target.value)}
                                    min="0"
                                />
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    </div>
                </TabsContent>
                ))}
            </Tabs>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map(cat => {
                    const filteredProducts = products.filter(p => p.category === cat);
                    if (filteredProducts.length === 0) return null;
                    return (
                        <div key={cat} className="space-y-1 bg-card border rounded-md overflow-hidden flex flex-col">
                            <h3 className="text-[11px] font-bold bg-muted/50 px-2 py-1 border-l-2 border-primary flex items-center justify-between">
                                <span>{cat}</span>
                                <span className="text-[9px] font-normal text-muted-foreground">{filteredProducts.length}品目</span>
                            </h3>
                            <div className="overflow-x-auto flex-1">
                                <Table className="text-[10px] w-full min-w-max">
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 h-6">
                                            <TableHead className="h-6 p-1 pl-2 font-bold text-foreground min-w-[80px]">品名</TableHead>
                                            <TableHead className="h-6 p-1 text-center font-bold text-foreground w-[60px] border-r">陳列時間</TableHead>
                                            {daysOfWeek.map(day => (
                                                <TableHead key={day} className="h-6 p-0.5 text-center font-bold text-foreground w-[28px]">{dayLabels[day]}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProducts.map(product => (
                                            <TableRow key={product.id} className="h-6 hover:bg-muted/10 border-b last:border-0">
                                                <TableCell className="h-6 p-1 pl-2 py-0.5 font-medium border-r truncate max-w-[100px]">{product.name}</TableCell>
                                                <TableCell className="h-6 p-1 text-center border-r">
                                                    <div className="flex flex-col gap-0.5 items-center">
                                                        {product.displayTimeSlots && product.displayTimeSlots.length > 0 ? (
                                                            product.displayTimeSlots.map(slot => (
                                                                <span key={slot} className="bg-primary/10 text-primary px-1 rounded-[2px] leading-none py-0.5 scale-90 origin-center">{slot}</span>
                                                            ))
                                                        ) : (
                                                            <span className="text-muted-foreground opacity-30 italic">未設定</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                {daysOfWeek.map(day => (
                                                    <TableCell key={day} className="h-6 p-0.5 text-center tabular-nums">
                                                        {weatherPattern === 'sunny' 
                                                            ? product.dailyProductionSunny?.[day] || 0 
                                                            : product.dailyProductionRainy?.[day] || 0}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )
                })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {viewMode === 'edit' ? (
        <div className="flex items-center gap-2 p-4 bg-primary/10 border rounded-lg text-sm">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <p className="text-muted-foreground">製造予定数（個数）と陳列時間帯をこの画面で一括設定できます。変更後は右上の「計画を保存」をクリックしてください。</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-4 bg-muted/20 border rounded-lg text-sm">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <p className="text-muted-foreground">「陳列時間」は店頭に並べるタイミングを示します。各時間帯の売れ行きを考慮して、曜日ごとの製造数を調整してください。</p>
        </div>
      )}
    </div>
  );
}