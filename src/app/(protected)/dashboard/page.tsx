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
import { Calendar as CalendarIcon, Trash2, TrendingDown, Loader2, Sun, Cloud, CloudRain, Snowflake, Package, Edit, Plus, Minus, PlusCircle, Search } from 'lucide-react';
import { useMemo, useState, useCallback, useEffect } from "react";
import type { WasteEntry, WeatherType, WasteItem, Product } from "@/lib/types";
import { useProducts } from "@/contexts/product-context";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { StoreSelector } from "@/components/ui/store-selector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAdmin } from "@/hooks/use-admin";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


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

const weatherOptions: { value: WeatherType; label: string; icon: any }[] = [
  { value: 'sunny', label: '晴れ', icon: Sun },
  { value: 'cloudy', label: '曇り', icon: Cloud },
  { value: 'rainy', label: '雨', icon: CloudRain },
  { value: 'snowy', label: '雪', icon: Snowflake },
];


const WeatherIcon = ({ type }: { type?: WeatherType }) => {
    if (!type) return null;
    const Icon = weatherIcons[type];
    return <Icon className="h-4 w-4 inline-block mr-1 text-muted-foreground" />;
};

const DashboardCalendar = ({ data, onDayClick, month, onMonthChange }: { data: any[], onDayClick: (date: Date) => void, month: Date | undefined, onMonthChange: (date: Date) => void }) => {
  return (
    <Card className="h-full">
      <CardContent className="p-2">
        <Calendar
          month={month}
          onMonthChange={onMonthChange}
          locale={ja}
          components={{
            DayContent: ({ date }) => {
              const dayData = data.find(d => isSameDay(d.fullDate, date));
              
              if (!dayData) { 
                return <div className="p-1 text-center text-xs text-muted-foreground/30">{date.getDate()}</div>;
              }

              const WeatherI = dayData.weatherLabel ? weatherIcons[Object.keys(weatherLabels).find(key => weatherLabels[key as WeatherType] === dayData.weatherLabel) as WeatherType] : null;

              return (
                <div onClick={() => onDayClick(date)} className="flex flex-col h-full w-full p-2 text-left text-xs cursor-pointer hover:bg-muted/50 rounded-md transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-muted-foreground">{date.getDate()}</span>
                    {WeatherI && <WeatherI className="h-3.5 w-3.5 text-muted-foreground/70" />}
                  </div>
                  <div className="flex-1 flex flex-col justify-end mt-2 text-right">
                    <p className="text-destructive font-black leading-tight text-sm">¥{dayData.totalWaste.toLocaleString()}</p>
                    <p className="text-blue-600 font-bold leading-tight text-xs">¥{dayData.totalOpportunityLoss.toLocaleString()}</p>
                  </div>
                </div>
              );
            },
          }}
          className="w-full"
          classNames={{
            months: 'w-full',
            month: 'w-full',
            table: 'w-full',
            head_row: 'ml-2',
            row: 'w-full mt-2',
            day: 'h-28 lg:h-28 align-top p-0',
            day_selected: 'bg-transparent text-current',
            day_range_start: 'bg-transparent text-current',
            day_range_end: 'bg-transparent text-current',
            day_today: 'bg-accent/10 text-current'
          }}
        />
      </CardContent>
    </Card>
  );
};

