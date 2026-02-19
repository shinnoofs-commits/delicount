
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
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, isValid, getDay, addDays } from "date-fns"
import { ja } from "date-fns/locale"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import holiday_jp from '@holiday-jp/holiday_jp';
import { StoreSelector } from "@/components/ui/store-selector";
import { useAdmin } from "@/hooks/use-admin";

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
  const { isAdmin } = useAdmin();
  const [selectedFilters, setSelectedFilters] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7]);

  const categories = useMemo(() => [...new Set(products.map(p => p.category))] as Category[], [products]);

  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });

  const handleFilterToggle = (filterId: number) => {
    setSelectedFilters(prev => 
      prev.includes(filterId) ? prev.filter(d => d !== filterId) : [...prev, filterId]
    );
  };
  
  const { filteredTransactions, filteredWasteEntries } = useMemo(() => {
    if (!date || !date.from) return { filteredTransactions: [], filteredWasteEntries: [] };
    
    const fromDate = startOfDay(date.from);
    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

    const filterByDateAndDay = (entry: { date: Date }) => {
        const entryDate = new Date(entry.date);
        if (!isValid(entryDate) || entryDate < fromDate || entryDate > toDate) {
          return false;
        }

        if (selectedFilters.length === filterOptions.length) {
            return true;
        }
        if (selectedFilters.length === 0) {
            return false;
        }

        const dayOfWeek = getDay(entryDate);
        const isHoliday = holiday_jp.isHoliday(entryDate);

        const isDaySelected = selectedFilters.includes(dayOfWeek);
        const isHolidaySelected = selectedFilters.includes(7);

        if (isHoliday) {
            return isHolidaySelected;
        }
        
        return isDaySelected;
    };

    return {
        filteredTransactions: transactions.filter(filterByDateAndDay),
        filteredWasteEntries: wasteEntries.filter(filterByDateAndDay)
    };
  }, [date, transactions, wasteEntries, selectedFilters]);

  const wasteAnalysisData: WasteData[] = useMemo(() => {
    const wasteDataMap = new Map<string, WasteData>();

    filteredWasteEntries.forEach(entry => {
        entry.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return;

            const data = wasteDataMap.get(item.productId);
            if (data) {
                data.wasteCount += item.quantity;
            } else {
                wasteDataMap.set(item.productId, {
                    productId: product.id,
                    productName: product.name,
                    wasteCount: item.quantity,
                    costPrice: product.costPrice,
                    price: product.price,
                    totalWasteCost: 0,
                    opportunityLoss: 0,
                });
            }
        });
    });
    
    return Array.from(wasteDataMap.values()).map(data => ({
        ...data,
        totalWasteCost: data.wasteCount * data.costPrice,
        opportunityLoss: data.wasteCount * data.price,
    })).filter(d => d.wasteCount > 0);

  }, [products, filteredWasteEntries]);
  
  const totalWasteCost = useMemo(() => wasteAnalysisData.reduce((acc, p) => acc + p.totalWasteCost, 0), [wasteAnalysisData]);
  const totalOpportunityLoss = useMemo(() => wasteAnalysisData.reduce((acc, p) => acc + p.opportunityLoss, 0), [wasteAnalysisData]);
  const totalWaste = useMemo(() => wasteAnalysisData.reduce((acc, p) => acc + p.wasteCount, 0), [wasteAnalysisData]);

  const dailyWasteData = useMemo(() => {
    if (!date?.from || !date?.to) return [];

    const dailyTotals = new Map<string, number>();

    filteredWasteEntries.forEach(entry => {
      const entryDate = format(new Date(entry.date), 'yyyy-MM-dd');
      const currentTotal = dailyTotals.get(entryDate) || 0;
      dailyTotals.set(entryDate, currentTotal + entry.totalWasteCost);
    });

    const allDaysData: { date: string, totalWaste: number }[] = [];
    let currentDate = date.from;

    while (currentDate <= date.to) {
      const formattedDate = format(currentDate, 'yyyy-MM-dd');
      allDaysData.push({
        date: format(currentDate, 'M/d'),
        totalWaste: dailyTotals.get(formattedDate) || 0,
      });
      currentDate = addDays(currentDate, 1);
    }
    
    return allDaysData;
  }, [filteredWasteEntries, date]);

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
       <div className="flex flex-col gap-4 p-4 border rounded-lg">
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
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
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
            <CardTitle>日別廃棄ロス推移</CardTitle>
            <CardDescription>指定した期間内の日ごとの廃棄ロス額（原価）の推移です。</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyWasteData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                  tickFormatter={(value) => `¥${(value as number).toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)'
                  }}
                  formatter={(value: number) => [`¥${value.toLocaleString()}`, "廃棄ロス額"]}
                />
                <Bar dataKey="totalWaste" fill="hsl(var(--primary))" name="廃棄ロス額" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
                        {wasteAnalysisData.sort((a,b) => b.totalWasteCost - a.totalWasteCost).map(data => (
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
