
'use client';

import { useState, useMemo, useEffect } from "react"
import { Loader2, Sun, CloudRain, Save, Info, Zap } from "lucide-react"
import type { Product, Store, DailyProduction } from "@/lib/types"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProducts } from "@/contexts/product-context"
import { useStores } from "@/contexts/store-context"
import { useAdmin } from "@/hooks/use-admin"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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

export default function ProductionPlanningClient() {
  const { stores, loading: storesLoading } = useStores();
  const { isAdmin } = useAdmin();
  const { products: allProducts, updateSchedules, loading: productsLoading } = useProducts();
  
  const [managedStoreId, setManagedStoreId] = useState<string | undefined>(undefined);
  const [weatherPattern, setWeatherPattern] = useState<'sunny' | 'rainy'>('sunny');
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

  const categories = useMemo(() => 
    Array.from(new Set(products.map(p => p.category))),
  [products]);

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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>製造計画</CardTitle>
            <CardDescription>曜日・天気別の製造予定数を一括で設定します。</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && stores.length > 0 && (
              <Select value={managedStoreId} onValueChange={setManagedStoreId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="店舗を選択" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map(store => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={handleSave} disabled={isSaving || !managedStoreId}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              計画を保存
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center p-1 bg-muted rounded-lg w-fit mx-auto">
            <Button
              variant={weatherPattern === 'sunny' ? "default" : "ghost"}
              onClick={() => setWeatherPattern('sunny')}
              className="px-8"
            >
              <Sun className="h-4 w-4 mr-2" />
              晴れの日
            </Button>
            <Button
              variant={weatherPattern === 'rainy' ? "default" : "ghost"}
              onClick={() => setWeatherPattern('rainy')}
              className="px-8"
            >
              <CloudRain className="h-4 w-4 mr-2" />
              雨の日
            </Button>
          </div>

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
                        <TableHead className="w-[200px] sticky left-0 bg-muted/50 z-10">商品名</TableHead>
                        {daysOfWeek.map(day => (
                          <TableHead key={day} className="text-center w-[80px]">{dayLabels[day]}</TableHead>
                        ))}
                        <TableHead className="text-center w-[100px] bg-accent/10">
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
                          <TableCell className="font-medium sticky left-0 bg-background z-10">{product.name}</TableCell>
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
                          <TableCell className="p-1 bg-accent/5">
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
        </CardContent>
      </Card>
      
      <div className="flex items-center gap-2 p-4 bg-primary/10 border rounded-lg text-sm text-primary-foreground/90">
        <Info className="h-4 w-4 text-primary" />
        <p>「一括」列に数値を入力すると、その行の全曜日の予定数が一括で書き換わります。製造数入力画面で「予定数を適用」ボタンを押すと、この計画に基づいた数値が自動入力されます。</p>
      </div>
    </div>
  );
}