const WasteEditForm = ({
  entry,
  products,
  onSave,
  onCancel,
}: {
  entry: WasteEntry;
  products: Product[];
  onSave: (items: WasteItem[], totalWasteCost: number, weather: WeatherType) => void;
  onCancel: () => void;
}) => {
  const [items, setItems] = useState<WasteItem[]>(entry.items);
  const [weather, setWeather] = useState<WeatherType>(entry.weather || 'sunny');
  const [productSearchOpen, setProductSearchOpen] = useState(false);

  const handleAddOrIncrementProduct = (product: Product) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(i => i.productId === product.id);
      if (existingItem) {
        return currentItems.map(i => 
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        return [
          ...currentItems,
          {
            productId: product.id,
            productCode: product.productCode,
            name: product.name,
            costPrice: product.costPrice,
            quantity: 1,
          }
        ];
      }
    });
    setProductSearchOpen(false);
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    setItems(currentItems => {
      const itemIndex = currentItems.findIndex(i => i.productId === productId);
      if (itemIndex > -1) {
        const newItems = [...currentItems];
        const newQuantity = newItems[itemIndex].quantity + delta;
        if (newQuantity > 0) {
          newItems[itemIndex] = { ...newItems[itemIndex], quantity: newQuantity };
          return newItems;
        } else {
          return newItems.filter((_, i) => i !== itemIndex);
        }
      }
      return currentItems;
    });
  };

  const handleSave = () => {
    const totalWasteCost = items.reduce((acc, item) => acc + item.costPrice * item.quantity, 0);
    onSave(items, totalWasteCost, weather);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>廃棄記録の編集</DialogTitle>
        <DialogDescription>
          {format(entry.date, 'M月d日 HH:mm')} の記録を編集します。
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-4">
        <div>
          <Label className="text-xs font-medium">代表天気</Label>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {weatherOptions.map((option) => (
              <Button
                key={option.value}
                variant={weather === option.value ? "default" : "outline"}
                className="flex flex-col h-14 p-1"
                onClick={() => setWeather(option.value)}
              >
                <option.icon className="h-4 w-4" />
                <span className="text-[10px]">{option.label}</span>
              </Button>
            ))}
          </div>
        </div>
        <div className="max-h-[30vh] overflow-y-auto pr-2 space-y-2">
          {items.map(item => (
            <div key={item.productId} className="flex items-center justify-between p-2 rounded-md border">
              <span className="text-sm font-medium truncate flex-1">{item.name}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item.productId, -1)}><Minus className="h-4 w-4" /></Button>
                <span className="w-6 text-center font-bold">{item.quantity}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item.productId, 1)}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
           {items.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">廃棄商品がありません。</p>}
        </div>
         <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    商品を追加
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                <CommandInput placeholder="商品を検索..." />
                <CommandList>
                    <CommandEmpty>商品が見つかりません。</CommandEmpty>
                    <CommandGroup>
                    {products.map((product) => (
                        <CommandItem
                        key={product.id}
                        value={product.name}
                        onSelect={() => handleAddOrIncrementProduct(product)}
                        >
                        {product.name}
                        </CommandItem>
                    ))}
                    </CommandGroup>
                </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>キャンセル</Button>
        <Button onClick={handleSave}>変更を保存</Button>
      </DialogFooter>
    </>
  );
};


