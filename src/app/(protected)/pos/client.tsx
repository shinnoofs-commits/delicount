
'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Plus, Minus, Trash2, Loader2, Sun, Cloud, CloudRain, Snowflake, MapPin, Info, Package } from 'lucide-react';
import { Product, Transaction, WasteEntry, WeatherType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useTransactions } from '@/contexts/transaction-context';
import { useProducts } from '@/contexts/product-context';
import { useStores } from '@/contexts/store-context';
import { useAdmin } from '@/hooks/useAdmin';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useStoreSelection } from '@/contexts/store-selection-context';

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

type CheckerTheme = 'sky' | 'amber' | 'emerald' | 'lavender' | 'none';

const CHECKER_THEMES: Record<CheckerTheme, {
  id: CheckerTheme;
  label: string;
  bgA: string;
  borderA: string;
  bgB: string;
  borderB: string;
  dotClass: string;
}> = {
  sky: {
    id: 'sky',
    label: 'スカイ',
    bgA: '#ffffff',
    borderA: '#cbd5e1',
    bgB: '#e0f2fe',
    borderB: '#7dd3fc',
    dotClass: 'bg-sky-400',
  },
  amber: {
    id: 'amber',
    label: '琥珀',
    bgA: '#ffffff',
    borderA: '#cbd5e1',
    bgB: '#fef3c7',
    borderB: '#fcd34d',
    dotClass: 'bg-amber-400',
  },
  emerald: {
    id: 'emerald',
    label: '若草',
    bgA: '#ffffff',
    borderA: '#cbd5e1',
    bgB: '#dcfce7',
    borderB: '#86efac',
    dotClass: 'bg-emerald-500',
  },
  lavender: {
    id: 'lavender',
    label: '藤色',
    bgA: '#ffffff',
    borderA: '#cbd5e1',
    bgB: '#ede9fe',
    borderB: '#c4b5fd',
    dotClass: 'bg-violet-400',
  },
  none: {
    id: 'none',
    label: 'オフ',
    bgA: '#ffffff',
    borderA: '#cbd5e1',
    bgB: '#ffffff',
    borderB: '#cbd5e1',
    dotClass: 'bg-slate-300',
  },
};

const CHECKER_THEME_LIST: { id: CheckerTheme; label: string; bgClass: string }[] = [
  { id: 'sky', label: 'スカイ', bgClass: 'bg-sky-400' },
  { id: 'amber', label: '琥珀', bgClass: 'bg-amber-400' },
  { id: 'emerald', label: '若草', bgClass: 'bg-emerald-500' },
  { id: 'lavender', label: '藤色', bgClass: 'bg-violet-400' },
  { id: 'none', label: 'オフ', bgClass: 'bg-slate-300' },
];

