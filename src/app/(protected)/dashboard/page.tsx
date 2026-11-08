
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
import { Calendar as CalendarIcon, Trash2, TrendingDown, Loader2, Sun, Cloud, CloudRain, Snowflake, Package, Edit, Plus, Minus, Activity } from 'lucide-react';
import { useMemo, useState, useCallback, useEffect } from "react";
import type { WasteEntry, WeatherType, WasteItem, Product, Transaction, TransactionItem } from "@/lib/types";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/hooks/useAdmin";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";


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
                    <p className="text-orange-600 font-bold leading-tight text-xs">¥{dayData.totalOpportunityLoss.toLocaleString()}</p>
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
                    <Plus className="mr-2 h-4 w-4" />
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
const TransactionEditForm = ({
  transaction,
  products,
  onSave,
  onCancel,
}: {
  transaction: Transaction;
  products: Product[];
  onSave: (items: TransactionItem[], discountValue: number, discountType: 'percentage' | 'amount') => void;
  onCancel: () => void;
}) => {
  const [items, setItems] = useState<TransactionItem[]>(transaction.items);
  const [discountValue, setDiscountValue] = useState(transaction.discount?.value || 0);
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>(transaction.discount?.type || 'percentage');
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
            name: product.name,
            unitPrice: product.price,
            quantity: 1,
            wasDiscounted: discountValue > 0
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
    onSave(items, discountValue, discountType);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>値引き販売記録の編集</DialogTitle>
        <DialogDescription>
          {format(transaction.date, 'M月d日 HH:mm')} の記録を編集します。
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-4">
        <div className="space-y-2">
            <Label className="text-xs font-medium">値引き設定</Label>
            <div className="flex gap-2">
                 <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="percentage">パーセント(%)</SelectItem>
                        <SelectItem value="amount">定額引(円)</SelectItem>
                    </SelectContent>
                 </Select>
                 <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} className="flex-1" />
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
          {items.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">商品がありません。</p>}
        </div>
         <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
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


const resolveItemPrice = (item: any, products: Product[]) => {
    if (item.unitPrice != null) return item.unitPrice;
    let prod = products.find(p => p.id === item.productId);
    if (prod) return prod.price;
    const normalizedCode = item.productCode?.replace(/^0+/, '');
    if (normalizedCode) {
        prod = products.find(p => p.productCode?.replace(/^0+/, '') === normalizedCode && p.name === item.name);
        if (prod) return prod.price;
        prod = products.find(p => p.productCode?.replace(/^0+/, '') === normalizedCode);
        if (prod) return prod.price;
    }
    if (item.name) {
        const normName = item.name.replace(/[\s\u3000]+/g, '').toLowerCase();
        prod = products.find(p => p.name.replace(/[\s\u3000]+/g, '').toLowerCase() === normName);
        if (prod) return prod.price;
    }
    return 0;
};

export default function DashboardPage() {
  const { wasteEntries, transactions, loading: dataLoading, updateWasteEntry, deleteWasteEntries, updateTransaction, deleteTransactions, setFetchDateRange } = useTransactions();
  const { products, loading: productsLoading } = useProducts();
  const { isAdmin } = useAdmin();
  
  const [selectedDayWaste, setSelectedDayWaste] = useState<{ date: Date, entries: WasteEntry[] } | null>(null);
  const [entryToEdit, setEntryToEdit] = useState<WasteEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<WasteEntry | null>(null);

  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState<'waste' | 'sale'>('waste');

  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [calendarMonth, setCalendarMonth] = useState<Date | undefined>(undefined);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const today = new Date();
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      setDate({
        from: start,
        to: end,
      });
      setCalendarMonth(start);
      if (setFetchDateRange) setFetchDateRange({ from: startOfDay(start), to: endOfDay(end) });
    }
  }, [isClient, setFetchDateRange]);

  const confirmDelete = useCallback(() => {
    if (entryToDelete) {
      deleteWasteEntries(entryToDelete.storeId, [entryToDelete.id]);
    }
    setEntryToDelete(null);
  }, [entryToDelete, deleteWasteEntries]);

  const confirmDeleteTx = useCallback(() => {
    if (txToDelete) {
      deleteTransactions(txToDelete.storeId, [txToDelete.id]);
    }
    setTxToDelete(null);
  }, [txToDelete, deleteTransactions]);
  
  const filteredWasteEntries = useMemo(() => {
    if (!date || !date.from) return [];
    
    const fromDate = startOfDay(date.from);
    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

    return wasteEntries.filter((entry) => {
        const entryDate = new Date(entry.date);
        return isValid(entryDate) && entryDate >= fromDate && entryDate <= toDate;
    });
  }, [date, wasteEntries]);

  const { totalWasteCost, totalOpportunityLoss, totalWaste, totalSales, totalDiscountsCount, hourlySales } = useMemo(() => {
    if (!filteredWasteEntries || productsLoading || dataLoading) return { 
      totalWasteCost: 0, 
      totalOpportunityLoss: 0, 
      totalWaste: 0, 
      totalSales: 0, 
      totalDiscountsCount: 0,
      hourlySales: { slot10to13: 0, slot16to18: 0, slot18to19: 0 }
    };

    // Pre-index products for faster lookup
    const productMap = new Map<string, any>();
    const productCodeNameMap = new Map<string, any>();
    const productCodeMap = new Map<string, any>();
    
    products.forEach(p => {
        productMap.set(p.id, p);
        const normalizedCode = p.productCode?.replace(/^0+/, '');
        if (normalizedCode) {
            productCodeNameMap.set(`${normalizedCode}|${p.name}`, p);
            productCodeMap.set(normalizedCode, p);
        }
    });
    
    const wasteStats = filteredWasteEntries.reduce((acc, entry) => {
        const entryLoss = entry.items.reduce((sum, item) => {
            const normalizedItemCode = item.productCode?.replace(/^0+/, '');
            const product = productMap.get(item.productId) || 
                          (normalizedItemCode ? productCodeNameMap.get(`${normalizedItemCode}|${item.name}`) : null) ||
                          (normalizedItemCode ? productCodeMap.get(normalizedItemCode) : null);
            const price = item.unitPrice ?? product?.price ?? 0;
            return sum + (price * item.quantity);
        }, 0);
        acc.totalWasteCost += entry.totalWasteCost;
        acc.totalOpportunityLoss += entryLoss;
        acc.totalWaste += entry.items.reduce((sum, item) => sum + item.quantity, 0);
        return acc;
    }, { totalWasteCost: 0, totalOpportunityLoss: 0, totalWaste: 0 });

    const saleStats = (transactions || []).filter(t => {
        const d = new Date(t.date);
        const from = date?.from ? startOfDay(date.from) : null;
        const to = date?.to ? endOfDay(date.to) : (date?.from ? endOfDay(date.from) : null);
        return from && to && d >= from && d <= to;
    }).reduce((acc, t) => {
        acc.totalSales += t.finalAmount;
        if (t.discount) acc.totalDiscountsCount++;
        
        const hour = new Date(t.date).getHours();
        if (hour >= 10 && hour < 13) acc.hourlySales.slot10to13 += t.finalAmount;
        if (hour >= 16 && hour < 18) acc.hourlySales.slot16to18 += t.finalAmount;
        if (hour >= 18 && hour < 19) acc.hourlySales.slot18to19 += t.finalAmount;
        
        return acc;
    }, { 
      totalSales: 0, 
      totalDiscountsCount: 0, 
      hourlySales: { slot10to13: 0, slot16to18: 0, slot18to19: 0 } 
    });

    return { ...wasteStats, ...saleStats };
  }, [filteredWasteEntries, transactions, products, productsLoading, dataLoading, date]);

  
  const dailyWasteData = useMemo(() => {
    if (!date?.from) return [];

    const dailyTotals = new Map<string, { cost: number, price: number, weather?: WeatherType, originalDate: Date }>();

    filteredWasteEntries.forEach(entry => {
      const entryDate = format(new Date(entry.date), 'yyyy-MM-dd');
      const current = dailyTotals.get(entryDate) || { cost: 0, price: 0, originalDate: new Date(entry.date) };
      
      const entryTotalPrice = entry.items.reduce((sum, item) => {
          return sum + resolveItemPrice(item, products) * item.quantity;
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
      const newTo = endOfMonth(today);
      setDate({ from: newFrom, to: newTo });
      setCalendarMonth(newFrom);
      if (setFetchDateRange) setFetchDateRange({ from: startOfDay(newFrom), to: endOfDay(newTo) });
    } else if (preset === 'last_month') {
      const lastMonth = subMonths(today, 1);
      const newFrom = startOfMonth(lastMonth);
      const newTo = endOfMonth(lastMonth);
      setDate({ from: newFrom, to: newTo });
      setCalendarMonth(newFrom);
      if (setFetchDateRange) setFetchDateRange({ from: startOfDay(newFrom), to: endOfDay(newTo) });
    }
  };
  
  const handleDateRangeSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);
    if (newDate?.from) {
      setCalendarMonth(newDate.from);
      const toDate = newDate.to || newDate.from;
      if (setFetchDateRange) setFetchDateRange({ from: startOfDay(newDate.from), to: endOfDay(toDate) });
    }
  }

  if (dataLoading || productsLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  if (!isClient) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-4">
       <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
          <div className="grid grid-cols-1 gap-4 items-center">
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
          {isClient && calendarMonth ? (
            <DashboardCalendar data={dailyWasteData} onDayClick={handleDayClick} month={calendarMonth} onMonthChange={setCalendarMonth} />
          ) : (
            <Card className="h-full"><CardContent className="p-2"><Skeleton className="w-full h-[600px]" /></CardContent></Card>
          )}
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">値引き販売（売上計）</CardTitle>
                <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-primary">¥{totalSales.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">値引き販売実施数: {totalDiscountsCount.toLocaleString()}回</p>
            </CardContent>
          </Card>
          
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-primary">重点時間帯 売上集計</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b pb-1">
                    <span className="text-xs font-bold text-muted-foreground">10:00 - 13:00</span>
                    <span className="text-lg font-black tabular-nums">¥{hourlySales.slot10to13.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-end border-b pb-1">
                    <span className="text-xs font-bold text-muted-foreground">16:00 - 18:00</span>
                    <span className="text-lg font-black tabular-nums">¥{hourlySales.slot16to18.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-muted-foreground">18:00 - 19:00</span>
                    <span className="text-lg font-black tabular-nums text-primary">¥{hourlySales.slot18to19.toLocaleString()}</span>
                  </div>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                   <CardTitle>登録履歴</CardTitle>
                   <CardDescription>期間内に行われた廃棄・値引き登録の履歴です。</CardDescription>
                </div>
                <div className="flex gap-1 bg-muted p-1 rounded-md">
                   <Button variant={activeTab === 'waste' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('waste')} className="text-xs h-8">廃棄履歴</Button>
                   <Button variant={activeTab === 'sale' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('sale')} className="text-xs h-8">値引き販売履歴</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="max-h-[400px] overflow-auto">
                {activeTab === 'waste' ? (
                    filteredWasteEntries.length > 0 ? (
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead className="w-[120px]">日付</TableHead>
                            <TableHead>品目</TableHead>
                            <TableHead className="text-right">廃棄ロス(原価)</TableHead>
                            <TableHead className="text-right">機会損失(売価)</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredWasteEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => {
                                const entryTotalSellPrice = entry.items.reduce((sum, item) => {
                                    return sum + resolveItemPrice(item, products) * item.quantity;
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
                                        <TableCell className="text-right text-orange-600 font-semibold tabular-nums">
                                            ¥{entryTotalSellPrice.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEntryToEdit(entry)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEntryToDelete(entry)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center text-muted-foreground py-10">廃棄記録はありません。</div>
                    )
                ) : (
                    transactions.filter(t => {
                        const d = new Date(t.date);
                        const from = date?.from ? startOfDay(date.from) : null;
                        const to = date?.to ? endOfDay(date.to) : (date?.from ? endOfDay(date.from) : null);
                        return from && to && d >= from && d <= to;
                    }).length > 0 ? (
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead className="w-[120px]">日付</TableHead>
                            <TableHead>品目</TableHead>
                            <TableHead className="text-right">小計(定価)</TableHead>
                            <TableHead className="text-right">値引き後合計</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions
                              .filter(t => {
                                const d = new Date(t.date);
                                const from = date?.from ? startOfDay(date.from) : null;
                                const to = date?.to ? endOfDay(date.to) : (date?.from ? endOfDay(date.from) : null);
                                return from && to && d >= from && d <= to;
                              })
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map(tx => (
                                <TableRow key={tx.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{format(new Date(tx.date), 'M月d日')}</span>
                                            <span className="text-xs text-muted-foreground">{format(new Date(tx.date), 'HH:mm')}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {tx.items.map((item, i) => (
                                                <div key={i} className="text-xs">
                                                    <span className="font-medium">{item.name}</span>
                                                    <span className="text-muted-foreground"> x {item.quantity}</span>
                                                </div>
                                            ))}
                                            {tx.discount && (
                                                <div className="text-[10px] text-destructive font-bold">
                                                    値引き: {tx.discount.type === 'percentage' ? `${tx.discount.value}%` : `¥${tx.discount.value}`}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium tabular-nums">
                                        ¥{tx.totalAmount.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-primary font-bold tabular-nums">
                                        ¥{tx.finalAmount.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTxToEdit(tx)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTxToDelete(tx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center text-muted-foreground py-10">値引き販売記録はありません。</div>
                    )
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
                                      return sum + resolveItemPrice(item, products) * item.quantity;
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
                                            <div className="text-xs font-black text-orange-600">機会損失 (売価計): ¥{entryTotalSellPrice.toLocaleString()}</div>
                                        </div>
                                        <div className="grid gap-1 bg-muted/30 p-2 rounded-md">
                                            {entry.items.map((item, i) => {
                                                const itemLoss = resolveItemPrice(item, products) * item.quantity;
                                                return (
                                                    <div key={i} className="flex justify-between items-center text-sm border-b border-white last:border-0 py-1">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold">{item.name}</span>
                                                            <span className="text-[10px] text-orange-600 font-bold">損失額: ¥{itemLoss.toLocaleString()}</span>
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
      
      <Dialog open={!!txToEdit} onOpenChange={(open) => !open && setTxToEdit(null)}>
        <DialogContent className="max-w-md">
          {txToEdit && (
            <TransactionEditForm
              transaction={txToEdit}
              products={products}
              onSave={(items, dValue, dType) => {
                if (txToEdit) {
                  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
                  const finalAmount = dType === 'percentage' 
                    ? subtotal - Math.floor(subtotal * (dValue / 100))
                    : Math.max(0, subtotal - dValue);
                    
                  updateTransaction(txToEdit.storeId, txToEdit.id, {
                    items,
                    totalAmount: subtotal,
                    finalAmount,
                    discount: dValue > 0 ? { type: dType, value: dValue } : null
                  });
                }
                setTxToEdit(null);
              }}
              onCancel={() => setTxToEdit(null)}
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

      <AlertDialog open={!!txToDelete} onOpenChange={(open) => !open && setTxToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除確認</AlertDialogTitle>
            <AlertDialogDescription>この値引き販売記録を完全に削除しますか？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTx} className="bg-destructive hover:bg-destructive/90">削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
