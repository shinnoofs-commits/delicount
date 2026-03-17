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
import { Calendar as CalendarIcon, Loader2, CalendarDays, Sun, Filter, PieChart, Package, AlertCircle } from 'lucide-react';
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

const dayLabels = ['日', '月', '火', '水', '木', '金', '土', '祝'];
const weatherLabels: Record<string, string> = {
  sunny: '晴れ',
  cloudy: '曇り',
  rainy: '雨',
  snowy: '雪',
};

export default function WasteAnalysisPage() {
    const { wasteEntries, loading: wasteLoading } = useTransactions();
    const { productionEntries, loading: productionLoading } = useProduction();
    const { products, loading: productsLoading } = useProducts();
    const { isAdmin } = useAdmin();

    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

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

        filteredProduction.forEach(entry => {
            const entryDate = new Date(entry.date);
            const isHoliday = holiday_jp.isHoliday(entryDate);
            const dow = isHoliday ? 7 : getDay(entryDate);
            
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
                    costPrice: product.costPrice,
                    dow: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 }
                };
                stats.production += item.quantity;
                productStats.set(item.productId, stats);

                dayStats[dow].production += item.quantity;
                
                if (!categoryStats[product.category]) categoryStats[product.category] = { waste: 0, production: 0 };
                categoryStats[product.category].production += item.quantity;
            });
        });

        const filteredWaste = wasteEntries.filter(entry => 
            dateSet.has(format(startOfDay(entry.date), 'yyyy-MM-dd'))
        );

        filteredWaste.forEach(entry => {
            const entryDate = new Date(entry.date);
            const isHoliday = holiday_jp.isHoliday(entryDate);
            const dow = isHoliday ? 7 : getDay(entryDate);
            const weather = entry.weather || 'unknown';

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
                    costPrice: product.costPrice,
                    dow: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 }
                };
                stats.waste += item.quantity;
                stats.dow[dow] += item.quantity;
                productStats.set(item.productId, stats);

                dayStats[dow].waste += item.quantity;

                if (weather !== 'unknown' && weatherStats[weather]) {
                    weatherStats[weather].waste += item.quantity;
                    const key = `${dow}-${weather}`;
                    if (!matrixStats[key]) matrixStats[key] = { waste: 0, production: 0 };
                    matrixStats[key].waste += item.quantity;
                }

                if (!categoryStats[product.category]) categoryStats[product.category] = { waste: 0, production: 0 };
                categoryStats[product.category].waste += item.quantity;
            });
        });

        // 曜日x天気マトリクスの製造数を補完
        filteredWaste.forEach(wasteEntry => {
            const dateStr = format(startOfDay(wasteEntry.date), 'yyyy-MM-dd');
            const weather = wasteEntry.weather;
            if (!weather || weather === 'unknown') return;

            const prodOnSameDay = filteredProduction.filter(p => format(startOfDay(p.date), 'yyyy-MM-dd') === dateStr);
            const dow = holiday_jp.isHoliday(wasteEntry.date) ? 7 : getDay(wasteEntry.date);
            const key = `${dow}-${weather}`;
            
            if (!matrixStats[key]) matrixStats[key] = { waste: 0, production: 0 };
            
            prodOnSameDay.forEach(p => {
                p.items.forEach(item => {
                    const product = products.find(prod => prod.id === item.productId);
                    if (!product) return;
                    if (selectedCategory !== 'all' && product.category !== selectedCategory) return;
                    
                    matrixStats[key].production += item.quantity;
                    if (weather && weatherStats[weather]) {
                        weatherStats[weather].production += item.quantity;
                    }
                });
            });
        });

        return {
            products: Array.from(productStats.values()).sort((a, b) => b.waste - a.waste),
            dayStats,
            weatherStats,
            matrixStats,
            categoryStats,
            totalWaste: filteredWaste.reduce((sum, e) => {
                const itemsCount = selectedCategory === 'all' 
                    ? e.items.reduce((s, i) => s + i.quantity, 0)
                    : e.items.filter(i => products.find(p => p.id === i.productId)?.category === selectedCategory).reduce((s, i) => s + i.quantity, 0);
                return sum + itemsCount;
            }, 0),
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
        <div className="flex flex-col gap-2 h-full overflow-hidden">
            {/* Filter Section */}
            <Card className="shrink-0 border-none shadow-none bg-muted/40">
                <CardContent className="p-2 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Label className="text-[10px] font-black uppercase whitespace-nowrap opacity-70">店舗</Label>
                        {isAdmin ? <StoreSelector /> : <Badge variant="outline" className="bg-background h-7 px-2 text-[11px]">自店舗</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-[10px] font-black uppercase whitespace-nowrap opacity-70">期間</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-[11px] font-medium bg-background px-2">
                                    <CalendarIcon className="mr-1.5 h-3 w-3" />
                                    {date?.from ? (date.to ? `${format(date.from, "M/d")} - ${format(date.to, "M/d")}` : format(date.from, "M/d")) : "選択"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="range" selected={date} onSelect={setDate} locale={ja} /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-[10px] font-black uppercase whitespace-nowrap opacity-70">カテゴリー</Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="h-7 text-[11px] w-[120px] bg-background">
                                <SelectValue placeholder="全カテゴリー" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat} value={cat} className="text-xs">{cat === 'all' ? '全カテゴリー' : cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {!analysisData || analysisData.products.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed m-4">
                    <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
                    <p className="font-bold">対象期間にデータがありません</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col gap-2 min-h-0">
                    {/* KPI Section */}
                    <div className="grid grid-cols-3 gap-2 shrink-0 px-1">
                        <Card className="bg-background border-l-[4px] border-l-blue-400 shadow-sm">
                            <CardContent className="p-3">
                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">総製造数</p>
                                <div className="text-2xl font-black mt-1 leading-none">{analysisData.totalProduction.toLocaleString()} <span className="text-xs font-normal ml-0.5">個</span></div>
                            </CardContent>
                        </Card>
                        <Card className="bg-background border-l-[4px] border-l-destructive shadow-sm">
                            <CardContent className="p-3">
                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">総廃棄数</p>
                                <div className="text-2xl font-black mt-1 text-destructive leading-none">{analysisData.totalWaste.toLocaleString()} <span className="text-xs font-normal ml-0.5">個</span></div>
                            </CardContent>
                        </Card>
                        <Card className="bg-primary/5 border-l-[4px] border-l-primary shadow-sm">
                            <CardContent className="p-3">
                                <p className="text-[10px] text-primary font-black uppercase tracking-wider">平均廃棄率</p>
                                <div className="text-2xl font-black mt-1 text-primary leading-none">{overallWasteRate.toFixed(1)}<span className="text-xs ml-0.5">%</span></div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Analysis Tabs */}
                    <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                        <TabsList className="grid grid-cols-3 h-9 p-1 bg-muted/60 mx-1 rounded-md">
                            <TabsTrigger value="overview" className="text-[11px] font-bold"><PieChart className="h-3.5 w-3.5 mr-1.5" />概況分析</TabsTrigger>
                            <TabsTrigger value="product" className="text-[11px] font-bold"><Package className="h-3.5 w-3.5 mr-1.5" />商品分析</TabsTrigger>
                            <TabsTrigger value="cross" className="text-[11px] font-bold"><Filter className="h-3.5 w-3.5 mr-1.5" />クロス分析</TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-auto mt-2 px-1">
                            {/* Overview Tab */}
                            <TabsContent value="overview" className="m-0 space-y-3 pb-4">
                                {/* Day of Week Analysis */}
                                <Card className="border-none shadow-sm bg-background">
                                    <CardHeader className="p-3 pb-0">
                                        <CardTitle className="text-[11px] text-muted-foreground font-black uppercase flex items-center tracking-wider">
                                            <CalendarDays className="h-4 w-4 mr-2 text-primary" />曜日別 廃棄率
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-4">
                                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                            {dayLabels.map((label, i) => {
                                                const stats = analysisData.dayStats[i];
                                                const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                                                const isAlert = rate > 15;
                                                const isSpecial = i === 7 || i === 0;
                                                
                                                return (
                                                    <div key={label} className={cn(
                                                        "flex flex-col gap-1.5 p-2 rounded-lg border-l-[3px] transition-all",
                                                        isAlert ? "bg-destructive/5 border-l-destructive" : "bg-muted/30 border-l-primary"
                                                    )}>
                                                        <div className="flex flex-col">
                                                            <span className={cn("text-[10px] font-black leading-tight", isSpecial ? "text-destructive" : "text-muted-foreground")}>{label}</span>
                                                            <div className={cn("text-xl font-black mt-0.5", isAlert ? "text-destructive" : "text-primary")}>
                                                                {rate.toFixed(1)}<span className="text-[10px] ml-0.5">%</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                                            <div className={cn("h-full", isAlert ? "bg-destructive" : "bg-primary")} style={{ width: `${Math.min(rate * 2.5, 100)}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Weather Analysis */}
                                <Card className="border-none shadow-sm bg-background">
                                    <CardHeader className="p-3 pb-0">
                                        <CardTitle className="text-[11px] text-muted-foreground font-black uppercase flex items-center tracking-wider">
                                            <Sun className="h-4 w-4 mr-2 text-accent" />天気別 廃棄率
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {Object.entries(weatherLabels).map(([key, label]) => {
                                                const stats = analysisData.weatherStats[key];
                                                const rate = stats && stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                                                const isAlert = rate > 15;
                                                
                                                return (
                                                    <div key={key} className={cn(
                                                        "flex flex-col gap-1.5 p-2 rounded-lg border-l-[3px] transition-all",
                                                        isAlert ? "bg-destructive/5 border-l-destructive" : "bg-accent/5 border-l-accent"
                                                    )}>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black leading-tight text-muted-foreground">{label}</span>
                                                            <div className={cn("text-xl font-black mt-0.5", isAlert ? "text-destructive" : "text-accent")}>
                                                                {rate.toFixed(1)}<span className="text-[10px] ml-0.5">%</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                                            <div className={cn("h-full", isAlert ? "bg-destructive" : "bg-accent")} style={{ width: `${Math.min(rate * 2.5, 100)}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Category Summary Table */}
                                <Card className="border-none shadow-sm overflow-hidden bg-background">
                                    <CardHeader className="p-3 bg-primary/5 pb-2">
                                        <CardTitle className="text-[11px] font-black flex items-center">
                                            <Filter className="h-4 w-4 mr-2 text-primary" />
                                            カテゴリー別サマリー <span className="text-[9px] font-normal text-muted-foreground ml-2">(廃棄率順)</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader className="bg-muted/40">
                                                <TableRow className="h-8">
                                                    <TableHead className="h-8 text-[10px] font-black px-3">カテゴリー</TableHead>
                                                    <TableHead className="h-8 text-[10px] font-black px-3 text-right">製造 (個)</TableHead>
                                                    <TableHead className="h-8 text-[10px] font-black px-3 text-right">廃棄 (個)</TableHead>
                                                    <TableHead className="h-8 text-[10px] font-black px-3 text-right">廃棄率 (%)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sortedCategoryStats.map((item) => (
                                                    <TableRow key={item.cat} className="h-10 hover:bg-primary/5 transition-colors">
                                                        <TableCell className="px-3 py-1 text-[11px] font-black">{item.cat}</TableCell>
                                                        <TableCell className="px-3 py-1 text-[11px] text-right tabular-nums">{item.production.toLocaleString()}</TableCell>
                                                        <TableCell className="px-3 py-1 text-[11px] text-right text-destructive font-black tabular-nums">{item.waste.toLocaleString()}</TableCell>
                                                        <TableCell className="px-3 py-1 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <span className={cn("text-sm font-black tabular-nums", item.rate > 15 ? "text-destructive" : "text-primary")}>{item.rate.toFixed(1)}%</span>
                                                                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                                                    <div className={cn("h-full", item.rate > 15 ? "bg-destructive" : "bg-primary")} style={{ width: `${Math.min(item.rate * 2, 100)}%` }} />
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Product Detail Tab */}
                            <TabsContent value="product" className="m-0">
                                <Card className="border-none shadow-sm bg-background">
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader className="bg-muted/40 sticky top-0 z-20">
                                                <TableRow className="h-8">
                                                    <TableHead className="h-8 text-[10px] font-black px-3">商品詳細</TableHead>
                                                    <TableHead className="h-8 text-[10px] font-black px-3 text-right">実績 (廃棄/製造)</TableHead>
                                                    <TableHead className="h-8 text-[10px] font-black px-3 text-right">廃棄率</TableHead>
                                                    <TableHead className="h-8 text-[10px] font-black px-3 text-center">ロス要因 (曜日)</TableHead>
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
                                                        <TableRow key={p.id} className="h-12 hover:bg-muted/20">
                                                            <TableCell className="px-3 py-1">
                                                                <div className="flex flex-col leading-tight">
                                                                    <span className="text-[11px] font-black truncate max-w-[140px]">{p.name}</span>
                                                                    <span className="text-[9px] text-muted-foreground uppercase font-bold">{p.category}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-3 py-1 text-right">
                                                                <div className="flex flex-col items-end leading-none">
                                                                    <div className="text-[11px] font-black text-destructive">{p.waste.toLocaleString()} <span className="text-[9px] font-normal opacity-70">個</span></div>
                                                                    <div className="text-[10px] font-medium opacity-50 mt-1">/ {p.production.toLocaleString()}</div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-3 py-1 text-right">
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <span className={cn("text-sm font-black leading-none", wasteRate > 15 ? "text-destructive" : "text-primary")}>{wasteRate.toFixed(1)}%</span>
                                                                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                                                        <div className={cn("h-full", wasteRate > 15 ? "bg-destructive" : "bg-primary")} style={{ width: `${Math.min(wasteRate * 2, 100)}%` }} />
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-3 py-1">
                                                                <div className="flex justify-center gap-1.5">
                                                                    {topDows.length > 0 ? topDows.map((item, idx) => (
                                                                        <div key={item.dow} className="flex flex-col items-center">
                                                                            <Badge variant={idx === 0 ? "destructive" : "outline"} className="h-4 px-1 text-[9px] font-black border-none bg-muted/50 text-muted-foreground data-[variant=destructive]:bg-destructive data-[variant=destructive]:text-destructive-foreground">{dayLabels[item.dow]}</Badge>
                                                                            <span className="text-[8px] font-black mt-0.5 opacity-60 tabular-nums">{item.count}</span>
                                                                        </div>
                                                                    )) : <span className="text-[10px] text-muted-foreground">-</span>}
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

                            {/* Cross Analysis Tab */}
                            <TabsContent value="cross" className="m-0">
                                <Card className="border-none shadow-sm overflow-hidden bg-background">
                                    <CardHeader className="p-3 bg-muted/40 pb-2">
                                        <CardTitle className="text-[11px] font-black flex items-center justify-between tracking-wider">
                                            <div>曜日 × 天気 クロス分析 <span className="text-[9px] font-normal text-muted-foreground ml-2">(廃棄率 / 実績数)</span></div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <Table className="border-collapse">
                                                <TableHeader className="bg-muted/60">
                                                    <TableRow className="h-9">
                                                        <TableHead className="h-9 p-1 text-[10px] font-black border-r text-center bg-muted/80 w-12">曜\天</TableHead>
                                                        {Object.entries(weatherLabels).map(([_, label]) => <TableHead key={label} className="h-9 text-[10px] text-center font-black p-1">{label}</TableHead>)}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {dayLabels.map((label, dowIndex) => (
                                                        <TableRow key={label} className="h-12">
                                                            <TableHead className={cn("h-12 p-1 text-[11px] font-black border-r text-center bg-muted/10", dowIndex === 7 || dowIndex === 0 ? "text-destructive" : "")}>{label}</TableHead>
                                                            {Object.keys(weatherLabels).map(weatherKey => {
                                                                const stats = analysisData.matrixStats[`${dowIndex}-${weatherKey}`] || { waste: 0, production: 0 };
                                                                const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                                                                
                                                                const getBgColor = (r: number) => {
                                                                    if (r === 0) return "";
                                                                    if (r > 20) return "bg-destructive/10";
                                                                    if (r > 12) return "bg-orange-400/5";
                                                                    if (r > 5) return "bg-primary/5";
                                                                    return "bg-green-500/5";
                                                                };

                                                                return (
                                                                    <TableCell key={weatherKey} className={cn("text-center p-1 border-r last:border-r-0 transition-colors", getBgColor(rate))}>
                                                                        {stats.production > 0 ? (
                                                                            <div className="flex flex-col items-center leading-tight">
                                                                                <span className={cn("text-sm font-black tabular-nums", rate > 15 ? "text-destructive" : "text-primary")}>{rate.toFixed(1)}%</span>
                                                                                <span className="text-[9px] text-muted-foreground tabular-nums font-bold opacity-70">{stats.waste} / {stats.production}</span>
                                                                            </div>
                                                                        ) : <span className="text-muted-foreground text-[9px]">-</span>}
                                                                    </TableCell>
                                                                );
                                                            })}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            )}
        </div>
    );
}
