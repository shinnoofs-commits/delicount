'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Loader2, CalendarIcon, Factory, Info, Sun, CloudRain, RefreshCw, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import type { ProductionEntry, DailyProduction, Product, WeatherType } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
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
  const [weather, setWeather] = useState<WeatherType>('sunny');
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

  const fetch2200Weather = useCallback(async (targetDate: Date) => {
    if (!userStore) return;
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
        const codeAt22 = weatherData.hourly.weather_code[22];
        setWeather(interpretWeatherCode(codeAt22));
      }
    } catch (error) {
      console.warn('Weather fetch failed', error);
    } finally {
      setIsFetchingWeather(false);
    }
  }, [userStore]);

  useEffect(() => {
    if (userStore) fetch2200Weather(date);
  }, [fetch2200Weather, date, userStore]);

  const handleQuantityChange = (productId: string, value: string) => {
    setQuantities(prev => ({ ...prev, [productId]: value }));
  };

  const handleApplySchedule = () => {
    const isHoliday = holiday_jp.isHoliday(date);
    const dayKey = dayMap[getDay(date)];
    const newQuantities: Record<string, string> = {};
    let appliedCount = 0;

    const productsToApply = selectedCategory === 'すべて' ? allProducts : allProducts.filter(p => p.category === selectedCategory);
    
    // 天気に応じた予定数を選択
    const patternKey = (weather === 'rainy') ? 'dailyProductionRainy' : 'dailyProductionSunny';
    const weatherLabel = (weather === 'rainy') ? '雨の日' : '晴れの日';

    productsToApply.forEach(product => {
      const dailyProduction = product[patternKey];
      const holidayQuantity = dailyProduction?.holiday;
      const dayQuantity = dailyProduction?.[dayKey];

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
        title: `${weatherLabel}の予定数を適用しました`,
        description: `${appliedCount}件の商品に適用しました。`
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
      toast({ variant: "destructive", title: "入力エラー", description: "製造数を入力してください。" });
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
    setQuantities({});
  };

  const isLoading = productsLoading || storesLoading;
  const isHoliday = holiday_jp.isHoliday(date);
  const dayKey = dayMap[getDay(date)];

  if (isAdmin) {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md text-center">
                <CardHeader><CardTitle>店舗アカウントでログインしてください</CardTitle></CardHeader>
            </Card>
        </div>
    )
  }

  if (isLoading) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle>製造数入力</CardTitle>
              <CardDescription>当日の製造数を記録します。</CardDescription>
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
              <div className="flex items-center gap-2 border px-3 py-1.5 rounded-md bg-muted/50">
                 {weather === 'rainy' ? <CloudRain className="h-4 w-4 text-blue-500" /> : <Sun className="h-4 w-4 text-yellow-500" />}
                 <span className="text-sm font-medium">{weather === 'rainy' ? '雨予報' : '晴れ予報'} (22:00)</span>
                 <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => fetch2200Weather(date)} disabled={isFetchingWeather}>
                    <RefreshCw className={cn("h-3 w-3", isFetchingWeather && "animate-spin")} />
                 </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleApplySchedule} disabled={productionLoading}>
                  予定数を適用
                </Button>
                <Button className="bg-primary text-primary-foreground" onClick={handleRecordProduction} disabled={totalProductionCount === 0 || productionLoading}>
                  {productionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Factory className="mr-2 h-4 w-4"/>}
                  製造数を記録
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
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
                                        <TableHead className="w-32 text-right">予定数({weather === 'rainy' ? '雨' : '晴'})</TableHead>
                                        <TableHead className="w-32 text-right">今回の製造数</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allProducts.filter(p => category === 'すべて' || p.category === category).map(product => {
                                        const dailyProduction = weather === 'rainy' ? product.dailyProductionRainy : product.dailyProductionSunny;
                                        const scheduledQuantity = (isHoliday && dailyProduction?.holiday !== undefined)
                                            ? dailyProduction.holiday
                                            : dailyProduction?.[dayKey] ?? 0;
                                        return (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{scheduledQuantity.toLocaleString()} 個</TableCell>
                                            <TableCell><Input type="number" className="text-right" value={quantities[product.id] || ''} onChange={(e) => handleQuantityChange(product.id, e.target.value)} min="0" /></TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                 ))}
            </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col items-end gap-4 bg-muted/50 p-6">
          <div className="w-full max-w-sm flex justify-between font-bold text-lg">
              <span>合計製造数</span>
              <span>{totalProductionCount.toLocaleString()} 個</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
