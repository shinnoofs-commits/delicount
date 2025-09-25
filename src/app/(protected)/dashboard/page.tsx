
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
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts"
import { TicketPercent, TrendingUp, Calendar as CalendarIcon, Package, Trash2, ShoppingCart } from 'lucide-react';
import { useMemo, useState } from "react";
import type { Category, Product, TransactionItem } from "@/lib/types";
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
    productionQuantity: number;
    normalSales: number;
    discountedSalesByRate: { [key: number]: number };
    wasteCount: number;
};


export default function DashboardPage() {
  const { transactions } = useTransactions();
  const { products } = useProducts();

  const categories = useMemo(() => [...new Set(products.map(p => p.category))] as Category[], [products]);

  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });

  const filteredTransactions = useMemo(() => {
    if (!date || !date.from) return [];
    
    const fromDate = startOfDay(date.from);
    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

    return transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return isValid(transactionDate) && transactionDate >= fromDate && transactionDate <= toDate;
    });
  }, [date, transactions]);

  const totalRevenue = useMemo(() => filteredTransactions.reduce((acc, t) => acc + t.finalAmount, 0), [filteredTransactions]);
  const totalDiscount = useMemo(() => filteredTransactions.reduce((acc, t) => {
      if (t.discount) {
          if (t.discount.type === 'percentage') {
              return acc + (t.totalAmount * t.discount.value / 100);
          }
          return acc + t.discount.value;
      }
      return acc;
  }, 0), [filteredTransactions]);

  const salesByTime = useMemo(() => Array.from({ length: 15 }, (_, i) => {
      const hour = i + 8; // 8:00 to 22:00
      const sales = filteredTransactions
          .filter(t => new Date(t.date).getHours() >= hour && new Date(t.date).getHours() < hour + 1)
          .reduce((sum, t) => sum + t.finalAmount, 0);
      return { name: `${hour}:00`, '売上': sales };
  }), [filteredTransactions]);

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
            const wasteCount = Math.max(0, product.productionQuantity - totalSold);
            
            return {
                productId: product.id,
                productName: product.name,
                productionQuantity: product.productionQuantity,
                normalSales,
                discountedSalesByRate,
                wasteCount
            };
        });
    }, [products, filteredTransactions]);

    const totalProduction = useMemo(() => wasteAnalysisData.reduce((acc, p) => acc + p.productionQuantity, 0), [wasteAnalysisData]);
    const totalWaste = useMemo(() => wasteAnalysisData.reduce((acc, p) => acc + p.wasteCount, 0), [wasteAnalysisData]);
    const totalSold = useMemo(() => wasteAnalysisData.reduce((acc, p) => acc + p.normalSales + Object.values(p.discountedSalesByRate).reduce((s,q) => s + q, 0), 0), [wasteAnalysisData]);

  const salesByDiscount = useMemo(() => {
    const discountCategories = [10, 20, 30, 40];
    const result: { name: string; '売上': number }[] = discountCategories.map(rate => ({
      name: `${rate}%`,
      '売上': 0,
    }));

    filteredTransactions.forEach(t => {
      if (t.discount?.type === 'percentage') {
        const rate = t.discount.value;
        const category = discountCategories.find(c => c === rate);
        if (category) {
          const index = discountCategories.indexOf(category);
          const discountedAmount = t.totalAmount * (1 - rate / 100);
          const tax = discountedAmount * 0.08;
          result[index]['売上'] += discountedAmount + tax;
        }
      }
    });
    return result;
  }, [filteredTransactions]);


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

  const discountRates = [10, 20, 30, 40];

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総収益</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{Math.round(totalRevenue).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">選択期間中の総売上です。</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">割引/値引額合計</CardTitle>
            <TicketPercent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{Math.round(totalDiscount).toLocaleString()}</div>
             <p className="text-xs text-muted-foreground">適用された割引・値引の合計です。</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総販売数</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSold.toLocaleString()}</div>
             <p className="text-xs text-muted-foreground">総製造数: {totalProduction.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総廃棄数</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWaste.toLocaleString()}</div>
             <p className="text-xs text-muted-foreground">廃棄率: {totalProduction > 0 ? ((totalWaste / totalProduction) * 100).toFixed(1) : 0}%</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>時間帯別売上概要</CardTitle>
            <CardDescription>選択期間中の時間帯別売上です。</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesByTime}>
                    <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `¥${value.toLocaleString()}`}
                    />
                    <Tooltip
                        cursor={{fill: 'hsl(var(--muted))'}}
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: 'var(--radius)'
                        }}
                         formatter={(value: number) => `¥${Math.round(value).toLocaleString()}`}
                    />
                    <Bar dataKey="売上" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>割引率別売上</CardTitle>
            <CardDescription>選択期間中の割引率ごとの売上貢献です。</CardDescription>
          </CardHeader>
          <CardContent>
             <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesByDiscount}>
                    <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `¥${value.toLocaleString()}`}
                    />
                    <Tooltip
                        cursor={{fill: 'hsl(var(--muted))'}}
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: 'var(--radius)'
                        }}
                         formatter={(value: number) => `¥${Math.round(value).toLocaleString()}`}
                    />
                    <Bar dataKey="売上" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-1 gap-4 auto-rows-min lg:grid-cols-3">
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
      <Card>
        <CardHeader>
            <CardTitle>廃棄分析</CardTitle>
            <CardDescription>各商品の製造数、販売数、廃棄数の一覧です。</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>商品名</TableHead>
                        <TableHead className="text-right">製造数</TableHead>
                        <TableHead className="text-right">通常販売</TableHead>
                        {discountRates.map(rate => (
                            <TableHead key={rate} className="text-right">{rate}%割引</TableHead>
                        ))}
                        <TableHead className="text-right">廃棄数</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {wasteAnalysisData.map(data => (
                        <TableRow key={data.productId}>
                            <TableCell>{data.productName}</TableCell>
                            <TableCell className="text-right">{data.productionQuantity}</TableCell>
                            <TableCell className="text-right">{data.normalSales}</TableCell>
                            {discountRates.map(rate => (
                                <TableCell key={rate} className="text-right">
                                    {(data.discountedSalesByRate as any)[rate] || 0}
                                </TableCell>
                            ))}
                            <TableCell className="text-right font-medium">{data.wasteCount}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  )
}

    