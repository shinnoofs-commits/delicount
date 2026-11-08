
'use client';

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import type { DateRange } from "react-day-picker";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Loader2, CalendarDays, Sun, Filter, PieChart, Package, Cloud, CloudRain, Snowflake, Maximize2, ClipboardList, Info, BarChart3, TrendingUp, DollarSign, Search, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, getDay, addDays, subDays, isSameDay, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import holiday_jp from '@holiday-jp/holiday_jp';
import { useTransactions } from "@/contexts/transaction-context";
import { useProducts } from "@/contexts/product-context";
import { useStores } from "@/contexts/store-context";
import { useAdmin } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useChatbotContext } from "@/contexts/chatbot-context";
import { type WeatherType, defaultCategories } from "@/lib/types";

const dayLabels = ['月', '火', '水', '木', '金', '土', '日', '祝'];
const dayOrder = [1, 2, 3, 4, 5, 6, 0, 7];
const dayMap: string[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'holiday'];

const weatherLabels: Record<string, string> = {
  sunny: '晴れ',
  cloudy: '曇り',
  rainy: '雨',
  snowy: '雪',
};

const weatherIcons: Record<string, any> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: Snowflake,
};

function SortHeader({ label, K, currentK, order, onClick, setOrder, align = 'left', className = "" }: any) {
  const isActive = currentK === K;
  return (
    <TableHead 
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors select-none text-[12px] font-black h-10 px-2", 
        align === 'right' && "text-right",
        className
      )}
      onClick={() => {
        if (isActive) {
          setOrder(order === 'asc' ? 'desc' : 'asc');
        } else {
          onClick(K);
          setOrder('desc');
        }
      }}
    >
      <div className={cn("flex items-center gap-1", align === 'right' && "justify-end")}>
        {label}
        {isActive ? (
          order === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
      </div>
    </TableHead>
  );
}

function actualDowLabel(dow: number) {
  const labels = ['日', '月', '火', '水', '木', '金', '土', '祝'];
  return labels[dow];
}

