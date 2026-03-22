
'use client';

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Loader2, CalendarDays, Sun, Filter, PieChart, Package, Cloud, CloudRain, Snowflake, Maximize2, ClipboardList } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, getDay, addDays } from "date-fns"
import { ja } from "date-fns/locale"
import holiday_jp from '@holiday-jp/holiday_jp';
import { DateRange } from "react-day-picker"
import { useTransactions } from "@/contexts/transaction-context";
import { useProducts } from "@/contexts/product-context";
import { useProduction } from "@/contexts/production-context";
import { useAdmin } from "@/hooks/use-admin";
import { StoreSelector } from "@/components/ui/store-selector";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const dayLabels = ['月', '火', '水', '木', '金', '土', '日', '祝'];
const dayOrder = [1, 2, 3, 4, 5, 6, 0, 7];
const dayMap: any[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'holiday'];

const weatherLabels: Record<string, string> = {
  sunny: '晴れ',
  cloudy: '曇り',
  rainy: '雨',
  snowy: '雪',
};

const weatherIcons: Record<string, any> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: Snowflake,
};

function actualDowLabel(dow: number) {
  const labels = ['日', '月', '火', '水', '木', '金', '土', '祝'];
  return labels[dow];
}

export default function ABCAnalysisPage() {
  const { wasteEntries, loading: wasteLoading } = useTransactions();
  const { productionEntries, loading: productionLoading } = useProduction();
  const { products, loading: productsLoading } = useProducts();
  const { isAdmin } = useAdmin();

  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [selectedCategoryForDetail, setSelectedCategoryForDetail] = useState<string | null>(null);
  const [isFullScreenDaily, setIsFullScreenDaily] = useState(false);

  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  const validDates = useMemo(() => {
    if (!date || !date.from) return [];
    const fromDate = startOfDay(date.from);
    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
    const dates: string[] = [];
    let current = fromDate;
    while (current <= toDate) {
      dates.push(format(current, 'yyyy-MM-dd'));
      current = addDays(current, 1);
    }
    return dates;
  }, [date]);

  const analysisData = useMemo(() => {
    if (wasteLoading || productsLoading || productionLoading || validDates.length === 0) return null;

    const dateSet = new Set(validDates);
    const productStats = new Map<string, any>();
    const dayStats: Record<number, { waste: number; production: number }> = {};
    const weatherStats: Record<string, { waste: number; production: number }> = {};
    const matrixStats: Record<string, { waste: number; production: number }> = {};
    const categoryStats: Record<string, { waste: number; production: number }> = {};

    for (let i = 0; i < 8; i++) dayStats[i] = { waste: 0, production: 0 };
    Object.keys(weatherLabels).forEach(w => weatherStats[w] = { waste: 0, production: 0 });

    const dateToWeather = new Map<string, string>();
    wasteEntries.forEach(entry => {
      const dateKey = format(startOfDay(entry.date), 'yyyy-MM-dd');
      if (entry.weather && dateSet.has(dateKey)) {
        dateToWeather.set(dateKey, entry.weather);
      }
    });

    const getOrCreateStats = (productId: string, product: any) => {
      let stats = productStats.get(productId);
      if (!stats) {
        stats = {
          id: productId,
          name: product.name,
          category: product.category,
          price: product.price,
          waste: 0,
          production: 0,
          wasteDow: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 },
          prodDow: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 }
        };
        productStats.set(productId, stats);
      }
      return stats;
    };

    // Calculate Final Production = Planned + Corrections
    validDates.forEach(dateKey => {
      const entryDate = new Date(dateKey);
      const isHoliday = holiday_jp.isHoliday(entryDate);
      const dow = isHoliday ? 7 : getDay(entryDate);
      const weather = dateToWeather.get(dateKey) || 'sunny';
      const dowKey = isHoliday ? 'holiday' : dayMap[dow];

      products.forEach(product => {
        if (selectedCategory !== 'all' && product.category !== selectedCategory) return;

        const dailyProduction = weather === 'rainy' ? product.dailyProductionRainy : product.dailyProductionSunny;
        const planned = (isHoliday && dailyProduction?.holiday !== undefined)
            ? dailyProduction.holiday
            : (dailyProduction as any)?.[dowKey] || 0;

        if (planned > 0) {
          const stats = getOrCreateStats(product.id, product);
          stats.production += planned;
          stats.prodDow[dow] += planned;
          dayStats[dow].production += planned;
          weatherStats[weather].production += planned;
          
          const matrixKey = `${dow}-${weather}`;
          if (!matrixStats[matrixKey]) matrixStats[matrixKey] = { waste: 0, production: 0 };
          matrixStats[matrixKey].production += planned;

          if (!categoryStats[product.category]) categoryStats[product.category] = { waste: 0, production: 0 };
          categoryStats[product.category].production += planned;
        }
      });
    });

    // Add corrections from productionEntries
    productionEntries.filter(entry => dateSet.has(format(startOfDay(entry.date), 'yyyy-MM-dd'))).forEach(entry => {
      const entryDate = new Date(entry.date);
      const isHoliday = holiday_jp.isHoliday(entryDate);
      const dow = isHoliday ? 7 : getDay(entryDate);
      const weather = dateToWeather.get(format(startOfDay(entryDate), 'yyyy-MM-dd')) || 'sunny';
      
      entry.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product || (selectedCategory !== 'all' && product.category !== selectedCategory)) return;

        const stats = getOrCreateStats(item.productId, product);
        stats.production += item.quantity;
        stats.prodDow[dow] += item.quantity;
        dayStats[dow].production += item.quantity;
        
        weatherStats[weather].production += item.quantity;
        const matrixKey = `${dow}-${weather}`;
        if (!matrixStats[matrixKey]) matrixStats[matrixKey] = { waste: 0, production: 0 };
        matrixStats[matrixKey].production += item.quantity;
        
        if (!categoryStats[product.category]) categoryStats[product.category] = { waste: 0, production: 0 };
        categoryStats[product.category].production += item.quantity;
      });
    });

    // Add waste stats
    wasteEntries.filter(entry => dateSet.has(format(startOfDay(entry.date), 'yyyy-MM-dd'))).forEach(entry => {
      const entryDate = new Date(entry.date);
      const isHoliday = holiday_jp.isHoliday(entryDate);
      const dow = isHoliday ? 7 : getDay(entryDate);
      const weather = entry.weather || 'sunny';
      
      entry.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product || (selectedCategory !== 'all' && product.category !== selectedCategory)) return;

        const stats = productStats.get(item.productId);
        if (stats) {
          stats.waste += item.quantity;
          stats.wasteDow[dow] += item.quantity;
        }
        dayStats[dow].waste += item.quantity;
        
        weatherStats[weather].waste += item.quantity;
        const matrixKey = `${dow}-${weather}`;
        if (!matrixStats[matrixKey]) matrixStats[matrixKey] = { waste: 0, production: 0 };
        matrixStats[matrixKey].waste += item.quantity;
        
        if (!categoryStats[product.category]) categoryStats[product.category] = { waste: 0, production: 0 };
        categoryStats[product.category].waste += item.quantity;
      });
    });

    return {
      products: Array.from(productStats.values()),
      dayStats,
      weatherStats,
      matrixStats,
      categoryStats,
      totalWaste: Array.from(productStats.values()).reduce((sum, p) => sum + p.waste, 0),
      totalProduction: Array.from(productStats.values()).reduce((sum, p) => sum + p.production, 0)
    };
  }, [wasteEntries, productionEntries, products, validDates, wasteLoading, productionLoading, productsLoading, selectedCategory]);

  const sortedCategoryStats = useMemo(() => {
    if (!analysisData) return [];
    return Object.entries(analysisData.categoryStats)
      .map(([cat, stats]) => {
        const s = stats as { waste: number; production: number };
        const rate = s.production > 0 ? (s.waste / s.production) * 100 : 0;
        return { cat, ...s, rate };
      })
      .sort((a, b) => b.rate - a.rate);
  }, [analysisData]);

  const overallWasteRate = useMemo(() => {
    if (!analysisData || analysisData.totalProduction <= 0) return 0;
    return (analysisData.totalWaste / analysisData.totalProduction) * 100;
  }, [analysisData]);

  const renderDailyGrid = (isFull: boolean = false) => {
    if (!analysisData) return null;
    return (
      <div className={cn(
        "px-1",
        isFull 
          ? "grid grid-cols-4 gap-2 pb-6 w-full" 
          : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
      )}>
        {dayLabels.map((label, i) => {
          const actualDow = dayOrder[i];
          const dowProducts = analysisData.products
            .filter(p => (p.prodDow[actualDow] || 0) > 0 || (p.wasteDow[actualDow] || 0) > 0)
            .sort((a, b) => {
              const rateA = (a.prodDow[actualDow] || 0) > 0 ? (a.wasteDow[actualDow] / a.prodDow[actualDow]) : 0;
              const rateB = (b.prodDow[actualDow] || 0) > 0 ? (b.wasteDow[actualDow] / b.prodDow[actualDow]) : 0;
              return rateB - rateA;
            });
          
          const stats = analysisData.dayStats[actualDow];
          const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;

          return (
            <Card key={label} onClick={() => !isFull && setSelectedDayIdx(actualDow)} className={cn(
              "border bg-background shadow-sm overflow-hidden flex flex-col transition-all",
              !isFull && "hover:border-primary/50 cursor-pointer h-[500px]",
              isFull && "h-[420px] border-2 shadow-md w-full"
            )}>
              <CardHeader className={cn(
                "p-3 py-2 border-b shrink-0",
                (actualDow === 0 || actualDow === 7) ? "bg-destructive/10" : (actualDow === 6 ? "bg-blue-50" : "bg-muted/30")
              )}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={(actualDow === 0 || actualDow === 7) ? "destructive" : (actualDow === 6 ? "default" : "outline")} className="h-8 w-8 rounded-full flex items-center justify-center p-0 font-black text-[14px]">
                      {label}
                    </Badge>
                    <span className="text-[12px] font-bold text-muted-foreground">{actualDowLabel(actualDow)}曜日</span>
                  </div>
                  <div className={cn("text-[20px] font-black", rate > 15 ? "text-destructive" : "text-blue-900")}>
                    {rate.toFixed(1)}%
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black opacity-80 border-t pt-1">
                   <span>製造計: {stats.production}</span>
                   <span className="text-destructive">廃棄計: {stats.waste}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto overflow-x-hidden">
                {dowProducts.length > 0 ? (
                  <Table className="w-full table-fixed">
                    <TableHeader className="bg-muted/20 sticky top-0 z-10">
                      <TableRow className="h-8">
                        <TableHead className="h-8 p-1 px-2 text-[10px] font-black">商品実績</TableHead>
                        <TableHead className="h-8 p-1 px-2 text-[10px] font-black text-right w-[110px]">廃棄率</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dowProducts.map((p) => {
                        const pWaste = p.wasteDow[actualDow] || 0;
                        const pProd = p.prodDow[actualDow] || 0;
                        const pRate = pProd > 0 ? (pWaste / pProd) * 100 : 0;
                        return (
                          <TableRow key={p.id} className="h-16 hover:bg-muted/5 border-b last:border-0">
                            <TableCell className="p-2 px-2">
                              <p className="text-[16px] font-black leading-tight truncate w-full">{p.name}</p>
                              <div className="text-[16px] font-black mt-1 flex items-center gap-2 tabular-nums">
                                <span className="text-muted-foreground/80 shrink-0">製:{pProd}</span>
                                <span className="text-destructive shrink-0">廃:{pWaste}</span>
                              </div>
                            </TableCell>
                            <TableCell className="p-2 px-2 text-right">
                              <p className={cn("text-[26px] font-black leading-none tabular-nums", pRate > 15 ? "text-destructive" : "text-blue-900")}>
                                {pRate.toFixed(1)}%
                              </p>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-30 py-10">
                    <ClipboardList className="h-10 w-10 mb-2" />
                    <p className="text-[12px] font-black">データなし</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (wasteLoading || productsLoading || productionLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 h-full overflow-hidden">
      <Card className="shrink-0 border-none shadow-none bg-muted/40">
        <CardContent className="p-1 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Label className="text-[10px] font-black uppercase opacity-70">店舗</Label>
            {isAdmin ? <StoreSelector /> : <Badge variant="outline" className="bg-background h-6 px-2 text-[10px]">自店舗</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-[10px] font-black uppercase opacity-70">期間</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 text-[10px] font-medium bg-background">
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {date?.from ? (date.to ? `${format(date.from, "M/d")} - ${format(date.to, "M/d")}` : format(date.from, "M/d")) : "選択"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="range" selected={date} onSelect={setDate} locale={ja} /></PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-[10px] font-black uppercase opacity-70">カテゴリー</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-6 text-[10px] w-[120px] bg-background">
                <SelectValue placeholder="全カテゴリー" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat} className="text-[10px]">{cat === 'all' ? '全カテゴリー' : cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!analysisData || (analysisData.totalProduction <= 0 && analysisData.totalWaste === 0) ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed m-4">
          <PieChart className="h-10 w-10 mb-2 opacity-20" />
          <p className="font-bold">対象期間にデータがありません</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-1 min-h-0">
          <div className="grid grid-cols-3 gap-1 shrink-0 px-1">
            <Card className="bg-background border-l-[3px] border-l-blue-400 h-14">
              <CardContent className="p-2">
                <p className="text-[10px] text-muted-foreground font-black uppercase">総製造数</p>
                <div className="text-[22px] font-black">{analysisData.totalProduction.toLocaleString()} <span className="text-[12px] font-normal">個</span></div>
              </CardContent>
            </Card>
            <Card className="bg-background border-l-[3px] border-l-destructive h-14">
              <CardContent className="p-2">
                <p className="text-[10px] text-muted-foreground font-black uppercase">総廃棄数</p>
                <div className="text-[22px] font-black text-destructive">{analysisData.totalWaste.toLocaleString()} <span className="text-[12px] font-normal">個</span></div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-l-[3px] border-l-blue-900 h-14 shadow-sm">
              <CardContent className="p-2">
                <p className="text-[10px] text-blue-900 font-black uppercase">平均廃棄率</p>
                <div className="text-[28px] font-black text-blue-900 leading-none">{overallWasteRate.toFixed(1)}<span className="text-[14px] font-normal">%</span></div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-1 px-1 shrink-0">
            <Card className="lg:col-span-8 border-none shadow-none bg-background">
              <CardHeader className="p-1 pb-0">
                <CardTitle className="text-[9px] text-muted-foreground font-black uppercase flex items-center">
                  <CalendarDays className="h-2.5 w-2.5 mr-1 text-primary" />曜日別 廃棄率
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1">
                <div className="grid grid-cols-4 lg:grid-cols-8 gap-1">
                  {dayLabels.map((label, i) => {
                    const actualDow = dayOrder[i];
                    const stats = analysisData.dayStats[actualDow];
                    const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                    const isAlert = rate > 15;
                    let borderColor = "border-slate-200";
                    let labelColor = "text-muted-foreground";
                    if (actualDow === 6) { borderColor = "border-blue-400"; labelColor = "text-blue-500"; }
                    if (actualDow === 0 || actualDow === 7) { borderColor = "border-destructive/60"; labelColor = "text-destructive"; }
                    return (
                      <div key={label} onClick={() => setSelectedDayIdx(actualDow)} className={cn(
                        "flex items-center justify-between px-2 h-9 lg:h-10 rounded-full transition-all cursor-pointer hover:bg-muted/80 bg-background border shadow-sm",
                        borderColor,
                        isAlert && "bg-destructive/5 border-destructive border-2"
                      )}>
                        <span className={cn("text-[12px] font-black shrink-0", labelColor)}>{label}</span>
                        <div className={cn("text-[16px] font-black tabular-nums leading-none flex items-baseline gap-0.5", isAlert ? "text-destructive" : "text-blue-900")}>
                          {rate.toFixed(1)}<span className="text-[9px] font-normal">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4 border-none shadow-none bg-background">
              <CardHeader className="p-1 pb-0">
                <CardTitle className="text-[9px] text-muted-foreground font-black uppercase flex items-center">
                  <Sun className="h-2.5 w-2.5 mr-1 text-orange-500" />天気別 廃棄率
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  {Object.entries(weatherLabels).map(([key, label]) => {
                    const stats = analysisData.weatherStats[key] || { waste: 0, production: 0 };
                    const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                    const Icon = weatherIcons[key];
                    const isAlert = rate > 15;
                    return (
                      <div key={key} className={cn(
                        "flex items-center justify-between px-2 h-9 lg:h-10 rounded-full bg-background border border-orange-400/50 shadow-sm",
                        isAlert && "bg-destructive/5 border-destructive border-2"
                      )}>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Icon className={cn("h-3.5 w-3.5", isAlert ? "text-destructive" : "text-orange-500")} />
                          <span className="text-[12px] font-black text-muted-foreground">{label.charAt(0)}</span>
                        </div>
                        <div className={cn("text-[16px] font-black tabular-nums leading-none flex items-baseline gap-0.5", isAlert ? "text-destructive" : "text-orange-600")}>
                          {rate.toFixed(1)}<span className="text-[9px] font-normal">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-4 h-9 p-1 bg-muted/60 mx-1">
              <TabsTrigger value="overview" className="text-[13px] font-black uppercase">カテゴリー別</TabsTrigger>
              <TabsTrigger value="product" className="text-[13px] font-black uppercase">商品別実績</TabsTrigger>
              <TabsTrigger value="daily" className="text-[13px] font-black uppercase">曜日別一覧</TabsTrigger>
              <TabsTrigger value="cross" className="text-[13px] font-black uppercase">クロス分析</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-1 px-1">
              <TabsContent value="overview" className="m-0 space-y-1 pb-4">
                <Card className="border-none shadow-none overflow-hidden bg-background">
                  <CardHeader className="p-2 bg-primary/5 pb-1 border-b">
                    <CardTitle className="text-[12px] font-black flex items-center">
                      <Filter className="h-3.5 w-3.5 mr-2 text-primary" />
                      カテゴリー別サマリー (行タップで詳細)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="h-10">
                          <TableHead className="h-10 text-[18px] font-black px-4 text-center">カテゴリー</TableHead>
                          <TableHead className="h-10 text-[18px] font-black px-4 text-right">製造</TableHead>
                          <TableHead className="h-10 text-[18px] font-black px-4 text-right">廃棄</TableHead>
                          <TableHead className="h-10 text-[18px] font-black px-4 text-right">廃棄率</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedCategoryStats.map((item) => (
                          <TableRow 
                            key={item.cat} 
                            className="h-16 hover:bg-primary/5 transition-colors cursor-pointer"
                            onClick={() => setSelectedCategoryForDetail(item.cat)}
                          >
                            <TableCell className="px-4 py-2 text-[22px] font-black">{item.cat}</TableCell>
                            <TableCell className="px-4 py-2 text-[20px] text-right font-bold tabular-nums">{item.production.toLocaleString()}</TableCell>
                            <TableCell className="px-4 py-2 text-[20px] text-right text-destructive font-black tabular-nums">{item.waste.toLocaleString()}</TableCell>
                            <TableCell className="px-4 py-2 text-right">
                              <span className={cn("text-[28px] font-black tabular-nums", item.rate > 15 ? "text-destructive" : "text-blue-900")}>{item.rate.toFixed(1)}%</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="product" className="m-0 pb-4">
                <Card className="border-none shadow-none bg-background">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/30 sticky top-0 z-20">
                        <TableRow className="h-10">
                          <TableHead className="h-10 text-[18px] font-black px-4 text-center">商品名 / 分類</TableHead>
                          <TableHead className="h-10 text-[18px] font-black px-4 text-right">廃棄 / 製造</TableHead>
                          <TableHead className="h-10 text-[18px] font-black px-4 text-right">廃棄率</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisData.products.sort((a,b) => {
                          const rA = a.production > 0 ? a.waste / a.production : 0;
                          const rB = b.production > 0 ? b.waste / b.production : 0;
                          return rB - rA;
                        }).map((p) => {
                          const wasteRate = p.production > 0 ? (p.waste / p.production) * 100 : 0;
                          return (
                            <TableRow key={p.id} className="h-20 hover:bg-muted/10 border-b">
                              <TableCell className="px-4 py-2">
                                <div className="flex flex-col">
                                  <span className="text-[22px] font-black truncate max-w-[300px] leading-tight">{p.name}</span>
                                  <span className="text-[12px] text-muted-foreground uppercase font-black">{p.category}</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-2 text-right">
                                <div className="text-[20px] font-black text-destructive tabular-nums">{p.waste} <span className="text-[16px] font-normal opacity-50 text-foreground">/ {p.production}</span></div>
                              </TableCell>
                              <TableCell className="px-4 py-2 text-right">
                                <span className={cn("text-[26px] font-black tabular-nums", wasteRate > 15 ? "text-destructive" : "text-blue-900")}>{wasteRate.toFixed(1)}%</span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="daily" className="m-0 space-y-4 pb-4">
                <div className="flex justify-end px-1">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={() => setIsFullScreenDaily(true)} 
                    className="h-12 border-2 border-primary font-black text-primary hover:bg-primary hover:text-white transition-all shadow-md"
                  >
                    <Maximize2 className="h-5 w-5 mr-2" />
                    全画面一覧比較
                  </Button>
                </div>
                {renderDailyGrid(false)}
              </TabsContent>

              <TabsContent value="cross" className="m-0 pb-4">
                <Card className="border-none shadow-none overflow-hidden bg-background">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/60">
                        <TableRow className="h-12">
                          <TableHead className="h-12 p-2 text-[18px] font-black border-r text-center w-24">曜\天</TableHead>
                          {Object.entries(weatherLabels).map(([_, label]) => <TableHead key={label} className="h-12 text-[18px] text-center font-black p-2">{label}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayLabels.map((label, i) => {
                          const actualDow = dayOrder[i];
                          return (
                            <TableRow key={label} className="h-24">
                              <TableHead className={cn("h-24 p-2 text-[22px] font-black border-r text-center", (actualDow === 0 || actualDow === 7) ? "text-destructive" : (actualDow === 6 ? "text-blue-500" : ""))}>
                                {label}
                              </TableHead>
                              {Object.keys(weatherLabels).map(weatherKey => {
                                const stats = analysisData.matrixStats[`${actualDow}-${weatherKey}`] || { waste: 0, production: 0 };
                                const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                                return (
                                  <TableCell key={weatherKey} className={cn("text-center p-2 border-r last:border-r-0", rate > 20 ? "bg-destructive/5" : (rate > 10 ? "bg-orange-50/50" : ""))}>
                                    {stats.production > 0 ? (
                                      <div className="flex flex-col items-center leading-none">
                                        <span className={cn("text-[26px] font-black tabular-nums", rate > 15 ? "text-destructive" : "text-blue-900")}>{rate.toFixed(1)}%</span>
                                        <span className="text-[14px] text-muted-foreground font-black opacity-70 mt-1">{stats.waste} / {stats.production}</span>
                                      </div>
                                    ) : <span className="text-muted-foreground text-[18px] opacity-20">-</span>}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          <Dialog open={isFullScreenDaily} onOpenChange={setIsFullScreenDaily}>
            <DialogContent className="max-w-[98vw] h-[95vh] flex flex-col p-4 bg-muted/5 overflow-hidden">
              <DialogHeader className="mb-2 shrink-0">
                <DialogTitle className="text-2xl font-black">全曜日実績比較（4×2グリッド俯瞰）</DialogTitle>
                <DialogDescription className="text-sm font-bold text-muted-foreground">
                  全8曜日のデータを1画面に集約。各カードは廃棄率が高い順に並び、上位4件までが固定表示されます。
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto mt-2 overflow-x-hidden">
                {renderDailyGrid(true)}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={selectedDayIdx !== null} onOpenChange={(open) => !open && setSelectedDayIdx(null)}>
            <DialogContent className="max-w-[550px] max-h-[90vh] flex flex-col p-4">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black flex items-center">
                  <CalendarDays className="mr-3 h-7 w-7 text-blue-900" />
                  {selectedDayIdx !== null && actualDowLabel(selectedDayIdx)}曜日の詳細分析
                </DialogTitle>
                <DialogDescription className="text-sm font-bold">
                  この曜日の天候別廃棄率と、具体的な廃棄商品（廃棄率順）です。
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-auto mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(weatherLabels).map(([weatherKey, label]) => {
                    const stats = (selectedDayIdx !== null && analysisData?.matrixStats[`${selectedDayIdx}-${weatherKey}`]) || { waste: 0, production: 0 };
                    const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                    const isAlert = rate > 15;
                    return (
                      <div key={weatherKey} className={cn(
                        "flex items-center justify-between p-3 rounded-xl border-2 shadow-sm transition-all bg-background",
                        isAlert ? "border-destructive/40" : "border-orange-400/30"
                      )}>
                        <div className="flex flex-col">
                           <span className="text-[12px] font-black text-muted-foreground">{label}</span>
                           <span className="text-[10px] text-muted-foreground font-bold">廃棄率</span>
                        </div>
                        <div className={cn("text-[22px] font-black tabular-nums", isAlert ? "text-destructive" : "text-blue-900")}>
                          {rate.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Separator className="h-0.5" />
                <div className="space-y-2">
                  <Label className="text-[14px] font-black text-muted-foreground uppercase flex items-center gap-2">
                    <Package className="h-4 w-4" /> 廃棄商品リスト (廃棄率順)
                  </Label>
                  <div className="border rounded-xl overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="h-10 text-[12px] font-black">商品名</TableHead>
                          <TableHead className="h-10 text-[12px] font-black text-right">廃棄率 (個数)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDayIdx !== null && analysisData?.products
                          .filter(p => (p.wasteDow[selectedDayIdx] || 0) > 0 || (p.prodDow[selectedDayIdx] || 0) > 0)
                          .sort((a, b) => {
                            const rA = a.prodDow[selectedDayIdx] > 0 ? a.wasteDow[selectedDayIdx] / a.prodDow[selectedDayIdx] : 0;
                            const rB = b.prodDow[selectedDayIdx] > 0 ? b.wasteDow[selectedDayIdx] / b.prodDow[selectedDayIdx] : 0;
                            return rB - rA;
                          })
                          .map(p => {
                            const pWaste = p.wasteDow[selectedDayIdx] || 0;
                            const pProd = p.prodDow[selectedDayIdx] || 0;
                            const pRate = pProd > 0 ? (pWaste / pProd) * 100 : 0;
                            return (
                              <TableRow key={p.id} className="h-14">
                                <TableCell className="py-2 px-4 text-[18px] font-black leading-tight">{p.name}</TableCell>
                                <TableCell className="py-2 px-4 text-right">
                                  <div className={cn("font-black text-[22px] tabular-nums leading-none", pRate > 15 ? "text-destructive" : "text-blue-900")}>
                                    {pRate.toFixed(1)}%
                                  </div>
                                  <div className="text-[11px] text-muted-foreground font-bold mt-1">({pWaste} / {pProd})</div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        }
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!selectedCategoryForDetail} onOpenChange={(open) => !open && setSelectedCategoryForDetail(null)}>
            <DialogContent className="max-w-[550px] max-h-[85vh] flex flex-col p-4">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">{selectedCategoryForDetail} カテゴリー詳細</DialogTitle>
                <DialogDescription className="text-sm font-bold">
                  廃棄数と機会損失（売価合計）です。これだけの売上チャンスを逃しています。
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-auto mt-6">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="h-10">
                      <TableHead className="font-black text-[13px]">商品名</TableHead>
                      <TableHead className="text-right font-black text-[13px]">廃棄数</TableHead>
                      <TableHead className="text-right font-black text-[13px]">製造数</TableHead>
                      <TableHead className="text-right font-black text-[13px]">廃棄率</TableHead>
                      <TableHead className="text-right font-black text-[13px]">機会損失</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisData.products
                      .filter(p => p.category === selectedCategoryForDetail)
                      .sort((a,b) => b.waste - a.waste)
                      .map(p => {
                        const rate = p.production > 0 ? (p.waste / p.production) * 100 : 0;
                        return (
                          <TableRow key={p.id} className="h-16 border-b">
                            <TableCell className="font-black py-2 text-[18px] leading-tight">{p.name}</TableCell>
                            <TableCell className="text-right text-destructive font-black py-2 text-[20px] tabular-nums">{p.waste}</TableCell>
                            <TableCell className="text-right font-bold py-2 text-[20px] tabular-nums">{p.production}</TableCell>
                            <TableCell className="text-right py-2">
                              <span className={cn("text-[20px] font-black tabular-nums", rate > 15 ? "text-destructive" : "text-blue-900")}>
                                {rate.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-black text-blue-900 py-2 text-[20px] tabular-nums">
                              ¥{(p.waste * (p.price || 0)).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    }
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
