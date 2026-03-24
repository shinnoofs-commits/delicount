'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTransactions } from "@/contexts/transaction-context";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, isValid, getDay, addDays, isSameDay, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Calendar as CalendarIcon, Trash2, TrendingDown, Edit, MoreHorizontal, Plus, Minus, Loader2, Sun, Cloud, CloudRain, Snowflake, Package, Sparkles, AlertCircle, ArrowRight, PlayCircle } from 'lucide-react';
import { useMemo, useState, useCallback, useEffect } from "react";
import type { WasteEntry, WasteItem, WeatherType } from "@/lib/types";
import { useProducts } from "@/contexts/product-context";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import holiday_jp from '@holiday-jp/holiday_jp';
import { StoreSelector } from "@/components/ui/store-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useAdmin } from "@/hooks/use-admin";
import { useStores } from "@/contexts/store-context";
import { getWasteInsights, type WasteInsightsOutput } from "@/ai/flows/waste-insights-flow";


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
};

const filterOptions = [
  { id: 1, label: '月' },
  { id: 2, label: '火' },
  { id: 3, label: '水' },
  { id: 4, label: '木' },
  { id: 5, label: '金' },
  { id: 6, label: '土' },
  { id: 0, label: '日' },
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

const weatherOptions: { value: WeatherType; label: string; icon: any }[] = [
  { value: 'sunny', label: '晴れ', icon: Sun },
  { value: 'cloudy', label: '曇り', icon: Cloud },
  { value: 'rainy', label: '雨', icon: CloudRain },
  { value: 'snowy', label: '雪', icon: Snowflake },
];

const weatherIcons: Record<WeatherType, any> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: Snowflake,
};

const weatherLabels: Record<WeatherType, string> = {
  sunny: '晴れ',
  cloudy: '曇り',
  rainy: '雨',
  snowy: '雪',
};

const WeatherIcon = ({ type }: { type?: WeatherType }) => {
    if (!type) return null;
    const Icon = weatherIcons[type];
    return <Icon className="h-4 w-4 inline-block mr-1 text-muted-foreground" />;
};

