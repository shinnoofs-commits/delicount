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
import { Calendar as CalendarIcon, Loader2, CalendarDays, Sun, Filter, PieChart, Package, Cloud, CloudRain, Snowflake } from 'lucide-react';
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

// 月曜開始のラベル
const dayLabels = ['月', '火', '水', '木', '金', '土', '日', '祝'];
// dayLabelsに対応するgetDay()の戻り値 (0=日, 1=月, ..., 6=土, 7=祝)
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

        const filteredProduction = productionEntries.filter(entry => 
            dateSet.has(format(startOfDay(entry.date), 'yyyy-MM-dd'))
        );

        const dateToWeather = new Map<string, string>();
        const filteredWaste = wasteEntries.filter(entry => 
            dateSet.has(format(startOfDay(entry.date), 'yyyy-MM-dd'))
        );
        filteredWaste.forEach(entry => {
            if (entry.weather) {
                dateToWeather.set(format(startOfDay(entry.date), 'yyyy-MM-dd'), entry.weather);
            }
        });

        filteredProduction.forEach(entry => {
            const entryDate = new Date(entry.date);
            const isHoliday = holiday_jp.isHoliday(entryDate);
            const dow = isHoliday ? 7 : getDay(entryDate);
            const dateStr = format(startOfDay(entryDate), 'yyyy-MM-dd');
            const weather = dateToWeather.get(dateStr) || 'unknown';
            
            entry.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (!product) return;
                if (selectedCategory !== 'all' && product.category !== selectedCategory) return;

                const stats = productStats.get(item.productId) || {
                    id: item.productId,
                    name: item.name,
                    category: product.category,
                    waste: 0,
                    production: 0,
                    dow: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 }
                };
                stats.production += item.quantity;
                productStats.set(item.productId, stats);
                dayStats[dow].production += item.quantity;
                if (weather !== 'unknown') {
                    if (!weatherStats[weather]) weatherStats[weather] = { waste: 0, production: 0 };
                    weatherStats[weather].production += item.quantity;
                    const matrixKey = `${dow}-${weather}`;
                    if (!matrixStats[matrixKey]) matrixStats[matrixKey] = { waste: 0, production: 0 };
                    matrixStats[matrixKey].production += item.quantity;
                }
                if (!categoryStats[product.category]) categoryStats[product.category] = { waste: 0, production: 0 };
                categoryStats[product.category].production += item.quantity;
            });
        });

        filteredWaste.forEach(entry => {
            const entryDate = new Date(entry.date);
            const isHoliday = holiday_jp.isHoliday(entryDate);
            const dow = isHoliday ? 7 : getDay(entryDate);
            const weather = entry.weather || 'unknown';
            
            entry.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (!product) return;
                if (selectedCategory !== 'all' && product.category !== selectedCategory) return;

                const stats = productStats.get(item.productId);
                if (stats) {
                    stats.waste += item.quantity;
                    stats.dow[dow] += item.quantity;
                }
                dayStats[dow].waste += item.quantity;
                if (weather !== 'unknown') {
                    if (!weatherStats[weather]) weatherStats[weather] = { waste: 0, production: 0 };
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
            .map(([cat, stats]: [string, any]) => ({
                cat,
                ...stats,
                rate: stats.production > 0 ? (stats.waste / stats.production) * 100 : 0
            }))
            .sort((a, b) => b.rate - a.rate);
    }, [analysisData]);

    if (wasteLoading || productsLoading || productionLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const overallWasteRate = analysisData && analysisData.totalProduction > 0 
        ? (analysisData.totalWaste / analysisData.totalProduction) * 100 
        : 0;

    return (
        <div className="flex flex-col gap-1 h-full overflow-hidden">
            {/* フィルターセクション */}
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
                        <Label className="text-[10px] font-black uppercase opacity-70">カテゴリ</Label>
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
                    {/* KPIセクション */}
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

                    {/* メイン分析タブ */}
                    <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                        <TabsList className="grid grid-cols-3 h-8 p-1 bg-muted/60 mx-1">
                            <TabsTrigger value="overview" className="text-[10px] font-bold"><PieChart className="h-3 w-3 mr-1" />概況分析</TabsTrigger>
                            <TabsTrigger value="product" className="text-[10px] font-bold"><Package className="h-3 w-3 mr-1" />商品分析</TabsTrigger>
                            <TabsTrigger value="cross" className="text-[10px] font-bold"><Filter className="h-3 w-3 mr-1" />クロス分析</TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-auto mt-1 px-1">
                            {/* 概況分析タブ */}
                            <TabsContent value="overview" className="m-0 space-y-1 pb-4">
                                <Card className="border-none shadow-none bg-background">
                                    <CardHeader className="p-2 pb-0">
                                        <CardTitle className="text-[10px] text-muted-foreground font-black uppercase flex items-center">
                                            <CalendarDays className="h-3 w-3 mr-2 text-primary" />曜日別 廃棄率 <span className="text-[8px] lowercase ml-2 opacity-60">(タップで詳細)</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-1">
                                        <div className="grid grid-cols-4 gap-2">
                                            {dayLabels.map((label, i) => {
                                                const actualDow = dayOrder[i];
                                                const stats = analysisData.dayStats[actualDow];
                                                const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                                                const isAlert = rate > 15;
                                                
                                                let labelColor = "text-muted-foreground";
                                                if (actualDow === 6) labelColor = "text-blue-500"; 
                                                if (actualDow === 0 || actualDow === 7) labelColor = "text-destructive";

                                                return (
                                                    <div key={label} onClick={() => setSelectedDayIdx(actualDow)} className={cn(
                                                        "flex items-center justify-center gap-3 px-4 h-10 rounded-full transition-all cursor-pointer hover:opacity-80 bg-muted/50 border border-transparent shadow-sm",
                                                        isAlert && "bg-destructive/10 border-destructive/20"
                                                    )}>
                                                        <span className={cn("text-[14px] font-black shrink-0", labelColor)}>{label}</span>
                                                        <div className={cn("text-[18px] font-black tabular-nums leading-none flex items-baseline gap-0.5", isAlert ? "text-destructive" : "text-blue-900")}>
                                                            {rate.toFixed(1)}<span className="text-[10px] font-normal">%</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-none bg-background">
                                    <CardHeader className="p-2 pb-0">
                                        <CardTitle className="text-[10px] text-muted-foreground font-black uppercase flex items-center">
                                            <Sun className="h-3 w-3 mr-2 text-orange-500" />天気別 廃棄率
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-1">
                                        <div className="grid grid-cols-4 gap-2">
                                            {Object.entries(weatherLabels).map(([key, label]) => {
                                                const stats = analysisData.weatherStats[key] || { waste: 0, production: 0 };
                                                const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                                                const Icon = weatherIcons[key];
                                                const isAlert = rate > 15;
                                                return (
                                                    <div key={key} className={cn(
                                                        "flex items-center justify-center gap-2 px-3 h-10 rounded-full bg-muted/50 border border-transparent shadow-sm",
                                                        isAlert && "bg-destructive/10 border-destructive/20"
                                                    )}>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <Icon className={cn("h-4 w-4", isAlert ? "text-destructive" : "text-orange-500")} />
                                                            <span className="text-[14px] font-black text-muted-foreground">{label}</span>
                                                        </div>
                                                        <div className={cn("text-[18px] font-black tabular-nums leading-none flex items-baseline gap-0.5", isAlert ? "text-destructive" : "text-orange-600")}>
                                                            {rate.toFixed(1)}<span className="text-[10px] font-normal">%</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-none overflow-hidden bg-background">
                                    <CardHeader className="p-2 bg-primary/5 pb-1">
                                        <CardTitle className="text-[12px] font-black flex items-center">
                                            <Filter className="h-3 w-3 mr-2 text-primary" />
                                            カテゴリー別サマリー <span className="text-[10px] font-normal text-muted-foreground ml-2">(廃棄率順)</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader className="bg-muted/30">
                                                <TableRow className="h-10">
                                                    <TableHead className="h-10 text-[18px] font-black px-4">カテゴリー</TableHead>
                                                    <TableHead className="h-10 text-[18px] font-black px-4 text-right">製造 (個)</TableHead>
                                                    <TableHead className="h-10 text-[18px] font-black px-4 text-right">廃棄 (個)</TableHead>
                                                    <TableHead className="h-10 text-[18px] font-black px-4 text-right">廃棄率 (%)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sortedCategoryStats.map((item) => (
                                                    <TableRow key={item.cat} className="h-14 hover:bg-primary/5 transition-colors">
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

                            {/* 商品分析タブ */}
                            <TabsContent value="product" className="m-0 pb-4">
                                <Card className="border-none shadow-none bg-background">
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader className="bg-muted/30 sticky top-0 z-20">
                                                <TableRow className="h-10">
                                                    <TableHead className="h-10 text-[18px] font-black px-4">商品詳細</TableHead>
                                                    <TableHead className="h-10 text-[18px] font-black px-4 text-right">廃棄/製造</TableHead>
                                                    <TableHead className="h-10 text-[18px] font-black px-4 text-right">廃棄率</TableHead>
                                                    <TableHead className="h-10 text-[18px] font-black px-4 text-center">ロス傾向 (曜日)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {analysisData.products.map((p) => {
                                                    const wasteRate = p.production > 0 ? (p.waste / p.production) * 100 : 0;
                                                    const topDows = Object.entries(p.dow)
                                                        .map(([dow, count]) => ({ dow: Number(dow), count: count as number }))
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

                            {/* クロス分析タブ */}
                            <TabsContent value="cross" className="m-0 pb-4">
                                <Card className="border-none shadow-none overflow-hidden bg-background">
                                    <CardHeader className="p-2 bg-muted/40 pb-1">
                                        <CardTitle className="text-[14px] font-black">
                                            曜日 × 天気 クロス分析 <span className="text-[12px] font-normal text-muted-foreground ml-2">(廃棄率 / 実績)</span>
                                        </CardTitle>
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
                                                                const getBgColor = (r: number) => {
                                                                    if (r === 0) return "";
                                                                    if (r > 20) return "bg-destructive/10";
                                                                    if (r > 12) return "bg-orange-400/5";
                                                                    if (r > 5) return "bg-primary/5";
                                                                    return "bg-green-500/5";
                                                                };
                                                                return (
                                                                    <TableCell key={weatherKey} className={cn("text-center p-2 border-r last:border-r-0", getBgColor(rate))}>
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
                                                    )})}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </div>
                    </Tabs>

                    {/* 曜日詳細ポップアップ */}
                    <Dialog open={selectedDayIdx !== null} onOpenChange={(open) => !open && setSelectedDayIdx(null)}>
                        <DialogContent className="max-w-[400px] p-4">
                            <DialogHeader>
                                <DialogTitle className="text-lg font-black flex items-center">
                                    <CalendarDays className="mr-2 h-5 w-5 text-blue-900" />
                                    {selectedDayIdx !== null && actualDowLabel(selectedDayIdx)}曜日の詳細
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    選択した曜日の、条件（天気）ごとの廃棄実績です。
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 mt-4">
                                {Object.entries(weatherLabels).map(([weatherKey, label]) => {
                                    const stats = (selectedDayIdx !== null && analysisData?.matrixStats[`${selectedDayIdx}-${weatherKey}`]) || { waste: 0, production: 0 };
                                    const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                                    const Icon = weatherIcons[weatherKey];
                                    const isAlert = rate > 15;
                                    return (
                                        <div key={weatherKey} className="flex items-center justify-between p-3 rounded-full bg-muted/30 border border-muted shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-1.5 rounded-full", isAlert ? "bg-destructive/10" : "bg-orange-100")}>
                                                    <Icon className={cn("h-4 w-4", isAlert ? "text-destructive" : "text-orange-500")} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-muted-foreground">{label}</span>
                                                    <span className="text-[9px] font-bold opacity-60">製造: {stats.production} / 廃棄: {stats.waste}</span>
                                                </div>
                                            </div>
                                            <div className="text-right pr-4">
                                                <div className={cn("text-xl font-black leading-none", isAlert ? "text-destructive" : "text-blue-900")}>
                                                    {rate.toFixed(1)}<span className="text-[10px] font-normal">%</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            )}
        </div>
    );
}

function actualDowLabel(dow: number) {
    const labels = ['日', '月', '火', '水', '木', '金', '土', '祝'];
    return labels[dow];
}
