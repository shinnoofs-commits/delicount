
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';

import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, isValid, getDay, addDays } from "date-fns"
import { ja } from "date-fns/locale"
import holiday_jp from '@holiday-jp/holiday_jp';
import { DateRange } from "react-day-picker"

import { useTransactions } from "@/contexts/transaction-context";
import { useProducts } from "@/contexts/product-context";
import { useAdmin } from "@/hooks/use-admin";
import { StoreSelector } from "@/components/ui/store-selector";
import { cn } from "@/lib/utils";
import type { Product, WasteEntry } from "@/lib/types";

type AbcAnalysisData = {
    rank: 'A' | 'B' | 'C';
    productId: string;
    productCode?: string;
    productName: string;
    totalWasteCount: number;
    averageDailyWaste: number;
    cumulativePercentage: number;
};


export default function AbcAnalysisPage() {
    const { wasteEntries, loading: wasteLoading } = useTransactions();
    const { products: allProducts, loading: productsLoading } = useProducts();
    const { isAdmin } = useAdmin();

    const [selectedFilters, setSelectedFilters] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7]);
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const handleFilterToggle = (filterId: number) => {
        setSelectedFilters(prev => 
            prev.includes(filterId) ? prev.filter(d => d !== filterId) : [...prev, filterId]
        );
    };

    const setDatePreset = (preset: 'today' | 'this_month' | 'last_7_days') => {
        const today = new Date();
        if (preset === 'today') {
          setDate({ from: today, to: today });
        } else if (preset === 'this_month') {
          setDate({ from: startOfMonth(today), to: endOfMonth(today) });
        } else if (preset === 'last_7_days') {
          setDate({ from: subDays(today, 6), to: today });
        }
    }
    
    const { filteredWasteEntries, numberOfDays } = useMemo(() => {
        if (!date || !date.from) return { filteredWasteEntries: [], numberOfDays: 1 };
        
        const fromDate = startOfDay(date.from);
        const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

        let dayCount = 0;
        const validDates = new Set<string>();
        let currentDate = fromDate;

        while (currentDate <= toDate) {
            const dayOfWeek = getDay(currentDate);
            const isHoliday = holiday_jp.isHoliday(currentDate);
            const isDaySelected = selectedFilters.includes(dayOfWeek);
            const isHolidaySelected = selectedFilters.includes(7);

            const dayIsValid = (isHoliday && isHolidaySelected) || (!isHoliday && isDaySelected);

            if (dayIsValid) {
                dayCount++;
                validDates.add(format(currentDate, 'yyyy-MM-dd'));
            }
            currentDate = addDays(currentDate, 1);
        }
        
        const entries = wasteEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            if (!isValid(entryDate)) return false;

            const formattedEntryDate = format(startOfDay(entryDate), 'yyyy-MM-dd');
            return validDates.has(formattedEntryDate);
        });

        return { 
            filteredWasteEntries: entries, 
            numberOfDays: dayCount > 0 ? dayCount : 1 
        };
    }, [date, wasteEntries, selectedFilters]);


    const abcAnalysisData: AbcAnalysisData[] = useMemo(() => {
        if (filteredWasteEntries.length === 0) return [];
        
        const productMap = new Map<string, Product>(allProducts.map(p => [p.id, p]));
        const aggregatedWaste = new Map<string, { name: string, totalQuantity: number, productCode?: string }>();

        filteredWasteEntries.forEach(entry => {
            entry.items.forEach(item => {
                let key: string | undefined;
                let name: string = item.name;

                const product = productMap.get(item.productId);

                if (isAdmin) {
                    key = product?.productCode;
                    if (product) name = product.name;
                } else {
                    key = item.productId;
                    if (product) name = product.name;
                }
                
                if (!key) return; 

                const existing = aggregatedWaste.get(key) || { name, totalQuantity: 0, productCode: product?.productCode };
                existing.totalQuantity += item.quantity;
                
                aggregatedWaste.set(key, existing);
            });
        });
        
        const calculatedData = Array.from(aggregatedWaste.entries()).map(([key, data]) => ({
            productId: isAdmin ? '' : key,
            productCode: isAdmin ? key : data.productCode,
            productName: data.name,
            totalWasteCount: data.totalQuantity,
            averageDailyWaste: data.totalQuantity / numberOfDays,
        }));

        if (calculatedData.length === 0) return [];

        const sortedData = calculatedData.sort((a, b) => b.averageDailyWaste - a.averageDailyWaste);
        const totalAverageWaste = sortedData.reduce((sum, item) => sum + item.averageDailyWaste, 0);

        if (totalAverageWaste === 0) return [];

        let cumulativePercentage = 0;
        return sortedData.map(item => {
            const percentage = (item.averageDailyWaste / totalAverageWaste) * 100;
            cumulativePercentage += percentage;
            let rank: 'A' | 'B' | 'C';
            if (cumulativePercentage <= 70) {
                rank = 'A';
            } else if (cumulativePercentage <= 90) {
                rank = 'B';
            } else {
                rank = 'C';
            }

            return {
                ...item,
                rank,
                cumulativePercentage,
            };
        });

    }, [filteredWasteEntries, allProducts, isAdmin, numberOfDays]);

    const rankCounts = useMemo(() => {
        return abcAnalysisData.reduce((acc, item) => {
            acc[item.rank]++;
            return acc;
        }, { A: 0, B: 0, C: 0 });
    }, [abcAnalysisData]);

    const isLoading = wasteLoading || productsLoading;
    
    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>ABC分析</CardTitle>
                    <CardDescription>指定した期間の廃棄状況をABC分析（重点分析）します。1日の平均廃棄数が多い順に商品を並べ、累計で70%までをAランク、90%までをBランク、それ以外をCランクとしています。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div>
                            <Label className="text-sm font-medium mb-2 block">分析対象の店舗</Label>
                            {isAdmin ? <StoreSelector /> : <p className="text-sm text-muted-foreground">自店舗のデータのみ表示</p>}
                        </div>
                        <div>
                            <Label className="text-sm font-medium mb-2 block">期間を選択</Label>
                            <div className="flex flex-wrap items-center gap-2">
                                <DateRangePicker date={date} setDate={setDate} />
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" onClick={() => setDatePreset('today')}>今日</Button>
                                  <Button variant="outline" size="sm" onClick={() => setDatePreset('last_7_days')}>過去7日間</Button>
                                  <Button variant="outline" size="sm" onClick={() => setDatePreset('this_month')}>今月</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="border-t pt-4">
                        <Label className="text-sm font-medium mb-2 block">曜日・祝日を選択</Label>
                        <div className="flex flex-wrap items-center gap-4">
                          {filterOptions.map(day => (
                            <div key={day.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`day-${day.id}`}
                                checked={selectedFilters.includes(day.id)}
                                onCheckedChange={() => handleFilterToggle(day.id)}
                              />
                              <Label htmlFor={`day-${day.id}`} className="text-sm font-normal cursor-pointer">{day.label}</Label>
                            </div>
                          ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Aランク品目</CardTitle>
                                <Badge variant="destructive" className="text-base">A</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{rankCounts.A}品目</div>
                                <p className="text-xs text-muted-foreground">【最重要管理】廃棄数の累計70%を占める品目群</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Bランク品目</CardTitle>
                                <Badge variant="secondary" className="text-base bg-yellow-500 text-white">B</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{rankCounts.B}品目</div>
                                <p className="text-xs text-muted-foreground">【重要管理】廃棄数の累計70%~90%を占める品目群</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Cランク品目</CardTitle>
                                <Badge variant="outline" className="text-base">C</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{rankCounts.C}品目</div>
                                <p className="text-xs text-muted-foreground">【一般管理】廃棄数の累計90%~100%を占める品目群</p>
                            </CardContent>
                        </Card>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>分析結果</CardTitle>
                            <CardDescription>
                                {isAdmin ? '選択された店舗' : 'あなたの店舗'}の廃棄分析結果です。
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-24">ランク</TableHead>
                                        <TableHead>商品名</TableHead>
                                        <TableHead className="text-right">廃棄合計</TableHead>
                                        <TableHead className="text-right">1日平均廃棄数</TableHead>
                                        <TableHead className="text-right">累計構成比</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {abcAnalysisData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                分析対象のデータがありません。
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        abcAnalysisData.map((item) => (
                                            <TableRow key={item.productCode || item.productId}>
                                                <TableCell><Badge variant={item.rank === 'A' ? 'destructive' : item.rank === 'B' ? 'secondary' : 'outline'} className={cn(item.rank === 'B' && 'bg-yellow-500 text-white')}>{item.rank}</Badge></TableCell>
                                                <TableCell className="font-medium">{item.productName}</TableCell>
                                                <TableCell className="text-right">{item.totalWasteCount.toLocaleString()} 個</TableCell>
                                                <TableCell className="text-right">{item.averageDailyWaste.toFixed(2)} 個</TableCell>
                                                <TableCell className="text-right">{item.cumulativePercentage.toFixed(1)}%</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