export default function DashboardPage() {
  const { wasteEntries, deleteWasteEntries, updateWasteEntry, loading: wasteLoading } = useTransactions();
  const { products } = useProducts();
  const { isAdmin } = useAdmin();
  const { userStore } = useStores();
  const { toast } = useToast();
  
  const [selectedFilters, setSelectedFilters] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7]);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [editEntry, setEditEntry] = useState<WasteEntry | null>(null);
  const [editItems, setEditItems] = useState<WasteItem[]>([]);
  const [editWeather, setEditWeather] = useState<WeatherType | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDayWaste, setSelectedDayWaste] = useState<{ date: Date, entries: WasteEntry[] } | null>(null);

  const [aiInsights, setAiInsights] = useState<WasteInsightsOutput | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [analyzedLabel, setAnalyzedLabel] = useState<string>('');

  const [date, setDate] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    setDate({
      from: subDays(new Date(), 6),
      to: new Date(),
    });
  }, []);

  const handleFilterToggle = (filterId: number) => {
    setSelectedFilters(prev => 
      prev.includes(filterId) ? prev.filter(d => d !== filterId) : [...prev, filterId]
    );
  };
  
  const filteredWasteEntries = useMemo(() => {
    if (!date || !date.from) return [];
    
    const fromDate = startOfDay(date.from);
    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

    return wasteEntries.filter((entry) => {
        const entryDate = new Date(entry.date);
        if (!isValid(entryDate) || entryDate < fromDate || entryDate > toDate) {
          return false;
        }

        const dayOfWeek = getDay(entryDate);
        const isHoliday = holiday_jp.isHoliday(entryDate);
        const isDaySelected = selectedFilters.includes(dayOfWeek);
        const isHolidaySelected = selectedFilters.includes(7);

        return isHoliday ? isHolidaySelected : isDaySelected;
    });
  }, [date, wasteEntries, selectedFilters]);

  const runAiAnalysis = useCallback(async (preset?: 'last_month' | 'this_month' | 'weekly' | 'current') => {
    setIsAiLoading(true);
    let targetEntries = filteredWasteEntries;
    let label = '現在の表示範囲';

    if (preset && preset !== 'current') {
      const now = new Date();
      let from: Date, to: Date;
      if (preset === 'last_month') {
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        label = '先月 (' + format(from, 'M月') + ')';
      } else if (preset === 'this_month') {
        from = startOfMonth(now);
        to = endOfMonth(now);
        label = '今月 (' + format(from, 'M月') + ')';
      } else { // weekly
        from = subDays(now, 6);
        to = now;
        label = '直近7日間';
      }
      
      setDate({ from, to });
      targetEntries = wasteEntries.filter(e => {
        const d = new Date(e.date);
        return d >= startOfDay(from) && d <= endOfDay(to);
      });
    }

    if (targetEntries.length === 0) {
      toast({ title: "データ不足", description: "指定された期間に廃棄データが見つかりません。" });
      setIsAiLoading(false);
      return;
    }

    try {
      const summary = {
        period: label,
        entriesCount: targetEntries.length,
        totalWasteCost: targetEntries.reduce((acc, e) => acc + e.totalWasteCost, 0),
        weatherImpact: targetEntries.reduce((acc: any, e) => {
          const w = e.weather || 'unknown';
          acc[w] = (acc[w] || 0) + e.totalWasteCost;
          return acc;
        }, {}),
        products: products.map(p => ({
          name: p.name,
          category: p.category,
          displaySlots: p.displayTimeSlots,
          waste: targetEntries.reduce((sum, entry) => {
            const item = entry.items.find(i => i.productId === p.id);
            return sum + (item?.quantity || 0);
          }, 0)
        })).sort((a, b) => b.waste - a.waste).slice(0, 10)
      };

      const result = await getWasteInsights({
        summaryData: JSON.stringify(summary),
        storeName: userStore?.name
      });
      setAiInsights(result);
      setAnalyzedLabel(label);
      toast({ title: "分析完了", description: `${label}の分析が完了しました。` });
    } catch (e) {
      console.error('AI Insight error:', e);
      toast({ variant: "destructive", title: "分析エラー", description: "AIの分析に失敗しました。時間をおいてお試しください。" });
    } finally {
      setIsAiLoading(false);
    }
  }, [wasteEntries, filteredWasteEntries, products, userStore, toast]);

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

    const dailyTotals = new Map<string, { cost: number, price: number, weather?: WeatherType, originalDate: Date }>();

    filteredWasteEntries.forEach(entry => {
      const entryDate = format(new Date(entry.date), 'yyyy-MM-dd');
      const current = dailyTotals.get(entryDate) || { cost: 0, price: 0, originalDate: new Date(entry.date) };
      
      const entryTotalPrice = entry.items.reduce((sum, item) => {
          const product = products.find(p => p.id === item.productId);
          return sum + (product?.price || 0) * item.quantity;
      }, 0);

      dailyTotals.set(entryDate, {
          cost: current.cost + entry.totalWasteCost,
          price: current.price + entryTotalPrice,
          weather: current.weather || entry.weather,
          originalDate: current.originalDate
      });
    });

    const allDaysData: { date: string, totalWaste: number, totalOpportunityLoss: number, weatherLabel?: string, fullDate: Date }[] = [];
    let currentDate = startOfDay(date.from);
    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

    while (currentDate <= toDate) {
      const formattedDate = format(currentDate, 'yyyy-MM-dd');
      const dayData = dailyTotals.get(formattedDate) || { cost: 0, price: 0, originalDate: new Date(currentDate) };
      allDaysData.push({
        date: format(currentDate, 'M/d'),
        totalWaste: dayData.cost,
        totalOpportunityLoss: dayData.price,
        weatherLabel: dayData.weather ? weatherLabels[dayData.weather] : undefined,
        fullDate: new Date(currentDate)
      });
      currentDate = addDays(currentDate, 1);
    }
    
    return allDaysData;
  }, [filteredWasteEntries, date, products]);

  const handleChartClick = (data: any) => {
    if (!data || !data.activePayload) return;
    const clickedData = data.activePayload[0].payload;
    const entries = filteredWasteEntries.filter(e => isSameDay(new Date(e.date), clickedData.fullDate));
    setSelectedDayWaste({ date: clickedData.fullDate, entries });
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
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEntries(filteredWasteEntries.map(e => e.id));
    } else {
      setSelectedEntries([]);
    }
  };

  const handleSelectEntry = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedEntries(prev => [...prev, id]);
    } else {
      setSelectedEntries(prev => prev.filter(e => e !== id));
    }
  };

  const handleDelete = async (entry: WasteEntry) => {
    await deleteWasteEntries(entry.storeId, [entry.id]);
  };

  const handleDeleteSelected = async () => {
    if (selectedEntries.length === 0) return;
    const storeIds = new Set(filteredWasteEntries.filter(e => selectedEntries.includes(e.id)).map(e => e.storeId));
    
    for (const storeId of Array.from(storeIds)) {
        const idsToDelete = filteredWasteEntries
            .filter(e => e.storeId === storeId && selectedEntries.includes(e.id))
            .map(e => e.id);
        await deleteWasteEntries(storeId, idsToDelete);
    }
    setSelectedEntries([]);
  };

  const handleEditOpen = (entry: WasteEntry) => {
    setEditEntry(entry);
    setEditItems(JSON.parse(JSON.stringify(entry.items)));
    setEditWeather(entry.weather);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setEditItems(prev => prev.map(item => {
        if (item.productId === productId) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
        }
        return item;
    }));
  };

  const handleSaveEdit = async () => {
    if (!editEntry) return;
    setIsSaving(true);
    
    const validItems = editItems.filter(item => item.quantity > 0);
    const newTotalCost = validItems.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    
    try {
        if (validItems.length === 0) {
            await deleteWasteEntries(editEntry.storeId, [editEntry.id]);
        } else {
            await updateWasteEntry(editEntry.storeId, editEntry.id, validItems, newTotalCost, editWeather);
        }
        setEditEntry(null);
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "保存エラー",
            description: "データの更新に失敗しました。",
        });
    } finally {
        setIsSaving(false);
    }
  };

  if (wasteLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-4">
       <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
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

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary/20 p-2 rounded-full">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">AIからの改善提案（β）</CardTitle>
                <CardDescription>
                  {aiInsights ? `${analyzedLabel} のデータを分析済み` : '通信節約のため、ボタンを押したときのみ分析を実行します。'}
                </CardDescription>
              </div>
            </div>
            {isAiLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-background/50 rounded-lg border">
            <span className="text-xs font-bold mr-2 text-muted-foreground">分析を実行:</span>
            <Button size="sm" variant="outline" onClick={() => runAiAnalysis('this_month')} disabled={isAiLoading} className="h-8 text-xs">
              今月を分析
            </Button>
            <Button size="sm" variant="outline" onClick={() => runAiAnalysis('last_month')} disabled={isAiLoading} className="h-8 text-xs">
              先月を分析
            </Button>
            <Button size="sm" variant="outline" onClick={() => runAiAnalysis('weekly')} disabled={isAiLoading} className="h-8 text-xs">
              直近7日間を分析
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button size="sm" variant="default" onClick={() => runAiAnalysis('current')} disabled={isAiLoading || filteredWasteEntries.length === 0} className="h-8 text-xs">
              <PlayCircle className="h-3 w-3 mr-1.5" />
              現在の表示範囲で分析
            </Button>
          </div>

          {!aiInsights && !isAiLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
              <Sparkles className="h-10 w-10 mb-2 opacity-10" />
              <p className="text-sm font-medium">上のボタンから分析期間を指定してください。</p>
              <p className="text-[10px] opacity-60 mt-1">※通信量を抑えるため自動実行はオフになっています。</p>
            </div>
          ) : (
            <div className={cn("space-y-4 transition-opacity", isAiLoading && "opacity-50")}>
              {aiInsights?.summary && (
                <div className="bg-background/50 p-3 rounded-md border text-sm font-medium italic">
                  "{aiInsights.summary}"
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {aiInsights?.insights.map((insight, idx) => {
                  const typeColors = {
                    waste_reduction: "bg-red-100 text-red-700 border-red-200",
                    opportunity_loss: "bg-blue-100 text-blue-700 border-blue-200",
                    weather_pattern: "bg-orange-100 text-orange-700 border-orange-200",
                    time_slot_optimization: "bg-purple-100 text-purple-700 border-purple-200",
                  };
                  return (
                    <Card key={idx} className="bg-background shadow-sm overflow-hidden flex flex-col">
                      <div className={cn("px-3 py-1 text-[10px] font-bold border-b", typeColors[insight.type as keyof typeof typeColors])}>
                        {insight.type.toUpperCase().replace('_', ' ')}
                      </div>
                      <CardContent className="p-3 flex-1 flex flex-col">
                        <p className="font-bold text-sm mb-1 leading-tight">{insight.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-3 mb-2 flex-1">{insight.description}</p>
                        <div className="mt-auto space-y-2 pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground uppercase">推定影響</span>
                            <span className="text-xs font-bold text-destructive">{insight.impact}</span>
                          </div>
                          <div className="flex items-center gap-1.5 p-1.5 bg-muted rounded text-[11px] font-bold">
                            <ArrowRight className="h-3 w-3 shrink-0" />
                            <span>{insight.action}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">廃棄ロス（原価計）</CardTitle>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">¥{totalWasteCost.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">総廃棄数: {totalWaste.toLocaleString()}個</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">機会損失（売価計）</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">¥{totalOpportunityLoss.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">廃棄された商品の売価合計です。</p>
            </CardContent>
        </Card>
      </div>

      <Card>
          <CardHeader>
            <CardTitle>日別廃棄ロス推移</CardTitle>
            <CardDescription>指定した期間内の日ごとの廃棄ロス額（原価）と機会損失額（売価）の推移です。棒グラフをタップして詳細を確認できます。</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={dailyWasteData} onClick={handleChartClick}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
                  cursor={{fill: 'rgba(0,0,0,0.05)'}}
                  contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)'
                  }}
                  formatter={(value: number, name: string) => {
                      const label = name === 'totalWaste' ? '廃棄ロス額' : '機会損失額';
                      return [`¥${value.toLocaleString()}`, label];
                  }}
                  labelFormatter={(label, payload) => {
                      const weather = payload[0]?.payload.weatherLabel;
                      return `${label} ${weather ? `(${weather})` : ''}`;
                  }}
                />
                <Legend />
                <Bar dataKey="totalWaste" fill="hsl(var(--primary))" name="廃棄ロス額" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                <Bar dataKey="totalOpportunityLoss" fill="hsl(var(--accent))" name="機会損失額" radius={[4, 4, 0, 0]} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>廃棄履歴</CardTitle>
                  <CardDescription>入力された廃棄データの一覧です。</CardDescription>
              </div>
              {selectedEntries.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      選択した{selectedEntries.length}件を削除
                  </Button>
              )}
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="w-12">
                              <Checkbox 
                                checked={filteredWasteEntries.length > 0 && selectedEntries.length === filteredWasteEntries.length}
                                onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                              />
                          </TableHead>
                          <TableHead>日時</TableHead>
                          <TableHead>天気</TableHead>
                          <TableHead>商品内容</TableHead>
                          <TableHead className="text-right">廃棄額（原価）</TableHead>
                          <TableHead className="text-right">機会損失（売価）</TableHead>
                          <TableHead className="w-12"></TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredWasteEntries.length === 0 ? (
                          <TableRow>
                              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                  廃棄データがありません。
                              </TableCell>
                          </TableRow>
                      ) : (
                          filteredWasteEntries.sort((a, b) => b.date.getTime() - a.date.getTime()).map(entry => {
                              const entryTotalSellPrice = entry.items.reduce((sum, item) => {
                                  const product = products.find(p => p.id === item.productId);
                                  return sum + (product?.price || 0) * item.quantity;
                              }, 0);

                              return (
                                <TableRow key={entry.id}>
                                    <TableCell>
                                        <Checkbox 
                                            checked={selectedEntries.includes(entry.id)}
                                            onCheckedChange={(checked) => handleSelectEntry(entry.id, checked as boolean)}
                                        />
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {format(entry.date, "yyyy/MM/dd HH:mm", { locale: ja })}
                                    </TableCell>
                                    <TableCell>
                                        <WeatherIcon type={entry.weather} />
                                        <span className="text-xs text-muted-foreground">{entry.weather ? weatherLabels[entry.weather] : '-'}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {entry.items.map((item, i) => (
                                                <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                                                    {item.name} x{item.quantity}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        ¥{entry.totalWasteCost.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-destructive font-medium">
                                        ¥{entryTotalSellPrice.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>操作</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleEditOpen(entry)}>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    編集
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className="text-destructive"
                                                    onClick={() => handleDelete(entry)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    削除
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                              );
                          })
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>

      <Dialog open={!!editEntry} onOpenChange={(open) => !open && !isSaving && setEditEntry(null)}>
          <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden">
              {!!editEntry && (
                <>
                  <DialogHeader className="p-6 pb-2">
                      <DialogTitle>廃棄データの編集</DialogTitle>
                      <DialogDescription>
                          数量や天気を調整してください。
                      </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                      <div className="space-y-6">
                          <div className="space-y-2">
                              <Label className="text-sm font-semibold">天気を修正</Label>
                              <div className="grid grid-cols-4 gap-2">
                                  {weatherOptions.map((option) => (
                                      <Button
                                          key={option.value}
                                          variant={editWeather === option.value ? "default" : "outline"}
                                          className="flex flex-col h-14 gap-1 p-1"
                                          onClick={() => setEditWeather(option.value)}
                                          disabled={isSaving}
                                      >
                                          <option.icon className="h-4 w-4" />
                                          <span className="text-[10px]">{option.label}</span>
                                      </Button>
                                  ))}
                              </div>
                          </div>
                          <Separator />
                          <div className="space-y-4">
                              <Label className="text-sm font-semibold">数量を修正</Label>
                              {editItems.map(item => (
                                  <div key={item.productId} className="flex items-center justify-between gap-4 border-b pb-2 last:border-0">
                                      <span className="text-sm font-medium flex-1 truncate">{item.name}</span>
                                      <div className="flex items-center gap-2">
                                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleUpdateQuantity(item.productId, -1)} disabled={isSaving}>
                                              <Minus className="h-4 w-4" />
                                          </Button>
                                          <span className="w-8 text-center tabular-nums font-semibold">{item.quantity}</span>
                                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleUpdateQuantity(item.productId, 1)} disabled={isSaving}>
                                              <Plus className="h-4 w-4" />
                                          </Button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  <DialogFooter className="p-6 pt-2 border-t mt-auto flex-row justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditEntry(null)} disabled={isSaving}>キャンセル</Button>
                      <Button onClick={handleSaveEdit} disabled={isSaving}>
                          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          変更を保存
                      </Button>
                  </DialogFooter>
                </>
              )}
          </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDayWaste} onOpenChange={(open) => !open && setSelectedDayWaste(null)}>
          <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
              {!!selectedDayWaste && (
                <>
                  <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary" />
                          {format(selectedDayWaste.date, 'M月d日', { locale: ja })}の廃棄詳細分析
                      </DialogTitle>
                      <DialogDescription>
                          この日の廃棄実績と、それに伴う機会損失額の一覧です。
                      </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-auto py-4">
                      {selectedDayWaste.entries.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">廃棄データはありません。</p>
                      ) : (
                          <div className="space-y-4">
                              {selectedDayWaste.entries.map((entry, idx) => {
                                  const entryTotalSellPrice = entry.items.reduce((sum, item) => {
                                      const product = products.find(p => p.id === item.productId);
                                      return sum + (product?.price || 0) * item.quantity;
                                  }, 0);

                                  return (
                                    <div key={idx} className="border-b pb-4 last:border-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                                                <WeatherIcon type={entry.weather} />
                                                {format(entry.date, 'HH:mm')} 登録分
                                            </span>
                                            <div className="text-right">
                                                <div className="text-[10px] text-muted-foreground">原価合計: ¥{entry.totalWasteCost.toLocaleString()}</div>
                                                <div className="text-xs font-black text-destructive">機会損失 (売価計): ¥{entryTotalSellPrice.toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <div className="grid gap-1 bg-muted/30 p-2 rounded-md">
                                            {entry.items.map((item, i) => {
                                                const prod = products.find(p => p.id === item.productId);
                                                const itemLoss = (prod?.price || 0) * item.quantity;
                                                return (
                                                    <div key={i} className="flex justify-between items-center text-sm border-b border-white last:border-0 py-1">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold">{item.name}</span>
                                                            <span className="text-[10px] text-destructive font-bold">損失額: ¥{itemLoss.toLocaleString()}</span>
                                                        </div>
                                                        <span className="font-black text-lg">x{item.quantity}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
                  <DialogFooter>
                      <Button variant="outline" className="w-full" onClick={() => setSelectedDayWaste(null)}>閉じる</Button>
                  </DialogFooter>
                </>
              )}
          </DialogContent>
      </Dialog>
    </div>
  );
}
