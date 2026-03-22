
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Loader2, CalendarIcon, Plus, Minus, RefreshCw, Info, Calculator, Save, MapPin } from 'lucide-react';
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
import type { ProductionEntry, DailyProduction, WeatherType } from '@/lib/types';
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
  const [correctionQuantities, setCorrectionQuantities] = useState<Record<string, string>>({});
  const [date, setDate] = useState<Date>(new Date());
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [isWeatherRepresentative, setIsWeatherRepresentative] = useState(false);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const { toast } = useToast();

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
      } else {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      }
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=weather_code&start_date=${dateStr}&end_date=${dateStr}&timezone=Asia%2FTokyo`);
      const weatherData = await weatherRes.json();
      if (weatherData.hourly && weatherData.hourly.weather_code) {
        const codeAt10 = weatherData.hourly.weather_code[10];
        setWeather(interpretWeatherCode(codeAt10));
      }
    } catch (error) {
      console.warn('Weather fetch failed', error);
    } finally {
      setIsFetchingWeather(false);
    }
  }, [userStore, wasteEntries]);

  useEffect(() => {
    if (userStore) fetchWeather(date);
  }, [fetchWeather, date, userStore]);

  const handleQuantityChange = (productId: string, value: string) => {
    setCorrectionQuantities(prev => ({ ...prev, [productId]: value }));
  };

  const handleAdjustQuantity = (productId: string, delta: number) => {
    setCorrectionQuantities(prev => {
      const current = parseInt(prev[productId] || '0', 10);
      return { ...prev, [productId]: (current + delta).toString() };
    });
  };

  const totalCorrectionCount = useMemo(() => {
    return Object.values(correctionQuantities).reduce((sum, current) => sum + (parseInt(current, 10) || 0), 0);
  }, [correctionQuantities]);

  const handleRecordProduction = async () => {
    const itemsToRecord = Object.entries(correctionQuantities)
      .map(([productId, quantityStr]) => {
        const product = allProducts.find(p => p.id === productId);
        const quantity = parseInt(quantityStr, 10);
        if (!product || isNaN(quantity) || quantity === 0) return null;
        return {
          productId: product.id,
          productCode: product.productCode,
          name: product.name,
          quantity: quantity,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (itemsToRecord.length === 0) {
      toast({ variant: "destructive", title: "入力エラー", description: "補正数を入力してください。" });
      return;
    }
    
    if (!userStore) return;

    const newProductionEntry: Omit<ProductionEntry, 'id' | 'userId'> = {
      storeId: userStore.id,
      date: date,
      items: itemsToRecord,
      totalProductionCount: itemsToRecord.reduce((sum, item) => sum + item.quantity, 0),
    };

    await addProductionEntry(newProductionEntry);
    setCorrectionQuantities({});
  };

  const isHoliday = holiday_jp.isHoliday(date);
  const dayKey = dayMap[getDay(date)];

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

  if (productsLoading || storesLoading) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle>製造補正登録</CardTitle>
              <CardDescription>
                計画数に対する「補正数」を記録します。減算（マイナス）も可能です。<br/>
                最終製造数 ＝ 計画数 ＋ 補正数 として分析されます。
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
                {isWeatherRepresentative && (
                   <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1 pl-1">
                      <Info className="h-2 w-2" /> 廃棄実績の天気に同期中
                   </p>
                )}
              </div>
              <Button className="bg-primary text-primary-foreground" onClick={handleRecordProduction} disabled={totalCorrectionCount === 0 || productionLoading}>
                {productionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                補正分を記録
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
                                        <TableHead className="w-24 text-center bg-muted/30">計画数</TableHead>
                                        <TableHead className="w-56 text-center">補正数調整 (調整分のみ入力)</TableHead>
                                        <TableHead className="w-32 text-right font-bold text-primary">最終製造数</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allProducts.filter(p => category === 'すべて' || p.category === category).map(product => {
                                        const dailyProduction = weather === 'rainy' ? product.dailyProductionRainy : product.dailyProductionSunny;
                                        const plannedQuantity = (isHoliday && dailyProduction?.holiday !== undefined)
                                            ? dailyProduction.holiday
                                            : (dailyProduction as any)?.[dayKey] ?? 0;
                                        
                                        const correction = parseInt(correctionQuantities[product.id] || '0', 10);
                                        const finalQuantity = plannedQuantity + correction;

                                        return (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell className="text-center text-muted-foreground bg-muted/30">
                                                <span className="font-bold text-foreground">{plannedQuantity}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleAdjustQuantity(product.id, -1)}><Minus className="h-3 w-3"/></Button>
                                                    <Input 
                                                        type="number" 
                                                        className="text-center w-16 h-8 p-0" 
                                                        placeholder="0"
                                                        value={correctionQuantities[product.id] || ''} 
                                                        onChange={(e) => handleQuantityChange(product.id, e.target.value)} 
                                                    />
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleAdjustQuantity(product.id, 1)}><Plus className="h-3 w-3"/></Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Calculator className="h-3 w-3 opacity-30" />
                                                    <span className={cn("text-lg font-black", finalQuantity < plannedQuantity ? "text-orange-500" : (finalQuantity > plannedQuantity ? "text-blue-600" : "text-primary"))}>
                                                        {finalQuantity}
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
          <div className="w-full max-w-sm flex justify-between font-bold text-lg border-b border-white pb-2 mb-2">
              <span className="text-sm">今回の補正合計</span>
              <span className={cn(totalCorrectionCount < 0 ? "text-destructive" : "text-primary")}>
                {totalCorrectionCount > 0 ? "+" : ""}{totalCorrectionCount} 個
              </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
             <MapPin className="h-3 w-3" />
             店舗地域: {userStore?.name || '-'}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
