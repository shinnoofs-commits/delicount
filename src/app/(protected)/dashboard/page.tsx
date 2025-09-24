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
import { CreditCard } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const totalRevenue = transactions.reduce((acc, t) => acc + t.finalAmount, 0)
const today = new Date();
const todaysTransactions = transactions.filter(t => new Date(t.date).toDateString() === today.toDateString())
const todaysRevenue = todaysTransactions.reduce((acc, t) => acc + t.finalAmount, 0)

const salesData = Array.from({ length: 7 }, (_, i) => {
  const date = subDays(today, i);
  const dayName = format(date, "eee", { locale: ja });

  const dailySales = transactions
    .filter(t => format(new Date(t.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd"))
    .reduce((sum, t) => sum + t.finalAmount, 0);

  return {
    name: dayName,
    total: dailySales,
  }
}).reverse();

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総収益</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">全期間の売上</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日の収益</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{todaysRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">今日の取引 {todaysTransactions.length}件</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>売上概要</CardTitle>
            <CardDescription>過去7日間の売上収益です。</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
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
                        tickFormatter={(value) => `¥${value}`}
                    />
                    <Tooltip
                        cursor={{fill: 'hsl(var(--muted))'}}
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: 'var(--radius)'
                        }}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>最近の取引</CardTitle>
            <CardDescription>
              直近の売上一覧です。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>詳細</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.slice(0, 7).map((transaction) => (
                    <TableRow key={transaction.id}>
                        <TableCell>
                        <div className="font-medium">{transaction.items[0].name}{transaction.items.length > 1 ? ` +${transaction.items.length - 1}`: ''}</div>
                        <div className="text-sm text-muted-foreground">{format(new Date(transaction.date), "PP", { locale: ja })}</div>
                        </TableCell>
                        <TableCell className="text-right">¥{transaction.finalAmount.toLocaleString()}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
