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
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, isValid, getDay, addDays } from "date-fns"
import { ja } from "date-fns/locale"
import holiday_jp from '@holiday-jp/holiday_jp';
import { DateRange } from "react-day-picker"
import { useTransactions } from "@/contexts/transaction-context";
import { useProducts } from "@/contexts/product-context";
import { useProduction } from "@/contexts/production-context";
import { useAdmin } from "@/hooks/use-admin";
import { StoreSelector } from "@/components/ui/store-selector";

type RankType = 'A' | 'B' | 'C';

interface AnalysisItem {
    key: string;
    productName: string;
    totalWasteCount: number;
    totalWasteCost: number;
    totalActualProduction: number;
    wasteRatio: number;
    cumulativePercentage: number;
    rank: RankType;
}

export default function AbcAnalysisPage() {
    const { wasteEntries, loading: wasteLoading } = useTransactions();
    const { products, loading: productsLoading } = useProducts();
    const { productionEntries, loading: productionLoading } = useProduction();
    const { isAdmin } = useAdmin();

    const [selectedFilters, setSelectedFilters] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7]);
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const { validDateObjects } = useMemo(() => {
        if (!date || !date.from) return { validDateObjects: [] };
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
        return { validDateObjects: objects };
    }, [date, selectedFilters]);

    const abcAnalysisData = useMemo((): AnalysisItem[] => {
        if (wasteLoading || productsLoading || productionLoading || validDateObjects.length === 0) return [];
        
        const aggregatedWaste = new Map<string, { name: string, totalQuantity: number, totalCost: number }>();
        const aggregatedActualProduction = new Map<string, number>();
        
        const productsMap = new Map(products.map(p => [isAdmin ? `${p.storeId}-${p.id}` : p.id, p]));
        const validDatesSet = new Set(validDateObjects.map(d => format(d, 'yyyy-MM-dd')));

        wasteEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            return isValid(entryDate) && validDatesSet.has(format(startOfDay(entryDate), 'yyyy-MM-dd'));
        }).forEach(entry => {
            entry.items.forEach(item => {
                const productKey = isAdmin ? `${entry.storeId}-${item.productId}` : item.productId;
                const product = productsMap.get(productKey);
                const aggregationKey = isAdmin ? (item.productCode || product?.productCode || item.productId) : item.productId;

                const current = aggregatedWaste.get(aggregationKey) || { name: product?.name || item.name, totalQuantity: 0, totalCost: 0 };
                current.totalQuantity += item.quantity;
                current.totalCost += item.quantity * (product?.costPrice || item.costPrice || 0);
                aggregatedWaste.set(aggregationKey, current);
            });
        });

        // 実際の製造実績データを集計
        productionEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            return isValid(entryDate) && validDatesSet.has(format(startOfDay(entryDate), 'yyyy-MM-dd'));
        }).forEach(entry => {
            entry.items.forEach(item => {
                const productKey = isAdmin ? `${entry.storeId}-${item.productId}` : item.productId;
                const product = productsMap.get(productKey);
                const aggregationKey = isAdmin ? (item.productCode || product?.productCode || item.productId) : item.productId;

                const currentQty = aggregatedActualProduction.get(aggregationKey) || 0;
                aggregatedActualProduction.set(aggregationKey, currentQty + item.quantity);
            });
        });

        const sortedDataByCost = Array.from(aggregatedWaste.entries())
            .map(([key, data]) => {
                const totalActualProduction = aggregatedActualProduction.get(key) || 0;
                return {
                    key,
                    productName: data.name,
                    totalWasteCount: data.totalQuantity,
                    totalWasteCost: data.totalCost,
                    totalActualProduction,
                    wasteRatio: totalActualProduction > 0 ? (data.totalQuantity / totalActualProduction) * 100 : 0,
                };
            })
            .sort((a, b) => b.totalWasteCost - a.totalWasteCost);

        const grandTotalWasteCost = sortedDataByCost.reduce((sum, item) => sum + item.totalWasteCost, 0);
        let cumulativeCost = 0;
        
        return sortedDataByCost.map(item => {
            cumulativeCost += item.totalWasteCost;
            const cumulativePercentage = grandTotalWasteCost > 0 ? (cumulativeCost / grandTotalWasteCost) * 100 : 0;
            
            // 一般的なABC分析の基準: A=累計70%まで, B=累計90%まで, C=それ以降
            let rank: RankType = 'C';
            if (cumulativePercentage <= 70) rank = 'A';
            else if (cumulativePercentage <= 90) rank = 'B';

            return { ...item, cumulativePercentage, rank };
        });
    }, [validDateObjects, isAdmin, products, wasteEntries, productionEntries, wasteLoading, productsLoading, productionLoading]);

    const rankCounts = useMemo(() => {
        const counts: Record<RankType, number> = { A: 0, B: 0, C: 0 };
        abcAnalysisData.forEach(item => {
            counts[item.rank]++;
        });
        return counts;
    }, [abcAnalysisData]);

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>ABC分析</CardTitle>
                    <CardDescription>
                        廃棄ロス額（原価）の累積構成比に基づきランク付けします。製造実績に対する廃棄率も表示します。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div><Label className="mb-2 block">対象店舗</Label>{isAdmin ? <StoreSelector /> : <p className="text-sm">自店舗</p>}</div>
                        <div>
                            <Label className="mb-2 block">分析期間</Label>
                            <div className="flex gap-2">
                                <Popover>
                                    <PopoverTrigger asChild><Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />期間変更</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="range" selected={date} onSelect={setDate} locale={ja} /></PopoverContent>
                                </Popover>
                                <Button variant="outline" size="sm" onClick={() => setDate({from: startOfMonth(new Date()), to: endOfMonth(new Date())})}>今月</Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {(wasteLoading || productionLoading) ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        {(['A', 'B', 'C'] as RankType[]).map(r => (
                            <Card key={r}>
                                <CardHeader className="pb-2"><CardTitle className="text-sm">{r}ランク (最重要管理品目)</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{rankCounts[r]}品目</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {r === 'A' ? '累積ロス額の70%を占める品目' : r === 'B' ? '累積ロス額の70〜90%を占める品目' : '累積ロス額の残り10%を占める品目'}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <Card>
                        <CardContent className="pt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ランク</TableHead>
                                        <TableHead>商品名</TableHead>
                                        <TableHead className="text-right">廃棄(個数)</TableHead>
                                        <TableHead className="text-right">廃棄ロス額(原価)</TableHead>
                                        <TableHead className="text-right">構成比(累積%)</TableHead>
                                        <TableHead className="text-right">製造実績</TableHead>
                                        <TableHead className="text-right">廃棄率(実績対比)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {abcAnalysisData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">データがありません</TableCell>
                                        </TableRow>
                                    ) : abcAnalysisData.map((item) => (
                                        <TableRow key={item.key}>
                                            <TableCell><Badge variant={item.rank === 'A' ? 'destructive' : item.rank === 'B' ? 'secondary' : 'outline'}>{item.rank}</Badge></TableCell>
                                            <TableCell className="font-medium">{item.productName}</TableCell>
                                            <TableCell className="text-right">{item.totalWasteCount.toLocaleString()} 個</TableCell>
                                            <TableCell className="text-right">¥{item.totalWasteCost.toLocaleString()}</TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">{item.cumulativePercentage.toFixed(1)}%</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{item.totalActualProduction.toLocaleString()} 個</TableCell>
                                            <TableCell className="text-right font-bold text-primary">
                                                {item.totalActualProduction > 0 ? `${item.wasteRatio.toFixed(1)}%` : '-'}
                                            </TableCell>
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
