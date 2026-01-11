
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
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts"
import { Calendar as CalendarIcon, Trash2, TrendingDown } from 'lucide-react';
import { useMemo, useState } from "react";
import type { Category, Product } from "@/lib/types";
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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

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
    wasteCount: number;
    costPrice: number;
    price: number;
    totalWasteCost: number;
    opportunityLoss: number;
};

export default function DashboardPage() {
  const { transactions, wasteEntries } = useTransactions();
  const { products } = useProducts();

  const categories = useMemo(() => [...new Set(products.map(p => p.category))] as Category[], [products]);

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
    const wasteDataMap = new Map<string, WasteData>();

    products.forEach(product => {
        wasteDataMap.set(product.id, {
            productId: product.id,
            productName: product.name,
            wasteCount: 0,
            costPrice: product.costPrice,
            price: product.price,
            totalWasteCost: 0,
            opportunityLoss: 0,
        });
    });

    filteredWasteEntries.forEach(entry => {
        entry.items.forEach(item => {
            const data = wasteDataMap.get(item.productId);
            if (data) {
                data.wasteCount += item.quantity;
            }
        });
    });
    
    return Array.from(wasteDataMap.values()).map(data => ({
        ...data,
        totalWasteCost: data.wasteCount * data.costPrice,
        opportunityLoss: data.wasteCount * data.price,
    })).filter(d => d.wasteCount > 0);

  }, [products, filteredTransactions, filteredWasteEntries]);
  
  const totalWasteCost = useMemo(() => wasteAnalysisData.reduce((acc, p) => acc + p.totalWasteCost, 0), [wasteAnalysisData]);
  const totalOpportunityLoss = useMemo(() => wasteAnalysisData.reduce((acc, p) => acc + p.opportunityLoss, 0), [wasteAnalysisData]);
  const totalWaste = useMemo(() => wasteAnalysisData.reduce((acc, p) => acc + p.wasteCount, 0), [wasteAnalysisData]);

  const salesByCategory = useMemo(() => categories.map(category => {
      const productSales = filteredTransactions
          .flatMap(t => t.items)
          .filter(item => {
              const product = products.find(p => p.id === item.productId);
              return product?.category === category;
          })
          .reduce((acc, item) => {
              const product = products.find(p => p.id === item.productId);
              if (!product) return acc;
              
              const existing = acc.find(p => p.name === product.name);
              const transaction = transactions.find(t => t.items.some(i => i.productId === item.productId));
              const discountValue = (transaction?.discount?.type === 'percentage' ? transaction.discount.value : 0);
              const saleAmount = item.quantity * item.unitPrice * (item.wasDiscounted ? (1 - discountValue / 100) : 1);

              if (existing) {
                  existing.quantity += item.quantity;
                  existing.total += saleAmount;
              } else {
                  acc.push({ name: product.name, quantity: item.quantity, total: saleAmount });
              }
              return acc;
          }, [] as { name: string; quantity: number, total: number }[])
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

      return {
          category,
          sales: productSales
      };
  }), [filteredTransactions, products, categories, transactions]);

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
       <div className="flex flex-wrap items-center gap-4">
        <DateRangePicker date={date} setDate={setDate} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDatePreset('today')}>今日</Button>
          <Button variant="outline" size="sm" onClick={() => setDatePreset('last_7_days')}>過去7日間</Button>
          <Button variant="outline" size="sm" onClick={() => setDatePreset('this_month')}>今月</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">廃棄ロス（原価）</CardTitle>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">¥{totalWasteCost.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">総廃棄数: {totalWaste.toLocaleString()}個</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">機会損失（売価）</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">¥{totalOpportunityLoss.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">廃棄された商品の売価合計です。</p>
            </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <Card>
            <CardHeader>
                <CardTitle>廃棄分析</CardTitle>
                <CardDescription>各商品の廃棄状況と、それに伴う損失額の一覧です。</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>商品名</TableHead>
                            <TableHead className="text-right">売価</TableHead>
                            <TableHead className="text-right">原価</TableHead>
                            <TableHead className="text-right">廃棄数</TableHead>
                            <TableHead className="text-right">廃棄額</TableHead>
                            <TableHead className="text-right">機会損失</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {wasteAnalysisData.map(data => (
                            <TableRow key={data.productId}>
                                <TableCell className="font-medium">{data.productName}</TableCell>
                                <TableCell className="text-right">¥{data.price.toLocaleString()}</TableCell>
                                <TableCell className="text-right">¥{data.costPrice.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{data.wasteCount}</TableCell>
                                <TableCell className="text-right font-medium">¥{data.totalWasteCost.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-destructive">¥{data.opportunityLoss.toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
       <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-1 gap-4 auto-rows-min lg:grid-cols-2 xl:grid-cols-3">
            {salesByCategory.filter(cat => cat.sales.length > 0).map(({ category, sales }) => (
            <Card key={category}>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg">{category} 売上 TOP5</CardTitle>
                    <CardDescription>選択期間中の{category}カテゴリの売上トップ5です。</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={sales}
                                dataKey="total"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                labelLine={false}
                                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            >
                                {sales.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: 'var(--radius)'
                                }}
                                formatter={(value: number, name) => [`¥${Math.round(value).toLocaleString()}`, name]}
                            />
                            <Legend formatter={(value) => <span className="text-muted-foreground text-xs truncate w-32 inline-block">{value}</span>} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            ))}
        </div>
      </div>
    </div>
  )
}
