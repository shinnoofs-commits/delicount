
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Minus, Trash2, Loader2, Sun, Cloud, CloudRain, Snowflake, MapPin, Info } from 'lucide-react';
import type { Product, WasteEntry, WeatherType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useTransactions } from '@/contexts/transaction-context';
import { useProducts } from '@/contexts/product-context';
import { useStores } from '@/contexts/store-context';
import { useAdmin } from '@/hooks/use-admin';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

type WasteListItem = {
  product: Product;
  quantity: number;
};

const weatherOptions: { value: WeatherType; label: string; icon: any }[] = [
  { value: 'sunny', label: '晴れ', icon: Sun },
  { value: 'cloudy', label: '曇り', icon: Cloud },
  { value: 'rainy', label: '雨', icon: CloudRain },
  { value: 'snowy', label: '雪', icon: Snowflake },
];

export default function PosClient() {
  const { wasteEntries, addWasteEntry, loading: wasteLoading, updateDailyWeather } = useTransactions();
  const { products: allProducts, loading: productsLoading } = useProducts();
  const { userStore, loading: storesLoading } = useStores();
  const { isAdmin } = useAdmin();
  
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [wasteList, setWasteList] = useState<WasteListItem[]>([]);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [isWeatherFixed, setIsWeatherFixed] = useState(false);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if(isClient) {
      setDate(new Date());
    }
  }, [isClient]);

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
    if (typeof window === 'undefined') return;

    const existingEntryWithWeather = wasteEntries.find(e => 
      e.storeId === userStore.id && 
      isSameDay(e.date, targetDate) && 
      e.weather
    );

    if (existingEntryWithWeather && existingEntryWithWeather.weather) {
      setWeather(existingEntryWithWeather.weather);
      setIsWeatherFixed(true);
      return;
    }

    setIsWeatherFixed(false);
    setIsFetchingWeather(true);
    try {
      const cityName = userStore.name?.replace(/(店|支店|営業所)$/, '') || '';
      if (!cityName) return;
      
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ja&format=json`);
      const geoData = await geoRes.json();
      let lat, lon;

      if (geoData.results && geoData.results.length > 0) {
        lat = geoData.results[0].latitude;
        lon = geoData.results[0].longitude;
      } else if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      }

      if (lat && lon) {
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=weather_code&start_date=${dateStr}&end_date=${dateStr}&timezone=Asia%2FTokyo`
        );
        const weatherData = await weatherRes.json();

        if (weatherData.hourly && weatherData.hourly.weather_code) {
          const codeAt22 = weatherData.hourly.weather_code[22];
          setWeather(interpretWeatherCode(codeAt22));
        }
      }
    } catch (error) {
      console.warn('Weather fetch failed', error);
    } finally {
      setIsFetchingWeather(false);
    }
  }, [userStore, wasteEntries]);

  useEffect(() => {
    if (userStore && date) fetch2200Weather(date);
  }, [fetch2200Weather, date, userStore]);

  const handleRecordWaste = async () => {
    if (wasteList.length === 0 || !userStore || !date) return;
    const totalWasteCost = wasteList.reduce((acc, item) => acc + item.product.costPrice * item.quantity, 0);
    const newWasteEntry: Omit<WasteEntry, 'id' | 'userId'> = {
      storeId: userStore.id,
      date: date,
      weather: weather,
      items: wasteList.map(item => ({
        productId: item.product.id,
        productCode: item.product.productCode,
        name: item.product.name,
        quantity: item.quantity,
        costPrice: item.product.costPrice,
      })),
      totalWasteCost,
    };
    
    if (!isWeatherFixed) {
        await updateDailyWeather(userStore.id, date, weather);
    }

    await addWasteEntry(newWasteEntry);
    setWasteList([]);
  };

  if (isAdmin) {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md text-center">
                <CardHeader><CardTitle>管理者アカウント</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">廃棄入力は店舗アカウントで行ってください。</p></CardContent>
            </Card>
        </div>
    )
  }

  if (productsLoading || storesLoading || !isClient) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!userStore) return <div className="flex items-center justify-center h-full"><Card className="w-full max-w-md text-center"><CardHeader><CardTitle>店舗が設定されていません</CardTitle></CardHeader></Card></div>;

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 items-start lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 justify-start">
              {categories.map(category => (
                  <TabsTrigger key={category} value={category} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">{category}</TabsTrigger>
              ))}
          </TabsList>
          {categories.map(category => (
            <TabsContent value={category} key={category}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-4">
                    {(category === 'すべて' ? allProducts : allProducts.filter(p => p.category === category))
                    .map(product => (
                        <Card key={product.id} onClick={() => setWasteList(prev => {
                            const existing = prev.find(i => i.product.id === product.id);
                            if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
                            return [...prev, { product, quantity: 1 }];
                        })} className="cursor-pointer hover:shadow-lg transition-all text-center min-h-24 p-4 flex flex-col justify-center">
                            <p className="font-semibold text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">¥{product.price.toLocaleString()}</p>
                        </Card>
                    ))}
                </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <div className="lg:col-span-1 sticky top-6">
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">廃棄リスト</CardTitle>
            <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-sm">
                    <Label className="font-medium">廃棄日:</Label>
                    <Popover>
                        <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start">{date ? format(date, "PPP", { locale: ja }) : <span>日付を選択</span>}</Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} locale={ja} /></PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-medium">代表天気 (1日1天気):</Label>
                    <div className="grid grid-cols-4 gap-2">
                        {weatherOptions.map((option) => (
                            <Button key={option.value} variant={weather === option.value ? "default" : "outline"} className="flex flex-col h-14 p-1" onClick={() => setWeather(option.value)}>
                                <option.icon className="h-4 w-4" /><span className="text-[10px]">{option.label}</span>
                            </Button>
                        ))}
                    </div>
                    {isWeatherFixed && (
                      <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        この日の天気は既に他のデータで確定しています。
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        地域: {userStore?.name?.replace(/(店|支店|営業所)$/, '') || '-'}
                    </div>
                </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[400px]">
            {wasteList.length === 0 ? <p className="text-center text-muted-foreground py-10">追加してください</p> : (
              <div className="space-y-4">
                {wasteList.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate flex-1">{item.product.name}</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWasteList(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i).filter(i => i.quantity > 0))}><Minus className="h-4 w-4" /></Button>
                      <span className="w-6 text-center">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWasteList(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: i.quantity + 1 } : i))}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4 bg-muted/50 p-6">
            <div className="w-full flex justify-between font-bold text-lg">
                <span>合計(売価)</span><span>¥{wasteList.reduce((acc, i) => acc + i.product.price * i.quantity, 0).toLocaleString()}</span>
            </div>
            <Button className="w-full bg-destructive" size="lg" disabled={wasteList.length === 0 || wasteLoading} onClick={handleRecordWaste}>
               {wasteLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Trash2 className="mr-2 h-5 w-5"/>}
               廃棄を記録
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
