
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

type WasteData = {
    productId: string;
    productName: string;
    productionQuantity: number;
    wasteCount: number;
    costPrice: number;
    price: number;
    totalWasteCost: number;
    opportunityLoss: number;
};

type AbcRank = 'A' | 'B' | 'C';

type AbcDataItem = {
    productId: string;
    productName: string;
    wasteCost: number;
    cumulativePercentage: number;
    rank: AbcRank;
};


export default function AbcAnalysisPage() {
  const { transactions, wasteEntries } = useTransactions();
  const { products } = useProducts();

  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });

  const { filteredTransactions, filteredWasteEntries } = useMemo(() => {
    if (!date || !date.from) return { filteredTransactions: [], filteredWasteEntries: [] };
    
    const fromDate = startOfDay(date.from);
    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

    const filterByDate = (entry: { date: Date }) => {
        const entryDate = new Date(entry.date);
        return isValid(entryDate) && entryDate >= fromDate && entryDate <= toDate;
    };

    return {
        filteredTransactions: transactions.filter(filterByDate),
        filteredWasteEntries: wasteEntries.filter(filterByDate)
    };
  }, [date, transactions, wasteEntries]);

  const wasteAnalysisData: WasteData[] = useMemo(() => {
    return products.map(product => {
        const transactionsWithProduct = filteredTransactions.filter(t => t.items.some(item => item.productId === product.id));

        const normalSales = transactionsWithProduct
            .filter(t => !t.discount || t.discount.value === 0)
            .flatMap(t => t.items)
            .filter(item => item.productId === product.id)
            .reduce((sum, item) => sum + item.quantity, 0);
        
        const discountedSalesByRate = [10, 20, 30, 40].reduce((acc, rate) => ({ ...acc, [rate]: 0 }), {});

        const discountedTransactions = transactionsWithProduct.filter(t => t.discount?.type === 'percentage' && t.discount.value > 0);
        
        discountedTransactions.forEach(t => {
            const rate = t.discount!.value;
            if ([10, 20, 30, 40].includes(rate)) {
                const productItem = t.items.find(item => item.productId === product.id);
                if (productItem) {
                    (discountedSalesByRate as any)[rate] += productItem.quantity;
                }
            }
        });
        
        const totalDiscountedSales = Object.values(discountedSalesByRate).reduce((sum, q) => sum + q, 0);
        const totalSold = normalSales + totalDiscountedSales;
        
        const wastedQuantityFromEntries = filteredWasteEntries
          .flatMap(we => we.items)
          .filter(item => item.productId === product.id)
          .reduce((sum, item) => sum + item.quantity, 0);
        
        const wasteCount = Math.max(0, product.productionQuantity - totalSold) + wastedQuantityFromEntries;

        return {
            productId: product.id,
            productName: product.name,
            productionQuantity: product.productionQuantity,
            wasteCount,
            costPrice: product.costPrice,
            price: product.price,
            totalWasteCost: wasteCount * product.costPrice,
            opportunityLoss: wasteCount * product.price,
        };
    }).filter(d => d.productionQuantity > 0 || d.wasteCount > 0);
  }, [products, filteredTransactions, filteredWasteEntries]);
  
  const abcAnalysisData: AbcDataItem[] = useMemo(() => {
    const sortedByWasteCost = wasteAnalysisData
      .filter(p => p.totalWasteCost > 0)
      .sort((a, b) => b.totalWasteCost - a.totalWasteCost);

    const totalWasteCost = sortedByWasteCost.reduce((sum, p) => sum + p.totalWasteCost, 0);
    if (totalWasteCost === 0) return [];

    let cumulativeCost = 0;
    return sortedByWasteCost.map(product => {
      cumulativeCost += product.totalWasteCost;
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
        productId: product.productId,
        productName: product.productName,
        wasteCost: product.totalWasteCost,
        cumulativePercentage,
        rank,
      };
    });
  }, [wasteAnalysisData]);
  
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
       <div className="flex items-center gap-4">
        <DateRangePicker date={date} setDate={setDate} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDatePreset('today')}>今日</Button>
          <Button variant="outline" size="sm" onClick={() => setDatePreset('last_7_days')}>過去7日間</Button>
          <Button variant="outline" size="sm" onClick={() => setDatePreset('this_month')}>今月</Button>
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
