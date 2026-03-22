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
import { Calendar as CalendarIcon, Loader2, CalendarDays, Sun, Filter, PieChart, Package, Cloud, CloudRain, Snowflake, TrendingDown, ClipboardList, Maximize2 } from 'lucide-react';
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

// 曜日ラベル（月曜開始）
const dayLabels = ['月', '火', '水', '木', '金', '土', '日', '祝'];
const dayOrder = [1, 2, 3, 4, 5, 6, 0, 7];

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

    productionEntries.filter(entry => dateSet.has(format(startOfDay(entry.date), 'yyyy-MM-dd'))).forEach(entry => {
      const entryDate = new Date(entry.date);
      const isHoliday = holiday_jp.isHoliday(entryDate);
      const dow = isHoliday ? 7 : getDay(entryDate);
      const weather = dateToWeather.get(format(startOfDay(entryDate), 'yyyy-MM-dd')) || 'unknown';
      
      entry.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product || (selectedCategory !== 'all' && product.category !== selectedCategory)) return;

        const stats = productStats.get(item.productId) || {
          id: item.productId,
          name: item.name,
          category: product.category,
          price: product.price,
          waste: 0,
          production: 0,
          wasteDow: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 },
          prodDow: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 }
        };
        stats.production += item.quantity;
        stats.prodDow[dow] += item.quantity;
        productStats.set(item.productId, stats);

        dayStats[dow].production += item.quantity;
        if (weather !== 'unknown') {
          weatherStats[weather].production += item.quantity;
          const matrixKey = `${dow}-${weather}`;
          if (!matrixStats[matrixKey]) matrixStats[matrixKey] = { waste: 0, production: 0 };
          matrixStats[matrixKey].production += item.quantity;
        }
        if (!categoryStats[product.category]) categoryStats[product.category] = { waste: 0, production: 0 };
        categoryStats[product.category].production += item.quantity;
      });
    });

    wasteEntries.filter(entry => dateSet.has(format(startOfDay(entry.date), 'yyyy-MM-dd'))).forEach(entry => {
      const entryDate = new Date(entry.date);
      const isHoliday = holiday_jp.isHoliday(entryDate);
      const dow = isHoliday ? 7 : getDay(entryDate);
      const weather = entry.weather || 'unknown';
      
      entry.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product || (selectedCategory !== 'all' && product.category !== selectedCategory)) return;

        const stats = productStats.get(item.productId);
        if (stats) {
          stats.waste += item.quantity;
          stats.wasteDow[dow] += item.quantity;
        }
        
        dayStats[dow].waste += item.quantity;
        if (weather !== 'unknown') {
          weatherStats[weather].waste += item.quantity;
          const matrixKey = `${dow}-${weather}`;
          if (!matrixStats[matrixKey]) matrixStats[matrixKey] = { waste: 0, production: 0 };
          matrixStats[matrixKey].waste += item.quantity;
        }
        if (!categoryStats[product.category]) categoryStats[product.category] = { waste: 0, production: 0 };
        categoryStats[product.category].waste += item.quantity;
      });
    });

    return {
      products: Array.from(productStats.values()).sort((a, b) => b.waste - a.waste),
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
    if (!analysisData || analysisData.totalProduction === 0) return 0;
    return (analysisData.totalWaste / analysisData.totalProduction) * 100;
  }, [analysisData]);

  if (wasteLoading || productsLoading || productionLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const renderDailyGrid = (isFull: boolean = false) => {
    if (!analysisData) return null;
    return (
      <div className={cn(
        "grid gap-4 px-1",
        isFull ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
      )}>
        {dayLabels.map((label, i) => {
          const actualDow = dayOrder[i];
          const dowProducts = analysisData.products
            .filter(p => (p.prodDow[actualDow] || 0) > 0 || (p.wasteDow[actualDow] || 0) > 0)
            .sort((a, b) => b.wasteDow[actualDow] - a.wasteDow[actualDow]);
          
          const stats = analysisData.dayStats[actualDow];
          const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;

          return (
            <Card key={label} onClick={() => !isFull && setSelectedDayIdx(actualDow)} className={cn(
              "border bg-background shadow-sm overflow-hidden flex flex-col transition-all",
              !isFull && "hover:border-primary/50 cursor-pointer h-[400px]",
              isFull && "h-auto"
            )}>
              <CardHeader className={cn(
                "p-3 py-2 border-b shrink-0",
                (actualDow === 0 || actualDow === 7) ? "bg-destructive/5" : (actualDow === 6 ? "bg-blue-50" : "bg-muted/30")
              )}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={(actualDow === 0 || actualDow === 7) ? "destructive" : (actualDow === 6 ? "default" : "outline")} className="h-7 w-7 rounded-full flex items-center justify-center p-0 font-black text-[14px]">
                      {label}
                    </Badge>
                    <span className="text-[12px] font-bold text-muted-foreground">{actualDowLabel(actualDow)}曜日</span>
                  </div>
                  <div className={cn("text-[16px] font-black", rate > 15 ? "text-destructive" : "text-blue-900")}>
                    {rate.toFixed(1)}%
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold opacity-70">
                   <span>製造: {stats.production.toLocaleString()}個</span>
                   <span className="text-destructive">廃棄: {stats.waste.toLocaleString()}個</span>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto">
                {dowProducts.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-muted/20 sticky top-0 z-10">
                      <TableRow className="h-8">
                        <TableHead className="h-8 p-2 px-3 text-[10px] font-bold">商品名</TableHead>
                        <TableHead className="h-8 p-2 px-3 text-[10px] font-bold text-right">ロス/率</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dowProducts.map(p => {
                        const pWaste = p.wasteDow[actualDow] || 0;
                        const pProd = p.prodDow[actualDow] || 0;
                        const pRate = pProd > 0 ? (pWaste / pProd) * 100 : 0;
                        return (
                          <TableRow key={p.id} className="h-12 hover:bg-muted/5">
                            <TableCell className="p-2 px-3">
                              <p className="text-[13px] font-black leading-tight truncate max-w-[140px]">{p.name}</p>
                              <p className="text-[9px] text-muted-foreground font-bold">製造: {pProd}個</p>
                            </TableCell>
                            <TableCell className="p-2 px-3 text-right">
                              <p className="text-[15px] font-black text-destructive leading-none">{pWaste}<span className="text-[9px] font-normal ml-0.5">個</span></p>
                              <p className={cn("text-[11px] font-black mt-0.5", pRate > 15 ? "text-destructive" : "text-blue-900")}>
                                {pRate.toFixed(1)}%
                              </p>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-40 py-8">
                    <ClipboardList className="h-8 w-8 mb-2" />
                    <p className="text-xs font-bold">データなし</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

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

      {!analysisData || (analysisData.totalProduction === 0 && analysisData.totalWaste === 0) ? (
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
                <div className="text-xl font-black">{analysisData.totalProduction.toLocaleString()} <span className="text-[10px] font-normal">個</span></div>
              </CardContent>
            </Card>
            <Card className="bg-background border-l-[3px] border-l-destructive h-14">
              <CardContent className="p-2">
                <p className="text-[10px] text-muted-foreground font-black uppercase">総廃棄数</p>
                <div className="text-xl font-black text-destructive">{analysisData.totalWaste.toLocaleString()} <span className="text-[10px] font-normal">個</span></div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-l-[3px] border-l-blue-900 h-14">
              <CardContent className="p-2">
                <p className="text-[10px] text-blue-900 font-black uppercase">平均廃棄率</p>
                <div className="text-2xl font-black text-blue-900">{overallWasteRate.toFixed(1)}<span className="text-[12px]">%</span></div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-1 px-1 shrink-0">
            <Card className="lg:col-span-8 border-none shadow-none bg-background">
              <CardHeader className="p-1 pb-0">
                <CardTitle className="text-[9px] text-muted-foreground font-black uppercase flex items-center">
                  <CalendarDays className="h-2.5 w-2.5 mr-1 text-primary" />曜日別 廃棄率 (タップで詳細)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1">
                <div className="grid grid-cols-4 lg:grid-cols-8 gap-1">
                  {dayLabels.map((label, i) => {
                    const actualDow = dayOrder[i];
                    const stats = analysisData.dayStats[actualDow];
                    const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                    const isAlert = rate > 15;
                    let labelColor = "text-muted-foreground";
                    let borderColor = "border-slate-200";
                    if (actualDow === 6) { labelColor = "text-blue-500"; borderColor = "border-blue-400/60"; }
                    if (actualDow === 0 || actualDow === 7) { labelColor = "text-destructive"; borderColor = "border-destructive/60"; }
                    return (
                      <div key={label} onClick={() => setSelectedDayIdx(actualDow)} className={cn(
                        "flex items-center justify-between px-2 h-9 lg:h-8 rounded-full transition-all cursor-pointer hover:opacity-80 bg-muted/50 border shadow-sm",
                        borderColor,
                        isAlert && "bg-destructive/10 border-destructive"
                      )}>
                        <span className={cn("text-[11px] font-black shrink-0", labelColor)}>{label}</span>
                        <div className={cn("text-[13px] font-black tabular-nums leading-none flex items-baseline gap-0.5", isAlert ? "text-destructive" : "text-blue-900")}>
                          {rate.toFixed(1)}<span className="text-[8px] font-normal">%</span>
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
                        "flex items-center justify-between px-2 h-9 lg:h-8 rounded-full bg-muted/50 border border-orange-400/50 shadow-sm",
                        isAlert && "bg-destructive/10 border-destructive"
                      )}>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Icon className={cn("h-3 w-3", isAlert ? "text-destructive" : "text-orange-500")} />
                          <span className="text-[11px] font-black text-muted-foreground">{label.charAt(0)}</span>
                        </div>
                        <div className={cn("text-[13px] font-black tabular-nums leading-none flex items-baseline gap-0.5", isAlert ? "text-destructive" : "text-orange-600")}>
                          {rate.toFixed(1)}<span className="text-[8px] font-normal">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-4 h-8 p-1 bg-muted/60 mx-1">
              <TabsTrigger value="overview" className="text-[10px] font-bold">カテゴリー別</TabsTrigger>
              <TabsTrigger value="product" className="text-[10px] font-bold">商品別</TabsTrigger>
              <TabsTrigger value="daily" className="text-[10px] font-bold">曜日別一覧</TabsTrigger>
              <TabsTrigger value="cross" className="text-[10px] font-bold">クロス分析</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-1 px-1">
              <TabsContent value="overview" className="m-0 space-y-1 pb-4">
                <Card className="border-none shadow-none overflow-hidden bg-background">
                  <CardHeader className="p-2 bg-primary/5 pb-1">
                    <CardTitle className="text-[12px] font-black flex items-center">
                      <Filter className="h-3 w-3 mr-2 text-primary" />
                      カテゴリー別サマリー (タップで詳細)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="h-10">
                          <TableHead className="h-10 text-[18px] font-black px-4 text-center">カテゴリー</TableHead>
                          <TableHead className="h-10 text-[18px] font-black px-4 text-right">製造 (個)</TableHead>
                          <TableHead className="h-10 text-[18px] font-black px-4 text-right">廃棄 (個)</TableHead>
                          <TableHead className="h-10 text-[18px] font-black px-4 text-right">廃棄率 (%)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedCategoryStats.map((item) => (
                          <TableRow 
                            key={item.cat} 
                            className="h-14 hover:bg-primary/5 transition-colors cursor-pointer"
                            onClick={() => setSelectedCategoryForDetail(item.cat)}
                          >
                            <TableCell className="px-4 py-2 text-[22px] font-black">{item.cat}</TableCell>
                            <TableCell className="px-4 py-2 text-[20px] text-right">{item.production.toLocaleString()}</TableCell>
                            <TableCell className="px-4 py-2 text-[20px] text-right text-destructive font-black">{item.waste.toLocaleString()}</TableCell>
                            <TableCell className="px-4 py-2 text-right">
                              <span className={cn("text-[26px] font-black", item.rate > 15 ? "text-destructive" : "text-blue-900")}>{item.rate.toFixed(1)}%</span>
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
                          <TableHead className="h-10 text-[18px] font-black px-4 text-center">商品名</TableHead>
                          <TableHead className="h-10 text-[18px] font-black px-4 text-right">廃棄/製造</TableHead>
                          <TableHead className="h-10 text-[18px] font-black px-4 text-right">廃棄率</TableHead>
                          <TableHead className="h-10 text-[18px] font-black px-4 text-center">主要廃棄曜日</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisData.products.map((p) => {
                          const wasteRate = p.production > 0 ? (p.waste / p.production) * 100 : 0;
                          const productDows = p.wasteDow as Record<number, number>;
                          const topDows = Object.entries(productDows)
                            .map(([dow, count]) => ({ dow: Number(dow), count: count }))
                            .filter(item => item.count > 0)
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 3);
                          return (
                            <TableRow key={p.id} className="h-16 hover:bg-muted/10">
                              <TableCell className="px-4 py-2">
                                <div className="flex flex-col">
                                  <span className="text-[22px] font-black truncate max-w-[250px]">{p.name}</span>
                                  <span className="text-[12px] text-muted-foreground uppercase font-bold">{p.category}</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-2 text-right">
                                <div className="text-[20px] font-black text-destructive">{p.waste} <span className="text-[16px] font-normal opacity-50 text-foreground">/ {p.production}</span></div>
                              </TableCell>
                              <TableCell className="px-4 py-2 text-right">
                                <span className={cn("text-[24px] font-black", wasteRate > 15 ? "text-destructive" : "text-blue-900")}>{wasteRate.toFixed(1)}%</span>
                              </TableCell>
                              <TableCell className="px-4 py-2">
                                <div className="flex justify-center gap-2">
                                  {topDows.map((item, idx) => (
                                    <div key={item.dow} className="flex flex-col items-center">
                                      <Badge variant={idx === 0 ? "destructive" : "outline"} className="h-6 px-2 text-[12px] font-black">
                                        {actualDowLabel(item.dow)}
                                      </Badge>
                                      <span className="text-[14px] font-black opacity-60">{item.count}</span>
                                    </div>
                                  ))}
                                </div>
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
                <div className="flex justify-end mb-2">
                  <Button variant="outline" size="sm" onClick={() => setIsFullScreenDaily(true)} className="h-8 font-black text-[10px]">
                    <Maximize2 className="h-3.5 w-3.5 mr-2" />
                    全画面で比較する
                  </Button>
                </div>
                {renderDailyGrid(false)}
              </TabsContent>

              <TabsContent value="cross" className="m-0 pb-4">
                <Card className="border-none shadow-none overflow-hidden bg-background">
                  <CardHeader className="p-2 bg-muted/40 pb-1">
                    <CardTitle className="text-[14px] font-black">曜日 × 天気 クロス分析</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/60">
                          <TableRow className="h-12">
                            <TableHead className="h-12 p-2 text-[18px] font-black border-r text-center w-20">曜\天</TableHead>
                            {Object.entries(weatherLabels).map(([_, label]) => <TableHead key={label} className="h-12 text-[18px] text-center font-black p-2">{label}</TableHead>)}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dayLabels.map((label, i) => {
                            const actualDow = dayOrder[i];
                            return (
                              <TableRow key={label} className="h-16">
                                <TableHead className={cn("h-16 p-2 text-[20px] font-black border-r text-center", (actualDow === 0 || actualDow === 7) ? "text-destructive" : (actualDow === 6 ? "text-blue-500" : ""))}>
                                  {label}
                                </TableHead>
                                {Object.keys(weatherLabels).map(weatherKey => {
                                  const stats = analysisData.matrixStats[`${actualDow}-${weatherKey}`] || { waste: 0, production: 0 };
                                  const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                                  return (
                                    <TableCell key={weatherKey} className={cn("text-center p-2 border-r last:border-r-0", rate > 20 ? "bg-destructive/5" : (rate > 10 ? "bg-orange-50/50" : ""))}>
                                      {stats.production > 0 ? (
                                        <div className="flex flex-col items-center leading-tight">
                                          <span className={cn("text-[24px] font-black", rate > 15 ? "text-destructive" : "text-blue-900")}>{rate.toFixed(1)}%</span>
                                          <span className="text-[14px] text-muted-foreground font-bold opacity-70">{stats.waste} / {stats.production}</span>
                                        </div>
                                      ) : <span className="text-muted-foreground text-[16px]">-</span>}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          {/* 曜日別分析 全画面ダイアログ */}
          <Dialog open={isFullScreenDaily} onOpenChange={setIsFullScreenDaily}>
            <DialogContent className="max-w-none w-[98vw] h-[95vh] flex flex-col p-4 bg-muted/5">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black flex items-center">
                  <CalendarDays className="mr-3 h-6 w-6 text-primary" />
                  全曜日 廃棄詳細比較分析
                </DialogTitle>
                <DialogDescription className="text-sm font-bold">全曜日の廃棄状況を並べて比較し、製造計画の最適化に活用してください。</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-auto mt-4">
                {renderDailyGrid(true)}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={selectedDayIdx !== null} onOpenChange={(open) => !open && setSelectedDayIdx(null)}>
            <DialogContent className="max-w-[500px] max-h-[90vh] flex flex-col p-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-black flex items-center">
                  <CalendarDays className="mr-2 h-5 w-5 text-blue-900" />
                  {selectedDayIdx !== null && actualDowLabel(selectedDayIdx)}曜日の詳細分析
                </DialogTitle>
                <DialogDescription className="text-xs">条件別の廃棄実績と、この曜日の主要廃棄商品一覧です。</DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-auto mt-4 space-y-6">
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black text-muted-foreground uppercase flex items-center">
                    <Sun className="h-3 w-3 mr-1" />天気別実績
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(weatherLabels).map(([weatherKey, label]) => {
                      const stats = (selectedDayIdx !== null && analysisData?.matrixStats[`${selectedDayIdx}-${weatherKey}`]) || { waste: 0, production: 0 };
                      const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                      const Icon = weatherIcons[weatherKey];
                      const isAlert = rate > 15;
                      return (
                        <div key={weatherKey} className="flex items-center justify-between p-2 rounded-full bg-muted/30 border border-muted shadow-sm">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-3.5 w-3.5", isAlert ? "text-destructive" : "text-orange-500")} />
                            <span className="text-[10px] font-black text-muted-foreground">{label.charAt(0)}</span>
                          </div>
                          <div className={cn("text-[16px] font-black leading-none", isAlert ? "text-destructive" : "text-blue-900")}>
                            {rate.toFixed(1)}<span className="text-[8px] font-normal">%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 pb-4">
                  <h4 className="text-[11px] font-black text-muted-foreground uppercase flex items-center">
                    <TrendingDown className="h-3 w-3 mr-1 text-destructive" />この曜日の廃棄商品一覧
                  </h4>
                  <div className="rounded-md border bg-background overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="h-8 text-[10px] font-bold">商品名</TableHead>
                          <TableHead className="h-8 text-[10px] font-bold text-right">廃棄 / 製造</TableHead>
                          <TableHead className="h-8 text-[10px] font-bold text-right">廃棄率</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDayIdx !== null && analysisData?.products
                          .filter(p => (p.wasteDow[selectedDayIdx] || 0) > 0 || (p.prodDow[selectedDayIdx] || 0) > 0)
                          .sort((a, b) => (b.wasteDow[selectedDayIdx] || 0) - (a.wasteDow[selectedDayIdx] || 0))
                          .map(p => {
                            const pWaste = p.wasteDow[selectedDayIdx] || 0;
                            const pProd = p.prodDow[selectedDayIdx] || 0;
                            const pRate = pProd > 0 ? (pWaste / pProd) * 100 : 0;
                            return (
                              <TableRow key={p.id} className="h-10">
                                <TableCell className="py-1 px-3 text-[14px] font-black">{p.name}</TableCell>
                                <TableCell className="py-1 px-3 text-right font-bold text-[13px]">
                                  <span className="text-destructive font-black text-[15px]">{pWaste}</span> / {pProd}
                                </TableCell>
                                <TableCell className={cn("py-1 px-3 text-right font-black text-[15px]", pRate > 15 ? "text-destructive" : "text-blue-900")}>
                                  {pRate.toFixed(1)}%
                                </TableCell>
                              </TableRow>
                            );
                          })
                        }
                        {selectedDayIdx !== null && (!analysisData?.products.some(p => (p.wasteDow[selectedDayIdx] || 0) > 0 || (p.prodDow[selectedDayIdx] || 0) > 0)) && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-xs">
                              この曜日の廃棄データはありません
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!selectedCategoryForDetail} onOpenChange={(open) => !open && setSelectedCategoryForDetail(null)}>
            <DialogContent className="max-w-[500px] max-h-[80vh] flex flex-col p-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-black flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {selectedCategoryForDetail} の詳細分析
                </DialogTitle>
                <DialogDescription className="text-sm">商品ごとの廃棄数と機会損失（売価合計）です。</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-auto mt-4">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-bold">商品名</TableHead>
                      <TableHead className="text-right font-bold">廃棄数</TableHead>
                      <TableHead className="text-right font-bold">機会損失 (売価計)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisData.products
                      .filter(p => p.category === selectedCategoryForDetail)
                      .map(p => (
                        <TableRow key={p.id} className="h-12">
                          <TableCell className="font-bold py-2 text-[18px]">{p.name}</TableCell>
                          <TableCell className="text-right text-destructive font-black py-2 text-[22px]">{p.waste.toLocaleString()} <span className="text-xs font-normal">個</span></TableCell>
                          <TableCell className="text-right font-black text-blue-900 py-2 text-[22px]">
                            ¥{(p.waste * (p.price || 0)).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
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
