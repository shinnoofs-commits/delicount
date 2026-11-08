'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTransactions } from '@/contexts/transaction-context';
import { useProducts } from '@/contexts/product-context';
import { useStoreSelection } from '@/contexts/store-selection-context';
import { useStores } from '@/contexts/store-context';
import { type WeatherType, defaultCategories } from '@/lib/types';
import { Loader2, TrendingUp, PieChart, BarChart2, Activity, Package, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LabelList,
  ScatterChart, Scatter, ZAxis, PieChart as RechartsPieChart, Pie, Cell, Tooltip
} from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar, Filter, X, Maximize2, ShoppingBag, Percent, TrendingDown, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { startOfDay, endOfDay, isWithinInterval, getDay, parseISO, startOfMonth } from 'date-fns';
import holiday_jp from '@holiday-jp/holiday_jp';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useChatbotContext } from '@/contexts/chatbot-context';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
const HEATMAP_MAX_COLOR = 'rgba(239, 68, 68, 1)'; // Red
const HEATMAP_MIN_COLOR = 'rgba(254, 242, 242, 1)'; // Light Red

export default function CrossAnalysisPage() {
  const { transactions, wasteEntries, loading, setFetchDateRange } = useTransactions();
  const { products } = useProducts();
  const { selectedStoreIds } = useStoreSelection();
  const { stores } = useStores();
  const { setChatContext, setPageTitle } = useChatbotContext();
  const [activeTab, setActiveTab] = useState('basket');
  const [basketExcludedCategories, setBasketExcludedCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [selectedDOWs, setSelectedDOWs] = useState<string[]>(['日', '月', '火', '水', '木', '金', '土', '祝']);
  const [detailCategory, setDetailCategory] = useState<string | null>(null);
  const [showProfitDetail, setShowProfitDetail] = useState<string | null>(null);
  const [heatmapCategory, setHeatmapCategory] = useState<string>('all');
  const [heatmapProduct, setHeatmapProduct] = useState<string>('all');
  const [selectedCell, setSelectedCell] = useState<{ day: string, hour: string } | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string | null>(null);

  // Auto-set current month when store selection changes
  const prevStoreIdsRef = React.useRef<string>('');
  React.useEffect(() => {
    const currentStoresStr = selectedStoreIds.join(',');
    if (currentStoresStr !== prevStoreIdsRef.current) {
      if (selectedStoreIds.length > 0) {
        const today = new Date();
        setDate({ from: startOfMonth(today), to: endOfDay(today) });
      }
      prevStoreIdsRef.current = currentStoresStr;
    }
  }, [selectedStoreIds]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      const cat = params.get('category');
      const prod = params.get('product');
      if (tab) setActiveTab(tab);
      if (cat) setHeatmapCategory(cat);
      if (prod) setHeatmapProduct(prod);
    }
  }, []);

  React.useEffect(() => {
    if (setFetchDateRange) {
      const today = new Date();
      let fromDate = new Date();
      fromDate.setMonth(today.getMonth() - 3); // Default to last 3 months
      let toDate = endOfDay(today);

      if (date?.from) {
        fromDate = startOfDay(date.from);
        if (date.to) {
          toDate = endOfDay(date.to);
        } else {
          toDate = endOfDay(date.from);
        }
      }
      
      setFetchDateRange({ from: fromDate, to: toDate });
    }
  }, [date, setFetchDateRange]);

  const DOW = ['日', '月', '火', '水', '木', '金', '土', '祝'];

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      
      // Date Range Filter
      if (date?.from && txDate < startOfDay(date.from)) return false;
      if (date?.to && txDate > endOfDay(date.to)) return false;
      
      // DOW Filter
      const isHoliday = holiday_jp.isHoliday(txDate);
      const dow = isHoliday ? '祝' : DOW[getDay(txDate)];
      if (!selectedDOWs.includes(dow)) return false;
      
      return true;
    });
  }, [transactions, date, selectedDOWs]);

  const filteredWaste = useMemo(() => {
    return (wasteEntries || []).filter(w => {
      const wDate = new Date(w.date);
      if (date?.from && wDate < startOfDay(date.from)) return false;
      if (date?.to && wDate > endOfDay(date.to)) return false;
      const isHoliday = holiday_jp.isHoliday(wDate);
      const dow = isHoliday ? '祝' : DOW[getDay(wDate)];
      if (!selectedDOWs.includes(dow)) return false;
      return true;
    });
  }, [wasteEntries, date, selectedDOWs]);

  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(true);

  React.useEffect(() => {
    setIsCalculating(true);
    const timer = setTimeout(() => {
    const defaultTimeSlots = { '10-13': 0, '16-18': 0, '18-19': 0 };
    // Removed early return to allow production analysis even if transactions are empty

    // 商品マスタ (storeId === 'master') を最優先でインデックス化
    const masterCodeMap = new Map<string, any>();
    const masterNameMap = new Map<string, any>();
    const masterIdMap = new Map<string, any>();
    const masterProducts = products.filter(p => p.storeId === 'master' || (p as any).isMaster);

    masterProducts.forEach(p => {
        masterIdMap.set(p.id, p);
        const normCode = p.productCode ? String(p.productCode).replace(/^0+/, '') : '';
        if (normCode) masterCodeMap.set(normCode, p);
        const normName = p.name ? p.name.replace(/[\s\u3000]+/g, '').replace(/（/g, '(').replace(/）/g, ')').trim().toLowerCase() : '';
        if (normName) masterNameMap.set(normName, p);
    });

    const productMap = new Map<string, any>();
    const productCodeNameMap = new Map<string, any>();
    const productCodeMap = new Map<string, any>();

    // 店舗商品をインデックス化
    products.filter(p => p.storeId !== 'master' && !(p as any).isMaster).forEach(p => {
        productMap.set(p.id, p);
        const normalizedCode = p.productCode?.replace(/^0+/, '');
        if (normalizedCode) {
            productCodeNameMap.set(`${normalizedCode}|${p.name}`, p);
            productCodeMap.set(normalizedCode, p);
        }
    });

    // マスタ商品を上書きインデックス化して優先度を最上位に
    masterProducts.forEach(p => {
        productMap.set(p.id, p);
        const normalizedCode = p.productCode?.replace(/^0+/, '');
        if (normalizedCode) {
            productCodeNameMap.set(`${normalizedCode}|${p.name}`, p);
            productCodeMap.set(normalizedCode, p);
        }
    });

    const getResolvedProductId = (id: string, code?: string, name?: string) => {
        const normalizedId = id?.replace(/^0+/, '');
        const normalizedCode = code?.replace(/^0+/, '');
        const normalizedName = name ? name.replace(/[\s\u3000]+/g, '').replace(/（/g, '(').replace(/）/g, ')').trim().toLowerCase() : '';
        
        let targetCode = normalizedCode;
        if (!targetCode) {
            const prod = productMap.get(id);
            if (prod?.productCode) {
                targetCode = String(prod.productCode).replace(/^0+/, '');
            } else if (normalizedId && normalizedId.match(/^\d+$/)) {
                targetCode = normalizedId;
            }
        }

        let baseId = id;
        if (targetCode) {
            const representativeProd = productCodeMap.get(targetCode);
            if (representativeProd) {
                baseId = representativeProd.id;
            }
        } else if (normalizedName) {
            const prodByName = Array.from(productMap.values() || []).find(p => {
                const pNorm = p.name ? p.name.replace(/[\s\u3000]+/g, '').replace(/（/g, '(').replace(/）/g, ')').trim().toLowerCase() : '';
                return pNorm === normalizedName;
            });
            if (prodByName) {
                baseId = prodByName.id;
            }
        } else {
            const found = productMap.get(id);
            if (found) baseId = found.id;
        }

        return baseId;
    };

    const masterStore = stores?.find(s => s.id === 'master' || s.isMaster);
    const masterCategoriesList = (masterStore?.categories || defaultCategories)
      .filter(c => c && c.trim() && c !== '未分類')
      .map(c => c.trim());
    const validMasterCategories = new Set(masterCategoriesList);

    const getCategory = (item: any) => {
      const normCode = item.productCode ? String(item.productCode).replace(/^0+/, '') : '';
      const normName = item.name ? String(item.name).replace(/[\s\u3000]+/g, '').replace(/（/g, '(').replace(/）/g, ')').trim().toLowerCase() : '';

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
      else if (item.productId && masterIdMap.has(item.productId)) {
        const cat = masterIdMap.get(item.productId)?.category;
        if (cat && cat.trim()) candidate = cat.trim();
      } else {
        // 4. 解決された店舗商品のカテゴリー
        const resolvedId = getResolvedProductId(item.productId, item.productCode, item.name);
        const baseProductId = resolvedId.split('__')[0];
        const prod = productMap.get(baseProductId);
        if (prod?.category && prod.category.trim()) {
          candidate = prod.category.trim();
        } else if (item.category && item.category.trim()) {
          candidate = item.category.trim();
        }
      }

      // マスタ商品に存在する有効なカテゴリーのみ反映。削除されたカテゴリーは「未分類」に集約
      if (candidate && validMasterCategories.has(candidate)) {
        return candidate;
      }
      return '未分類';
    };

    // --- Basket Analysis ---
    const pairsMap = new Map<string, { a: string; b: string; count: number }>();
    
    // --- Discount & Profit ---
    const productStats = new Map<string, {
      name: string;
      category: string;
      qty: number;
      revenue: number;
      regQty: number; // 0%
      lightDiscQty: number; // ~20%
      deepDiscQty: number; // >20%
      totalDiscountAmount: number;
      totalBaseAmount: number;
      wasteQty: number;
      wasteCost: number;
    }>();

    let totalReg = 0, totalLight = 0, totalDeep = 0, totalExtreme = 0;

    // --- Time Analysis ---
    const dayHourCount: Record<string, number> = {};
    const categoryDayHourCount: Record<string, Record<string, number>> = { 'all': {} };
    const dayHourProductSales = new Map<string, Map<string, number>>(); // dayHourKey -> productName -> totalQty
    const dayProductProduction = new Map<string, Map<string, number>>(); // dayKey (月, 火) -> productName -> totalQty
    const targetTimeSlots: Record<string, number> = { ...defaultTimeSlots };
    const DOW = ['日', '月', '火', '水', '木', '金', '土', '祝'];

    // Process Sales to build dayProductProduction
    filteredTransactions.forEach(tx => {
      const entryDate = new Date(tx.date);
      const isHoliday = holiday_jp.isHoliday(entryDate);
      const day = isHoliday ? '祝' : DOW[entryDate.getDay()];
      if (!dayProductProduction.has(day)) dayProductProduction.set(day, new Map());
      const prodMap = dayProductProduction.get(day)!;
      tx.items.forEach(item => {
        const resolvedId = getResolvedProductId(item.productId, item.productCode, item.name);
        const prod = productMap.get(resolvedId.split('__')[0]);
        const finalName = prod?.name || item.name;
        prodMap.set(finalName, (prodMap.get(finalName) || 0) + item.quantity);
      });
    });

    // Process Waste to build dayProductProduction (Sales + Waste = Production)
    filteredWaste.forEach(entry => {
      const entryDate = new Date(entry.date);
      const isHoliday = holiday_jp.isHoliday(entryDate);
      const day = isHoliday ? '祝' : DOW[entryDate.getDay()];
      if (!dayProductProduction.has(day)) dayProductProduction.set(day, new Map());
      const prodMap = dayProductProduction.get(day)!;
      entry.items.forEach(item => {
        const resolvedId = getResolvedProductId(item.productId, item.productCode, item.name);
        const prod = productMap.get(resolvedId.split('__')[0]);
        const finalName = prod?.name || item.name;
        prodMap.set(finalName, (prodMap.get(finalName) || 0) + item.quantity);
      });
    });

    filteredTransactions.forEach(tx => {
      // Time Analysis
      const d = new Date(tx.date);
      const hourNum = d.getHours();
      const minNum = d.getMinutes();
      let hour = hourNum.toString().padStart(2, '0');
      if (hourNum === 19) {
        hour = minNum < 30 ? '19:00' : '19:30';
      } else if (hourNum === 20) {
        hour = '20:00';
      }
      
      const isHoliday = holiday_jp.isHoliday(d);
      const day = isHoliday ? '祝' : DOW[d.getDay()];
      const dayHourKey = `${day}-${hour}`;
      
      if (hourNum >= 10 && hourNum < 13) targetTimeSlots['10-13'] += tx.totalAmount;
      if (hourNum >= 16 && hourNum < 18) targetTimeSlots['16-18'] += tx.totalAmount;
      if (hourNum >= 18 && hourNum < 19) targetTimeSlots['18-19'] += tx.totalAmount;
      
      // Calculate overall tx discount info if it's bundle
      const bundleVal = tx.discount ? tx.discount.value : 0;
      const totalTxPrice = tx.items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
      const txDiscountRate = bundleVal > 0 && totalTxPrice > 0 ? (bundleVal / totalTxPrice) : 0;

      // Ensure DayHour exists
      if (!dayHourCount[dayHourKey]) dayHourCount[dayHourKey] = 0;
      dayHourCount[dayHourKey] += tx.totalAmount;
      if (!categoryDayHourCount['all'][dayHourKey]) categoryDayHourCount['all'][dayHourKey] = 0;
      categoryDayHourCount['all'][dayHourKey] += tx.totalAmount;

      if (!dayHourProductSales.has(dayHourKey)) dayHourProductSales.set(dayHourKey, new Map());
      const innerProductMap = dayHourProductSales.get(dayHourKey)!;
      tx.items.forEach(item => {
        const resolvedId = getResolvedProductId(item.productId, item.productCode, item.name);
        const prod = productMap.get(resolvedId.split('__')[0]);
        const finalName = prod?.name || item.name;
        innerProductMap.set(finalName, (innerProductMap.get(finalName) || 0) + item.quantity);
      });

      // Basket Analysis logic (Pairs of sorted items)
      const itemNames = Array.from(new Set(tx.items.map(i => {
        const resolvedId = getResolvedProductId(i.productId, i.productCode, i.name);
        const prod = productMap.get(resolvedId.split('__')[0]);
        return prod?.name || i.name;
      }))).sort();
      for (let i = 0; i < itemNames.length; i++) {
        for (let j = i + 1; j < itemNames.length; j++) {
          const pairKey = `${itemNames[i]}|${itemNames[j]}`;
          if (!pairsMap.has(pairKey)) pairsMap.set(pairKey, { a: itemNames[i], b: itemNames[j], count: 0});
          pairsMap.get(pairKey)!.count += 1;
        }
      }

      // Products Discount & Scatter
      tx.items.forEach(item => {
        let actualItemDiscRate = 0;
        
        // Use pre-calculated discountRate if available
        if (item.discountRate !== undefined) {
           actualItemDiscRate = item.discountRate;
        } else if (item.wasDiscounted && !bundleVal) {
           actualItemDiscRate = 0.20; 
        } else if (bundleVal > 0) {
           actualItemDiscRate = txDiscountRate;
        }

        const resolvedId = getResolvedProductId(item.productId, item.productCode, item.name);
        const prodForStat = productMap.get(resolvedId.split('__')[0]);

        if (!productStats.has(resolvedId)) {
          productStats.set(resolvedId, {
            name: prodForStat?.name || item.name, category: getCategory(item), qty: 0, revenue: 0, regQty: 0, lightDiscQty: 0, deepDiscQty: 0, totalDiscountAmount: 0, totalBaseAmount: 0, wasteQty: 0, wasteCost: 0
          });
        }
        const stat = productStats.get(resolvedId)!;
        stat.qty += item.quantity;
        
        const itemRev = (item.unitPrice * item.quantity) * (1 - actualItemDiscRate);
        const itemBase = item.unitPrice * item.quantity;
        stat.revenue += itemRev;
        stat.totalBaseAmount += itemBase;
        stat.totalDiscountAmount += (itemBase - itemRev);

        if (actualItemDiscRate <= 0) stat.regQty += item.quantity;
        else if (actualItemDiscRate <= 0.20) stat.lightDiscQty += item.quantity;
        else stat.deepDiscQty += item.quantity;

        // Global Pie
        if (actualItemDiscRate <= 0) totalReg++;
        else if (actualItemDiscRate <= 0.20) totalLight++;
        else if (actualItemDiscRate <= 0.40) totalDeep++;
        else totalExtreme++;

        // Category Time Matrix
        const cat = getCategory(item);
        if (!categoryDayHourCount[cat]) categoryDayHourCount[cat] = {};
        if (!categoryDayHourCount[cat][dayHourKey]) categoryDayHourCount[cat][dayHourKey] = 0;
        categoryDayHourCount[cat][dayHourKey] += (item.unitPrice * item.quantity) * (1 - actualItemDiscRate);
      });
    });

     // --- Process Waste ---
     const dateStoreWeatherMap = new Map<string, WeatherType>();
     const dayProductWaste = new Map<string, Map<string, number>>();

     filteredWaste.forEach(entry => {
       const dateStr = format(new Date(entry.date), 'yyyy-MM-dd');
       const weatherKey = `${dateStr}|${entry.storeId}`;
       if (entry.weather) {
         dateStoreWeatherMap.set(weatherKey, entry.weather);
       }

       const entryDate = new Date(entry.date);
       const isHoliday = holiday_jp.isHoliday(entryDate);
       const day = isHoliday ? '祝' : DOW[entryDate.getDay()];
       if (!dayProductWaste.has(day)) dayProductWaste.set(day, new Map());
       const wasteMap = dayProductWaste.get(day)!;

       entry.items.forEach(item => {
         const resolvedId = getResolvedProductId(item.productId, item.productCode, item.name);
         const prodForWaste = productMap.get(resolvedId.split('__')[0]);
         const finalName = prodForWaste?.name || item.name;
         wasteMap.set(finalName, (wasteMap.get(finalName) || 0) + item.quantity);

         if (!productStats.has(resolvedId)) {
           const prodForStat = productMap.get(resolvedId.split('__')[0]);
           productStats.set(resolvedId, {
             name: prodForStat?.name || item.name,
             category: getCategory(item),
             qty: 0,
             revenue: 0,
             regQty: 0,
             lightDiscQty: 0,
             deepDiscQty: 0,
             totalDiscountAmount: 0,
             totalBaseAmount: 0,
             wasteQty: 0,
             wasteCost: 0
           });
         }
         const stat = productStats.get(resolvedId)!;
         stat.wasteQty += item.quantity;
         
         const baseProductId = resolvedId.split('__')[0];
         const prod = productMap.get(baseProductId);
         const unitPrice = prod?.price || 0;
         stat.wasteCost += unitPrice * item.quantity;
       });
     });

    // --- Category Summaries for Popups ---
    // 商品マスタの登録カテゴリー一覧と完全にリンク
    const allMasterCategories = Array.from(new Set(masterCategoriesList)).sort((a, b) => a.localeCompare(b, 'ja'));
    const hasUnclassified = Array.from(productStats.values()).some(p => p.category === '未分類');
    const availableCategories = hasUnclassified ? [...allMasterCategories, '未分類'] : allMasterCategories;

    const categoryStats = new Map<string, {
      category: string;
      totalQty: number;
      totalRevenue: number;
      totalBase: number;
      regQty: number;
      lightQty: number;
      deepQty: number;
      totalWasteQty: number;
      totalWasteCost: number;
      products: typeof productStats extends Map<any, infer T> ? T[] : any[];
    }>();

    // Initialize with all available categories (master categories + '未分類' if present)
    availableCategories.forEach(cat => {
      categoryStats.set(cat, { 
        category: cat, totalQty: 0, totalRevenue: 0, totalBase: 0, regQty: 0, lightQty: 0, deepQty: 0, totalWasteQty: 0, totalWasteCost: 0, products: [] 
      });
    });

    productStats.forEach(p => {
      const c = categoryStats.get(p.category);
      if (c) {
        c.totalQty += p.qty;
        c.totalRevenue += p.revenue;
        c.totalBase += p.totalBaseAmount;
        c.regQty += p.regQty;
        c.lightQty += p.lightDiscQty;
        c.deepQty += p.deepDiscQty;
        c.totalWasteQty += p.wasteQty;
        c.totalWasteCost += p.wasteCost;
        c.products.push(p);
      }
    });

    const categoryAbcData = Array.from(categoryStats.values()).map(c => ({
      name: c.category,
      reg: c.totalQty > 0 ? (c.regQty / c.totalQty) * 100 : 0,
      light: c.totalQty > 0 ? (c.lightQty / c.totalQty) * 100 : 0,
      deep: c.totalQty > 0 ? (c.deepQty / c.totalQty) * 100 : 0,
      qty: c.totalQty,
      revenue: c.totalRevenue,
      discountRate: c.totalBase > 0 ? ((c.totalBase - c.totalRevenue) / c.totalBase) * 100 : 0,
      wasteQty: c.totalWasteQty,
      wasteCost: c.totalWasteCost,
      wasteRate: (c.totalQty + c.totalWasteQty) > 0 ? (c.totalWasteQty / (c.totalQty + c.totalWasteQty)) * 100 : 0
    })).sort((a, b) => b.qty - a.qty);

    const EXCLUDED_BASKET_ITEMS = [
      'レジ袋3円',
      'レジ袋5円',
      'お惣菜　お買い得3p',
      'お惣菜　お買い得2p',
      'バンドル値引'
    ];
    
    // We export all pairs to the state, and dynamically filter them in render
    const allPairs = Array.from(pairsMap.values());
    
    const catsAndAbc = Array.from(productStats.values());
    const prodCatByName = new Map<string, string>();
    catsAndAbc.forEach(p => prodCatByName.set(p.name, p.category));
    
    const abcData = catsAndAbc
      .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
      .map(p => ({
        name: p.name,
        category: p.category,
        reg: p.qty > 0 ? (p.regQty / p.qty) * 100 : 0,
        light: p.qty > 0 ? (p.lightDiscQty / p.qty) * 100 : 0,
        deep: p.qty > 0 ? (p.deepDiscQty / p.qty) * 100 : 0,
        qty: p.qty,
        revenue: p.revenue,
        discountRate: p.totalBaseAmount > 0 ? ((p.totalBaseAmount - p.revenue) / p.totalBaseAmount) * 100 : 0,
        wasteQty: p.wasteQty,
        wasteCost: p.wasteCost,
        wasteRate: (p.qty + p.wasteQty) > 0 ? (p.wasteQty / (p.qty + p.wasteQty)) * 100 : 0
      })).sort((a,b) => b.reg - a.reg).slice(0, 100);

    const sData = catsAndAbc
      .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
      .map(p => ({
        name: p.name,
        qty: p.qty,
        revenue: p.revenue,
        discountRate: p.totalBaseAmount > 0 ? (p.totalDiscountAmount / p.totalBaseAmount) * 100 : 0
      })).filter(p => p.qty > 0);

    const pData = [
      { name: '定価', value: totalReg },
      { name: '~20%引', value: totalLight },
      { name: '~40%引', value: totalDeep },
      { name: '40%超', value: totalExtreme },
    ];

    setAnalysisData({ 
      allPairs,
      prodCatByName,
      discountAbcData: abcData,  
      categoryAbcData,
      scatterData: sData, 
      pieData: pData, 
      timeDayData: dayHourCount, 
      categoryTimeData: categoryDayHourCount, 
      targetTimeSlots, 
      availableCategories,
      categoryStats,
      dayHourProductSales,
      dayProductProduction,
      dayProductWaste,
      catsAndAbc
    });
    setIsCalculating(false);
    }, 10);
    return () => clearTimeout(timer);
  }, [filteredTransactions, filteredWaste, products, stores, selectedCategory]);

  const allPairs: any[] = analysisData?.allPairs || [];
  const prodCatByName: Map<string, string> = analysisData?.prodCatByName || new Map();
  
  const basketData = useMemo(() => {
    if (!allPairs.length) return [];
    const EXCLUDED_BASKET_ITEMS = [
      'レジ袋3円',
      'レジ袋5円',
      'お惣菜　お買い得3p',
      'お惣菜　お買い得2p',
      'バンドル値引'
    ];
    let filtered = allPairs.filter(pair => !EXCLUDED_BASKET_ITEMS.includes(pair.a) && !EXCLUDED_BASKET_ITEMS.includes(pair.b));
    
    if (basketExcludedCategories.length > 0) {
      filtered = filtered.flatMap(pair => {
        const catA = prodCatByName.get(pair.a) || 'その他';
        const catB = prodCatByName.get(pair.b) || 'その他';
        const aMatches = !basketExcludedCategories.includes(catA);
        const bMatches = !basketExcludedCategories.includes(catB);
        
        if (aMatches && !bMatches) return [{ ...pair, a: pair.a, b: pair.b }];
        if (!aMatches && bMatches) return [{ ...pair, a: pair.b, b: pair.a }];
        if (aMatches && bMatches) return [{ ...pair, a: pair.a, b: pair.b }];
        return [];
      });
    }
    
    return filtered.sort((x, y) => y.count - x.count).slice(0, 50);
  }, [allPairs, prodCatByName, basketExcludedCategories]);
  const discountAbcData: any[] = analysisData?.discountAbcData || [];
  const categoryAbcData: any[] = analysisData?.categoryAbcData || [];
  const scatterData: any[] = analysisData?.scatterData || [];
  const pieData: any[] = analysisData?.pieData || [];
  const timeDayData: any[] = analysisData?.timeDayData || [];
  const categoryTimeData: any = analysisData?.categoryTimeData || {};
  const targetTimeSlots: any = analysisData?.targetTimeSlots || {};
  const availableCategories: any[] = analysisData?.availableCategories || [];
  const categoryStats: Map<string, any> = analysisData?.categoryStats || new Map();
  const dayHourProductSales: Map<string, Map<string, number>> = analysisData?.dayHourProductSales || new Map();
  const dayProductProduction: Map<string, Map<string, number>> = analysisData?.dayProductProduction || new Map();
  const dayProductWaste: Map<string, Map<string, number>> = analysisData?.dayProductWaste || new Map();

  React.useEffect(() => {
    if (selectedCategory !== 'all' && availableCategories.length > 0 && !availableCategories.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [availableCategories, selectedCategory]);

  React.useEffect(() => {
    if (heatmapCategory !== 'all' && availableCategories.length > 0 && !availableCategories.includes(heatmapCategory)) {
      setHeatmapCategory('all');
    }
  }, [availableCategories, heatmapCategory]);

  React.useEffect(() => {
    setPageTitle('詳細クロス分析');
    if (analysisData) {
      const EXCLUDED_CATEGORIES = ['未分類'];
      const EXCLUDED_NAMES = ['レジ袋', '値引'];

      const allProducts: any[] = analysisData.catsAndAbc || [];
      const mainProducts = allProducts
        .filter(p => !EXCLUDED_CATEGORIES.includes(p.category) && !EXCLUDED_NAMES.some(name => p.name.includes(name)))
        .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
        .sort((a,b) => b.qty - a.qty).slice(0, 150);
        
      setChatContext(JSON.stringify({
        page: '詳細クロス分析',
        selectedCategory: selectedCategory === 'all' ? '全カテゴリー' : selectedCategory,
        basketData: basketData.slice(0, 10).map(b => ({ pair: `${b.a} + ${b.b}`, count: b.count })),
        mainProductsData: mainProducts.map(p => {
          return {
            name: p.name,
            category: p.category,
            totalSoldQty: p.qty,
            regSalesAmount: p.regQty,
            discSalesAmount: p.lightDiscQty + p.deepDiscQty,
            regSalesRate: p.qty > 0 ? Number(((p.regQty / p.qty) * 100).toFixed(1)) : 0,
            wasteAmount: p.wasteQty,
          };
        }),
        timeDayData: timeDayData
      }));
    } else {
      setChatContext('データがありません。');
    }
  }, [analysisData, basketData, timeDayData, selectedCategory, setChatContext, setPageTitle]);

  const customLabelFormatter = (val: number) => {
    if (val < 5) return '';
    return `${val.toFixed(1)}%`;
  };


  if (loading || isCalculating || !analysisData) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="font-bold animate-pulse">データを読み込み・集計中...</p>
        </div>
      </div>
    );
  }
  if (!transactions.length) return <div className="p-6 text-muted-foreground font-bold">データがありません。POSデータをインポートしてください。</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">詳細クロス分析 (POS Analytics)</h1>
          <p className="text-muted-foreground mt-2 font-bold">POSから連携された取引データに基づく複合分析ダッシュボードです。</p>
          <div className="flex items-center gap-2 mt-4">
            <Link href="/abc-analysis">
              <Button variant="outline" className="rounded-full font-black text-xs h-10 px-6 gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/50 transition-all">
                <ClipboardList className="h-4 w-4 text-primary" />
                廃棄クロス分析 (ABC) へ移動
              </Button>
            </Link>
          </div>
        </div>
        <div className="bg-muted/30 p-5 rounded-2xl border shadow-sm flex flex-col gap-4 min-w-[350px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-black">
              <Filter className="h-4 w-4 text-primary" />
              分析フィルタ
            </div>
            {(date?.from || date?.to || selectedDOWs.length < 7) && (
              <Button variant="ghost" size="sm" onClick={() => {
                setDate(undefined);
                setSelectedDOWs(DOW);
              }} className="h-7 text-[10px] px-2 font-bold hover:bg-destructive/10 hover:text-destructive">
                フィルタ解除
              </Button>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">期間指定</Label>
              <DatePickerWithRange date={date} setDate={setDate} inline={true} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">曜日絞り込み</Label>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {DOW.map(day => (
                  <div key={day} className="flex items-center gap-1.5">
                    <Checkbox 
                      id={`dow-${day}`} 
                      checked={selectedDOWs.includes(day)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedDOWs(prev => [...prev, day]);
                        else setSelectedDOWs(prev => prev.filter(d => d !== day));
                      }}
                      className="h-3.5 w-3.5"
                    />
                    <Label 
                      htmlFor={`dow-${day}`} 
                      className={cn("text-[11px] font-bold cursor-pointer", day === '祝' && "text-destructive")}
                    >
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            {(date?.from || date?.to || selectedDOWs.length < 7) && (
              <div className="flex justify-end pt-2">
                <Button variant="link" onClick={() => { setDate(undefined); setSelectedDOWs(DOW); }} className="h-auto p-0 text-muted-foreground text-[10px] font-bold">
                  条件をクリア <X className="ml-1 h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-2" />

      {!filteredTransactions.length && (
        <div className="p-12 text-center border-2 border-dashed rounded-xl bg-muted/20">
          <p className="text-muted-foreground font-bold">選択された条件に一致する取引データがありません。</p>
          <Button variant="link" onClick={() => { setDate(undefined); setSelectedDOWs(DOW); }} className="h-auto p-0 text-muted-foreground text-[10px] font-bold">
            フィルタをクリアする
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className={cn("w-full", !filteredTransactions.length && "hidden")}>
        <div className="flex justify-between items-center mb-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="basket" className="font-bold"><Activity className="mr-2 h-4 w-4"/>バスケット分析</TabsTrigger>
            <TabsTrigger value="discount" className="font-bold"><BarChart2 className="mr-2 h-4 w-4"/>値引き・利益分析 (ABC)</TabsTrigger>
            <TabsTrigger value="scatter" className="font-bold"><PieChart className="mr-2 h-4 w-4"/>総合利益の散布図</TabsTrigger>
            <TabsTrigger value="time" className="font-bold"><TrendingUp className="mr-2 h-4 w-4"/>時間帯・曜日</TabsTrigger>
          </TabsList>
          
          <Button
            variant="outline"
            size="sm"
            className="h-9 font-bold"
            onClick={async () => {
              const { exportMultipleCsvsAsZip } = await import('@/lib/export-utils');
              const now = format(new Date(), 'yyyyMMdd_HHmm');
              
              // --- マスターデータの生成 (日別・店舗別) ---
              const masterDataMap = new Map<string, any>(); // Key: date|storeId|productId
              
              // ヘルパー: 店舗コードと商品情報の解決
              const getStoreCode = (storeName: string) => {
                if (storeName.includes('港南台')) return '12';
                if (storeName.includes('本厚木')) return '202';
                if (storeName.includes('西川口')) return '203';
                return '';
              };
              const productMap = new Map<string, any>();
              const productCodeMap = new Map<string, any>();
              const productNameMap = new Map<string, any>();
              products.forEach(p => {
                productMap.set(p.id, p);
                const normalizedCode = String(p.productCode || '').replace(/^0+/, '');
                if (normalizedCode) {
                  productCodeMap.set(normalizedCode, p);
                }
                if (p.name) {
                  const normalizedName = p.name.replace(/[\s\u3000]+/g, '').replace(/（/g, '(').replace(/）/g, ')').trim().toLowerCase();
                  productNameMap.set(normalizedName, p);
                }
              });

              const getResolvedProduct = (itemId: string, itemCode?: string, itemName?: string) => {
                const normalizedId = itemId?.replace(/^0+/, '');
                const normalizedCode = itemCode?.replace(/^0+/, '');
                const normalizedName = itemName ? itemName.replace(/[\s\u3000]+/g, '').replace(/（/g, '(').replace(/）/g, ')').trim().toLowerCase() : '';
                
                let targetCode = normalizedCode;
                if (!targetCode) {
                  const prod = productMap.get(itemId);
                  if (prod?.productCode) {
                    targetCode = String(prod.productCode).replace(/^0+/, '');
                  } else if (normalizedId && normalizedId.match(/^\d+$/)) {
                    targetCode = normalizedId;
                  }
                }

                let prod = productMap.get(itemId);
                
                if (!prod && targetCode) {
                   prod = productCodeMap.get(targetCode);
                }
                
                if (!prod && normalizedName) {
                   prod = productNameMap.get(normalizedName);
                }
                
                if (prod) {
                  return { ...prod, name: prod.name, category: prod.category, productCode: prod.productCode || itemCode || '' };
                }
                return { name: itemName, category: '未分類', productCode: itemCode || '', price: 0 };
              };

              // 1. 売上データの集計
              filteredTransactions.forEach(tx => {
                const dateStr = format(new Date(tx.date), 'yyyy/MM/dd');
                const dow = DOW[new Date(tx.date).getDay()];
                const storeName = stores.find(s => s.id === tx.storeId)?.name || tx.storeId;
                
                const bundleVal = tx.discount ? tx.discount.value : 0;
                const totalTxPrice = tx.items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
                const txDiscountRate = bundleVal > 0 && totalTxPrice > 0 ? (bundleVal / totalTxPrice) : 0;

                tx.items.forEach(item => {
                  const prod = getResolvedProduct(item.productId, item.productCode, item.name);
                  const key = `${dateStr}|${storeName}|${prod.name}`;
                  
                  if (!masterDataMap.has(key)) {
                    masterDataMap.set(key, {
                      '日付': dateStr,
                      '曜日': dow,
                      '店舗コード': getStoreCode(storeName),
                      '店舗名': storeName,
                      'カテゴリー': prod.category || item.category || '未分類',
                      '商品コード': prod.productCode,
                      '商品名': prod.name || item.name,
                      '定価販売数': 0,
                      '値引販売数': 0,
                      '売上金額': 0,
                      '値引金額': 0,
                      '廃棄数': 0,
                      '廃棄金額': 0
                    });
                  }
                  
                  const row = masterDataMap.get(key);
                  let actualItemDiscRate = 0;
                  if (item.discountRate !== undefined) actualItemDiscRate = item.discountRate;
                  else if (item.wasDiscounted && !bundleVal) actualItemDiscRate = 0.20;
                  else if (bundleVal > 0) actualItemDiscRate = txDiscountRate;

                  const itemBase = item.unitPrice * item.quantity;
                  const itemRev = itemBase * (1 - actualItemDiscRate);

                  if (actualItemDiscRate <= 0) {
                    row['定価販売数'] += item.quantity;
                  } else {
                    row['値引販売数'] += item.quantity;
                  }
                  
                  row['売上金額'] += itemRev;
                  row['値引金額'] += (itemBase - itemRev);
                });
              });

              // 2. 廃棄データの集計
              filteredWaste.forEach(entry => {
                const dateStr = format(new Date(entry.date), 'yyyy/MM/dd');
                const dow = DOW[new Date(entry.date).getDay()];
                const storeName = stores.find(s => s.id === entry.storeId)?.name || entry.storeId;

                entry.items.forEach(item => {
                  const prod = getResolvedProduct(item.productId, item.productCode, item.name);
                  const key = `${dateStr}|${storeName}|${prod.name}`;
                  
                  if (!masterDataMap.has(key)) {
                    masterDataMap.set(key, {
                      '日付': dateStr,
                      '曜日': dow,
                      '店舗コード': getStoreCode(storeName),
                      '店舗名': storeName,
                      'カテゴリー': prod.category || '未分類',
                      '商品コード': prod.productCode,
                      '商品名': prod.name || item.name,
                      '定価販売数': 0,
                      '値引販売数': 0,
                      '売上金額': 0,
                      '値引金額': 0,
                      '廃棄数': 0,
                      '廃棄金額': 0
                    });
                  }
                  
                  const row = masterDataMap.get(key);
                  row['廃棄数'] += item.quantity;
                  const unitPrice = prod?.price || 0;
                  row['廃棄金額'] += unitPrice * item.quantity;
                });
              });

              const masterExport = Array.from(masterDataMap.values()).sort((a, b) => {
                if (a['日付'] !== b['日付']) return a['日付'] > b['日付'] ? 1 : -1;
                if (a['店舗名'] !== b['店舗名']) return a['店舗名'] > b['店舗名'] ? 1 : -1;
                return 0;
              });

              // 1. バスケット分析
              const basketExport = basketData.map((d: any) => ({
                '商品A': d.a,
                '商品B': d.b,
                '同時購入回数': d.count
              }));

              // 2. 時間帯・曜日トレンド
              const timeExport = Object.entries(timeDayData).map(([key, value]) => {
                const [day, hour] = key.split('-');
                return {
                  '曜日': day,
                  '時間帯': hour,
                  '売上金額': value
                };
              });

              // 3. 値引・廃棄データ
              const abcExport = discountAbcData.map((d: any) => ({
                '商品名': d.name,
                'カテゴリー': d.category,
                '販売数': d.qty,
                '定価販売比率(%)': d.reg.toFixed(1),
                '軽微値引比率(%)': d.light.toFixed(1),
                '大幅値引比率(%)': d.deep.toFixed(1),
                '売上金額': d.revenue,
                '値引率(%)': d.discountRate.toFixed(1),
                '廃棄数': d.wasteQty,
                '廃棄金額': d.wasteCost,
                '廃棄率(%)': d.wasteRate.toFixed(1)
              }));

              // 4. 相関分析データ
              const scatterExport = scatterData.map((d: any) => ({
                '商品名': d.name,
                '販売数': d.qty,
                '売上金額': d.revenue,
                '値引率(%)': d.discountRate.toFixed(1)
              }));
              
              const files = [
                { name: `0_日別店舗別マスターデータ_${now}.csv`, rows: masterExport },
                { name: `1_併売分析_${now}.csv`, rows: basketExport },
                { name: `2_時間帯トレンド_${now}.csv`, rows: timeExport },
                { name: `3_値引廃棄データ_${now}.csv`, rows: abcExport },
                { name: `4_相関分析データ_${now}.csv`, rows: scatterExport }
              ];

              await exportMultipleCsvsAsZip(`詳細クロス分析データ_${now}.zip`, files);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            全データZIPダウンロード
          </Button>
        </div>

        <TabsContent value="basket">
          <Card>
            <CardHeader>
              <CardTitle>同時購入 組み合わせABC</CardTitle>
              <CardDescription>バスケットで共買い傾向の強い商品の組み合わせトップ50</CardDescription>
              <div className="mt-4">
                <p className="text-sm font-bold text-muted-foreground mb-2">商品Aのカテゴリーを指定 (複数選択可)</p>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={basketExcludedCategories.length === 0 ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setBasketExcludedCategories([])}
                  >
                    すべて
                  </Badge>
                  {availableCategories.map(cat => (
                    <Badge
                      key={cat}
                      variant={!basketExcludedCategories.includes(cat) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        if (basketExcludedCategories.includes(cat)) {
                          setBasketExcludedCategories(basketExcludedCategories.filter(c => c !== cat));
                        } else {
                          setBasketExcludedCategories([...basketExcludedCategories, cat]);
                        }
                      }}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>対象商品 (カテゴリ指定)</TableHead>
                    <TableHead>同時購入商品</TableHead>
                    <TableHead className="text-right">同時購入数 (回)</TableHead>
                    <TableHead className="w-1/3">グラフ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {basketData.map((d, i) => {
                    const max = basketData[0].count;
                    const percent = (d.count / max) * 100;
                    return (
                      <TableRow key={`${d.a}-${d.b}`}>
                        <TableCell className="font-bold">{i + 1}</TableCell>
                        <TableCell className="font-bold text-[13px]"><span className="cursor-pointer text-foreground hover:underline" onClick={() => setSelectedProductName(d.a)}>{d.a}</span></TableCell>
                        <TableCell className="font-bold text-[13px]"><span className="cursor-pointer text-foreground hover:underline" onClick={() => setSelectedProductName(d.b)}>{d.b}</span></TableCell>
                        <TableCell className="text-right font-black tabular-nums text-lg text-primary">{d.count}</TableCell>
                        <TableCell>
                          <div className="w-full bg-muted rounded-r-md h-6 overflow-hidden">
                            <div className="bg-orange-400 h-full" style={{ width: `${percent}%` }} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discount">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    部門別サマリー
                  </CardTitle>
                  <CardDescription>部門をタップすると詳細（全画面）が表示されます。</CardDescription>
                </CardHeader>
                <CardContent className="px-2">
                  <div className="grid grid-cols-1 gap-2">
                    {categoryAbcData.map((cat) => (
                      <Button
                        key={cat.name}
                        variant="outline"
                        className="h-auto py-4 px-4 flex flex-col items-start gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all group border-2"
                        onClick={() => setDetailCategory(cat.name)}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-black text-sm group-hover:text-primary">{cat.name}</span>
                          <Maximize2 className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                        </div>
                        <div className="flex items-center gap-4 w-full">
                          <div className="flex-1">
                            <div className="text-[10px] text-muted-foreground font-bold uppercase mb-1">売上構成 (定価率)</div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                              <div className="bg-primary h-full transition-all" style={{ width: `${cat.reg}%` }} />
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-muted-foreground font-bold uppercase mb-1">数量</div>
                            <div className="text-sm font-black">{cat.qty.toLocaleString()}</div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-xl font-black">商品別 ABC分析 (構成比)</CardTitle>
                  <CardDescription>
                    {selectedCategory === 'all' ? '全商品の値引き率構成（上位100件）' : `${selectedCategory}内の商品構成`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 overflow-auto" style={{ height: 600 }}>
                  <ResponsiveContainer width="100%" height={Math.max(600, discountAbcData.length * 40)}>
                    <BarChart layout="vertical" data={discountAbcData} margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                      <RechartsTooltip formatter={(value: number) => [`${value.toFixed(1)}%`]} />
                      <Legend />
                      <Bar dataKey="reg" name="1. 定価販売(0%)" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]}>
                        <LabelList dataKey="reg" position="center" fill="white" fontSize={10} fontWeight="bold" formatter={customLabelFormatter} />
                      </Bar>
                      <Bar dataKey="light" name="2. 20%以下販売" stackId="a" fill="#f59e0b">
                        <LabelList dataKey="light" position="center" fill="white" fontSize={10} fontWeight="bold" formatter={customLabelFormatter} />
                      </Bar>
                      <Bar dataKey="deep" name="3. 40%以上の大幅値引き" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="deep" position="center" fill="white" fontSize={10} fontWeight="bold" formatter={customLabelFormatter} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scatter">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Percent className="h-5 w-5 text-primary" />
                  部門別 値引き実績
                </CardTitle>
                <CardDescription>タップで商品の定価販売率をチェック</CardDescription>
              </CardHeader>
              <CardContent className="px-2">
                <div className="space-y-2">
                  {categoryAbcData.map(cat => (
                    <Button 
                      key={cat.name}
                      variant="ghost" 
                      className="w-full justify-between h-auto py-3 px-3 hover:bg-primary/5 border border-transparent hover:border-primary/20 rounded-xl transition-all"
                      onClick={() => setShowProfitDetail(cat.name)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-xs">{cat.name}</span>
                        <span className="text-[10px] text-muted-foreground">値引き率: {cat.discountRate.toFixed(1)}%</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-primary">{cat.reg.toFixed(1)}%</div>
                        <div className="text-[9px] text-muted-foreground uppercase font-bold">定価率</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-black">値引き率 区分構成 (全店)</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(1)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="time">
          <Card>
            <CardHeader>
              <CardTitle>曜日・時間帯別 ヒートマップ</CardTitle>
              <CardDescription>売上や数量が集中している部分が濃く表示されます。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 overflow-auto">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="text-xs font-bold text-muted-foreground mb-1">10:00 - 13:00 (ランチタイム前)</div>
                  <div className="text-2xl font-black text-primary">¥{Math.floor(targetTimeSlots['10-13'] || 0).toLocaleString()}</div>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="text-xs font-bold text-muted-foreground mb-1">16:00 - 18:00 (夕方ピーク前)</div>
                  <div className="text-2xl font-black text-primary">¥{Math.floor(targetTimeSlots['16-18'] || 0).toLocaleString()}</div>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="text-xs font-bold text-muted-foreground mb-1">18:00 - 19:00 (夜間ピーク)</div>
                  <div className="text-2xl font-black text-primary">¥{Math.floor(targetTimeSlots['18-19'] || 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">表示部門を選択 (タッチで切り替え)</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant={heatmapCategory === 'all' ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => { setHeatmapCategory('all'); setHeatmapProduct('all'); }}
                      className={cn("font-black text-xs px-6 rounded-full transition-all", heatmapCategory === 'all' && "shadow-md scale-105")}
                    >
                      全て
                    </Button>
                    {availableCategories.map(cat => (
                      <Button 
                        key={cat} 
                        variant={heatmapCategory === cat ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => { setHeatmapCategory(cat); setHeatmapProduct('all'); }}
                        className={cn("font-black text-xs px-6 rounded-full transition-all", heatmapCategory === cat && "shadow-md scale-105")}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                  
                  {heatmapCategory !== 'all' && (
                    <div className="mt-2 flex items-center gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">商品絞り込み</Label>
                      <Select value={heatmapProduct} onValueChange={setHeatmapProduct}>
                        <SelectTrigger className="w-[250px] h-8 text-xs font-bold">
                          <SelectValue placeholder="全商品" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="font-bold">全商品</SelectItem>
                          {(() => {
                            const catData = categoryStats.get(heatmapCategory);
                            if (!catData) return null;
                            return catData.products.map((p: any) => (
                              <SelectItem key={p.name} value={p.name} className="font-bold text-xs">{p.name}</SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="min-w-[800px] border-2 border-primary/5 rounded-2xl p-4 bg-background">
                  <h3 className="font-black text-xl mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    {heatmapProduct !== 'all' ? heatmapProduct : (heatmapCategory === 'all' ? '全体' : heatmapCategory)} - 曜日時間帯別 {heatmapProduct !== 'all' ? '販売数量' : '売上金額'}実績
                  </h3>
                  <div className="p-2 text-[10px] text-muted-foreground font-bold bg-muted/20 rounded-md mb-4 inline-block">
                    ※ セルをタッチすると、その時間の売れ筋商品（製造対販売比）を表示します。
                  </div>
                  <Table className="border-collapse">
                    <TableHeader>
                      <TableRow className="border-none">
                        <TableHead className="w-16 bg-muted/50 font-black text-center rounded-tl-xl border">曜日</TableHead>
                        {['10', '11', '12', '13', '14', '15', '16', '17', '18', '19:00', '19:30', '20:00', '21'].map((bucket,i) => (
                          <TableHead key={i} className="text-center font-black bg-muted/50 border text-[11px] px-1 whitespace-nowrap">
                            {bucket}
                          </TableHead>
                        ))}
                        <TableHead className="text-center font-black bg-muted/50 border text-blue-600 whitespace-nowrap text-xs">製造数</TableHead>
                        <TableHead className="text-center font-black bg-muted/50 border rounded-tr-xl text-blue-600 whitespace-nowrap text-xs">販売率</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const displayDays = ['月', '火', '水', '木', '金', '土', '日', '祝'];
                        const TIME_BUCKETS = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19:00', '19:30', '20:00', '21'];
                        const getBucketHour = (b: string) => b.includes(':') ? b : b.padStart(2, '0');
                        
                        const getValue = (day: string, hour: string) => {
                          const key = `${day}-${hour}`;
                          if (heatmapProduct !== 'all') {
                            return dayHourProductSales.get(key)?.get(heatmapProduct) || 0;
                          } else {
                            return ((categoryTimeData as any)[heatmapCategory] || {})[key] || 0;
                          }
                        };

                        const getDayCategoryData = (day: string) => {
                          let prodTotal = 0;
                          let salesTotal = 0;
                          const prodMap = dayProductProduction.get(day) || new Map();
                          
                          if (heatmapProduct !== 'all') {
                            prodTotal = prodMap.get(heatmapProduct) || 0;
                            // For specific product, we can sum the quantity sold across buckets
                            salesTotal = TIME_BUCKETS.reduce((sum, b) => sum + (dayHourProductSales.get(`${day}-${getBucketHour(b)}`)?.get(heatmapProduct) || 0), 0);
                          } else {
                            const productsInCat = heatmapCategory === 'all' 
                              ? Array.from(prodMap.keys()) 
                              : (categoryStats.get(heatmapCategory)?.products.map((p: any) => p.name) || []);
                            
                            if (heatmapCategory === 'all') {
                              for (const qty of prodMap.values()) prodTotal += qty;
                            } else {
                              for (const pName of productsInCat) prodTotal += (prodMap.get(pName) || 0);
                            }
                            
                            // To get correct sales quantity (since getValue returns revenue for category/all),
                            // we sum from dayHourProductSales directly.
                            salesTotal = TIME_BUCKETS.reduce((sum, b) => {
                              const h = getBucketHour(b);
                              const key = `${day}-${h}`;
                              const salesMap = dayHourProductSales.get(key) || new Map();
                              let bucketTotal = 0;
                              if (heatmapCategory === 'all') {
                                for (const qty of salesMap.values()) bucketTotal += qty;
                              } else {
                                for (const pName of productsInCat) bucketTotal += (salesMap.get(pName) || 0);
                              }
                              return sum + bucketTotal;
                            }, 0);
                          }
                          return { prodTotal, salesTotal };
                        };
                        
                        // Calculate global max for this category to ensure consistent scaling across days
                        const globalMaxVal = Math.max(...displayDays.flatMap(day => 
                          TIME_BUCKETS.map((bucket) => getValue(day, getBucketHour(bucket)))
                        ), 1); // Avoid division by zero

                        return displayDays.map(day => {
                          const { prodTotal, salesTotal } = getDayCategoryData(day);
                          const salesRate = prodTotal > 0 ? (salesTotal / prodTotal) * 100 : 0;
                          
                          return (
                            <TableRow key={day} className="border-none group">
                              <TableCell className={cn(
                                "font-black text-center bg-muted/20 border group-hover:bg-primary/5 transition-colors",
                                day === '祝' && "text-destructive"
                              )}>{day}</TableCell>
                              {TIME_BUCKETS.map((bucket, i) => {
                                const h = getBucketHour(bucket);
                                const val = getValue(day, h);
                                const opacity = val / globalMaxVal;
                                return (
                                  <TableCell 
                                    key={i} 
                                    className="text-center font-bold tabular-nums text-[13px] border cursor-pointer hover:ring-2 hover:ring-primary hover:z-10 transition-all active:scale-95" 
                                    style={{ backgroundColor: `rgba(245, 158, 11, ${opacity * 0.7})` }}
                                    onClick={() => setSelectedCell({ day, hour: h })}
                                  >
                                    <div className="flex flex-col items-center justify-center">
                                      <span>{val > 0 ? Math.floor(val).toLocaleString() : '-'}</span>
                                      {heatmapProduct !== 'all' && prodTotal > 0 && val > 0 && (
                                        <span className="text-blue-600 mt-0.5 leading-none">
                                          {((val / prodTotal) * 100).toFixed(1)}%
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                )
                              })}
                              <TableCell className="text-center font-black tabular-nums border text-[13px] text-blue-600 bg-blue-50/30">
                                {prodTotal > 0 ? prodTotal.toLocaleString() : '-'}
                              </TableCell>
                              <TableCell className={cn(
                                "text-center font-black tabular-nums border text-[13px] bg-blue-50/30",
                                salesRate >= 90 ? "text-red-600" : (salesRate >= 70 ? "text-orange-600" : "text-blue-600")
                              )}>
                                {prodTotal > 0 ? `${salesRate.toFixed(1)}%` : '-'}
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* --- ABC Detail Dialog --- */}
      <Dialog open={!!detailCategory} onOpenChange={(open) => !open && setDetailCategory(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-6">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <DialogTitle className="text-2xl font-black flex items-center gap-2">
                <BarChart2 className="h-6 w-6 text-primary" />
                {detailCategory} - 詳細分析
              </DialogTitle>
              <DialogDescription className="font-bold">この部門に属する商品の値引き率構成（依存度）を視覚化します。</DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col gap-6 pt-4">
            <div className="h-1/2 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical" 
                  data={discountAbcData.filter(d => d.category === detailCategory).sort((a,b) => b.deep - a.deep)} 
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <RechartsTooltip formatter={(value: number) => [`${value.toFixed(1)}%`]} />
                  <Legend />
                  <Bar dataKey="reg" name="1. 定価販売" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="light" name="2. ~20%引" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="deep" name="3. 40%~引" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 overflow-auto border rounded-xl">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="font-black">商品名</TableHead>
                    <TableHead className="text-right font-black">総数量</TableHead>
                    <TableHead className="text-right font-black">売上高(実績)</TableHead>
                    <TableHead className="text-right font-black text-primary">定価率</TableHead>
                    <TableHead className="text-right font-black text-orange-500">~20%率</TableHead>
                    <TableHead className="text-right font-black text-destructive">40%~率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discountAbcData
                    .filter(d => d.category === detailCategory)
                    .sort((a,b) => b.qty - a.qty)
                    .map(d => (
                      <TableRow key={d.name}>
                        <TableCell className="font-bold text-xs"><span className="cursor-pointer text-primary hover:underline" onClick={() => setSelectedProductName(d.name)}>{d.name}</span></TableCell>
                        <TableCell className="text-right font-black tabular-nums">{d.qty.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-black tabular-nums">¥{Math.floor(d.revenue).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{d.reg.toFixed(1)}%</TableCell>
                        <TableCell className="text-right font-bold text-orange-500">{d.light.toFixed(1)}%</TableCell>
                        <TableCell className="text-right font-bold text-destructive">{d.deep.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- Profit Detail Dialog --- */}
      <Dialog open={!!showProfitDetail} onOpenChange={(open) => !open && setShowProfitDetail(null)}>
        <DialogContent className="max-w-[90vw] w-full max-h-[85vh] overflow-hidden flex flex-col p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-black text-primary flex items-center gap-3">
              <TrendingDown className="h-8 w-8" />
              {showProfitDetail} 利益分析詳細
            </DialogTitle>
            <DialogDescription className="text-lg font-bold">
              商品の「定価販売率」と「値引きによる収益性の変化」を確認します。
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discountAbcData
                .filter(d => d.category === showProfitDetail)
                .sort((a,b) => b.revenue - a.revenue)
                .map(d => (
                  <Card key={d.name} className="overflow-hidden border-2 hover:border-primary/40 transition-colors">
                    <div className="p-4 bg-muted/20 border-b cursor-pointer hover:bg-muted/40" onClick={() => setSelectedProductName(d.name)}>
                      <h4 className="font-black text-sm text-primary hover:underline truncate">{d.name}</h4>
                    </div>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">実績売上</p>
                          <p className="text-lg font-black tabular-nums">¥{Math.floor(d.revenue).toLocaleString()}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">平均値引き率</p>
                          <p className="text-lg font-black text-destructive tabular-nums">{d.discountRate.toFixed(1)}%</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-black">
                          <span>定価販売率</span>
                          <span className="text-primary">{d.reg.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3 overflow-hidden flex">
                          <div className="bg-primary h-full" style={{ width: `${d.reg}%` }} title="定価" />
                          <div className="bg-orange-400 h-full" style={{ width: `${d.light}%` }} title="~20%" />
                          <div className="bg-destructive h-full" style={{ width: `${d.deep}%` }} title="40%~" />
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-2">
                        <div className="flex-1 bg-primary/5 rounded p-1.5 text-center">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">数量</p>
                          <p className="text-sm font-black">{d.qty}</p>
                        </div>
                        <div className="flex-1 bg-primary/5 rounded p-1.5 text-center">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">定価数</p>
                          <p className="text-sm font-black">{Math.round(d.qty * d.reg / 100)}</p>
                        </div>
                      </div>

                      <Link href={`/abc-analysis?q=${encodeURIComponent(d.name)}`}>
                        <Button variant="ghost" className="w-full mt-2 h-8 text-[10px] font-black text-primary hover:bg-primary/5 rounded-lg border border-primary/10">
                          <ClipboardList className="h-3 w-3 mr-1.5" />
                          この商品の廃棄・ABC分析へ
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* --- Heatmap Cell Detail Dialog --- */}
      <Dialog open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <DialogContent className="max-w-[800px] w-full p-8 rounded-2xl shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-black flex items-center gap-3 text-primary">
              <Package className="h-8 w-8" />
              {selectedCell?.day}曜日 {selectedCell?.hour.includes(':') ? selectedCell.hour : `${selectedCell?.hour}:00`}台 売筋詳細
            </DialogTitle>
            <DialogDescription className="text-lg font-bold">
              この時間帯の販売実績と、当日の製造個数に対する販売比率を表示します。
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto border rounded-2xl">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
                  <TableHead className="font-black text-xs uppercase">商品名</TableHead>
                  <TableHead className="text-right font-black text-xs uppercase">販売数量</TableHead>
                  <TableHead className="text-right font-black text-xs uppercase">製造数量(当日)</TableHead>
                  <TableHead className="text-right font-black text-xs uppercase text-primary">販売比率</TableHead>
                  <TableHead className="text-right font-black text-xs uppercase text-destructive">廃棄数量(当日)</TableHead>
                  <TableHead className="text-right font-black text-xs uppercase text-destructive">廃棄比率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  if (!selectedCell) return null;
                  const key = `${selectedCell.day}-${selectedCell.hour}`;
                  const salesMap = dayHourProductSales.get(key) || new Map();
                  const prodMap = dayProductProduction.get(selectedCell.day) || new Map();
                  const wasteMap = (dayProductWaste as any)?.get(selectedCell.day) || new Map();

                  const list = Array.from(salesMap.entries()).map(([name, salesQty]) => {
                    const prodQty = prodMap.get(name) || 0;
                    const wasteQty = wasteMap.get(name) || 0;
                    const ratio = prodQty > 0 ? (salesQty / prodQty) * 100 : 0;
                    const wasteRatio = prodQty > 0 ? (wasteQty / prodQty) * 100 : 0;
                    return { name, salesQty, prodQty, wasteQty, ratio, wasteRatio };
                  }).sort((a, b) => b.ratio - a.ratio);

                  if (list.length === 0) return (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-bold">取引データがありません</TableCell>
                    </TableRow>
                  );

                  return list.map(item => (
                    <TableRow key={item.name} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-black text-sm"><span className="cursor-pointer text-primary hover:underline" onClick={() => setSelectedProductName(item.name)}>{item.name}</span></TableCell>
                      <TableCell className="text-right font-black tabular-nums text-primary">{item.salesQty.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-muted-foreground">{item.prodQty > 0 ? item.prodQty.toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-black text-lg text-primary">{item.ratio > 0 ? `${item.ratio.toFixed(1)}%` : '-'}</span>
                          {item.ratio > 0 && (
                            <div className="w-24 bg-muted h-1.5 rounded-full overflow-hidden">
                              <div className="bg-primary h-full" style={{ width: `${Math.min(item.ratio, 100)}%` }} />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black tabular-nums text-destructive">{item.wasteQty > 0 ? item.wasteQty.toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-black text-lg text-destructive">{item.wasteRatio > 0 ? `${item.wasteRatio.toFixed(1)}%` : '-'}</span>
                          {item.wasteRatio > 0 && (
                            <div className="w-24 bg-muted h-1.5 rounded-full overflow-hidden">
                              <div className="bg-destructive h-full" style={{ width: `${Math.min(item.wasteRatio, 100)}%` }} />
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
      {/* --- Product Detail Popup --- */}
      <Dialog open={!!selectedProductName} onOpenChange={(open) => !open && setSelectedProductName(null)}>
        <DialogContent className="max-w-[600px] w-full p-8 rounded-2xl shadow-2xl">
          {(() => {
            if (!selectedProductName) return null;
            // Need to retrieve product stats again or use the one from context if available
            // Since productStats is memoized inside, we can just find it in the products array and calculate,
            // or pass `discountAbcData` which contains the compiled stats
            const pData = discountAbcData.find(d => d.name === selectedProductName);
            if (!pData) return <div className="p-12 text-center text-muted-foreground font-bold">データが見つかりません</div>;

            return (
              <>
                <DialogHeader className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase">{pData.category}</span>
                  </div>
                  <DialogTitle className="text-3xl font-black text-foreground">
                    {pData.name}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/20 border rounded-xl">
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-1">総販売数</p>
                      <p className="text-2xl font-black">{pData.qty.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-muted/20 border rounded-xl">
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-1">売上高 (実績)</p>
                      <p className="text-2xl font-black text-primary">¥{Math.floor(pData.revenue).toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-muted/20 border rounded-xl">
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-1">平均値引き率</p>
                      <p className="text-2xl font-black text-orange-500">{pData.discountRate.toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
                      <p className="text-xs font-bold text-destructive uppercase mb-1">廃棄数 / 廃棄率</p>
                      <p className="text-2xl font-black text-destructive">{pData.wasteQty.toLocaleString()} <span className="text-lg opacity-80">({pData.wasteRate.toFixed(1)}%)</span></p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <h4 className="font-black text-sm mb-3">販売構成 (値引き率ごと)</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span>定価販売</span>
                          <span className="text-primary">{pData.reg.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${pData.reg}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span>~20%引き (軽度)</span>
                          <span className="text-orange-500">{pData.light.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div className="bg-orange-500 h-full" style={{ width: `${pData.light}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span>40%超引き (大幅)</span>
                          <span className="text-destructive">{pData.deep.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div className="bg-destructive h-full" style={{ width: `${pData.deep}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Link href={`/abc-analysis?q=${encodeURIComponent(pData.name)}`}>
                      <Button className="w-full font-black py-6 rounded-xl shadow-lg hover:scale-[1.02] transition-transform">
                        <ClipboardList className="mr-2 h-5 w-5" />
                        この商品の廃棄・ABC分析画面へ
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

