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
import type { WasteEntry } from "@/lib/types";

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

type AbcAnalysisData = {
    key: string; // Unique key for the row (productCode for admin, productId for user)
    rank: 'A' | 'B' | 'C';
    productName: string;
    totalWasteCount: number;
    totalWasteCost: number;
    averageDailyWaste: number;
    cumulativePercentage: number;
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

        let aggregatedWaste: Map<string, { name: string, totalQuantity: number, totalCost: number }>;

        if (isAdmin) {
            if (products.length === 0) return [];
            const productsById = new Map(products.map(p => [p.id, p]));
            aggregatedWaste = new Map<string, { name: string, totalQuantity: number, totalCost: number }>();
            
            filteredWasteEntries.forEach(entry => {
                entry.items.forEach(item => {
                    const productCode = item.productCode || productsById.get(item.productId)?.productCode;
                    if (!productCode) return;

                    const current = aggregatedWaste.get(productCode) || { 
                        name: item.name, 
                        totalQuantity: 0,
                        totalCost: 0
                    };
                    current.totalQuantity += item.quantity;
                    current.totalCost += item.quantity * (item.costPrice || 0);
                    aggregatedWaste.set(productCode, current);
                });
            });
        } else {
           aggregatedWaste = new Map<string, { name: string, totalQuantity: number, totalCost: number }>();
           filteredWasteEntries.forEach(entry => {
            entry.items.forEach(item => {
              const current = aggregatedWaste.get(item.productId) || { 
                name: item.name, 
                totalQuantity: 0,
                totalCost: 0
              };
              current.totalQuantity += item.quantity;
              current.totalCost += item.quantity * (item.costPrice || 0);
              aggregatedWaste.set(item.productId, current);
            });
          });
        }

        const calculatedData = Array.from(aggregatedWaste.entries()).map(([key, data]) => ({
            key: key,
            productName: data.name,
            totalWasteCount: data.totalQuantity,
            totalWasteCost: data.totalCost,
            averageDailyWaste: data.totalQuantity / numberOfDays,
        }));


        if (calculatedData.length === 0) return [];

        const sortedData = calculatedData.sort((a, b) => b.totalWasteCost - a.totalWasteCost);
        const grandTotalWasteCost = sortedData.reduce((sum, item) => sum + item.totalWasteCost, 0);

        if (grandTotalWasteCost === 0) return [];

        let cumulativePercentage = 0;
        return sortedData.map(item => {
            const percentage = (item.totalWasteCost / grandTotalWasteCost) * 100;
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

    }, [filteredWasteEntries, isAdmin, numberOfDays, products]);

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
                    <CardDescription>指定した期間の廃棄状況をABC分析（重点分析）します。廃棄ロス額（原価）が多い順に商品を並べ、累計で70%までをAランク、90%までをBランク、それ以外をCランクとしています。</CardDescription>
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
                                {isAdmin ? '選択された店舗' : 'あなたの店舗'}の廃棄分析結果です。
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-24">ランク</TableHead>
                                        <TableHead>商品名</TableHead>
                                        <TableHead className="text-right">廃棄ロス(合計)</TableHead>
                                        <TableHead className="text-right">累計構成比</TableHead>
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
                                                <TableCell className="text-right">{item.cumulativePercentage.toFixed(1)}%</TableCell>
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
