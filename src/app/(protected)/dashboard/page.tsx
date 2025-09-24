
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
import { transactions } from "@/lib/data"
import { format, subDays } from "date-fns"
import { ja } from "date-fns/locale"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts"
import { TicketPercent, TrendingDown, TrendingUp, ShoppingCart, Info } from 'lucide-react';
import { useMemo } from "react";
import type { Transaction, Product, Category } from "@/lib/types";
import { products } from "@/lib/data";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const today = new Date();

const last7DaysTransactions = transactions.filter(t => new Date(t.date) > subDays(today, 7));

const totalRevenue = last7DaysTransactions.reduce((acc, t) => acc + t.finalAmount, 0);
const totalDiscount = last7DaysTransactions.reduce((acc, t) => {
    if (t.discount) {
        if (t.discount.type === 'percentage') {
            return acc + (t.totalAmount * t.discount.value / 100);
        }
        return acc + t.discount.value;
    }
    return acc;
}, 0);

const salesByTime = Array.from({ length: 15 }, (_, i) => {
    const hour = i + 8; // 8:00 to 22:00
    const sales = last7DaysTransactions
        .filter(t => new Date(t.date).getHours() >= hour && new Date(t.date).getHours() < hour + 1)
        .reduce((sum, t) => sum + t.finalAmount, 0);
    return { name: `${hour}:00`, '売上': sales };
});

const categories: Category[] = ['揚げ物', 'サラダ', 'お弁当', '一品料理', 'ご飯もの'];

const salesByCategory = categories.map(category => {
    const productSales = last7DaysTransactions
        .flatMap(t => t.items)
        .filter(item => {
            const product = products.find(p => p.id === item.productId);
            return product?.category === category;
        })
        .reduce((acc, item) => {
            const existing = acc.find(p => p.name === item.name);
            if (existing) {
                existing.quantity += item.quantity;
                existing.total += item.quantity * item.unitPrice;
            } else {
                acc.push({ name: item.name, quantity: item.quantity, total: item.quantity * item.unitPrice });
            }
            return acc;
        }, [] as { name: string; quantity: number, total: number }[])
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    return {
        category,
        sales: productSales
    };
});


export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総収益 (過去7日間)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">過去7日間の総売上です。</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">割引/値引額合計 (過去7日間)</CardTitle>
            <TicketPercent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{Math.round(totalDiscount).toLocaleString()}</div>
             <p className="text-xs text-muted-foreground">適用された割引・値引の合計です。</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>時間帯別売上概要</CardTitle>
            <CardDescription>過去7日間の時間帯別売上です。</CardDescription>
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
                         formatter={(value: number) => `¥${value.toLocaleString()}`}
                    />
                    <Bar dataKey="売上" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <div className="lg:col-span-3 grid grid-cols-1 gap-4 auto-rows-min">
            {salesByCategory.filter(cat => cat.sales.length > 0).map(({ category, sales }) => (
            <Card key={category}>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg">{category} 売上 TOP5</CardTitle>
                    <CardDescription>過去7日間の{category}カテゴリの売上トップ5です。</CardDescription>
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
                                formatter={(value: number, name) => [`¥${value.toLocaleString()}`, name]}
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