export default function PosClient() {
  const { wasteEntries, addWasteEntry, loading: wasteLoading, updateDailyWeather } = useTransactions();
  const { products: allProducts, loading: productsLoading } = useProducts();
  const { userStore, stores, loading: storesLoading } = useStores();
  const { isAdmin } = useAdmin();
  const { selectedStoreIds } = useStoreSelection();

  const activeStore = isAdmin ? stores.find(s => s.id === selectedStoreIds[0]) : userStore;

  const [selectedCategory, setSelectedCategory] = useState('全て');
  const [checkerTheme, setCheckerTheme] = useState<CheckerTheme>('sky');
  const activeCheckerConfig = CHECKER_THEMES[checkerTheme] || CHECKER_THEMES.sky;
  const [cartItems, setCartItems] = useState<WasteListItem[]>([]);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [isWeatherFixed, setIsWeatherFixed] = useState(false);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('pos_checker_theme') as CheckerTheme;
    if (saved && ['sky', 'amber', 'emerald', 'lavender', 'none'].includes(saved)) {
      setCheckerTheme(saved);
    }
  }, []);

  const handleThemeChange = (theme: CheckerTheme) => {
    setCheckerTheme(theme);
    localStorage.setItem('pos_checker_theme', theme);
  };

  // Double-submission prevention & Confirmation Dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const totalQuantity = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const totalWasteCost = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.product.costPrice * item.quantity, 0);
  }, [cartItems]);

  const totalSellingPrice = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.product.price || 0) * item.quantity, 0);
  }, [cartItems]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      setDate(new Date());
    }
  }, [isClient]);

  const activeProducts = useMemo(() => {
    if (!activeStore) return [];
    const filtered = allProducts.filter(p => p.isActive && p.storeId === activeStore.id);
    return filtered.sort((a, b) => {
      const catA = a.category || '未分類';
      const catB = b.category || '未分類';
      if (catA !== catB) {
        return catA.localeCompare(catB, 'ja-JP');
      }
      const codeA = String(a.productCode || '');
      const codeB = String(b.productCode || '');
      return codeA.localeCompare(codeB, 'ja-JP', { numeric: true, sensitivity: 'base' });
    });
  }, [allProducts, activeStore]);
  const categories = useMemo(() => ['全て', ...Array.from(new Set(activeProducts.map(p => p.category || '未分類')))], [activeProducts]);

  const interpretWeatherCode = (code: number): WeatherType => {
    if (code === 0) return 'sunny';
    if ([1, 2, 3, 45, 48].includes(code)) return 'cloudy';
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) return 'rainy';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snowy';
    return 'sunny';
  };

  const fetch2200Weather = useCallback(async (targetDate: Date) => {
    if (!activeStore) return;
    if (typeof window === 'undefined') return;

    const existingEntryWithWeather = wasteEntries.find(e =>
      e.storeId === activeStore.id &&
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
      const cityName = activeStore.name?.replace(/(店|支店|営業所)$/, '') || '';
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
  }, [activeStore, wasteEntries]);

  useEffect(() => {
    if (activeStore && date) fetch2200Weather(date);
  }, [fetch2200Weather, date, activeStore]);

  const handleRecordWaste = async () => {
    // 1. Synchronous lock to completely block rapid duplicate clicks/submits
    if (isSubmittingRef.current || isSubmitting) return;
    if (cartItems.length === 0 || !activeStore || !date) return;

    // 2. Lock immediately
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const currentCart = [...cartItems];
      const newWasteEntry: Omit<WasteEntry, 'id' | 'userId'> = {
        storeId: activeStore.id,
        date: date,
        weather: weather,
        items: currentCart.map(item => ({
          productId: item.product.id,
          productCode: item.product.productCode,
          name: item.product.name,
          quantity: item.quantity,
          costPrice: item.product.costPrice,
          unitPrice: item.product.price,
        })),
        totalWasteCost,
      };

      if (!isWeatherFixed) {
        await updateDailyWeather(activeStore.id, date, weather);
      }

      await addWasteEntry(newWasteEntry);
      
      // Clear cart immediately upon successful registration
      setCartItems([]);
      setIsConfirmOpen(false);
    } catch (error) {
      console.error('Failed to register waste:', error);
      toast({
        variant: 'destructive',
        title: '登録エラー',
        description: '廃棄データの登録に失敗しました。もう一度お試しください。',
      });
    } finally {
      // Small cooldown to prevent bounce clicks
      setTimeout(() => {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }, 500);
    }
  };



  if (isAdmin && selectedStoreIds.length !== 1) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Card className="w-full max-w-md text-center border-dashed border-2 bg-muted/20">
          <CardHeader><CardTitle>店舗を選択してください</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-muted-foreground font-bold text-sm">ヘッダーから廃棄登録を行う店舗を「1つ」だけ選択してください。</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (productsLoading || storesLoading || !isClient) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!activeStore) return <div className="flex items-center justify-center h-full"><Card className="w-full max-w-md text-center"><CardHeader><CardTitle>店舗が設定されていません</CardTitle></CardHeader></Card></div>;

  return (
    <div className="flex flex-col gap-4">

      <div className="grid flex-1 grid-cols-1 gap-4 items-start lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 justify-start">
              {categories.map(category => (
                <TabsTrigger key={category} value={category} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border text-xs">{category}</TabsTrigger>
              ))}
            </TabsList>

            {/* 市松模様カラーセレクター */}
            <div className="flex items-center gap-1 bg-white/95 border border-slate-200 rounded-lg p-1 shadow-xs ml-auto">
              <span className="font-bold text-slate-700 text-[11px] sm:text-xs flex items-center gap-1 px-1.5 py-1">
                <span className="inline-block w-2.5 h-2.5 rounded-xs border border-slate-300 bg-gradient-to-br from-white to-sky-300" />
                市松模様:
              </span>
              {CHECKER_THEME_LIST.map(t => {
                const isSelected = checkerTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleThemeChange(t.id);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      handleThemeChange(t.id);
                    }}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded text-[11px] sm:text-xs font-bold transition-all cursor-pointer touch-manipulation select-none min-h-[30px]",
                      isSelected
                        ? "bg-slate-900 text-white shadow-xs ring-2 ring-primary/40 ring-offset-1"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200"
                    )}
                    title={`${t.label}に切り替え`}
                  >
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 border border-black/10", t.bgClass)} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {categories.map(category => (
            <TabsContent value={category} key={category}>
              <div
                className={cn(
                  "pos-checker-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-2 pt-2",
                  `theme-checker-${checkerTheme}`
                )}
                style={{
                  '--pos-card-bg-a': activeCheckerConfig.bgA,
                  '--pos-card-border-a': activeCheckerConfig.borderA,
                  '--pos-card-bg-b': activeCheckerConfig.bgB,
                  '--pos-card-border-b': activeCheckerConfig.borderB,
                } as React.CSSProperties}
              >
                {(category === '全て' ? activeProducts : activeProducts.filter(p => (p.category || '未分類') === category))
                  .map(product => {
                    const cartItem = cartItems.find(i => i.product.id === product.id);
                    const quantity = cartItem?.quantity || 0;
                    return (
                      <Card
                        key={product.id}
                        data-selected={quantity > 0 ? "true" : "false"}
                        onClick={() => {
                          if (isSubmitting) return;
                          setCartItems(prev => {
                            const existing = prev.find(i => i.product.id === product.id);
                            if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
                            return [...prev, { product, quantity: 1 }];
                          });
                        }}
                        className={cn(
                          "pos-checker-card relative cursor-pointer text-center min-h-20 p-2 flex flex-col justify-center select-none rounded-lg border",
                          quantity > 0 && "ring-2 ring-sky-500 shadow-md font-bold"
                        )}
                      >
                        {quantity > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[11px] font-black rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center shadow-md animate-in zoom-in-75 z-10">
                            {quantity}
                          </span>
                        )}
                        <p className="font-bold text-[15px] sm:text-[16px] leading-tight text-slate-900 break-words line-clamp-2">
                          {product.name}
                        </p>
                        <p className="text-[15px] font-black text-slate-700 mt-1">
                          ¥{(product.price || 0).toLocaleString()}
                        </p>
                      </Card>
                    );
                  })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <div className="lg:col-span-1 sticky top-6">
        <Card className="flex flex-col h-full bg-slate-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-lg">
              廃棄入力リスト
            </CardTitle>
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
                  地域: {activeStore?.name?.replace(/(店|支店|営業所)$/, '') || '-'}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[400px] py-2">
            {cartItems.length === 0 ? <p className="text-center text-muted-foreground py-10 text-sm italic">追加してください</p> : (
              <div className="space-y-3">
                {cartItems.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between bg-white p-2 rounded-md border shadow-sm">
                    <span className="text-sm font-semibold truncate flex-1">{item.product.name}</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={isSubmitting} onClick={() => setCartItems(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i).filter(i => i.quantity > 0))}><Minus className="h-3 w-3" /></Button>
                      <span className="w-5 text-center font-bold text-sm">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={isSubmitting} onClick={() => setCartItems(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: i.quantity + 1 } : i))}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2 bg-muted/50 p-6">
            <div className="w-full flex justify-between font-black text-[13px] opacity-70">
              <span>合計(原価)</span><span>¥{totalWasteCost.toLocaleString()}</span>
            </div>
            <div className="w-full flex justify-between font-black text-lg">
              <span>合計(売価)</span><span>¥{totalSellingPrice.toLocaleString()}</span>
            </div>
            <Button
              className="w-full bg-destructive hover:bg-destructive/90 mt-2 font-bold text-base h-12 shadow-sm transition-all"
              size="lg"
              disabled={cartItems.length === 0 || wasteLoading || isSubmitting}
              onClick={() => setIsConfirmOpen(true)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  登録処理中...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-5 w-5" />
                  廃棄を登録
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
      </div>

      {/* 廃棄登録 確定確認ダイアログ（二重確定・誤登録防止） */}
      <AlertDialog open={isConfirmOpen} onOpenChange={(open) => !isSubmitting && setIsConfirmOpen(open)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base font-black text-slate-900">
              <Trash2 className="h-5 w-5 text-destructive" />
              廃棄登録の確定確認
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-xs text-slate-700">
                <p className="font-medium text-slate-600">
                  以下の内容で廃棄データを確定し、登録します。内容をご確認ください。
                </p>
                <div className="bg-slate-100/80 p-3 rounded-lg border border-slate-200/80 space-y-1.5 font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">登録店舗:</span>
                    <span className="font-bold text-slate-900">{activeStore?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">廃棄日:</span>
                    <span className="font-bold text-slate-900">{date ? format(date, "yyyy年M月d日 (E)", { locale: ja }) : "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">登録品目数:</span>
                    <span className="font-bold text-slate-900">{cartItems.length} 品目 (合計 {totalQuantity} 個)</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-200">
                    <span className="text-slate-500 font-bold">合計金額 (売価):</span>
                    <span className="font-black text-slate-900 text-sm">¥{totalSellingPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">合計原価 (ロス額):</span>
                    <span className="font-black text-destructive text-sm">¥{totalWasteCost.toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  ※ 二重確定を防ぐため、確定完了と同時にリストは自動クリアされボタンは無効化されます。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
            <AlertDialogCancel disabled={isSubmitting} className="font-bold">
              キャンセル
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isSubmitting || cartItems.length === 0}
              onClick={handleRecordWaste}
              className="font-black"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  確定処理中...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  確定して登録する
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
