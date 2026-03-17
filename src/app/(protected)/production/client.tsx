'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Loader2, CalendarIcon, Plus, RefreshCw, MapPin } from 'lucide-react';
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
import type { ProductionEntry, DailyProduction, WeatherType } from '@/lib/types';
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
  const [additionalQuantities, setAdditionalQuantities] = useState<Record<string, string>>({});
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

  const fetch1000Weather = useCallback(async (targetDate: Date) => {
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
        const codeAt10 = weatherData.hourly.weather_code[10];
        setWeather(interpretWeatherCode(codeAt10));
      }
    } catch (error) {
      console.warn('Weather fetch failed', error);
    } finally {
      setIsFetchingWeather(false);
    }
  }, [userStore]);

  useEffect(() => {
    if (userStore) fetch1000Weather(date);
  }, [fetch1000Weather, date, userStore]);

  const handleQuantityChange = (productId: string, value: string) => {
    setAdditionalQuantities(prev => ({ ...prev, [productId]: value }));
  };

  const totalAdditionalCount = useMemo(() => {
    return Object.values(additionalQuantities).reduce((sum, current) => sum + (Number(current) || 0), 0);
  }, [additionalQuantities]);

  const handleRecordProduction = async () => {
    const itemsToRecord = Object.entries(additionalQuantities)
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
      toast({ variant: "destructive", title: "入力エラー", description: "追加製造数を入力してください。" });
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
    setAdditionalQuantities({});
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
              <CardTitle>追加製造登録</CardTitle>
              <CardDescription>当日の基本製造分（予定数）以外の追加分のみを記録します。</CardDescription>
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
                 {weather === 'rainy' ? <RefreshCw className="h-4 w-4 text-blue-500" /> : <RefreshCw className="h-4 w-4 text-yellow-500" />}
                 <span className="text-sm font-medium">{weather === 'rainy' ? '雨 (10:00基準)' : '晴 (10:00基準)'}</span>
                 <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => fetch1000Weather(date)} disabled={isFetchingWeather}>
                    <RefreshCw className={cn("h-3 w-3", isFetchingWeather && "animate-spin")} />
                 </Button>
              </div>
              <Button className="bg-primary text-primary-foreground" onClick={handleRecordProduction} disabled={totalAdditionalCount === 0 || productionLoading}>
                {productionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Plus className="mr-2 h-4 w-4"/>}
                追加分を記録
              </Button>
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
                                        <TableHead className="w-32 text-center bg-muted/30">予定数</TableHead>
                                        <TableHead className="w-40 text-right">追加製造数</TableHead>
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
                                            <TableCell className="text-center text-muted-foreground bg-muted/30">
                                                <span className="font-bold text-foreground">{scheduledQuantity.toLocaleString()}</span> 個
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 justify-end">
                                                    <Input 
                                                        type="number" 
                                                        className="text-right w-24" 
                                                        placeholder="0"
                                                        value={additionalQuantities[product.id] || ''} 
                                                        onChange={(e) => handleQuantityChange(product.id, e.target.value)} 
                                                        min="0" 
                                                    />
                                                    <span className="text-sm font-medium">個</span>
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
        <CardFooter className="flex flex-col items-end gap-4 bg-muted/50 p-6">
          <div className="w-full max-w-sm flex justify-between font-bold text-lg">
              <span>今回の追加製造合計</span>
              <span className="text-primary">{totalAdditionalCount.toLocaleString()} 個</span>
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
