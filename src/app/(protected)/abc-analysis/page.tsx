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
import type { DailyProduction } from "@/lib/types";

const DateRangePicker = ({ date, setDate }: { date: DateRange | undefined, setDate: (date: DateRange | undefined) => void }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant={"outline"}
          className={cn(
            "w-[300px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "yyyy年M月d日")} -{" "}
                {format(date.to, "yyyy年M月d日")}
              </>
            ) : (
              format(date.from, "yyyy年M月d日")
            )
          ) : (
            <span>日付を選択</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={date?.from}
          selected={date}
          onSelect={setDate}
          numberOfMonths={2}
          locale={ja}
        />
      </PopoverContent>
    </Popover>
  );
}

const filterOptions = [
  { id: 0, label: '日' },
  { id: 1, label: '月' },
  { id: 2, label: '火' },
  { id: 3, label: '水' },
  { id: 4, label: '木' },
  { id: 5, label: '金' },
  { id: 6, label: '土' },
  { id: 7, label: '祝' }
];

const dayMap: (keyof DailyProduction)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

type AbcAnalysisData = {
    key: string; 
    rank: 'A' | 'B' | 'C';
    productName: string;
    totalWasteCount: number;
    totalWasteCost: number;
    totalPlannedProduction: number;
    wasteRatio: number;
    averageDailyWaste: number;
};