export default function DashboardPage() {
  const { wasteEntries, loading: wasteLoading, updateWasteEntry, deleteWasteEntries } = useTransactions();
  const { products } = useProducts();
  const { isAdmin } = useAdmin();
  
  const [selectedDayWaste, setSelectedDayWaste] = useState<{ date: Date, entries: WasteEntry[] } | null>(null);
  const [entryToEdit, setEntryToEdit] = useState<WasteEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<WasteEntry | null>(null);

  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [calendarMonth, setCalendarMonth] = useState<Date>();

  useEffect(() => {
    const today = new Date();
    const start = startOfMonth(today);
    setDate({
      from: start,
      to: endOfMonth(today),
    });
    setCalendarMonth(start);
  }, []);

  const confirmDelete = useCallback(() => {
    if (entryToDelete) {
      deleteWasteEntries(entryToDelete.storeId, [entryToDelete.id]);
    }
    setEntryToDelete(null);
  }, [entryToDelete, deleteWasteEntries]);
  
  const filteredWasteEntries = useMemo(() => {
    if (!date || !date.from) return [];
    
    const fromDate = startOfDay(date.from);
    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

    return wasteEntries.filter((entry) => {
        const entryDate = new Date(entry.date);
        return isValid(entryDate) && entryDate >= fromDate && entryDate <= toDate;
    });
  }, [date, wasteEntries]);


  const wasteAnalysisData: { productId: string; productName: string; wasteCount: number; costPrice: number; price: number; totalWasteCost: number; opportunityLoss: number; }[] = useMemo(() => {
    const wasteDataMap = new Map<string, { productId: string; productName: string; wasteCount: number; costPrice: number; price: number; totalWasteCost: number; opportunityLoss: number; }>();

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

  const handleDayClick = (date: Date) => {
    const entries = filteredWasteEntries.filter(e => isSameDay(new Date(e.date), date));
    setSelectedDayWaste({ date, entries });
  }

  const setDatePreset = (preset: 'this_month' | 'last_month') => {
    const today = new Date();
    if (preset === 'this_month') {
      const newFrom = startOfMonth(today);
      setDate({ from: newFrom, to: endOfMonth(today) });
      setCalendarMonth(newFrom);
    } else if (preset === 'last_month') {
      const lastMonth = subMonths(today, 1);
      const newFrom = startOfMonth(lastMonth);
      setDate({ from: newFrom, to: endOfMonth(lastMonth) });
      setCalendarMonth(newFrom);
    }
  };
  
  const handleDateRangeSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);
    if(newDate?.from) {
      setCalendarMonth(newDate.from);
    }
  }

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
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-[240px] justify-start text-left font-normal",
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
                            onSelect={handleDateRangeSelect}
                            numberOfMonths={2}
                            locale={ja}
                            />
                        </PopoverContent>
                    </Popover>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDatePreset('last_month')}>先月</Button>
                        <Button variant="outline" size="sm" onClick={() => setDatePreset('this_month')}>今月</Button>
                    </div>
              </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {dailyWasteData.length > 0 && <DashboardCalendar data={dailyWasteData} onDayClick={handleDayClick} month={calendarMonth} onMonthChange={setCalendarMonth} />}
        </div>
        <div className="lg:col-span-1 flex flex-col gap-4">
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>日別廃棄ロス推移</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyWasteData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} />
                <Legend />
                <Bar dataKey="totalWaste" fill="hsl(var(--accent))" name="廃棄ロス(原価)" />
                <Bar dataKey="totalOpportunityLoss" fill="hsl(var(--chart-4))" name="機会損失(売価)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
            <CardTitle>廃棄商品履歴</CardTitle>
            <CardDescription>期間内の日ごとの廃棄記録です。</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="max-h-[300px] overflow-auto">
                {filteredWasteEntries.length > 0 ? (
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="w-[120px]">日付</TableHead>
                        <TableHead>品目</TableHead>
                        <TableHead className="text-right">廃棄ロス(原価)</TableHead>
                        <TableHead className="text-right">機会損失(売価)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredWasteEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => {
                            const entryTotalSellPrice = entry.items.reduce((sum, item) => {
                                const product = products.find(p => p.id === item.productId);
                                return sum + (product?.price || 0) * item.quantity;
                            }, 0);
                            return (
                                <TableRow key={entry.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{format(new Date(entry.date), 'M月d日')}</span>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                              <WeatherIcon type={entry.weather} />
                                              <span>{format(new Date(entry.date), 'HH:mm')}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {entry.items.map((item, i) => (
                                                <div key={i} className="text-xs">
                                                    <span className="font-medium">{item.name}</span>
                                                    <span className="text-muted-foreground"> x {item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold tabular-nums">
                                        ¥{entry.totalWasteCost.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-destructive font-semibold tabular-nums">
                                        ¥{entryTotalSellPrice.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                    </Table>
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        この期間に廃棄記録はありません。
                    </div>
                )}
                </div>
            </CardContent>
        </Card>
      </div>

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
                                          <div className="flex items-center">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEntryToEdit(entry)}>
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEntryToDelete(entry)}>
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                          </div>
                                      </div>
                                        <div className="text-right mb-2">
                                            <div className="text-[10px] text-muted-foreground">原価合計: ¥{entry.totalWasteCost.toLocaleString()}</div>
                                            <div className="text-xs font-black text-destructive">機会損失 (売価計): ¥{entryTotalSellPrice.toLocaleString()}</div>
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

      <Dialog open={!!entryToEdit} onOpenChange={(open) => !open && setEntryToEdit(null)}>
        <DialogContent className="max-w-md">
          {entryToEdit && (
            <WasteEditForm
              entry={entryToEdit}
              products={products}
              onSave={(items, totalWasteCost, weather) => {
                if (entryToEdit) {
                  updateWasteEntry(entryToEdit.storeId, entryToEdit.id, entryToEdit.date, items, totalWasteCost, weather);
                }
                setEntryToEdit(null);
              }}
              onCancel={() => setEntryToEdit(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除確認</AlertDialogTitle>
            <AlertDialogDescription>この廃棄記録を完全に削除しますか？この操作は元に戻せません。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