function DowAllTooltip({ active, payload, fullData }: any) {
  if (!active || !fullData) return null;

  return (
    <div className="bg-white/95 backdrop-blur shadow-2xl border-2 border-primary/20 py-4 px-6 rounded-3xl min-w-[400px] z-[1000]">
      <p className="text-[20px] font-black mb-2 pb-2 border-b flex items-center gap-3">
        <CalendarDays className="h-6 w-6 text-primary" /> 週間パフォーマンス一覧
      </p>
      <div className="space-y-1.5">
        <div className="grid grid-cols-[50px_1fr_1fr_1fr_1.5fr] gap-3 text-[14px] font-black text-muted-foreground uppercase pb-1">
          <span>曜</span>
          <span className="text-right">定価%</span>
          <span className="text-right">値引%</span>
          <span className="text-right">廃棄%</span>
          <span className="text-right">製造金額</span>
        </div>
        {fullData.map((d: any, idx: number) => {
          const isHighlighted = payload && payload[0]?.payload?.name === d.name;
          return (
            <div 
              key={idx} 
              className={cn(
                "grid grid-cols-[50px_1fr_1fr_1fr_1.5fr] gap-3 py-1 px-2 rounded-xl transition-colors",
                isHighlighted ? "bg-primary/10 scale-[1.02] shadow-sm" : "hover:bg-muted/50"
              )}
            >
              <span className={cn("text-[20px] font-black", (d.name === '土' || d.name === '日' || d.name === '祝') ? "text-destructive" : "text-blue-900")}>
                {d.name}
              </span>
              <span className="text-right text-[20px] font-bold tabular-nums text-blue-700">{d.regR.toFixed(1)}%</span>
              <span className="text-right text-[20px] font-bold tabular-nums text-yellow-700">{d.discR.toFixed(1)}%</span>
              <span className="text-right text-[20px] font-bold tabular-nums text-red-600">{d.wasteR.toFixed(1)}%</span>
              <span className="text-right text-[20px] font-black tabular-nums">¥{d.prodValue.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ABCAnalysisContent() {
  const { wasteEntries, transactions, loading: wasteLoading, setFetchDateRange } = useTransactions();
  const { products, loading: productsLoading } = useProducts();
  const { stores } = useStores();
  const { isAdmin } = useAdmin();
  const searchParams = useSearchParams();
  const { setChatContext, setPageTitle } = useChatbotContext();

  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWasteDow, setSelectedWasteDow] = useState<number | null>(null);
  const [selectedCategoryForDetail, setSelectedCategoryForDetail] = useState<string | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string | null>(null);
  const [isFullScreenDaily, setIsFullScreenDaily] = useState(false);
  const [yesterdayStr, setYesterdayStr] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  const [sortKey, setSortKey] = useState<string>('regSellIndex');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isClient, setIsClient] = useState(false);
  const [visibleProductsCount, setVisibleProductsCount] = useState(50);
  const [matrixDisplayMode, setMatrixDisplayMode] = useState<'rate' | 'quantity'>('rate');

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (date && date.from && setFetchDateRange) {
      const fromDate = startOfDay(date.from);
      const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
      setFetchDateRange({ from: fromDate, to: toDate });
    }
  }, [date, setFetchDateRange]);

  useEffect(() => {
    setVisibleProductsCount(50);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    if (isClient) {
      const today = new Date();
      setDate({
        from: startOfMonth(today),
        to: endOfMonth(today),
      });
      setYesterdayStr(format(subDays(today, 1), 'yyyy-MM-dd'));
    }
  }, [isClient]);

  const categories = useMemo(() => {
    const masterStore = stores?.find(s => s.id === 'master' || s.isMaster);
    const storeCategories = (masterStore?.categories || defaultCategories).filter(c => c && c.trim() && c !== '未分類');
    const sortedMaster = Array.from(new Set(storeCategories.map(c => c.trim()))).sort((a, b) => a.localeCompare(b, 'ja'));
    return ['all', ...sortedMaster, '未分類'];
  }, [stores]);

  useEffect(() => {
    if (selectedCategory !== 'all' && !categories.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [categories, selectedCategory]);

  const validDates = useMemo(() => {
    if (!date || !date.from || !yesterdayStr) return [];
    const fromDate = startOfDay(date.from);
    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
    const dates: string[] = [];
    let current = fromDate;
    while (current <= toDate) {
      const dStr = format(current, 'yyyy-MM-dd');
      if (dStr <= yesterdayStr) {
        dates.push(dStr);
      }
      current = addDays(current, 1);
    }
    return dates;
  }, [date, yesterdayStr]);

  const analysisData = useMemo(() => {
    if (wasteLoading || productsLoading || !date || !date.from || validDates.length === 0) return null;

    const dailyWeatherMap = new Map<string, WeatherType>();
    const stockCheckMap = new Map<string, Map<number, { quantity: number, value: number }>>();

    // Pre-index products for faster lookup
    const productMapByStore = new Map<string, Map<string, any>>();
    const productCodeNameMapByStore = new Map<string, Map<string, any>>();
    const productCodeMapByStore = new Map<string, Map<string, any>>();
    const productNameMapByStore = new Map<string, Map<string, any>>();

    // 商品マスタ (storeId === 'master') のインデックス（優先紐付け）
    const masterCodeMap = new Map<string, any>();
    const masterNameMap = new Map<string, any>();
    const masterIdMap = new Map<string, any>();

    products.forEach(p => {
        const normName = p.name ? p.name.replace(/[\s\u3000]+/g, '').replace(/（/g, '(').replace(/）/g, ')').trim().toLowerCase() : '';
        const normCode = p.productCode ? String(p.productCode).replace(/^0+/, '').trim() : '';

        if (p.storeId === 'master' || (p as any).isMaster) {
            masterIdMap.set(p.id, p);
            if (normCode) masterCodeMap.set(normCode, p);
            if (normName && !masterNameMap.has(normName)) masterNameMap.set(normName, p);
        }

        if (!productMapByStore.has(p.storeId)) productMapByStore.set(p.storeId, new Map());
        if (!productCodeNameMapByStore.has(p.storeId)) productCodeNameMapByStore.set(p.storeId, new Map());
        if (!productCodeMapByStore.has(p.storeId)) productCodeMapByStore.set(p.storeId, new Map());
        if (!productNameMapByStore.has(p.storeId)) productNameMapByStore.set(p.storeId, new Map());

        productMapByStore.get(p.storeId)!.set(p.id, p);
        if (normCode) {
            productCodeNameMapByStore.get(p.storeId)!.set(`${normCode}|${p.name}`, p);
            productCodeMapByStore.get(p.storeId)!.set(normCode, p);
        }
        if (normName && !productNameMapByStore.get(p.storeId)!.has(normName)) {
            productNameMapByStore.get(p.storeId)!.set(normName, p);
        }
    });

    const masterStore = stores?.find(s => s.id === 'master' || s.isMaster);
    const validMasterCategories = new Set(
      (masterStore?.categories || defaultCategories)
        .filter(c => c && c.trim() && c !== '未分類')
        .map(c => c.trim())
    );

    const resolveMasterCategory = (code?: string, name?: string, id?: string, fallbackCat?: string): string => {
        const normCode = code ? String(code).replace(/^0+/, '') : '';
        const normName = name ? name.replace(/[\s\u3000]+/g, '').replace(/（/g, '(').replace(/）/g, ')').trim().toLowerCase() : '';

        let candidate: string | null = null;
        // 1. 商品マスタ（商品コード一致）
        if (normCode && masterCodeMap.has(normCode)) {
            const cat = masterCodeMap.get(normCode)?.category;
            if (cat && cat.trim()) candidate = cat.trim();
        }
        // 2. 商品マスタ（商品名一致）
        else if (normName && masterNameMap.has(normName)) {
            const cat = masterNameMap.get(normName)?.category;
            if (cat && cat.trim()) candidate = cat.trim();
        }
        // 3. 商品マスタ（ID一致）
        else if (id && masterIdMap.has(id)) {
            const cat = masterIdMap.get(id)?.category;
            if (cat && cat.trim()) candidate = cat.trim();
        } else if (fallbackCat && fallbackCat.trim()) {
            candidate = fallbackCat.trim();
        }

        // マスタ商品に存在する有効なカテゴリーのみ反映。削除されたカテゴリーは「未分類」に集約
        if (candidate && validMasterCategories.has(candidate)) {
            return candidate;
        }
        return '未分類';
    };

    const getResolvedProductId = (storeId: string, id: string, code?: string, name?: string) => {
        const normalizedId = id?.replace(/^0+/, '');
        const normalizedCode = code ? String(code).replace(/^0+/, '').trim() : '';
        const normalizedName = name ? name.replace(/[\s\u3000]+/g, '').replace(/（/g, '(').replace(/）/g, ')').trim().toLowerCase() : '';
        
        // 1. 同一店舗内で商品名が一致する既存商品があればそのIDに集約（商品名同一商品の分裂を防止）
        if (normalizedName) {
            const prodByName = productNameMapByStore.get(storeId)?.get(normalizedName);
            if (prodByName) {
                return prodByName.id;
            }
            const masterByName = masterNameMap.get(normalizedName);
            if (masterByName) {
                return masterByName.id;
            }
        }

        // 2. 次に商品コードで検索
        let targetCode = normalizedCode;
        if (!targetCode) {
            const prod = productMapByStore.get(storeId)?.get(id);
            if (prod?.productCode) {
                targetCode = String(prod.productCode).replace(/^0+/, '').trim();
            } else if (normalizedId && normalizedId.match(/^\d+$/)) {
                targetCode = normalizedId;
            }
        }

        if (targetCode) {
            const representativeProd = productCodeMapByStore.get(storeId)?.get(targetCode);
            if (representativeProd) {
                return representativeProd.id;
            }
            const masterProd = masterCodeMap.get(targetCode);
            if (masterProd) {
                return masterProd.id;
            }
        }

        // 3. IDで店舗内商品を検索
        const found = productMapByStore.get(storeId)?.get(id);
        if (found) return found.id;

        return id;
    };

    wasteEntries.forEach(entry => {
        const dateKey = format(startOfDay(entry.date), 'yyyy-MM-dd');
        if (!validDates.includes(dateKey)) return;
        const storeDateKey = `${dateKey}|${entry.storeId}`;
        if (entry.weather) {
            dailyWeatherMap.set(storeDateKey, entry.weather);
        }
    });

    const synthesizedProducts = new Map<string, {name: string, category: string, price: number}>();

    transactions.forEach(tx => {
        if (tx.entryType !== 'STOCK_CHECK') return;
        
        const dateKey = format(startOfDay(tx.date), 'yyyy-MM-dd');
        if (!validDates.includes(dateKey)) return;
        const discValue = tx.discount?.value || 0;
        if (discValue === 0) return; 

        const storeDateKey = `${dateKey}|${tx.storeId}`;
        tx.items.forEach(item => {
            const currentProductId = getResolvedProductId(tx.storeId, item.productId, item.productCode, item.name);
            const key = `${storeDateKey}|${currentProductId}`;
            const baseProductId = currentProductId.split('__')[0];
            const product = productMapByStore.get(tx.storeId)?.get(baseProductId);
            const price = item.unitPrice ?? (product?.price || 0);

            const cat = resolveMasterCategory(
                item.productCode || product?.productCode,
                item.name || product?.name,
                product?.id || item.productId,
                product?.category
            );

            synthesizedProducts.set(`${tx.storeId}|${currentProductId}`, {
                name: product?.name || item.name,
                category: cat,
                price: price
            });

            if (!stockCheckMap.has(key)) stockCheckMap.set(key, new Map());
            const existing = stockCheckMap.get(key)!.get(discValue) || { quantity: 0, value: 0 };
            
            stockCheckMap.get(key)!.set(discValue, {
                quantity: existing.quantity + item.quantity,
                value: existing.value + (item.quantity * price)
            });
        });
    });

    const salesMap = new Map<string, {
      regSales: number,
      d20Sales: number,
      d30Sales: number,
      d40Sales: number,
      totalSalesValue: number
    }>();

    transactions.forEach(tx => {
        if (tx.entryType !== 'SALE') return;
        const dateKey = format(startOfDay(tx.date), 'yyyy-MM-dd');
        if (!validDates.includes(dateKey)) return;
        const storeDateKey = `${dateKey}|${tx.storeId}`;

        tx.items.forEach(item => {
            const currentProductId = getResolvedProductId(tx.storeId, item.productId, item.productCode, item.name);
            const key = `${storeDateKey}|${currentProductId}`;
            if (!salesMap.has(key)) {
                salesMap.set(key, { regSales: 0, d20Sales: 0, d30Sales: 0, d40Sales: 0, totalSalesValue: 0 });
            }
            const s = salesMap.get(key)!;
            const qty = item.quantity;
            const discRate = item.discountRate || 0;
            const baseProductId = currentProductId.split('__')[0];
            const product = productMapByStore.get(tx.storeId)?.get(baseProductId);
            const price = item.unitPrice ?? (product?.price || 0);

            const cat = resolveMasterCategory(
                item.productCode || product?.productCode,
                item.name || product?.name,
                product?.id || item.productId,
                product?.category
            );

            synthesizedProducts.set(`${tx.storeId}|${currentProductId}`, {
                name: product?.name || item.name,
                category: cat,
                price: price
            });

            const itemValue = price * qty * (1 - discRate);

            s.totalSalesValue += itemValue;

            if (discRate <= 0) {
                s.regSales += qty;
            } else if (discRate <= 0.25) {
                s.d20Sales += qty;
            } else if (discRate <= 0.35) {
                s.d30Sales += qty;
            } else {
                s.d40Sales += qty;
            }
        });
    });

    const dailyProductData = new Map<string, { 
      production: number, 
      productionValue: number,
      s20: number | null, 
      s20Value: number,
      s30: number | null, 
      s30Value: number,
      s40: number | null, 
      s40Value: number,
      waste: number,
      wasteValue: number
    }>();

    wasteEntries.forEach(entry => {
        const dateKey = format(startOfDay(entry.date), 'yyyy-MM-dd');
        if (!validDates.includes(dateKey)) return;
        
        const storeDateKey = `${dateKey}|${entry.storeId}`;
        if (entry.weather) {
            dailyWeatherMap.set(storeDateKey, entry.weather);
        }

        entry.items.forEach(item => {
            const currentProductId = getResolvedProductId(entry.storeId, item.productId, item.productCode, item.name);
            const key = `${dateKey}|${entry.storeId}|${currentProductId}`;
            let current = dailyProductData.get(key);
            if (!current) {
                current = { 
                    production: 0, productionValue: 0, 
                    s20: null, s20Value: 0, 
                    s30: null, s30Value: 0, 
                    s40: null, s40Value: 0, 
                    waste: 0, wasteValue: 0 
                };
                dailyProductData.set(key, current);
            }
            current.waste += item.quantity;
            const baseProductId = currentProductId.split('__')[0];
            const product = productMapByStore.get(entry.storeId)?.get(baseProductId);
            const price = item.unitPrice ?? (product?.price || 0);

            const cat = resolveMasterCategory(
                item.productCode || product?.productCode,
                item.name || product?.name,
                product?.id || item.productId,
                product?.category
            );

            synthesizedProducts.set(`${entry.storeId}|${currentProductId}`, {
                name: product?.name || item.name,
                category: cat,
                price: price
            });

            current.wasteValue += item.quantity * price;
        });
    });

    stockCheckMap.forEach((milestones, key) => {
        let item = dailyProductData.get(key);
        if (!item) {
            item = { 
                production: 0, productionValue: 0, 
                s20: null, s20Value: 0, 
                s30: null, s30Value: 0, 
                s40: null, s40Value: 0, 
                waste: 0, wasteValue: 0 
            };
            dailyProductData.set(key, item);
        }
        const m20 = milestones.get(20);
        if (m20) { item.s20 = m20.quantity; item.s20Value = m20.value; }
        const m30 = milestones.get(30);
        if (m30) { item.s30 = m30.quantity; item.s30Value = m30.value; }
        const m40 = milestones.get(40);
        if (m40) { item.s40 = m40.quantity; item.s40Value = m40.value; }
    });

    salesMap.forEach((_, key) => {
        if (!dailyProductData.has(key)) {
            dailyProductData.set(key, { 
                production: 0, productionValue: 0, 
                s20: null, s20Value: 0, 
                s30: null, s30Value: 0, 
                s40: null, s40Value: 0, 
                waste: 0, wasteValue: 0 
            });
        }
    });

    const productStatsAll = new Map<string, any>();
    const dayStats: Record<number, { waste: number; production: number; regSales: number; discSales: number; prodValue: number; actualValue: number; regValue: number }> = {};
    const weatherStats: Record<string, { waste: number; production: number; regSales: number; discSales: number; prodValue: number; actualValue: number; regValue: number }> = {};
    const matrixStats: Record<string, { waste: number; production: number; regSales: number; discSales: number }> = {};
    const categoryStats: Record<string, { waste: number; production: number; regSales: number; discSales: number; prodValue: number; actualValue: number; regValue: number }> = {};

    for (let i = 0; i < 8; i++) dayStats[i] = { waste: 0, production: 0, regSales: 0, discSales: 0, prodValue: 0, actualValue: 0, regValue: 0 };
    Object.keys(weatherLabels).forEach(w => weatherStats[w] = { waste: 0, production: 0, regSales: 0, discSales: 0, prodValue: 0, actualValue: 0, regValue: 0 });

    const allKeys = Array.from(dailyProductData.keys());

    allKeys.forEach((key) => {
        const [dateKey, storeId, productId] = key.split('|');
        const baseProductId = productId.split('__')[0];
        const product = productMapByStore.get(storeId)?.get(baseProductId);
        const synth = synthesizedProducts.get(`${storeId}|${productId}`);
        
        if (!product && !synth) return;

        const productName = (product?.name || synth?.name || '不明な商品').trim();
        const normStatsName = productName.replace(/[\s\u3000]+/g, '').replace(/（/g, '(').replace(/）/g, ')').trim().toLowerCase();
        const statsKey = `${storeId}|${normStatsName}`;

        const productCategory = resolveMasterCategory(
            product?.productCode,
            productName,
            product?.id || baseProductId,
            synth?.category || product?.category
        );
        const productPrice = product?.price || synth?.price || 0;
        const productCostPrice = product?.costPrice || 0;

        let stats = productStatsAll.get(statsKey);
        if (!stats) {
            stats = {
                id: product?.id || productId, storeId: storeId, name: productName, category: productCategory, price: productPrice, costPrice: productCostPrice,
                production: 0, regSales: 0, d20Sales: 0, d30Sales: 0, d40Sales: 0, waste: 0,
                prodValue: 0, actualValue: 0, regValue: 0, prodCostValue: 0,
                regDow: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 },
                d20Dow: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 },
                dDiscDow: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 }, 
                wasteDow: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 },
                prodDow: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 }
            };
            productStatsAll.set(statsKey, stats);
        } else {
            if (stats.price === 0 && productPrice > 0) stats.price = productPrice;
            if (stats.costPrice === 0 && productCostPrice > 0) stats.costPrice = productCostPrice;
            if (stats.category === '未分類' && productCategory !== '未分類') stats.category = productCategory;
        }
        
        const entryDate = new Date(`${dateKey}T00:00:00`);
        const isHoliday = holiday_jp.isHoliday(entryDate);
        const dow = isHoliday ? 7 : getDay(entryDate);
        const weather = dailyWeatherMap.get(`${dateKey}|${storeId}`) || 'sunny';

        const dailyData = dailyProductData.get(key)!;
        const { s20, s20Value, s30, s30Value, s40, s40Value, waste, wasteValue } = dailyData;

        const price = productPrice;
        const directSales = salesMap.get(key);
        
        let regSales = 0;
        let d20Sales = 0;
        let d30Sales = 0;
        let d40Sales = 0;

        if (directSales) {
          regSales = directSales.regSales;
          d20Sales = directSales.d20Sales;
          d30Sales = directSales.d30Sales;
          d40Sales = directSales.d40Sales;
        } else {
          regSales = 0;
          d20Sales = s20 !== null ? Math.max(0, s20 - (s30 ?? s40 ?? waste)) : 0;
          d30Sales = s30 !== null ? Math.max(0, s30 - (s40 ?? waste)) : 0;
          d40Sales = s40 !== null ? Math.max(0, s40 - waste) : 0;
        }
        const discSalesTotal = d20Sales + d30Sales + d40Sales;
        const totalSalesQty = regSales + discSalesTotal;

        const production = totalSalesQty + waste;
        const productionValue = production * price;
        const productionCostValue = production * productCostPrice;
        
        let actualValue = 0;
        let regValue = 0;

        if (directSales) {
          actualValue = directSales.totalSalesValue;
          regValue = directSales.regSales * price;
        } else {
          regValue = regSales * price;
          const getAvgPrice = (qty: number, val: number) => qty > 0 ? val / qty : price;
          const d20Val = d20Sales * getAvgPrice(s20 ?? 0, s20Value) * 0.8;
          const d30Val = d30Sales * getAvgPrice(s30 ?? 0, s30Value) * 0.7;
          const d40Val = d40Sales * getAvgPrice(s40 ?? 0, s40Value) * 0.6;
          actualValue = regValue + d20Val + d30Val + d40Val;
        }

        stats.production += production;
        stats.regSales += regSales;
        stats.d20Sales += d20Sales;
        stats.d30Sales += d30Sales;
        stats.d40Sales += d40Sales;
        stats.waste += waste;
        stats.prodValue += productionValue;
        stats.prodCostValue += productionCostValue;
        stats.actualValue += actualValue;
        stats.regValue += regValue;

        stats.prodDow[dow] += production;
        stats.regDow[dow] += regSales;
        stats.dDiscDow[dow] += discSalesTotal;
        stats.wasteDow[dow] += waste;

        const isSelectedCat = selectedCategory === 'all' || productCategory === selectedCategory;

        if (isSelectedCat) {
            dayStats[dow].production += production;
            dayStats[dow].waste += waste;
            dayStats[dow].regSales += regSales;
            dayStats[dow].discSales += discSalesTotal;
            dayStats[dow].prodValue += productionValue;
            dayStats[dow].actualValue += actualValue;
            dayStats[dow].regValue += regValue;
        }
        
        if (!categoryStats[productCategory]) {
          categoryStats[productCategory] = { waste: 0, production: 0, regSales: 0, discSales: 0, prodValue: 0, actualValue: 0, regValue: 0 };
        }
        categoryStats[productCategory].production += production;
        categoryStats[productCategory].waste += waste;
        categoryStats[productCategory].regSales += regSales;
        categoryStats[productCategory].discSales += discSalesTotal;
        categoryStats[productCategory].prodValue += productionValue;
        categoryStats[productCategory].actualValue += actualValue;
        categoryStats[productCategory].regValue += regValue;

        if (isSelectedCat) {
            weatherStats[weather].production += production;
            weatherStats[weather].waste += waste;
            weatherStats[weather].regSales += regSales;
            weatherStats[weather].discSales += discSalesTotal;
            weatherStats[weather].prodValue += productionValue;
            weatherStats[weather].actualValue += actualValue;
            weatherStats[weather].regValue += regValue;

            const matrixKey = `${dow}-${weather}`;
            if (!matrixStats[matrixKey]) matrixStats[matrixKey] = { waste: 0, production: 0, regSales: 0, discSales: 0 };
            matrixStats[matrixKey].production += production;
            matrixStats[matrixKey].waste += waste;
            matrixStats[matrixKey].regSales += regSales;
            matrixStats[matrixKey].discSales += discSalesTotal;
        }
    });

    const productsForDisplay = Array.from(productStatsAll.values())
        .filter(p => selectedCategory === 'all' || p.category === selectedCategory);

    const totalProduction = productsForDisplay.reduce((sum, p) => sum + p.production, 0);
    const totalWaste = productsForDisplay.reduce((sum, p) => sum + p.waste, 0);
    const totalRegSales = productsForDisplay.reduce((sum, p) => sum + p.regSales, 0);
    const totalD20Sales = productsForDisplay.reduce((sum, p) => sum + p.d20Sales, 0);
    const totalD30Sales = productsForDisplay.reduce((sum, p) => sum + p.d30Sales, 0);
    const totalD40Sales = productsForDisplay.reduce((sum, p) => sum + p.d40Sales, 0);
    const totalDiscSales = productsForDisplay.reduce((sum, p) => sum + (p.d20Sales + p.d30Sales + p.d40Sales), 0);

    const totalProdValue = productsForDisplay.reduce((sum, p) => sum + p.prodValue, 0);
    const totalProdCostValue = productsForDisplay.reduce((sum, p) => sum + p.prodCostValue, 0);
    const totalActualValue = productsForDisplay.reduce((sum, p) => sum + p.actualValue, 0);

    const totalProdCostRate = totalProdValue > 0 ? (totalProdCostValue / totalProdValue) * 100 : 0;
    const totalActualCostRate = totalActualValue > 0 ? (totalProdCostValue / totalActualValue) * 100 : 0;

    return {
      products: productsForDisplay,
      dayStats,
      weatherStats,
      matrixStats,
      categoryStats,
      totalWaste,
      totalProduction,
      totalRegSales,
      totalD20Sales,
      totalD30Sales,
      totalD40Sales,
      totalDiscSales,
      totalProdCostRate,
      totalActualCostRate
    };
  }, [transactions, wasteEntries, products, stores, validDates, wasteLoading, productsLoading, selectedCategory, date]);

  useEffect(() => {
    setPageTitle('廃棄クロス分析');
    if (analysisData) {
      const EXCLUDED_CATEGORIES = ['未分類'];
      const EXCLUDED_NAMES = ['レジ袋', '値引'];

      const mainProducts = [...analysisData.products]
        .filter(p => !EXCLUDED_CATEGORIES.includes(p.category) && !EXCLUDED_NAMES.some(name => p.name.includes(name)))
        .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
        .sort((a, b) => b.production - a.production)
        .slice(0, 150);
      
      setChatContext(JSON.stringify({
        page: '廃棄クロス分析',
        selectedCategory: selectedCategory === 'all' ? '全カテゴリー' : selectedCategory,
        overallStats: {
          totalProduction: analysisData.totalProduction,
          totalWaste: analysisData.totalWaste,
          totalRegSales: analysisData.totalRegSales,
          totalDiscSales: analysisData.totalDiscSales,
          totalWasteRate: analysisData.totalProduction > 0 ? Number(((analysisData.totalWaste / analysisData.totalProduction) * 100).toFixed(1)) : 0
        },
        mainProductsData: mainProducts.map(p => {
          const regSalesRate = p.production > 0 ? Number(((p.regSales / p.production) * 100).toFixed(1)) : 0;
          const wasteRate = p.production > 0 ? Number(((p.waste / p.production) * 100).toFixed(1)) : 0;
          const discSales = p.d20Sales + p.d30Sales + p.d40Sales;
          return {
            name: p.name,
            category: p.category,
            production: p.production,
            regSalesAmount: p.regSales,
            discSalesAmount: discSales,
            wasteAmount: p.waste,
            regSalesRate: regSalesRate,
            wasteRate: wasteRate
          };
        }),
        matrixStats: analysisData.matrixStats
      }));
    } else {
      setChatContext('データがありません。');
    }
  }, [analysisData, selectedCategory, setChatContext, setPageTitle]);

  const selectedDowWasteList = useMemo(() => {
    if (selectedWasteDow === null || !analysisData) return [];
    
    return analysisData.products
      .filter(p => p.wasteDow[selectedWasteDow] > 0)
      .map(p => ({
        product: { id: p.id, name: p.name, category: p.category, price: p.price },
        quantity: p.wasteDow[selectedWasteDow]
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [selectedWasteDow, analysisData]);

  const sortedCategoryStats = useMemo(() => {
    if (!analysisData) return [];
    return Object.entries(analysisData.categoryStats)
      .map(([cat, stats]) => {
        const s = stats as { waste: number; production: number; regSales: number; discSales: number; actualValue: number; prodValue: number; regValue: number };
        const rate = s.production > 0 ? (s.waste / s.production) * 100 : 0;
        return { cat, ...s, rate };
      })
      .sort((a, b) => b.rate - a.rate);
  }, [analysisData]);

  const overallWasteRate = useMemo(() => {
    if (!analysisData || analysisData.totalProduction <= 0) return 0;
    return (analysisData.totalWaste / analysisData.totalProduction) * 100;
  }, [analysisData]);

  const overallRegSalesRate = useMemo(() => {
    if (!analysisData || analysisData.totalProduction <= 0) return 0;
    return (analysisData.totalRegSales / analysisData.totalProduction) * 100;
  }, [analysisData]);

  const overallDiscSalesRate = useMemo(() => {
    if (!analysisData || analysisData.totalProduction <= 0) return 0;
    return (analysisData.totalDiscSales / analysisData.totalProduction) * 100;
  }, [analysisData]);

  const searchFilteredProducts = useMemo(() => {
    if (!analysisData) return [];
    const filtered = analysisData.products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      const getRegSellIndex = (p: any) => {
        const prod = p.production || 1;
        const regRate = (p.regSales / prod);
        const sellThrough = ((p.regSales + p.d20Sales + p.d30Sales + p.d40Sales) / prod);
        return regRate * sellThrough;
      };

      const getRate = (val: number, prod: number) => prod > 0 ? (val / prod) : 0;
      const getDiscRate = (p: any) => getRate((p.d20Sales + p.d30Sales + p.d40Sales), p.production);
      
      const getDiscValueLoss = (p: any) => Math.max(0, p.prodValue - p.actualValue - (p.waste * p.price));
      const getWasteValue = (p: any) => p.waste * p.price;
      const getTotalLossAmount = (p: any) => p.prodValue - p.actualValue;

      switch (sortKey) {
        case 'name': valA = a.name; valB = b.name; break;
        case 'category': valA = a.category; valB = b.category; break;
        case 'prodValue': valA = a.prodValue; valB = b.prodValue; break;
        case 'prodCostRate': valA = a.prodValue > 0 ? (a.prodCostValue / a.prodValue) * 100 : 0; valB = b.prodValue > 0 ? (b.prodCostValue / b.prodValue) * 100 : 0; break;
        case 'actualValue': valA = a.actualValue; valB = b.actualValue; break;
        case 'actualGrossProfit': valA = a.actualValue - a.prodCostValue; valB = b.actualValue - b.prodCostValue; break;
        case 'actualCostRate': valA = a.actualValue > 0 ? (a.prodCostValue / a.actualValue) * 100 : 0; valB = b.actualValue > 0 ? (b.prodCostValue / b.actualValue) * 100 : 0; break;
        case 'actualRate': valA = a.prodValue > 0 ? a.actualValue / a.prodValue : 0; valB = b.prodValue > 0 ? b.actualValue / b.prodValue : 0; break;
        case 'production': valA = a.production; valB = b.production; break;
        case 'regRate': valA = getRate(a.regSales, a.production); valB = getRate(b.regSales, b.production); break;
        case 'd20Rate': valA = getRate(a.d20Sales, a.production); valB = getRate(b.d20Sales, b.production); break;
        case 'd30Rate': valA = getRate(a.d30Sales, a.production); valB = getRate(b.d30Sales, b.production); break;
        case 'd40Rate': valA = getRate(a.d40Sales, a.production); valB = getRate(b.d40Sales, b.production); break;
        case 'discQty': valA = (a.d20Sales + a.d30Sales + a.d40Sales); valB = (b.d20Sales + b.d30Sales + b.d40Sales); break;
        case 'discRate': valA = getDiscRate(a); valB = getDiscRate(b); break;
        case 'sellThrough': 
          valA = getRate((a.regSales + a.d20Sales + a.d30Sales + a.d40Sales), a.production); 
          valB = getRate((b.regSales + b.d20Sales + b.d30Sales + b.d40Sales), b.production); 
          break;
        case 'wasteQty': valA = a.waste; valB = b.waste; break;
        case 'wasteRate': valA = getRate(a.waste, a.production); valB = getRate(b.waste, b.production); break;
        case 'discValueLoss': valA = getDiscValueLoss(a); valB = getDiscValueLoss(b); break;
        case 'discValueLossRate': valA = a.prodValue > 0 ? getDiscValueLoss(a) / a.prodValue : 0; valB = b.prodValue > 0 ? getDiscValueLoss(b) / b.prodValue : 0; break;
        case 'wasteValue': valA = getWasteValue(a); valB = getWasteValue(b); break;
        case 'wasteValueRate': valA = a.prodValue > 0 ? getWasteValue(a) / a.prodValue : 0; valB = b.prodValue > 0 ? getWasteValue(b) / b.prodValue : 0; break;
        case 'totalLossAmount': valA = getTotalLossAmount(a); valB = getTotalLossAmount(b); break;
        case 'totalLossRate': valA = a.prodValue > 0 ? getTotalLossAmount(a) / a.prodValue : 0; valB = b.prodValue > 0 ? getTotalLossAmount(b) / b.prodValue : 0; break;
        default: valA = 0; valB = 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [analysisData, searchQuery, sortKey, sortOrder]);

  const renderDailyGrid = (isFull: boolean = false) => {
    if (!analysisData) return null;
    return (
      <div className={cn(
        "px-1",
        isFull 
          ? "grid grid-cols-4 gap-2 pb-6 w-full" 
          : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
      )}>
        {dayOrder.map((actualDow, i) => {
          const label = dayLabels[i];
          const dowProducts = (analysisData.products || [])
            .filter(p => (p.prodDow[actualDow] || 0) > 0 || (p.wasteDow[actualDow] || 0) > 0)
            .sort((a, b) => {
              const rateA = (a.prodDow[actualDow] || 0) > 0 ? (a.wasteDow[actualDow] / a.prodDow[actualDow]) : 0;
              const rateB = (b.prodDow[actualDow] || 0) > 0 ? (b.wasteDow[actualDow] / b.prodDow[actualDow]) : 0;
              return rateB - rateA;
            });
          
          const stats = analysisData.dayStats[actualDow];
          const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;

          return (
            <Card key={label} onClick={() => !isFull && setSelectedWasteDow(actualDow)} className={cn(
              "border bg-background shadow-sm overflow-hidden flex flex-col transition-all",
              !isFull && "hover:border-primary/50 cursor-pointer h-[500px]",
              isFull && "h-[420px] border-2 shadow-md w-full"
            )}>
              <CardHeader className={cn(
                "p-3 py-2 border-b shrink-0",
                (actualDow === 0 || actualDow === 7) ? "bg-destructive/10" : (actualDow === 6 ? "bg-blue-50" : "bg-muted/30")
              )}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={(actualDow === 0 || actualDow === 7) ? "destructive" : (actualDow === 6 ? "default" : "outline")} className="h-8 w-8 rounded-full flex items-center justify-center p-0 font-black text-[14px]">
                      {label}
                    </Badge>
                    <span className="text-[12px] font-bold text-muted-foreground">{actualDowLabel(actualDow)}曜日</span>
                  </div>
                  <div className={cn("text-[20px] font-black", rate > 15 ? "text-destructive" : "text-blue-900")}>
                    {rate.toFixed(1)}%
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black opacity-80 border-t pt-1">
                   <span>製造計: {stats.production}</span>
                   <span className="text-destructive">廃棄合計: {stats.waste}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto overflow-x-hidden">
                {dowProducts.length > 0 ? (
                  <Table className="w-full table-fixed">
                    <TableHeader className="bg-muted/20 sticky top-0 z-10">
                      <TableRow className="h-8">
                        <TableHead className="h-8 p-1 px-2 text-[10px] font-black">商品実績</TableHead>
                        <TableHead className="h-8 p-1 px-2 text-[10px] font-black text-right w-[110px]">廃棄率</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dowProducts.map((p) => {
                        const pWaste = p.wasteDow[actualDow] || 0;
                        const pProd = p.prodDow[actualDow] || 0;
                        const pRate = pProd > 0 ? (pWaste / pProd) * 100 : 0;
                        return (
                          <TableRow key={`${p.storeId}|${p.id}`} className="h-16 hover:bg-muted/5 border-b last:border-0">
                            <TableCell className="p-2 px-2">
                              <p className="text-[16px] font-black leading-tight truncate w-full">{p.name}</p>
                              <div className="text-[16px] font-black mt-1 flex items-center gap-2 tabular-nums">
                                <span className="text-muted-foreground/80 shrink-0">製:{pProd}</span>
                                <span className="text-destructive shrink-0">廃:{pWaste}</span>
                              </div>
                            </TableCell>
                            <TableCell className="p-2 px-2 text-right">
                              <p className={cn("text-[26px] font-black leading-none tabular-nums", pRate > 15 ? "text-destructive" : "text-blue-900")}>
                                {pRate.toFixed(1)}%
                              </p>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-30 py-10">
                    <ClipboardList className="h-10 w-10 mb-2" />
                    <p className="text-[12px] font-black">データなし</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (!isClient || wasteLoading || productsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 h-full overflow-hidden">
      <Card className="shrink-0 border-none shadow-none bg-muted/40">
        <CardContent className="p-1 flex flex-wrap items-center gap-2">

          <div className="flex items-center gap-1">
            <Label className="text-[10px] font-black uppercase opacity-70">期間</Label>
            <DatePickerWithRange date={date} setDate={setDate} />
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-[10px] font-black uppercase opacity-70">カテゴリー</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-6 text-[10px] w-[120px] bg-background">
                <SelectValue placeholder="全カテゴリー" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat} className="text-[10px]">{cat === 'all' ? '全カテゴリー' : cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-6 text-[10px] font-bold"
            onClick={() => {
              const { exportToCsv } = require('@/lib/export-utils');
              const exportData = searchFilteredProducts.map(p => ({
                '商品コード': p.code || '',
                '商品名': p.name,
                'カテゴリー': p.category,
                '単価': p.price || 0,
                '製造個数': p.production,
                '定価販売数': p.regSales,
                '定価販売率(%)': p.production > 0 ? ((p.regSales / p.production) * 100).toFixed(1) : '0.0',
                '20%引販売数': p.d20Sales,
                '20%引販売率(%)': p.production > 0 ? ((p.d20Sales / p.production) * 100).toFixed(1) : '0.0',
                '30%引販売数': p.d30Sales,
                '30%引販売率(%)': p.production > 0 ? ((p.d30Sales / p.production) * 100).toFixed(1) : '0.0',
                '40%引販売数': p.d40Sales,
                '40%引販売率(%)': p.production > 0 ? ((p.d40Sales / p.production) * 100).toFixed(1) : '0.0',
                '値引販売個数': p.d20Sales + p.d30Sales + p.d40Sales,
                '値引販売率(%)': p.production > 0 ? (((p.d20Sales + p.d30Sales + p.d40Sales) / p.production) * 100).toFixed(1) : '0.0',
                '廃棄数': p.waste,
                '廃棄率(%)': p.production > 0 ? ((p.waste / p.production) * 100).toFixed(1) : '0.0',
                '値引ロス金額': p.discountLoss,
                '廃棄ロス金額': p.wasteValue,
                '実利益額': p.actualValue
              }));
              exportToCsv(`廃棄クロス分析_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`, exportData);
            }}
          >
            <Download className="h-3 w-3 mr-1" />
            CSV出力
          </Button>
          <Badge variant="secondary" className="ml-auto h-6 text-[9px] font-bold bg-blue-50 text-blue-700 flex gap-1 items-center">
            <Info className="h-2.5 w-2.5" />
            データは前日分まで集計されています
          </Badge>
        </CardContent>
      </Card>

      {!analysisData || (analysisData.totalProduction <= 0 && analysisData.totalWaste === 0) ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed m-4">
          <PieChart className="h-10 w-10 mb-2 opacity-20" />
          <p className="font-bold">対象期間（前日まで）にデータがありません</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-1 min-h-0">
          <div className="grid grid-cols-7 gap-1 shrink-0 px-1">
            <Card className="bg-background border-l-[3px] border-l-blue-400 h-14">
              <CardContent className="p-2">
                <p className="text-[10px] text-muted-foreground font-black uppercase">総製造数</p>
                <div className="text-[22px] font-black">{analysisData.totalProduction.toLocaleString()} <span className="text-[12px] font-normal">個</span></div>
              </CardContent>
            </Card>
            <Card className="bg-background border-l-[3px] border-l-emerald-500 h-14">
              <CardContent className="p-2">
                <p className="text-[10px] text-muted-foreground font-black uppercase">定価販売率</p>
                <div className="text-[22px] font-black text-emerald-700">{overallRegSalesRate.toFixed(1)}<span className="text-[12px] font-normal">%</span></div>
              </CardContent>
            </Card>
            <Card className="bg-background border-l-[3px] border-l-red-500 h-14">
              <CardContent className="p-2">
                <p className="text-[10px] text-red-500 font-black uppercase">合計製造原価率</p>
                <div className="text-[22px] font-black text-red-600">{analysisData.totalProdCostRate.toFixed(1)}<span className="text-[12px] font-normal">%</span></div>
              </CardContent>
            </Card>
            <Card className="bg-background border-l-[3px] border-l-red-500 h-14">
              <CardContent className="p-2">
                <p className="text-[10px] text-red-500 font-black uppercase">合計実質原価率</p>
                <div className="text-[22px] font-black text-red-600">{analysisData.totalActualCostRate.toFixed(1)}<span className="text-[12px] font-normal">%</span></div>
              </CardContent>
            </Card>
            <Card className="bg-background border-l-[3px] border-l-orange-400 h-14" title={`値引内訳 => 20%引: ${analysisData.totalD20Sales.toLocaleString()}個 / 30%引: ${analysisData.totalD30Sales.toLocaleString()}個 / 40%引: ${analysisData.totalD40Sales.toLocaleString()}個`}>
              <CardContent className="p-2 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground font-black uppercase">値引販売率 (個数)</p>
                  <span className="text-[9px] text-orange-600 font-bold whitespace-nowrap">
                    20%:{analysisData.totalD20Sales.toLocaleString()} / 30%:{analysisData.totalD30Sales.toLocaleString()} / 40%:{analysisData.totalD40Sales.toLocaleString()}
                  </span>
                </div>
                <div className="text-[20px] font-black text-orange-600 flex items-baseline gap-1.5 leading-none">
                  <span>{overallDiscSalesRate.toFixed(1)}<span className="text-[11px] font-normal">%</span></span>
                  <span className="text-[12px] font-bold text-muted-foreground">({analysisData.totalDiscSales.toLocaleString()}個)</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background border-l-[3px] border-l-destructive h-14">
              <CardContent className="p-2">
                <p className="text-[10px] text-muted-foreground font-black uppercase">総廃棄数</p>
                <div className="text-[22px] font-black text-destructive">{analysisData.totalWaste.toLocaleString()} <span className="text-[12px] font-normal">個</span></div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-l-[3px] border-l-blue-900 h-14 shadow-sm">
              <CardContent className="p-2">
                <p className="text-[10px] text-blue-900 font-black uppercase">平均廃棄率</p>
                <div className="text-[24px] font-black text-blue-900 leading-none mt-0.5">{overallWasteRate.toFixed(1)}<span className="text-[14px] font-normal">%</span></div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-1 px-1 shrink-0">
            <Card className="lg:col-span-8 border-none shadow-none bg-background">
              <CardHeader className="p-1 pb-0">
                <CardTitle className="text-[9px] text-muted-foreground font-black uppercase flex items-center">
                  <CalendarDays className="h-2.5 w-2.5 mr-1 text-primary" />曜日別 廃棄率
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1">
                <div className="grid grid-cols-4 lg:grid-cols-8 gap-1">
                  {dayLabels.map((label, i) => {
                    const actualDow = dayOrder[i];
                    const stats = analysisData.dayStats[actualDow];
                    const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                    const isAlert = rate > 15;
                    let borderColor = "border-slate-200";
                    let labelColor = "text-muted-foreground";
                    if (actualDow === 6) { borderColor = "border-blue-400"; labelColor = "text-blue-500"; }
                    if (actualDow === 0 || actualDow === 7) { borderColor = "border-destructive/60"; labelColor = "text-destructive"; }
                    return (
                      <div key={label} onClick={() => setSelectedWasteDow(actualDow)} className={cn(
                        "flex items-center justify-between px-2 h-9 lg:h-10 rounded-full transition-all cursor-pointer hover:bg-muted/80 bg-background border shadow-sm",
                        borderColor,
                        isAlert && "bg-destructive/5 border-destructive border-2"
                      )}>
                        <span className={cn("text-[12px] font-black shrink-0", labelColor)}>{label}</span>
                        <div className={cn("text-[16px] font-black tabular-nums leading-none flex items-baseline gap-0.5", isAlert ? "text-destructive" : "text-blue-900")}>
                          {rate.toFixed(1)}<span className="text-[9px] font-normal">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4 border-none shadow-none bg-background">
              <CardHeader className="p-1 pb-0">
                <CardTitle className="text-[9px] text-muted-foreground font-black uppercase flex items-center">
                  <Sun className="h-2.5 w-2.5 mr-1 text-orange-500" />天気別 廃棄率
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  {Object.entries(weatherLabels).map(([key, label]) => {
                    const stats = analysisData.weatherStats[key] || { waste: 0, production: 0 };
                    const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                    const Icon = weatherIcons[key];
                    const isAlert = rate > 15;
                    return (
                      <div key={key} className={cn(
                        "flex items-center justify-between px-2 h-9 lg:h-10 rounded-full bg-background border border-orange-400/50 shadow-sm",
                        isAlert && "bg-destructive/5 border-destructive border-2"
                      )}>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Icon className={cn("h-3.5 w-3.5", isAlert ? "text-destructive" : "text-orange-500")} />
                          <span className="text-[12px] font-black text-muted-foreground">{label.charAt(0)}</span>
                        </div>
                        <div className={cn("text-[16px] font-black tabular-nums leading-none flex items-baseline gap-0.5", isAlert ? "text-destructive" : "text-orange-600")}>
                          {rate.toFixed(1)}<span className="text-[9px] font-normal">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="product" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-5 h-9 p-1 bg-muted/60 mx-1">
              <TabsTrigger value="product" className="text-[13px] font-black uppercase">商品別実績</TabsTrigger>
              <TabsTrigger value="category_ana" className="text-[13px] font-black uppercase">カテゴリー分析</TabsTrigger>
              <TabsTrigger value="dow_ana" className="text-[13px] font-black uppercase">曜日別分析</TabsTrigger>
              <TabsTrigger value="daily" className="text-[13px] font-black uppercase">曜日別一覧</TabsTrigger>
              <TabsTrigger value="cross" className="text-[13px] font-black uppercase">クロス分析</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-1 px-1">
              <TabsContent value="product" className="m-0">
                <Card className="border-none shadow-none">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-2 p-2 bg-muted/30 border-b">
                      <Search className="h-3 w-3 text-muted-foreground" />
                      <Input
                        placeholder="商品名で検索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-7 text-[12px] max-w-sm"
                      />
                    </div>
                    <div className="relative w-full overflow-auto pb-4">
                      <Table className="min-w-[2150px] whitespace-nowrap">
                        <TableHeader className="bg-muted/50">
                          <TableRow className="h-10">
                            <SortHeader label="商品名" K="name" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} className="sticky left-0 bg-muted/90 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" />
                            <SortHeader label="部門" K="category" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} />
                            <SortHeader label="製造売上" K="prodValue" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" />
                            <SortHeader label="製造原価率" K="prodCostRate" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-red-600 bg-red-50/50" />
                            <SortHeader label="実質売上" K="actualValue" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-blue-700 bg-blue-50/50" />
                            <SortHeader label="実質粗利額" K="actualGrossProfit" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-emerald-700 bg-emerald-50/50" />
                            <SortHeader label="実質原価率" K="actualCostRate" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-red-600 bg-red-50/50" />
                            <SortHeader label="実質売上率" K="actualRate" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-blue-700 bg-blue-50/50" />
                            <SortHeader label="製造個数" K="production" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" />
                            <SortHeader label="定価販売率" K="regRate" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-emerald-700 bg-emerald-50/50" />
                            <SortHeader label="20%引" K="d20Rate" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-orange-600 bg-orange-50/50" />
                            <SortHeader label="30%引" K="d30Rate" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-orange-600 bg-orange-50/50" />
                            <SortHeader label="40%引" K="d40Rate" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-orange-600 bg-orange-50/50" />
                            <SortHeader label="値引販売個数" K="discQty" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-orange-700 bg-orange-100/50" />
                            <SortHeader label="値引販売個数率" K="discRate" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-orange-700 bg-orange-100/50" />
                            <SortHeader label="消化個数率" K="sellThrough" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" />
                            <SortHeader label="廃棄個数" K="wasteQty" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-destructive bg-destructive/5" />
                            <SortHeader label="廃棄個数率" K="wasteRate" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-destructive bg-destructive/5" />
                            <SortHeader label="値引額" K="discValueLoss" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-orange-700 bg-orange-100/50" />
                            <SortHeader label="値引額率" K="discValueLossRate" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-orange-700 bg-orange-100/50" />
                            <SortHeader label="廃棄額" K="wasteValue" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-destructive bg-destructive/5" />
                            <SortHeader label="廃棄額率" K="wasteValueRate" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-destructive bg-destructive/5" />
                            <SortHeader label="合計ロス額" K="totalLossAmount" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-purple-700 bg-purple-50/50" />
                            <SortHeader label="合計ロス額率" K="totalLossRate" currentK={sortKey} order={sortOrder} onClick={setSortKey} setOrder={setSortOrder} align="right" className="text-purple-700 bg-purple-50/50" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {searchFilteredProducts.slice(0, visibleProductsCount).map((p) => {
                            const prod = p.production || 1;
                            const regRate = (p.regSales / prod) * 100;
                            const d20Rate = (p.d20Sales / prod) * 100;
                            const d30Rate = (p.d30Sales / prod) * 100;
                            const d40Rate = (p.d40Sales / prod) * 100;
                            const discRate = ((p.d20Sales + p.d30Sales + p.d40Sales) / prod) * 100;
                            const sellThrough = ((p.regSales + p.d20Sales + p.d30Sales + p.d40Sales) / prod) * 100;
                            const wasteRate = (p.waste / prod) * 100;
                            
                            const prodCostRate = p.prodValue > 0 ? (p.prodCostValue / p.prodValue) * 100 : 0;
                            const actualRate = p.prodValue > 0 ? (p.actualValue / p.prodValue) * 100 : 0;
                            const actualGrossProfit = p.actualValue - p.prodCostValue;
                            const actualCostRate = p.actualValue > 0 ? (p.prodCostValue / p.actualValue) * 100 : 0;
                            const totalLossAmount = p.prodValue - p.actualValue;
                            const totalLossRate = p.prodValue > 0 ? (totalLossAmount / p.prodValue) * 100 : 0;
                            const wasteValue = p.waste * p.price;
                            const wasteValueRate = p.prodValue > 0 ? (wasteValue / p.prodValue) * 100 : 0;
                            const discValueLoss = Math.max(0, totalLossAmount - wasteValue);
                            const discValueLossRate = p.prodValue > 0 ? (discValueLoss / p.prodValue) * 100 : 0;

                            return (
                              <TableRow key={`${p.storeId}|${p.id}`} className="hover:bg-muted/30 transition-colors h-11 border-b last:border-0 group">
                                <TableCell className="p-2 font-black transition-colors sticky left-0 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-black"><span className="cursor-pointer hover:underline" onClick={() => setSelectedProductName(p.name)}>{p.name}</span></TableCell>
                                <TableCell className="p-2 opacity-70 text-[11px]">{p.category}</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-bold">¥{p.prodValue.toLocaleString()}</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-bold text-red-600 bg-red-50/30">{prodCostRate.toFixed(1)}%</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-black text-blue-900 bg-blue-50/30">¥{p.actualValue.toLocaleString()}</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-black text-emerald-700 bg-emerald-50/30">¥{actualGrossProfit.toLocaleString()}</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-black text-red-600 bg-red-50/30">{actualCostRate.toFixed(1)}%</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-black text-blue-900 bg-blue-50/30">{actualRate.toFixed(1)}%</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-bold">{p.production.toLocaleString()}個</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-black text-emerald-700 bg-emerald-50/30 whitespace-nowrap">
                                  <span>{regRate.toFixed(1)}%</span>
                                  <span className="text-[10px] opacity-75 font-normal ml-1">({p.regSales.toLocaleString()}個)</span>
                                </TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-bold text-orange-600 bg-orange-50/30 whitespace-nowrap">
                                  <span>{d20Rate.toFixed(1)}%</span>
                                  <span className="text-[10px] opacity-75 font-normal ml-1">({p.d20Sales.toLocaleString()}個)</span>
                                </TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-bold text-orange-600 bg-orange-50/30 whitespace-nowrap">
                                  <span>{d30Rate.toFixed(1)}%</span>
                                  <span className="text-[10px] opacity-75 font-normal ml-1">({p.d30Sales.toLocaleString()}個)</span>
                                </TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-bold text-orange-600 bg-orange-50/30 whitespace-nowrap">
                                  <span>{d40Rate.toFixed(1)}%</span>
                                  <span className="text-[10px] opacity-75 font-normal ml-1">({p.d40Sales.toLocaleString()}個)</span>
                                </TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-bold text-orange-700 bg-orange-100/20 whitespace-nowrap cursor-help" title={`値引内訳 => 20%引: ${p.d20Sales}個 / 30%引: ${p.d30Sales}個 / 40%引: ${p.d40Sales}個`}>
                                  {(p.d20Sales + p.d30Sales + p.d40Sales).toLocaleString()}個
                                </TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-black text-orange-700 bg-orange-100/30">{discRate.toFixed(1)}%</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-bold">{sellThrough.toFixed(1)}%</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-bold text-destructive bg-destructive/5">{p.waste.toLocaleString()}個</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-black text-destructive bg-destructive/5">{wasteRate.toFixed(1)}%</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-black text-orange-700 bg-orange-100/30">¥{discValueLoss.toLocaleString()}</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-black text-orange-700 bg-orange-100/30">{discValueLossRate.toFixed(1)}%</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-black text-destructive bg-destructive/5">¥{wasteValue.toLocaleString()}</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-black text-destructive bg-destructive/5">{wasteValueRate.toFixed(1)}%</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-black text-purple-700 bg-purple-50/30">¥{totalLossAmount.toLocaleString()}</TableCell>
                                <TableCell className="p-2 text-right tabular-nums font-black text-purple-700 bg-purple-50/30">{totalLossRate.toFixed(1)}%</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {searchFilteredProducts.length > visibleProductsCount && (
                      <div className="flex justify-center p-4 border-t bg-muted/10">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setVisibleProductsCount(prev => prev + 50)}
                          className="font-bold text-xs rounded-full px-6 shadow-sm border-primary/20 hover:bg-primary/5 hover:border-primary/50"
                        >
                          もっと見る ({searchFilteredProducts.length - visibleProductsCount}件を表示)
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="category_ana" className="m-0 space-y-4 pb-6">
                <Card className="border-2 border-primary shadow-lg">
                  <CardHeader className="p-3 bg-primary/10 border-b">
                    <CardTitle className="text-lg font-black flex items-center gap-2">
                       <Package className="h-5 w-5 text-primary" /> 全カテゴリー俯瞰サマリー
                    </CardTitle>
                    <CardDescription className="text-xs font-bold">カテゴリー別の製造シェア比率</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    <div>
                      <div className="flex flex-col items-center mb-4 gap-2">
                        <p className="text-xs font-black w-full flex items-center gap-2 text-muted-foreground uppercase">
                           <ArrowUpDown className="h-3 w-3" /> カテゴリー別 製造シェア (全体製造計画に対する割合)
                        </p>
                        <span className="text-[17px] font-black text-black bg-white px-4 py-1.5 rounded-xl border-2 border-slate-200 shadow-sm">
                          製造計画合計金額: ¥{analysisData?.products.reduce((acc: number, cur: any) => acc + cur.prodValue, 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="h-[120px] w-full bg-slate-50/50 rounded-2xl p-4 border shadow-inner">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={[
                              sortedCategoryStats.sort((a,b) => b.prodValue - a.prodValue).reduce((acc: any, cur: any) => {
                                const total = sortedCategoryStats.reduce((sum, c) => sum + c.prodValue, 0) || 1;
                                const share = (cur.prodValue / total * 100);
                                acc[cur.cat] = Number(share.toFixed(1));
                                acc.totalValue = (acc.totalValue || 0) + cur.prodValue;
                                return acc;
                              }, { name: '全体シェア' })
                            ]}
                            margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                          >
                            <XAxis type="number" hide domain={[0, 100]} />
                            <YAxis dataKey="name" type="category" hide />
                            <Tooltip 
                              allowEscapeViewBox={{ x: true, y: true }} 
                              formatter={(v, name) => [`${v}%`, name]} 
                              wrapperStyle={{ zIndex: 1000 }}
                              position={{ y: -80 }}
                            />
                            {sortedCategoryStats.sort((a,b) => b.prodValue - a.prodValue).map((c, idx) => (
                              <Bar 
                                key={c.cat} 
                                dataKey={c.cat} 
                                stackId="a" 
                                fill={[
                                  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
                                  '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'
                                ][idx % 8]}
                                radius={idx === 0 ? [8, 0, 0, 8] : (idx === sortedCategoryStats.length - 1 ? [0, 8, 8, 0] : [0, 0, 0, 0])}
                              >
                                <LabelList 
                                  dataKey={c.cat} 
                                  position="center" 
                                  content={(props: any) => {
                                    const { x, y, width, value } = props;
                                    if (width < 40) return null;
                                    return (
                                      <text x={x + width / 2} y={y + 12} fill="#fff" textAnchor="middle" fontSize="10" fontWeight="900">
                                        {value}%
                                      </text>
                                    );
                                  }}
                                />
                              </Bar>
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                      {sortedCategoryStats.map((c, idx) => (
                        <Card key={c.cat} onClick={() => setSelectedCategoryForDetail(c.cat)} className="cursor-pointer hover:border-primary transition-all overflow-hidden border-2 shadow-md hover:shadow-xl">
                          <CardHeader className="p-3 bg-muted/20 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-black flex items-center gap-2">
                               <div className="w-3 h-3 rounded-full" style={{ background: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'][idx % 8] }} />
                               {c.cat}
                            </CardTitle>
                            <TrendingUp className={cn("h-4 w-4", c.rate > 15 ? "text-destructive" : "text-blue-500")} />
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            <div className="flex flex-col items-center">
                              <span className={cn("text-[32px] font-black leading-none", c.rate > 15 ? "text-destructive" : "text-blue-900")}>
                                {c.rate.toFixed(1)}%
                              </span>
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">廃棄率</span>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                               <div className="flex justify-between items-center text-[11px] font-bold">
                                  <span className="text-muted-foreground">定価率</span>
                                  <span className="text-blue-700">{(c.regSales / c.production * 100).toFixed(1)}%</span>
                               </div>
                               <div className="flex justify-between items-center text-[11px] font-bold">
                                  <span className="text-muted-foreground">値引率</span>
                                  <span className="text-yellow-700">{(c.discSales / c.production * 100).toFixed(1)}%</span>
                               </div>
                               <div className="flex justify-between items-center text-[11px] font-black pt-1">
                                  <span className="text-muted-foreground">製造総額</span>
                                  <span className="text-black">¥{c.prodValue.toLocaleString()}</span>
                               </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dow_ana" className="m-0 space-y-1">
                <Card className="border-none shadow-none">
                  <CardHeader className="p-4 bg-primary/5 border-b rounded-t-xl">
                     <CardTitle className="text-[20px] font-black flex items-center gap-3">
                        <BarChart3 className="h-6 w-6 text-primary" /> 曜日別パフォーマンス比較
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-[500px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dayOrder.map(actualDow => {
                            const stats = analysisData.dayStats[actualDow];
                            const prod = stats.production || 1;
                            return {
                              name: dayLabels[dayOrder.indexOf(actualDow)],
                              wasteR: (stats.waste / prod) * 100,
                              regR: (stats.regSales / prod) * 100,
                              discR: (stats.discSales / prod) * 100,
                              prodValue: stats.prodValue,
                              actualValue: stats.actualValue
                            };
                          })}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 16, fontWeight: 900 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} unit="%" />
                          <Tooltip content={<DowAllTooltip fullData={dayOrder.map(actualDow => {
                             const stats = analysisData.dayStats[actualDow];
                             const prod = stats.production || 1;
                             return {
                               name: dayLabels[dayOrder.indexOf(actualDow)],
                               wasteR: (stats.waste / prod) * 100,
                               regR: (stats.regSales / prod) * 100,
                               discR: (stats.discSales / prod) * 100,
                               prodValue: stats.prodValue,
                               actualValue: stats.actualValue
                             };
                          })} />} />
                          <Legend wrapperStyle={{ paddingTop: 20 }} />
                          <Bar name="定価率" dataKey="regR" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                          <Bar name="値引率" dataKey="discR" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                          <Bar name="廃棄率" dataKey="wasteR" stackId="a" fill="#ef4444" radius={[10, 10, 0, 0]} onClick={(_, idx) => setSelectedWasteDow(dayOrder[idx])} className="cursor-pointer" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="daily" className="m-0 py-2">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <CalendarDays className="h-6 w-6 text-primary" /> 曜日別 廃棄ワーストランキング
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setIsFullScreenDaily(true)} className="rounded-full shadow-sm">
                    <Maximize2 className="h-4 w-4 mr-2" />
                    フルスクリーン表示
                  </Button>
                </div>
                {renderDailyGrid()}
              </TabsContent>

              <TabsContent value="cross" className="m-0 py-2">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                             <div>
                                 <CardTitle>曜日 × 天気 クロスマトリクス</CardTitle>
                                 <CardDescription className="text-xs font-bold mt-1">曜日と天気を掛け合わせた廃棄の集計です。</CardDescription>
                             </div>
                             <div className="flex bg-muted p-1 rounded-lg">
                                 <Button 
                                   variant={matrixDisplayMode === 'rate' ? 'default' : 'ghost'} 
                                   size="sm" 
                                   className="h-7 text-xs font-bold px-3 py-0"
                                   onClick={() => setMatrixDisplayMode('rate')}
                                 >
                                   廃棄率 (%)
                                 </Button>
                                 <Button 
                                   variant={matrixDisplayMode === 'quantity' ? 'default' : 'ghost'} 
                                   size="sm" 
                                   className="h-7 text-xs font-bold px-3 py-0"
                                   onClick={() => setMatrixDisplayMode('quantity')}
                                 >
                                   廃棄数量 (個)
                                 </Button>
                             </div>
                         </CardHeader>
                        <CardContent>
                           <div className="overflow-x-auto">
                              <Table className="border">
                                 <TableHeader>
                                    <TableRow className="bg-muted/50">
                                       <TableHead className="w-20 font-black">曜日 \ 天気</TableHead>
                                       {Object.entries(weatherLabels).map(([k, l]) => <TableHead key={k} className="text-center font-black">{l}</TableHead>)}
                                    </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                    {dayOrder.map((actualDow, i) => (
                                       <TableRow key={actualDow}>
                                          <TableHead className="bg-muted/20 font-black">{dayLabels[i]}</TableHead>
                                          {Object.keys(weatherLabels).map(wKey => {
                                             const stats = analysisData.matrixStats[`${actualDow}-${wKey}`] || { waste: 0, production: 0 };
                                             const rate = stats.production > 0 ? (stats.waste / stats.production) * 100 : 0;
                                             const showRate = matrixDisplayMode === 'rate';
                                             const isAlert = showRate ? (rate > 15) : (stats.waste > 10);
                                             return (
                                                <TableCell key={wKey} className={cn("text-center font-bold tabular-nums", isAlert ? "text-destructive bg-destructive/5" : "text-blue-900")}>
                                                   {showRate 
                                                      ? (stats.production > 0 ? `${rate.toFixed(1)}%` : '-') 
                                                      : (stats.waste > 0 ? `${stats.waste.toLocaleString()} 個` : '-')
                                                    }
                                                </TableCell>
                                             );
                                          })}
                                       </TableRow>
                                    ))}
                                 </TableBody>
                              </Table>
                           </div>
                        </CardContent>
                    </Card>
                 </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}

      <Dialog open={isFullScreenDaily} onOpenChange={setIsFullScreenDaily}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-6 rounded-3xl">
          <DialogHeader className="shrink-0 mb-4">
            <DialogTitle className="text-3xl font-black flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-primary" /> 曜日別詳細パフォーマンス俯瞰
            </DialogTitle>
            <DialogDescription className="text-[16px] font-bold">
              各曜日の全商品実績を廃棄率順に表示しています。
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/20 rounded-3xl p-2 border-4 border-white shadow-inner">
            {renderDailyGrid(true)}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedWasteDow !== null} onOpenChange={(open) => !open && setSelectedWasteDow(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-6 rounded-3xl">
          <DialogHeader className="shrink-0 mb-4">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <CalendarDays className="h-6 w-6 text-primary" /> {selectedWasteDow !== null ? dayLabels[dayOrder.indexOf(selectedWasteDow)] : ''}曜日の廃棄リスト
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/20 rounded-xl p-4 border border-border">
             {selectedDowWasteList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground font-bold">廃棄記録がありません</div>
             ) : (
                <Table>
                   <TableHeader>
                      <TableRow>
                         <TableHead className="font-black">商品名</TableHead>
                         <TableHead className="font-black">カテゴリー</TableHead>
                         <TableHead className="text-right font-black">廃棄数</TableHead>
                         <TableHead className="text-right font-black">ロス金額</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                      {selectedDowWasteList.map(({product, quantity}) => (
                         <TableRow key={product.id}>
                            <TableCell className="font-bold">{product.name}</TableCell>
                            <TableCell className="text-xs">{product.category}</TableCell>
                            <TableCell className="text-right font-black tabular-nums text-destructive">{quantity}個</TableCell>
                            <TableCell className="text-right font-black tabular-nums text-destructive">¥{(quantity * (product.price || 0)).toLocaleString()}</TableCell>
                         </TableRow>
                      ))}
                   </TableBody>
                </Table>
             )}
          </div>
        </DialogContent>
      </Dialog>

      {/* --- Product Detail Popup --- */}
      <Dialog open={!!selectedProductName} onOpenChange={(open) => !open && setSelectedProductName(null)}>
        <DialogContent className="max-w-[600px] w-full p-8 rounded-2xl shadow-2xl">
          {(() => {
            if (!selectedProductName) return null;
            const pData = searchFilteredProducts.find(d => d.name === selectedProductName);
            if (!pData) return <div className="p-12 text-center text-muted-foreground font-bold">データが見つかりません</div>;

            const prod = pData.production || 1;
            const qty = pData.regSales + pData.d20Sales + pData.d30Sales + pData.d40Sales;
            const regRate = (pData.regSales / prod) * 100;
            const d20Rate = (pData.d20Sales / prod) * 100;
            const d30Rate = (pData.d30Sales / prod) * 100;
            const d40Rate = (pData.d40Sales / prod) * 100;
            const wasteRate = (pData.waste / prod) * 100;
            const discountRate = ((pData.d20Sales + pData.d30Sales + pData.d40Sales) / prod) * 100;

            return (
              <>
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-3xl font-black text-foreground">
                    {pData.name}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/20 border rounded-xl">
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-1">総販売数</p>
                      <p className="text-2xl font-black">{qty.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-muted/20 border rounded-xl">
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-1">売上高 (実績)</p>
                      <p className="text-2xl font-black text-primary">¥{Math.floor(pData.actualValue).toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-muted/20 border rounded-xl flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-1">値引率 / 値引販売数</p>
                        <p className="text-2xl font-black text-orange-500">{discountRate.toFixed(1)}% <span className="text-lg opacity-80">({(pData.d20Sales + pData.d30Sales + pData.d40Sales).toLocaleString()}個)</span></p>
                      </div>
                      <div className="text-[11px] font-bold text-muted-foreground mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-x-2 gap-y-0.5">
                        <span className="text-orange-600">20%引: {d20Rate.toFixed(1)}% ({pData.d20Sales.toLocaleString()}個)</span>
                        <span>•</span>
                        <span className="text-orange-600">30%引: {d30Rate.toFixed(1)}% ({pData.d30Sales.toLocaleString()}個)</span>
                        <span>•</span>
                        <span className="text-orange-600">40%引: {d40Rate.toFixed(1)}% ({pData.d40Sales.toLocaleString()}個)</span>
                      </div>
                    </div>
                    <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
                      <p className="text-xs font-bold text-destructive uppercase mb-1">廃棄率 / 廃棄数</p>
                      <p className="text-2xl font-black text-destructive">{wasteRate.toFixed(1)}% <span className="text-lg opacity-80">({pData.waste.toLocaleString()}個)</span></p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <h4 className="font-black text-sm mb-3">販売構成 (対製造)</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span>定価販売</span>
                          <span className="text-primary font-black">{regRate.toFixed(1)}% <span className="text-[11px] font-normal opacity-80">({pData.regSales.toLocaleString()}個)</span></span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${Math.min(regRate, 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span>20%引き</span>
                          <span className="text-orange-600 font-black">{d20Rate.toFixed(1)}% <span className="text-[11px] font-normal opacity-80">({pData.d20Sales.toLocaleString()}個)</span></span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div className="bg-orange-400 h-full" style={{ width: `${Math.min(d20Rate, 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span>30%引き</span>
                          <span className="text-orange-600 font-black">{d30Rate.toFixed(1)}% <span className="text-[11px] font-normal opacity-80">({pData.d30Sales.toLocaleString()}個)</span></span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div className="bg-orange-500 h-full" style={{ width: `${Math.min(d30Rate, 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span>40%引き</span>
                          <span className="text-destructive font-black">{d40Rate.toFixed(1)}% <span className="text-[11px] font-normal opacity-80">({pData.d40Sales.toLocaleString()}個)</span></span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div className="bg-destructive h-full" style={{ width: `${Math.min(d40Rate, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Link href={`/cross-analysis?tab=time&category=${encodeURIComponent(pData.category)}&product=${encodeURIComponent(pData.name)}`}>
                      <Button className="w-full font-black py-6 rounded-xl shadow-lg hover:scale-[1.02] transition-transform bg-purple-600 hover:bg-purple-700 text-white">
                        <ClipboardList className="mr-2 h-5 w-5" />
                        この商品の詳細クロス分析 (ヒートマップ) へ
                      </Button>
                    </Link>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ABCAnalysisPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>}>
      <ABCAnalysisContent />
    </Suspense>
  );
}
