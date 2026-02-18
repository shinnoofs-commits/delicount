'use client';

import { useState, useMemo, useCallback } from 'react';
import { Loader2, CalendarIcon, Factory, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/contexts/product-context';
import { useStores } from '@/contexts/store-context';
import { useAdmin } from '@/hooks/use-admin';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useProduction } from '@/contexts/production-context';
import type { ProductionEntry, DailyProduction, Product } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import holiday_jp from '@holiday-jp/holiday_jp';

const dayMap: (keyof DailyProduction)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function ProductionClient() {
  const { addProductionEntry, loading: productionLoading } = useProduction();
  const { products: allProducts, loading: productsLoading } = useProducts();
  const { userStore, loading: storesLoading } = useStores();
  const { isAdmin } = useAdmin();
  
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [date, setDate] = useState<Date>(new Date());
  const { toast } = useToast();

  const categories = useMemo(() => ['すべて', ...Array.from(new Set(allProducts.map(p => p.category)))], [allProducts]);

  const handleQuantityChange = (productId: string, value: string) => {
    setQuantities(prev => ({ ...prev, [productId]: value }));
  };

  const handleApplySchedule = () => {
    const isHoliday = holiday_jp.isHoliday(date);
    const dayKey = dayMap[getDay(date)];
    const newQuantities: Record<string, string> = {};
    let appliedCount = 0;

    const productsToApply = selectedCategory === 'すべて' ? allProducts : allProducts.filter(p => p.category === selectedCategory);
    
    productsToApply.forEach(product => {
      const holidayQuantity = product.dailyProduction?.holiday;
      const dayQuantity = product.dailyProduction?.[dayKey];

      const scheduledQuantity = (isHoliday && holidayQuantity !== undefined)
        ? holidayQuantity
        : (dayQuantity ?? 0);
        
      if (scheduledQuantity > 0) {
        newQuantities[product.id] = String(scheduledQuantity);
        appliedCount++;
      }
    });

    setQuantities(prev => ({ ...prev, ...newQuantities }));
    toast({
        title: "製造予定数を適用しました",
        description: `${appliedCount}件の商品に${format(date, 'PPPP', { locale: ja })}の予定数を反映しました。`
    })
  };

  const totalProductionCount = useMemo(() => {
    return Object.values(quantities).reduce((sum, current) => sum + (Number(current) || 0), 0);
  }, [quantities]);

  const handleRecordProduction = async () => {
    const itemsToRecord = Object.entries(quantities)
      .map(([productId, quantityStr]) => {
        const product = allProducts.find(p => p.id === productId);
        const quantity = Number(quantityStr);
        if (!product || !quantity || quantity <= 0) return null;
        return {
          productId: product.id,
          productCode: product.productCode,
          name: product.name,
          quantity: quantity,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (itemsToRecord.length === 0) {
      toast({
        variant: "destructive",
        title: "製造数が入力されていません",
        description: "製造した商品の数量を入力してください。",
      });
      return;
    }
    
    if (!userStore) {
        toast({
            variant: "destructive",
            title: "店舗が設定されていません",
            description: "このアカウントには店舗が紐付いていません。管理者に連絡してください。",
        });
        return;
    }

    const newProductionEntry: Omit<ProductionEntry, 'id' | 'userId'> = {
      storeId: userStore.id,
      date: date,
      items: itemsToRecord,
      totalProductionCount: itemsToRecord.reduce((sum, item) => sum + item.quantity, 0),
    };

    await addProductionEntry(newProductionEntry);
    setQuantities({});
  };

  const isLoading = productsLoading || storesLoading;
  const isHoliday = holiday_jp.isHoliday(date);
  const dayKey = dayMap[getDay(date)];

  if (isAdmin) {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>管理者アカウント</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">製造数入力は店舗アカウントで行ってください。</p>
                </CardContent>
            </Card>
        </div>
    )
  }

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!isLoading && !userStore) {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>店舗が紐付いていません</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">このアカウントには店舗が紐付いていません。管理者に連絡して店舗を割り当ててもらってください。</p>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>製造数入力</CardTitle>
              <CardDescription>商品の製造数を入力してください。</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-sm">製造日:</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: ja }) : <span>日付を選択</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => { if(d) setDate(d) }}
                    initialFocus
                    locale={ja}
                    disabled={(d) => d > new Date() || d < new Date("2000-01-01")}
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={handleApplySchedule}>
                <Factory className="mr-2 h-4 w-4"/>
                予定数を適用
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList>
                    {categories.map(category => (
                        <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
                    ))}
                </TabsList>
                 {categories.map(category => (
                    <TabsContent value={category} key={category}>
                        <div className="border rounded-md mt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>商品名</TableHead>
                                        <TableHead className="w-32 text-right">
                                          <div className="flex items-center justify-end gap-1">
                                            予定数
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>商品マスタに登録された製造予定数です。</p>
                                                  <p className="text-xs text-muted-foreground">祝日の場合は祝日、それ以外は曜日の数が適用されます。</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          </div>
                                        </TableHead>
                                        <TableHead className="w-32 text-right">今回の製造数</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allProducts.filter(p => category === 'すべて' || p.category === category).length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center">
                                                対象の商品がありません。
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        allProducts.filter(p => category === 'すべて' || p.category === category).map(product => {
                                            const scheduledQuantity = (isHoliday && product.dailyProduction?.holiday !== undefined)
                                                ? product.dailyProduction.holiday
                                                : product.dailyProduction?.[dayKey] ?? 0;
                                            
                                            return (
                                            <TableRow key={product.id}>
                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {scheduledQuantity.toLocaleString()} 個
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        className="text-right"
                                                        placeholder="0"
                                                        value={quantities[product.id] || ''}
                                                        onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                                        min="0"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )})
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                 ))}
            </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col items-end gap-4 mt-auto bg-muted/50 p-6">
          <div className="w-full max-w-sm space-y-2 text-sm">
            <div className="flex justify-between font-bold text-lg">
                <span>製造合計数</span>
                <span>{totalProductionCount.toLocaleString()} 個</span>
            </div>
          </div>
          <Button className="w-full max-w-sm" size="lg" disabled={totalProductionCount === 0 || productionLoading} onClick={handleRecordProduction}>
             {productionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Factory className="mr-2 h-5 w-5"/>}
             製造数を記録
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
