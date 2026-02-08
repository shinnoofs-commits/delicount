'use client';

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
import { useTransactions } from "@/contexts/transaction-context";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, isValid } from "date-fns"
import { ja } from "date-fns/locale"
import { Calendar as CalendarIcon } from 'lucide-react';
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { useProducts } from "@/contexts/product-context";
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge";
import { StoreSelector } from "@/components/ui/store-selector";
import { useAdmin } from "@/hooks/use-admin";

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
                {format(date.from, "LLL dd, y")} -{" "}
                {format(date.to, "LLL dd, y")}
              </>
            ) : (
              format(date.from, "LLL dd, y")
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

type AbcRank = 'A' | 'B' | 'C';

type AbcDataItem = {
    productId: string;
    productName: string;
    wasteCost: number;
    cumulativePercentage: number;
    rank: AbcRank;
};


export default function AbcAnalysisPage() {
  const { wasteEntries, loading: wasteLoading } = useTransactions();
  const { products, loading: productsLoading } = useProducts();
  const { isAdmin } = useAdmin();

  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });

  const filteredWasteEntries = useMemo(() => {
    if (!date || !date.from) return [];
    
    const fromDate = startOfDay(date.from);
    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

    return wasteEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return isValid(entryDate) && entryDate >= fromDate && entryDate <= toDate;
    });
  }, [date, wasteEntries]);

  const abcAnalysisData: AbcDataItem[] = useMemo(() => {
    // A map to hold aggregated waste data, keyed by productCode
    const wasteDataByProductCode = new Map<string, { name: string; wasteCost: number }>();

    filteredWasteEntries.forEach(entry => {
      entry.items.forEach(item => {
        // Always find the corresponding product from the master list using productId.
        // This is the single source of truth for product details like name and productCode.
        const product = products.find(p => p.id === item.productId);

        // If product is not found (e.g., it was deleted) or it doesn't have a product code,
        // we cannot reliably include it in a cross-store analysis. So we skip it.
        if (!product || !product.productCode) {
          return;
        }

        // Use the product master's code and name for aggregation and display.
        const { productCode, name } = product;

        // Use the cost price recorded at the time of waste for accuracy.
        const { costPrice, quantity } = item;

        // Aggregate waste cost by product code.
        const currentData = wasteDataByProductCode.get(productCode) || { name, wasteCost: 0 };
        currentData.wasteCost += quantity * costPrice;
        wasteDataByProductCode.set(productCode, currentData);
      });
    });

    const sortedByWasteCost = Array.from(wasteDataByProductCode.entries())
        .map(([code, data]) => ({
            productCode: code,
            productName: data.name,
            wasteCost: data.wasteCost,
        }))
        .filter(p => p.wasteCost > 0)
        .sort((a, b) => b.wasteCost - a.wasteCost);

    const totalWasteCost = sortedByWasteCost.reduce((sum, p) => sum + p.wasteCost, 0);
    if (totalWasteCost === 0) return [];

    let cumulativeCost = 0;
    return sortedByWasteCost.map(product => {
        cumulativeCost += product.wasteCost;
        const cumulativePercentage = (cumulativeCost / totalWasteCost) * 100;
        
        let rank: AbcRank;
        if (cumulativePercentage <= 70) {
            rank = 'A';
        } else if (cumulativePercentage <= 90) {
            rank = 'B';
        } else {
            rank = 'C';
        }

        return {
            productId: product.productCode,
            productName: product.productName,
            wasteCost: product.wasteCost,
            cumulativePercentage,
            rank,
        };
    });
  }, [products, filteredWasteEntries]);
  
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

  return (
    <div className="flex flex-col gap-4">
       <div className="flex flex-col gap-4 p-4 border rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <p className="text-sm font-medium mb-2">分析対象の店舗</p>
              {isAdmin ? <StoreSelector /> : <p className="text-sm text-muted-foreground">自店舗のデータのみ表示</p>}
            </div>
            <div>
              <p className="text-sm font-medium mb-2">期間を選択</p>
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
      </div>


      <Card>
        <CardHeader>
            <CardTitle>廃棄ABC分析</CardTitle>
            <CardDescription>廃棄額の大きさに基づいて商品をランク付けし、管理の優先度を明確にします。</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ランク</TableHead>
                        <TableHead>商品名</TableHead>
                        <TableHead className="text-right">廃棄額</TableHead>
                        <TableHead className="text-right">累積比率</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {abcAnalysisData.map(data => (
                        <TableRow key={data.productId}>
                            <TableCell>
                                <Badge variant={data.rank === 'A' ? 'destructive' : data.rank === 'B' ? 'secondary': 'outline'}>
                                    {data.rank}
                                </Badge>
                            </TableCell>
                            <TableCell>{data.productName}</TableCell>
                            <TableCell className="text-right">¥{data.wasteCost.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{data.cumulativePercentage.toFixed(1)}%</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  )
}
