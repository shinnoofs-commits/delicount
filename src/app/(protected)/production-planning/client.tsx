
'use client';

import { useState, useMemo, useEffect } from "react"
import { Loader2, Sun, CloudRain, Save, Info, Zap, LayoutGrid, Edit3 } from "lucide-react"
import type { Product, DailyProduction } from "@/lib/types"
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
import { Label } from "@/components/ui/label"
import { useProducts } from "@/contexts/product-context"
import { useStores } from "@/contexts/store-context"
import { useAdmin } from "@/hooks/use-admin"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

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

// 指定されたカテゴリー順
const TARGET_CATEGORIES = ['弁当', '丼ぶり', '温惣菜', '揚げ物', '冷惣菜', 'おこわ'];

export default function ProductionPlanningClient() {
  const { stores, loading: storesLoading } = useStores();
  const { isAdmin } = useAdmin();
  const { products: allProducts, updateSchedules, loading: productsLoading } = useProducts();
  
  const [managedStoreId, setManagedStoreId] = useState<string | undefined>(undefined);
  const [weatherPattern, setWeatherPattern] = useState<'sunny' | 'rainy'>('sunny');
  const [viewMode, setViewMode] = useState<'edit' | 'summary'>('edit');
  const [schedules, setSchedules] = useState<Record<string, Partial<DailyProduction>>>({});
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

  // 指定カテゴリーに存在するカテゴリーのみを抽出（順序を維持）
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
    products.forEach(product => {
      initialSchedules[product.id] = weatherPattern === 'sunny' 
        ? (product.dailyProductionSunny || { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, holiday: 0 })
        : (product.dailyProductionRainy || { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, holiday: 0 });
    });
    setSchedules(initialSchedules);
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

  const handleSave = async () => {
    if (!managedStoreId) return;
    setIsSaving(true);
    try {
      await updateSchedules(managedStoreId, schedules, weatherPattern);
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
            <CardDescription>曜日・天気別の製造予定数を設定・確認します。</CardDescription>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center p-1 bg-muted rounded-md mr-2">
                <Button 
                    variant={viewMode === 'edit' ? "default" : "ghost"} 
                    size="sm" 
                    className="h-8 text-xs px-3"
                    onClick={() => setViewMode('edit')}
                >
                    <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                    編集
                </Button>
                <Button 
                    variant={viewMode === 'summary' ? "default" : "ghost"} 
                    size="sm" 
                    className="h-8 text-xs px-3"
                    onClick={() => setViewMode('summary')}
                >
                    <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                    一覧表示
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
                            {daysOfWeek.map(day => (
                            <TableHead key={day} className="text-center w-[80px]">{dayLabels[day]}</TableHead>
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
            <div className="space-y-6">
                {categories.map(cat => {
                    const filteredProducts = products.filter(p => p.category === cat);
                    if (filteredProducts.length === 0) return null;
                    return (
                        <div key={cat} className="space-y-2">
                            <h3 className="text-sm font-bold bg-muted/50 px-3 py-1.5 rounded-md border-l-4 border-primary flex items-center">
                                {cat}
                                <span className="ml-2 text-[10px] font-normal text-muted-foreground">({filteredProducts.length}品目)</span>
                            </h3>
                            <div className="rounded-md border overflow-hidden">
                                <Table className="text-[11px]">
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 h-8">
                                            <TableHead className="h-8 p-2 font-bold text-foreground min-w-[150px]">商品名</TableHead>
                                            {daysOfWeek.map(day => (
                                                <TableHead key={day} className="h-8 p-1 text-center font-bold text-foreground w-[45px]">{dayLabels[day]}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProducts.map(product => (
                                            <TableRow key={product.id} className="h-7 hover:bg-muted/10">
                                                <TableCell className="h-7 p-2 py-1 font-medium border-r">{product.name}</TableCell>
                                                {daysOfWeek.map(day => (
                                                    <TableCell key={day} className="h-7 p-1 text-center tabular-nums">
                                                        {schedules[product.id]?.[day] || 0}
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
      
      {viewMode === 'edit' && (
        <div className="flex items-center gap-2 p-4 bg-primary/10 border rounded-lg text-sm">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <p className="text-muted-foreground">「一括」列に数値を入力すると、その商品の月曜〜祝日までの全曜日に同じ数値が反映されます。製造数入力画面で「予定数を適用」ボタンを押すと、この計画に基づいた数値が自動入力されます。</p>
        </div>
      )}
    </div>
  );
}
