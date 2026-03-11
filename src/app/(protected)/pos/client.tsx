
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Plus, Minus, Trash2, Loader2, CalendarIcon, Sun, Cloud, CloudRain, Snowflake, RefreshCw, MapPin } from 'lucide-react';
import type { Product, WasteItem, WasteEntry, WeatherType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useTransactions } from '@/contexts/transaction-context';
import { useProducts } from '@/contexts/product-context';
import { useStores } from '@/contexts/store-context';
import { useAdmin } from '@/hooks/use-admin';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
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
  const { addWasteEntry, loading: wasteLoading } = useTransactions();
  const { products: allProducts, loading: productsLoading } = useProducts();
  const { userStore, loading: storesLoading } = useStores();
  const { isAdmin } = useAdmin();
  
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [wasteList, setWasteList] = useState<WasteListItem[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const { toast } = useToast();

  const categories = useMemo(() => ['すべて', ...Array.from(new Set(allProducts.map(p => p.category)))], [allProducts]);

  // 気象コードからWeatherTypeへの変換
  const interpretWeatherCode = (code: number): WeatherType => {
    if (code === 0) return 'sunny';
    if ([1, 2, 3, 45, 48].includes(code)) return 'cloudy';
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) return 'rainy';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snowy';
    return 'sunny';
  };

  // 22時の天気を取得する関数
  const fetch2200Weather = useCallback(async (targetDate: Date) => {
    if (!userStore) return;

    setIsFetchingWeather(true);
    try {
      let lat, lon;

      // 1. 店舗名から緯度経度を検索 (店舗名 = 地域名)
      // 「店」や「支店」などの接尾辞を除去して精度を上げる
      const cityName = userStore.name.replace(/(店|支店|営業所)$/, '');
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ja&format=json`);
      const geoData = await geoRes.json();

      if (geoData.results && geoData.results.length > 0) {
        lat = geoData.results[0].latitude;
        lon = geoData.results[0].longitude;
      } else {
        // 店舗名で見つからない場合は現在地を試みる
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      }

      // 2. 指定日の22時の天気を取得
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=weather_code&start_date=${dateStr}&end_date=${dateStr}&timezone=Asia%2FTokyo`
      );
      const weatherData = await weatherRes.json();

      if (weatherData.hourly && weatherData.hourly.weather_code) {
        // インデックス22が22:00のデータ
        const codeAt22 = weatherData.hourly.weather_code[22];
        setWeather(interpretWeatherCode(codeAt22));
      }
    } catch (error) {
      console.warn('Weather fetch failed, falling back to manual selection.', error);
    } finally {
      setIsFetchingWeather(false);
    }
  }, [userStore]);

  // 初期読み込み時、または日付変更時に22時の天気を自動取得
  useEffect(() => {
    if (userStore) {
      fetch2200Weather(date);
    }
  }, [fetch2200Weather, date, userStore]);

  const addToWasteList = useCallback((product: Product) => {
    setWasteList(prevList => {
      const existingItem = prevList.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevList.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevList, { product, quantity: 1 }];
    });
    toast({
      title: "廃棄リストに追加しました",
      description: `${product.name} をリストに追加しました。`,
      duration: 500,
    })
  }, [toast]);

  const updateQuantity = (productId: string, quantity: number) => {
    setWasteList(prevList => {
      if (quantity <= 0) {
        return prevList.filter(item => item.product.id !== productId);
      }
      return prevList.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      );
    });
  };

  const clearWasteList = () => {
    setWasteList([]);
  };

  const totalWasteCost = useMemo(() => {
    return wasteList.reduce((acc, item) => acc + item.product.costPrice * item.quantity, 0);
  }, [wasteList]);
  
  const totalWastePrice = useMemo(() => {
    return wasteList.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [wasteList]);

  const handleRecordWaste = async () => {
    if (wasteList.length === 0) {
      toast({
        variant: "destructive",
        title: "リストが空です",
        description: "廃棄する商品を追加してください。",
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

    await addWasteEntry(newWasteEntry);
    clearWasteList();
  };

  const isLoading = productsLoading || storesLoading;

  if (isAdmin) {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>管理者アカウント</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">廃棄入力は店舗アカウントで行ってください。</p>
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
    <div className="grid flex-1 grid-cols-1 gap-4 items-start lg:grid-cols-3">
      {/* Product Selection */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 justify-start">
              {categories.map(category => (
                  <TabsTrigger 
                    key={category} 
                    value={category}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border"
                  >
                    {category}
                  </TabsTrigger>
              ))}
          </TabsList>
          {categories.map(category => (
            <TabsContent value={category} key={category}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-4">
                    {(category === 'すべて' ? allProducts : allProducts.filter(p => p.category === category))
                    .map(product => (
                        <Card 
                            key={product.id} 
                            onClick={() => addToWasteList(product)} 
                            className="cursor-pointer hover:shadow-lg hover:border-destructive transition-all flex flex-col min-h-24"
                        >
                        <CardContent className="p-4 flex-1 flex flex-col justify-center">
                            <div className="text-center">
                                <p className="font-semibold text-sm break-words">{product.name}</p>
                                <p className="text-xs text-muted-foreground">原価: ¥{product.costPrice.toLocaleString()}</p>
                            </div>
                        </CardContent>
                        </Card>
                    ))}
                </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Waste List Section */}
      <div className="lg:col-span-1 sticky top-6">
        <Card className="flex flex-col h-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              廃棄商品リスト
              <Button variant="ghost" size="icon" onClick={clearWasteList} disabled={wasteList.length === 0}>
                  <X className="h-4 w-4" />
                  <span className="sr-only">リストをクリア</span>
              </Button>
            </CardTitle>
            <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-sm">
                    <Label className="font-medium whitespace-nowrap">廃棄日:</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
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
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="font-medium text-sm">22時の天気 (自動取得):</Label>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => fetch2200Weather(date)} disabled={isFetchingWeather}>
                            {isFetchingWeather ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                            再取得
                        </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {weatherOptions.map((option) => (
                            <Button
                                key={option.value}
                                variant={weather === option.value ? "default" : "outline"}
                                className="flex flex-col h-14 gap-1 p-1"
                                onClick={() => setWeather(option.value)}
                            >
                                <option.icon className="h-4 w-4" />
                                <span className="text-[10px]">{option.label}</span>
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        地域: {userStore.name.replace(/(店|支店|営業所)$/, '')}
                    </div>
                </div>
            </div>
          </CardHeader>
          <div className="flex-grow">
            <div className="p-6">
              {wasteList.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                  <p>廃棄リストは空です。</p>
                  <p className="text-sm">商品をクリックして追加してください。</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {wasteList.map(item => (
                    <div key={item.product.id} className="space-y-2">
                       <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm flex-grow min-w-0 break-words pr-2">{item.product.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-medium text-sm w-20 text-right text-destructive">¥{(item.product.price * item.quantity).toLocaleString()}</span>
                            <span className="font-medium text-sm w-20 text-right">¥{(item.product.costPrice * item.quantity).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="w-12 text-center text-lg">x{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                         <div className="flex-1 text-right text-xs text-muted-foreground">
                            <span>売: ¥{item.product.price.toLocaleString()}</span> / <span>原: ¥{item.product.costPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <CardFooter className="flex flex-col gap-4 mt-auto !p-6 bg-muted/50">
            <div className="w-full space-y-2 text-sm">
              <Separator />
               <div className="flex justify-between">
                  <span>機会損失額 (売価)</span>
                  <span className="text-destructive">¥{totalWastePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                  <span>廃棄合計額 (原価)</span>
                  <span>¥{totalWasteCost.toLocaleString()}</span>
              </div>
            </div>
            <Button className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground" size="lg" disabled={wasteList.length === 0 || wasteLoading} onClick={handleRecordWaste}>
               {wasteLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Trash2 className="mr-2 h-5 w-5"/>}
               廃棄を記録
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