export default function AbcAnalysisPage() {
    const { wasteEntries, loading: wasteLoading } = useTransactions();
    const { products, loading: productsLoading } = useProducts();
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
    
    // 対象となる日付のリスト（期間内でフィルタに合致する日）を計算
    const { validDateObjects, numberOfDays } = useMemo(() => {
        if (!date || !date.from) return { validDateObjects: [], numberOfDays: 1 };
        
        const fromDate = startOfDay(date.from);
        const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

        const objects: Date[] = [];
        let currentDate = fromDate;

        while (currentDate <= toDate) {
            const dayOfWeek = getDay(currentDate);
            const isHoliday = holiday_jp.isHoliday(currentDate);
            const isDaySelected = selectedFilters.includes(dayOfWeek);
            const isHolidaySelected = selectedFilters.includes(7);

            // 祝日選択中かつ祝日の場合、または当該曜日が選択中の場合
            const dayIsValid = (isHoliday && isHolidaySelected) || (!isHoliday && isDaySelected);

            if (dayIsValid) {
                objects.push(new Date(currentDate));
            }
            currentDate = addDays(currentDate, 1);
        }
        
        return { 
            validDateObjects: objects, 
            numberOfDays: objects.length > 0 ? objects.length : 1 
        };
    }, [date, selectedFilters]);


    const abcAnalysisData: AbcAnalysisData[] = useMemo(() => {
        if (wasteLoading || productsLoading || validDateObjects.length === 0) return [];

        const aggregatedWaste = new Map<string, { name: string, totalQuantity: number, totalCost: number, productCode: string }>();
        
        // 商品マスタをマップ化
        const productsMap = new Map(products.map(p => [isAdmin ? `${p.storeId}-${p.id}` : p.id, p]));
        
        // フィルタリングされた有効な日付のセット
        const validDatesSet = new Set(validDateObjects.map(d => format(d, 'yyyy-MM-dd')));

        // 廃棄エントリを日付で絞り込み
        const filteredWasteEntries = wasteEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            if (!isValid(entryDate)) return false;
            return validDatesSet.has(format(startOfDay(entryDate), 'yyyy-MM-dd'));
        });

        // 廃棄数を商品ごとに集計
        filteredWasteEntries.forEach(entry => {
            entry.items.forEach(item => {
                const productKey = isAdmin ? `${entry.storeId}-${item.productId}` : item.productId;
                const product = productsMap.get(productKey);
                
                // 最新の商品マスタから原価を取得
                const currentCostPrice = product ? product.costPrice : (item.costPrice || 0);
                
                // 集計キー（管理者の場合は商品コードで名寄せ）
                const aggregationKey = isAdmin ? (item.productCode || product?.productCode || item.productId) : item.productId;

                const current = aggregatedWaste.get(aggregationKey) || { 
                    name: product?.name || item.name, 
                    totalQuantity: 0,
                    totalCost: 0,
                    productCode: item.productCode || product?.productCode || ''
                };
                current.totalQuantity += item.quantity;
                current.totalCost += item.quantity * currentCostPrice;
                aggregatedWaste.set(aggregationKey, current);
            });
        });

        // 商品マスタから各商品の「期間内の累計予定製造数」を計算
        const calculatedData = Array.from(aggregatedWaste.entries()).map(([key, data]) => {
            let totalPlannedForPeriod = 0;
            
            if (isAdmin) {
                // 管理者の場合：選択中の全店舗における、同コード商品の予定数を全有効日程分足し合わせる
                const sameCodeProducts = products.filter(p => p.productCode === data.productCode);
                validDateObjects.forEach(d => {
                    const isHoliday = holiday_jp.isHoliday(d);
                    const dayKey = dayMap[getDay(d)];
                    
                    sameCodeProducts.forEach(p => {
                        const daily = p.dailyProduction;
                        if (daily) {
                            totalPlannedForPeriod += (isHoliday && daily.holiday !== undefined) ? daily.holiday : (daily[dayKey] || 0);
                        }
                    });
                });
            } else {
                // 店舗の場合：自店舗の該当商品の予定数を全有効日程分足し合わせる
                const product = products.find(p => p.id === key);
                if (product?.dailyProduction) {
                    const daily = product.dailyProduction;
                    validDateObjects.forEach(d => {
                        const isHoliday = holiday_jp.isHoliday(d);
                        const dayKey = dayMap[getDay(d)];
                        totalPlannedForPeriod += (isHoliday && daily.holiday !== undefined) ? daily.holiday : (daily[dayKey] || 0);
                    });
                }
            }

            return {
                key: key,
                productName: data.name,
                totalWasteCount: data.totalQuantity,
                totalWasteCost: data.totalCost,
                totalPlannedProduction: totalPlannedForPeriod,
                wasteRatio: totalPlannedForPeriod > 0 ? (data.totalQuantity / totalPlannedForPeriod) * 100 : 0,
                averageDailyWaste: data.totalQuantity / numberOfDays,
            };
        });


        if (calculatedData.length === 0) return [];

        // ABCランク付け：廃棄ロス額（原価）の大きい順
        const sortedData = calculatedData.sort((a, b) => b.totalWasteCost - a.totalWasteCost);
        const grandTotalWasteCost = sortedData.reduce((sum, item) => sum + item.totalWasteCost, 0);

        if (grandTotalWasteCost === 0) return sortedData.map(item => ({ ...item, rank: 'C' as const }));

        let cumulativeCostPercentage = 0;
        return sortedData.map(item => {
            const percentage = (item.totalWasteCost / grandTotalWasteCost) * 100;
            cumulativeCostPercentage += percentage;
            let rank: 'A' | 'B' | 'C';
            if (cumulativeCostPercentage <= 70) {
                rank = 'A';
            } else if (cumulativeCostPercentage <= 90) {
                rank = 'B';
            } else {
                rank = 'C';
            }

            return {
                ...item,
                rank,
            };
        });

    }, [validDateObjects, isAdmin, numberOfDays, products, wasteEntries, wasteLoading, productsLoading]);

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
                    <CardDescription>指定した期間の廃棄ロス額（原価）を基準に商品をランク付けし、その期間の合計製造数に対する廃棄率を表示します。</CardDescription>
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
                        <Label className="text-sm font-medium mb-2 block">集計に含める曜日・祝日を選択</Label>
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
                                <p className="text-xs text-muted-foreground">【最重要管理】廃棄ロス額の累計70%を占める品目群</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Bランク品目</CardTitle>
                                <Badge variant="secondary" className="text-base bg-yellow-500 text-white">B</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{rankCounts.B}品目</div>
                                <p className="text-xs text-muted-foreground">【重要管理】廃棄ロス額の累計70%~90%を占める品目群</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Cランク品目</CardTitle>
                                <Badge variant="outline" className="text-base">C</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{rankCounts.C}品目</div>
                                <p className="text-xs text-muted-foreground">【一般管理】廃棄ロス額の累計90%~100%を占める品目群</p>
                            </CardContent>
                        </Card>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>分析結果</CardTitle>
                            <CardDescription>
                                {isAdmin ? '選択された店舗' : 'あなたの店舗'}の廃棄分析結果です。製造数対比は、期間中の累計製造予定数に対する廃棄数の割合です。
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-24">ランク</TableHead>
                                        <TableHead>商品名</TableHead>
                                        <TableHead className="text-right">廃棄ロス(期間合計)</TableHead>
                                        <TableHead className="text-right">製造数対比(廃棄率)</TableHead>
                                        <TableHead className="text-right">廃棄合計(個数)</TableHead>
                                        <TableHead className="text-right">1日平均廃棄数</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {abcAnalysisData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                分析対象のデータがありません。
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        abcAnalysisData.map((item) => (
                                            <TableRow key={item.key}>
                                                <TableCell><Badge variant={item.rank === 'A' ? 'destructive' : item.rank === 'B' ? 'secondary' : 'outline'} className={cn(item.rank === 'B' && 'bg-yellow-500 text-white')}>{item.rank}</Badge></TableCell>
                                                <TableCell className="font-medium">{item.productName}</TableCell>
                                                <TableCell className="text-right">¥{item.totalWasteCost.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-semibold text-primary">
                                                    {item.totalPlannedProduction > 0 ? `${item.wasteRatio.toFixed(1)}%` : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">{item.totalWasteCount.toLocaleString()} 個</TableCell>
                                                <TableCell className="text-right">{item.averageDailyWaste.toFixed(2)} 個</TableCell>
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
