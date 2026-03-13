
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
import type { DailyProduction, WasteEntry } from "@/lib/types";

const dayMap: (keyof DailyProduction)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function AbcAnalysisPage() {
    const { wasteEntries, loading: wasteLoading } = useTransactions();
    const { products, loading: productsLoading } = useProducts();
    const { isAdmin } = useAdmin();

    const [selectedFilters, setSelectedFilters] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7]);
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const { validDateObjects, numberOfDays } = useMemo(() => {
        if (!date || !date.from) return { validDateObjects: [], numberOfDays: 1 };
        const fromDate = startOfDay(date.from);
        const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
        const objects: Date[] = [];
        let currentDate = fromDate;
        while (currentDate <= toDate) {
            const dayOfWeek = getDay(currentDate);
            const isHoliday = holiday_jp.isHoliday(currentDate);
            if ((isHoliday && selectedFilters.includes(7)) || (!isHoliday && selectedFilters.includes(dayOfWeek))) {
                objects.push(new Date(currentDate));
            }
            currentDate = addDays(currentDate, 1);
        }
        return { validDateObjects: objects, numberOfDays: objects.length > 0 ? objects.length : 1 };
    }, [date, selectedFilters]);

    const abcAnalysisData = useMemo(() => {
        if (wasteLoading || productsLoading || validDateObjects.length === 0) return [];
        const aggregatedWaste = new Map<string, { name: string, totalQuantity: number, totalCost: number, productCode: string }>();
        const productsMap = new Map(products.map(p => [isAdmin ? `${p.storeId}-${p.id}` : p.id, p]));
        const validDatesSet = new Set(validDateObjects.map(d => format(d, 'yyyy-MM-dd')));

        const filteredWasteEntries = wasteEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            return isValid(entryDate) && validDatesSet.has(format(startOfDay(entryDate), 'yyyy-MM-dd'));
        });

        filteredWasteEntries.forEach(entry => {
            entry.items.forEach(item => {
                const productKey = isAdmin ? `${entry.storeId}-${item.productId}` : item.productId;
                const product = productsMap.get(productKey);
                const currentCostPrice = product ? product.costPrice : (item.costPrice || 0);
                const aggregationKey = isAdmin ? (item.productCode || product?.productCode || item.productId) : item.productId;

                const current = aggregatedWaste.get(aggregationKey) || { name: product?.name || item.name, totalQuantity: 0, totalCost: 0, productCode: item.productCode || product?.productCode || '' };
                current.totalQuantity += item.quantity;
                current.totalCost += item.quantity * currentCostPrice;
                aggregatedWaste.set(aggregationKey, current);
            });
        });

        // 日付ごとの天気をマップ化（製造予定数算出用）
        const weatherMap = new Map(filteredWasteEntries.map(e => [format(e.date, 'yyyy-MM-dd'), e.weather]));

        const calculatedData = Array.from(aggregatedWaste.entries()).map(([key, data]) => {
            let totalPlannedForPeriod = 0;
            const sameCodeProducts = products.filter(p => p.productCode === data.productCode);
            
            validDateObjects.forEach(d => {
                const dateKey = format(d, 'yyyy-MM-dd');
                const weatherAtDate = weatherMap.get(dateKey) || 'sunny';
                const isHoliday = holiday_jp.isHoliday(d);
                const dayKey = dayMap[getDay(d)];
                const productionPatternKey = weatherAtDate === 'rainy' ? 'dailyProductionRainy' : 'dailyProductionSunny';

                if (isAdmin) {
                    sameCodeProducts.forEach(p => {
                        const daily = p[productionPatternKey];
                        if (daily) totalPlannedForPeriod += (isHoliday && daily.holiday !== undefined) ? daily.holiday : (daily[dayKey] || 0);
                    });
                } else {
                    const product = products.find(p => p.id === key);
                    const daily = product?.[productionPatternKey];
                    if (daily) totalPlannedForPeriod += (isHoliday && daily.holiday !== undefined) ? daily.holiday : (daily[dayKey] || 0);
                }
            });

            return {
                key,
                productName: data.name,
                totalWasteCount: data.totalQuantity,
                totalWasteCost: data.totalCost,
                totalPlannedProduction: totalPlannedForPeriod,
                wasteRatio: totalPlannedForPeriod > 0 ? (data.totalQuantity / totalPlannedForPeriod) * 100 : 0,
                averageDailyWaste: data.totalQuantity / numberOfDays,
            };
        });

        const sortedData = calculatedData.sort((a, b) => b.totalWasteCost - a.totalWasteCost);
        const grandTotalWasteCost = sortedData.reduce((sum, item) => sum + item.totalWasteCost, 0);
        let cumulativeCostPercentage = 0;
        return sortedData.map(item => {
            cumulativeCostPercentage += grandTotalWasteCost > 0 ? (item.totalWasteCost / grandTotalWasteCost) * 100 : 0;
            const rank = cumulativeCostPercentage <= 70 ? 'A' : cumulativeCostPercentage <= 90 ? 'B' : 'C';
            return { ...item, rank };
        });
    }, [validDateObjects, isAdmin, numberOfDays, products, wasteEntries, wasteLoading, productsLoading]);

    const rankCounts = useMemo(() => {
        return abcAnalysisData.reduce((acc, item) => { acc[item.rank]++; return acc; }, { A: 0, B: 0, C: 0 });
    }, [abcAnalysisData]);

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>ABC分析</CardTitle>
                    <CardDescription>廃棄額（原価）基準のランク付けと、製造予定数に対する廃棄率を表示します。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div><Label className="mb-2 block">店舗</Label>{isAdmin ? <StoreSelector /> : <p className="text-sm">自店舗</p>}</div>
                        <div>
                            <Label className="mb-2 block">期間</Label>
                            <div className="flex gap-2">
                                <Popover>
                                    <PopoverTrigger asChild><Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />期間選択</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="range" selected={date} onSelect={setDate} locale={ja} /></PopoverContent>
                                </Popover>
                                <Button variant="outline" size="sm" onClick={() => setDate({from: startOfMonth(new Date()), to: endOfMonth(new Date())})}>今月</Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {wasteLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        {['A', 'B', 'C'].map(r => (
                            <Card key={r}>
                                <CardHeader className="pb-2"><CardTitle className="text-sm">{r}ランク</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{rankCounts[r as keyof typeof rankCounts]}品目</div></CardContent>
                            </Card>
                        ))}
                    </div>
                    <Card>
                        <CardContent className="pt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ランク</TableHead><TableHead>商品名</TableHead>
                                        <TableHead className="text-right">廃棄ロス</TableHead>
                                        <TableHead className="text-right">製造数対比(廃棄率)</TableHead>
                                        <TableHead className="text-right">1日平均廃棄</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {abcAnalysisData.map((item) => (
                                        <TableRow key={item.key}>
                                            <TableCell><Badge variant={item.rank === 'A' ? 'destructive' : item.rank === 'B' ? 'secondary' : 'outline'}>{item.rank}</Badge></TableCell>
                                            <TableCell>{item.productName}</TableCell>
                                            <TableCell className="text-right">¥{item.totalWasteCost.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-bold text-primary">{item.totalPlannedProduction > 0 ? `${item.wasteRatio.toFixed(1)}%` : '-'}</TableCell>
                                            <TableCell className="text-right">{item.averageDailyWaste.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
