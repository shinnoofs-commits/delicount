'use client';

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Calendar as CalendarIcon, Loader2, TrendingDown, CalendarDays, Sun, Filter, PieChart, Activity, Package } from 'lucide-react';
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
        
        // データ集計用の構造
        const productStats = new Map<string, any>();
        const dayStats: Record<number, { waste: number; production: number }> = {};
        const weatherStats: Record<string, { waste: number; production: number }> = {};
        const matrixStats: Record<string, { waste: number; production: number }> = {};
        const categoryStats: Record<string, { waste: number; production: number }> = {};

        // 初期化
        for (let i = 0; i < 8; i++) dayStats[i] = { waste: 0, production: 0 };
        Object.keys(weatherLabels).forEach(w => weatherStats[w] = { waste: 0, production: 0 });

        // 製造実績の集計
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

                // 商品別
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

                // 曜日別
                dayStats[dow].production += item.quantity;
                
                // カテゴリー別
                if (!categoryStats[product.category]) categoryStats[product.category] = { waste: 0, production: 0 };
                categoryStats[product.category].production += item.quantity;
            });
        });

        // 廃棄実績の集計
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

                // 曜日別
                dayStats[dow].waste += item.quantity;

                // 天気別
                if (weather !== 'unknown') {
                    weatherStats[weather].waste += item.quantity;
                    // マトリクス
                    const key = `${dow}-${weather}`;
                    if (!matrixStats[key]) matrixStats[key] = { waste: 0, production: 0 };
                    matrixStats[key].waste += item.quantity;
                }

                // カテゴリー別
                if (!categoryStats[product.category]) categoryStats[product.category] = { waste: 0, production: 0 };
                categoryStats[product.category].waste += item.quantity;
            });
        });

        // 再計算：マトリクス用の製造数（曜日ごとの生産比率から概算、またはマッチング）
        // ※正確なマトリクス製造数は、廃棄入力時にその日の天気が確定するため、
        // 廃棄入力があった日の製造実績から天気を紐づけて集計します。
        filteredWaste.forEach(wasteEntry => {
            const dateStr = format(startOfDay(wasteEntry.date), 'yyyy-MM-dd');
            const weather = wasteEntry.weather;
            if (weather === 'unknown') return;

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
                    weatherStats[weather].production += item.quantity;
                });
            });
        });

        return {
            products: Array.from(productStats.values()).sort((a, b) => b.waste - a.waste),
            dayStats,
            weatherStats,
            matrixStats,
            categoryStats,
            totalWaste: filteredWaste.reduce((sum, e) => sum + (selectedCategory === 'all' ? e.items.reduce((s, i) => s + i.quantity, 0) : e.items.filter(i => products.find(p => p.id === i.productId)?.category === selectedCategory).reduce((s, i) => s + i.quantity, 0)), 0),
            totalProduction: Array.from(productStats.values()).reduce((sum, p) => sum + p.production, 0)
        };
    }, [wasteEntries, productionEntries, products, validDates, wasteLoading, productionLoading, productsLoading, selectedCategory]);

    if (wasteLoading || productsLoading || productionLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const overallWasteRate = analysisData && analysisData.totalProduction > 0 
        ? (analysisData.totalWaste / analysisData.totalProduction) * 100 
        : 0;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>多角的廃棄分析（廃棄率分析）</CardTitle>
                    <CardDescription>
                        製造数に対する廃棄の割合（廃棄率）を軸に、ロスの真因を特定します。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-2">
                            <Label>対象店舗</Label>
                            {isAdmin ? <StoreSelector /> : <div className="text-sm font-medium border p-2 rounded-md bg-muted/50">自店舗</div>}
                        </div>
                        <div className="space-y-2">
                            <Label>分析期間</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date?.from ? (date.to ? `${format(date.from, "M/d")} - ${format(date.to, "M/d")}` : format(date.from, "M/d")) : "期間を選択"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="range" selected={date} onSelect={setDate} locale={ja} /></PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>カテゴリー</Label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="全カテゴリー" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat === 'all' ? '全カテゴリー' : cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!analysisData || analysisData.products.length === 0 ? (
                <Card className="p-20 text-center text-muted-foreground">対象期間にデータがありません</Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">期間内 総製造数</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{analysisData.totalProduction.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">個</span></div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">期間内 総廃棄数</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold text-destructive">{analysisData.totalWaste.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">個</span></div></CardContent>
                        </Card>
                        <Card className="bg-primary/5">
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">期間内 平均廃棄率</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold text-primary-foreground">{overallWasteRate.toFixed(1)}%</div></CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="overview" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="overview"><PieChart className="h-4 w-4 mr-2" />概況分析</TabsTrigger>
                            <TabsTrigger value="product"><Package className="h-4 w-4 mr-2" />商品別詳細</TabsTrigger>
                            <TabsTrigger value="cross"><Filter className="h-4 w-4 mr-2" />クロス分析</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center"><CalendarDays className="h-4 w-4 mr-2" />曜日別 廃棄率</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="flex items-end justify-between h-48 gap-1 pt-6">
                                            {dayLabels.map((label, i) => {
                                                const stats = analysisData.dayStats[i];
                                                const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                                                const height = Math.min(rate * 3, 100); // 視覚化のために倍率調整
                                                return (
                                                    <div key={label} className="flex-1 flex flex-col items-center gap-2">
                                                        <div className="text-[10px] font-bold">{rate > 0 ? `${rate.toFixed(1)}%` : ''}</div>
                                                        <div className={cn("w-full rounded-t-sm transition-all", rate > 15 ? "bg-destructive" : "bg-primary")} style={{ height: `${height}%` }} />
                                                        <div className={cn("text-xs font-medium p-1 rounded", i === 7 || i === 0 ? "text-destructive" : "")}>{label}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center"><Sun className="h-4 w-4 mr-2" />天気別 廃棄率</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="flex items-end justify-around h-48 gap-4 pt-6">
                                            {Object.entries(weatherLabels).map(([key, label]) => {
                                                const stats = analysisData.weatherStats[key];
                                                const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                                                const height = Math.min(rate * 3, 100);
                                                return (
                                                    <div key={key} className="flex-1 flex flex-col items-center gap-2 max-w-[60px]">
                                                        <div className="text-[10px] font-bold">{rate > 0 ? `${rate.toFixed(1)}%` : ''}</div>
                                                        <div className={cn("w-full rounded-t-sm transition-all", rate > 15 ? "bg-destructive" : "bg-accent")} style={{ height: `${height}%` }} />
                                                        <div className="text-xs font-medium">{label}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="product">
                            <Card>
                                <CardContent className="pt-6">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>商品名</TableHead>
                                                <TableHead>カテゴリー</TableHead>
                                                <TableHead className="text-right">製造数</TableHead>
                                                <TableHead className="text-right">廃棄数</TableHead>
                                                <TableHead className="text-right">廃棄率</TableHead>
                                                <TableHead className="w-[200px]">主な廃棄曜日(Top3)</TableHead>
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
                                                    <TableRow key={p.id}>
                                                        <TableCell className="font-medium">{p.name}</TableCell>
                                                        <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                                                        <TableCell className="text-right">{p.production.toLocaleString()} <span className="text-muted-foreground text-[10px]">個</span></TableCell>
                                                        <TableCell className="text-right font-bold text-destructive">{p.waste.toLocaleString()} <span className="text-muted-foreground text-[10px]">個</span></TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span className={cn("font-bold", wasteRate > 15 ? "text-destructive" : "")}>{wasteRate.toFixed(1)}%</span>
                                                                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden mt-1">
                                                                    <div className={cn("h-full", wasteRate > 15 ? "bg-destructive" : "bg-primary")} style={{ width: `${Math.min(wasteRate, 100)}%` }} />
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1">
                                                                {topDows.map((item, idx) => (
                                                                    <div key={item.dow} className="flex items-center gap-2 text-[10px]">
                                                                        <Badge variant={idx === 0 ? "destructive" : "outline"} className="h-4 px-1 text-[9px]">{dayLabels[item.dow]}</Badge>
                                                                        <span className="font-medium">{item.count}個</span>
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

                        <TabsContent value="cross">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">曜日 × 天気 クロス分析（廃棄率 / 製造数）</CardTitle>
                                    <CardDescription>特定の条件下での生産過剰（廃棄率の高さ）を特定します。</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-24 bg-muted/50 border-r">曜日 \ 天気</TableHead>
                                                    {Object.entries(weatherLabels).map(([_, label]) => <TableHead key={label} className="text-center">{label}</TableHead>)}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {dayLabels.map((label, dowIndex) => (
                                                    <TableRow key={label}>
                                                        <TableHead className={cn("font-bold border-r", dowIndex === 7 || dowIndex === 0 ? "text-destructive" : "")}>{label}</TableHead>
                                                        {Object.keys(weatherLabels).map(weatherKey => {
                                                            const stats = analysisData.matrixStats[`${dowIndex}-${weatherKey}`] || { waste: 0, production: 0 };
                                                            const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                                                            return (
                                                                <TableCell key={weatherKey} className={cn("text-center tabular-nums p-2", rate > 20 ? "bg-destructive/10" : rate > 10 ? "bg-primary/5" : "")}>
                                                                    {stats.production > 0 ? (
                                                                        <div className="flex flex-col items-center">
                                                                            <span className={cn("text-sm font-bold", rate > 15 ? "text-destructive" : "text-primary-foreground")}>{rate.toFixed(1)}%</span>
                                                                            <span className="text-[10px] text-muted-foreground">{stats.waste} / {stats.production}個</span>
                                                                        </div>
                                                                    ) : <span className="text-muted-foreground text-xs">-</span>}
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
                    </Tabs>
                </>
            )}
        </div>
    );
}
