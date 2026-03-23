'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Loader2, CalendarIcon, Plus, Minus, RefreshCw, Save, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/contexts/product-context';
import { useStores } from '@/contexts/store-context';
import { useAdmin } from '@/hooks/use-admin';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, getDay, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useProduction } from '@/contexts/production-context';
import { useTransactions } from '@/contexts/transaction-context';
import type { DailyProduction, WeatherType, ProductionEntry } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import holiday_jp from '@holiday-jp/holiday_jp';

const dayMap: (keyof DailyProduction)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function ProductionClient() {
  const { addProductionEntry, loading: productionLoading } = useProduction();
  const { wasteEntries } = useTransactions();
  const { products: allProducts, loading: productsLoading } = useProducts();
  const { userStore, loading: storesLoading } = useStores();
  const { isAdmin } = useAdmin();
  
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [resultQuantities, setResultQuantities] = useState<Record<string, string>>({});
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [isWeatherRepresentative, setIsWeatherRepresentative] = useState(false);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setDate(new Date());
  }, []);

  const categories = useMemo(() => ['すべて', ...Array.from(new Set(allProducts.map(p => p.category)))], [allProducts]);

  const interpretWeatherCode = (code: number): WeatherType => {
    if (code === 0) return 'sunny';
    if ([1, 2, 3, 45, 48].includes(code)) return 'cloudy';
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) return 'rainy';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snowy';
    return 'sunny';
  };

  const fetchWeather = useCallback(async (targetDate: Date) => {
    if (!userStore) return;

    const dailyWasteEntry = wasteEntries.find(e => e.storeId === userStore.id && isSameDay(e.date, targetDate) && e.weather);
    if (dailyWasteEntry && dailyWasteEntry.weather) {
      setWeather(dailyWasteEntry.weather);
      setIsWeatherRepresentative(true);
      return;
    }

    setIsWeatherRepresentative(false);
    setIsFetchingWeather(true);
    try {
      const cityName = userStore?.name?.replace(/(店|支店|営業所)$/, '') || '';
      if (!cityName) return;
      
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ja&format=json`);
      const geoData = await geoRes.json();
      let lat, lon;
      if (geoData.results && geoData.results.length > 0) {
        lat = geoData.results[0].latitude;
        lon = geoData.results[0].longitude;
      } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      }

      if (lat && lon) {
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=weather_code&start_date=${dateStr}&end_date=${dateStr}&timezone=Asia%2FTokyo`);
        const weatherData = await weatherRes.json();
        if (weatherData.hourly && weatherData.hourly.weather_code) {
          const codeAt10 = weatherData.hourly.weather_code[10];
          setWeather(interpretWeatherCode(codeAt10));
        }
      }
    } catch (error) {
      console.warn('Weather fetch failed', error);
    } finally {
      setIsFetchingWeather(false);
    }
  }, [userStore, wasteEntries]);

  useEffect(() => {
    if (userStore && date) fetchWeather(date);
  }, [fetchWeather, date, userStore]);

  useEffect(() => {
    if (allProducts.length === 0 || !date) return;
    const isHoliday = holiday_jp.isHoliday(date);
    const dayKey = dayMap[getDay(date)];
    
    const initialQuantities: Record<string, string> = {};
    allProducts.forEach(product => {
      const dailyProduction = weather === 'rainy' ? product.dailyProductionRainy : product.dailyProductionSunny;
      const plannedQuantity = (isHoliday && dailyProduction?.holiday !== undefined)
          ? dailyProduction.holiday
          : (dailyProduction as any)?.[dayKey] ?? 0;
      initialQuantities[product.id] = plannedQuantity.toString();
    });
    setResultQuantities(initialQuantities);
  }, [date, weather, allProducts]);

  const handleQuantityChange = (productId: string, value: string) => {
    setResultQuantities(prev => ({ ...prev, [productId]: value }));
  };

  const handleAdjustQuantity = (productId: string, delta: number) => {
    setResultQuantities(prev => {
      const current = parseInt(prev[productId] || '0', 10);
      return { ...prev, [productId]: Math.max(0, current + delta).toString() };
    });
  };

  const handleRecordProduction = async () => {
    if (!date || !userStore) return;
    const itemsToRecord = Object.entries(resultQuantities)
      .map(([productId, quantityStr]) => {
        const product = allProducts.find(p => p.id === productId);
        const quantity = parseInt(quantityStr, 10);
        if (!product || isNaN(quantity)) return null;
        return {
          productId: product.id,
          productCode: product.productCode,
          name: product.name,
          quantity: quantity,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (itemsToRecord.length === 0) {
      toast({ variant: "destructive", title: "入力エラー", description: "製造数を入力してください。" });
      return;
    }

    const newProductionEntry: Omit<ProductionEntry, 'id' | 'userId'> = {
      storeId: userStore.id,
      date: date,
      items: itemsToRecord,
      totalProductionCount: itemsToRecord.reduce((sum, item) => sum + item.quantity, 0),
    };

    await addProductionEntry(newProductionEntry);
  };

  if (isAdmin) {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md text-center">
                <CardHeader><CardTitle>管理者アカウント</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">この画面は店舗アカウントで利用してください。</p></CardContent>
            </Card>
        </div>
    )
  }

  if (productsLoading || storesLoading || !date) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle>製造実績登録</CardTitle>
              <CardDescription>
                今日の最終的な製造数を登録してください。計画数から変更がある場合は修正してください。<br/>
                登録された数値は「0ベース」で実績として分析に反映されます。
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "PPP", { locale: ja })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus locale={ja} />
                </PopoverContent>
              </Popover>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 border px-3 py-1.5 rounded-md bg-muted/50">
                   {weather === 'rainy' ? <RefreshCw className="h-4 w-4 text-blue-500" /> : <RefreshCw className="h-4 w-4 text-yellow-500" />}
                   <span className="text-sm font-medium">{weather === 'rainy' ? '雨 (代表天気)' : '晴 (代表天気)'}</span>
                   {!isWeatherRepresentative && (
                     <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => fetchWeather(date)} disabled={isFetchingWeather}>
                        <RefreshCw className={cn("h-3 w-3", isFetchingWeather && "animate-spin")} />
                     </Button>
                   )}
                </div>
              </div>
              <Button className="bg-primary text-primary-foreground font-bold" onClick={handleRecordProduction} disabled={productionLoading}>
                {productionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                実績を記録
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="すべて" value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="bg-transparent h-auto p-0 justify-start gap-1 flex-wrap">
                    {categories.map(category => (
                        <TabsTrigger key={category} value={category} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border rounded-md">{category}</TabsTrigger>
                    ))}
                </TabsList>
                 {categories.map(category => (
                    <TabsContent value={category} key={category} className="mt-4">
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>商品名</TableHead>
                                        <TableHead className="w-24 text-center bg-muted/30">計画参考</TableHead>
                                        <TableHead className="w-56 text-center">製造実績 (今日の総数を確認)</TableHead>
                                        <TableHead className="w-32 text-right font-bold text-primary">記録数</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allProducts.filter(p => category === 'すべて' || p.category === category).map(product => {
                                        const isHoliday = holiday_jp.isHoliday(date);
                                        const dayKey = dayMap[getDay(date)];
                                        const dailyProduction = weather === 'rainy' ? product.dailyProductionRainy : product.dailyProductionSunny;
                                        const plannedQuantity = (isHoliday && dailyProduction?.holiday !== undefined)
                                            ? dailyProduction.holiday
                                            : (dailyProduction as any)?.[dayKey] ?? 0;
                                        
                                        const currentVal = parseInt(resultQuantities[product.id] || '0', 10);

                                        return (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell className="text-center text-muted-foreground bg-muted/30">
                                                <span className="font-bold text-foreground opacity-50">{plannedQuantity}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleAdjustQuantity(product.id, -1)}><Minus className="h-3 w-3"/></Button>
                                                    <Input 
                                                        type="number" 
                                                        className="text-center w-16 h-8 p-0 font-bold" 
                                                        value={resultQuantities[product.id] || ''} 
                                                        onChange={(e) => handleQuantityChange(product.id, e.target.value)} 
                                                    />
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleAdjustQuantity(product.id, 1)}><Plus className="h-3 w-3"/></Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className={cn("text-lg font-black", currentVal !== plannedQuantity ? "text-blue-600" : "text-primary")}>
                                                        {currentVal}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">個</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                 ))}
            </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col items-end gap-2 bg-muted/50 p-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
             <MapPin className="h-3 w-3" />
             店舗地域: {userStore?.name || '-'}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
