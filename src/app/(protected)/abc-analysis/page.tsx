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
import { Calendar as CalendarIcon, Loader2, TrendingDown, CalendarDays, Sun, Filter, PieChart } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, isValid, getDay, addDays } from "date-fns"
import { ja } from "date-fns/locale"
import holiday_jp from '@holiday-jp/holiday_jp';
import { DateRange } from "react-day-picker"
import { useTransactions } from "@/contexts/transaction-context";
import { useProducts } from "@/contexts/product-context";
import { useAdmin } from "@/hooks/use-admin";
import { StoreSelector } from "@/components/ui/store-selector";
import type { WeatherType } from "@/lib/types";

const dayLabels = ['日', '月', '火', '水', '木', '金', '土', '祝'];
const weatherLabels: Record<string, string> = {
  sunny: '晴れ',
  cloudy: '曇り',
  rainy: '雨',
  snowy: '雪',
};

export default function WasteAnalysisPage() {
    const { wasteEntries, loading: wasteLoading } = useTransactions();
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

    // 期間内の有効な日付リストを生成
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

    // データ集計ロジック
    const analysisData = useMemo(() => {
        if (wasteLoading || productsLoading || validDates.length === 0) return null;

        const dateSet = new Set(validDates);
        const filteredEntries = wasteEntries.filter(entry => 
            dateSet.has(format(startOfDay(entry.date), 'yyyy-MM-dd'))
        );

        const productStats = new Map<string, any>();
        const dayStats: Record<number, number> = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 };
        const weatherStats: Record<string, number> = { sunny:0, cloudy:0, rainy:0, snowy:0 };
        const dayWeatherMatrix: Record<string, number> = {};

        filteredEntries.forEach(entry => {
            const entryDate = new Date(entry.date);
            const isHoliday = holiday_jp.isHoliday(entryDate);
            const dow = isHoliday ? 7 : getDay(entryDate);
            const weather = entry.weather || 'unknown';

            entry.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (selectedCategory !== 'all' && product?.category !== selectedCategory) return;

                // 商品別集計
                const stats = productStats.get(item.productId) || {
                    id: item.productId,
                    name: item.name,
                    category: product?.category || '未設定',
                    totalCount: 0,
                    totalCost: 0,
                    dowCount: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 },
                    weatherCount: { sunny:0, cloudy:0, rainy:0, snowy:0 }
                };
                stats.totalCount += item.quantity;
                stats.totalCost += item.quantity * item.costPrice;
                stats.dowCount[dow] += item.quantity;
                if (weather !== 'unknown') stats.weatherCount[weather] += item.quantity;
                productStats.set(item.productId, stats);

                // 全体集計
                dayStats[dow] += item.quantity;
                if (weather !== 'unknown') {
                    weatherStats[weather] += item.quantity;
                    const matrixKey = `${dow}-${weather}`;
                    dayWeatherMatrix[matrixKey] = (dayWeatherMatrix[matrixKey] || 0) + item.quantity;
                }
            });
        });

        return {
            products: Array.from(productStats.values()).sort((a, b) => b.totalCount - a.totalCount),
            dayStats,
            weatherStats,
            dayWeatherMatrix
        };
    }, [wasteEntries, products, validDates, wasteLoading, productsLoading, selectedCategory]);

    if (wasteLoading || productsLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>多角的廃棄分析</CardTitle>
                    <CardDescription>
                        曜日、天気、商品を掛け合わせたクロス分析により、ロスの真因を特定します。
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
                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview"><PieChart className="h-4 w-4 mr-2" />概況分析</TabsTrigger>
                        <TabsTrigger value="product"><TrendingDown className="h-4 w-4 mr-2" />商品別詳細</TabsTrigger>
                        <TabsTrigger value="cross"><Filter className="h-4 w-4 mr-2" />クロス分析</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center"><CalendarDays className="h-4 w-4 mr-2" />曜日別廃棄（個数）</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="flex items-end justify-between h-40 gap-1 pt-4">
                                        {dayLabels.map((label, i) => {
                                            const val = analysisData.dayStats[i] || 0;
                                            const max = Math.max(...Object.values(analysisData.dayStats));
                                            const height = max > 0 ? (val / max) * 100 : 0;
                                            return (
                                                <div key={label} className="flex-1 flex flex-col items-center gap-2">
                                                    <div className="text-[10px] font-bold">{val > 0 ? val : ''}</div>
                                                    <div className="w-full bg-primary rounded-t-sm transition-all" style={{ height: `${height}%` }} />
                                                    <div className={cn("text-xs font-medium p-1 rounded", i === 7 ? "text-destructive" : i === 0 ? "text-destructive" : i === 6 ? "text-blue-500" : "")}>{label}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center"><Sun className="h-4 w-4 mr-2" />天気別廃棄（個数）</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="flex items-end justify-around h-40 gap-4 pt-4">
                                        {Object.entries(weatherLabels).map(([key, label]) => {
                                            const val = analysisData.weatherStats[key] || 0;
                                            const max = Math.max(...Object.values(analysisData.weatherStats));
                                            const height = max > 0 ? (val / max) * 100 : 0;
                                            return (
                                                <div key={key} className="flex-1 flex flex-col items-center gap-2 max-w-[60px]">
                                                    <div className="text-[10px] font-bold">{val > 0 ? val : ''}</div>
                                                    <div className="w-full bg-accent rounded-t-sm transition-all" style={{ height: `${height}%` }} />
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
                                            <TableHead className="text-right">廃棄個数</TableHead>
                                            <TableHead className="text-right">廃棄ロス額(原価)</TableHead>
                                            <TableHead className="text-center">主な要因(曜日)</TableHead>
                                            <TableHead className="text-center">主な要因(天気)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analysisData.products.map((p) => {
                                            const topDow = Object.entries(p.dowCount).sort((a: any, b: any) => b[1] - a[1])[0];
                                            const topWeather = Object.entries(p.weatherCount).sort((a: any, b: any) => b[1] - a[1])[0];
                                            return (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">{p.name}</TableCell>
                                                    <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                                                    <TableCell className="text-right font-bold">{p.totalCount.toLocaleString()} 個</TableCell>
                                                    <TableCell className="text-right">¥{p.totalCost.toLocaleString()}</TableCell>
                                                    <TableCell className="text-center text-xs">
                                                        {topDow && Number(topDow[1]) > 0 ? <span className="text-destructive font-bold">{dayLabels[Number(topDow[0])]}</span> : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs">
                                                        {topWeather && Number(topWeather[1]) > 0 ? weatherLabels[topWeather[0]] : '-'}
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
                                <CardTitle className="text-base">曜日 × 天気 クロス集計（廃棄個数）</CardTitle>
                                <CardDescription>どの曜日のどの天気の時に、最もロスが発生しているかを確認できます。</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-20">曜日 \ 天気</TableHead>
                                            {Object.entries(weatherLabels).map(([_, label]) => <TableHead key={label} className="text-center">{label}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dayLabels.map((label, dowIndex) => (
                                            <TableRow key={label}>
                                                <TableHead className={cn("font-bold", dowIndex === 7 || dowIndex === 0 ? "text-destructive" : "")}>{label}</TableHead>
                                                {Object.keys(weatherLabels).map(weatherKey => {
                                                    const val = analysisData.dayWeatherMatrix[`${dowIndex}-${weatherKey}`] || 0;
                                                    return (
                                                        <TableCell key={weatherKey} className={cn("text-center tabular-nums", val > 0 ? "bg-primary/5 font-bold" : "text-muted-foreground")}>
                                                            {val > 0 ? `${val}個` : '-'}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
