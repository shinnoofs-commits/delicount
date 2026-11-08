'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useTransactions } from '@/contexts/transaction-context';
import { useProducts } from '@/contexts/product-context';
import { useStores } from '@/contexts/store-context';
import { useStoreSelection } from '@/contexts/store-selection-context';
import { useChatbotContext } from '@/contexts/chatbot-context';
import { useToast } from '@/hooks/use-toast';
import {
  GitCompare,
  Calendar,
  Building,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Download,
  Filter,
  Search,
  Award,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Zap,
  Copy,
  Check,
  CalendarDays,
  Clock,
  Layers,
  BarChart3,
  Sliders,
  ChevronRight,
  Tag,
  Package,
  BarChart2,
  PieChart,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  subDays,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from 'date-fns';
import { cn } from '@/lib/utils';
import {
  getDayInfo,
  aggregateConditionStats,
  buildComparisonMatrix,
  generateComparisonAiHeuristics,
  type ComparisonResult,
  type ComparedProductRow,
  type ComparedCategoryRow,
  type ConditionProductStat,
} from '@/lib/compare-utils';

const DOW_ALL = ['月', '火', '水', '木', '金', '土', '日', '祝'];

export default function CompareAnalysisPage() {
  const { transactions, wasteEntries, setFetchDateRange } = useTransactions();
  const { products } = useProducts();
  const { stores } = useStores();
  const { selectedStoreIds } = useStoreSelection();
  const { setChatContext, setPageTitle } = useChatbotContext();
  const { toast } = useToast();

  // Mode: 'dow' (曜日比較) | 'period' (期間・月別曜日対比) | 'store' (店舗間比較)
  const [activeTab, setActiveTab] = useState<'dow' | 'period' | 'store'>('dow');

  // Sub-presets / controls
  // 1. 曜日比較用
  const [dowPreset, setDowPreset] = useState<'weekday-weekend' | 'custom' | 'all-days'>('weekday-weekend');
  const [dowRangePreset, setDowRangePreset] = useState<'30days' | 'current-month' | 'prev-month' | '90days'>('30days');
  const [customDOWsA, setCustomDOWsA] = useState<string[]>(['月', '火', '水', '木', '金']);
  const [customDOWsB, setCustomDOWsB] = useState<string[]>(['土', '日', '祝']);

  // 2. 期間比較用 (月別・月別曜日対比・任意期間)
  const today = useMemo(() => new Date(), []);
  const [periodType, setPeriodType] = useState<'month-dow' | 'custom-range'>('month-dow');
  const [monthA, setMonthA] = useState<string>(() => format(subMonths(today, 1), 'yyyy-MM')); // e.g. 2026-08
  const [monthB, setMonthB] = useState<string>(() => format(today, 'yyyy-MM')); // e.g. 2026-09
  // 月別曜日対比フィルタ ('all' | 'weekday' | 'weekend' | specific DOW)
  const [monthDowFilter, setMonthDowFilter] = useState<string>('all');

  // 任意期間用
  const [customDateRangeA, setCustomDateRangeA] = useState<{ from: Date; to: Date }>(() => ({
    from: startOfMonth(subMonths(today, 1)),
    to: endOfMonth(subMonths(today, 1)),
  }));
  const [customDateRangeB, setCustomDateRangeB] = useState<{ from: Date; to: Date }>(() => ({
    from: startOfMonth(today),
    to: endOfDay(today),
  }));

  // 3. 店舗比較用
  const [storeAId, setStoreAId] = useState<string>('all');
  const [storeBId, setStoreBId] = useState<string>('all');
  const [storeDateRange, setStoreDateRange] = useState<'30days' | 'current-month' | 'prev-month'>('30days');

  // Global category filter across whole analysis
  const [globalCategory, setGlobalCategory] = useState<string>('all');

  // Detail view mode: 'categories' | 'products'
  const [detailViewMode, setDetailViewMode] = useState<'categories' | 'products'>('categories');

  // Filters & sorting for detailed category table
  const [catSearchQuery, setCatSearchQuery] = useState<string>('');
  const [catSortKey, setCatSortKey] = useState<string>('salesB');
  const [catSortOrder, setCatSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filters & sorting for detailed product table
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string>('profitDiff');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [hoveredProductCode, setHoveredProductCode] = useState<string | null>(null);

  // Low-volume filter (Pattern 1)
  const [excludeUnder30, setExcludeUnder30] = useState<boolean>(true);
  const [minSalesThreshold, setMinSalesThreshold] = useState<number>(30);
  const [isExcludedModalOpen, setIsExcludedModalOpen] = useState<boolean>(false);

  // Copied state
  const [copiedReport, setCopiedReport] = useState(false);

  // All available categories derived from products & transactions
  const allAvailableCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim() && p.category !== '未分類') {
        set.add(p.category.trim());
      }
    });
    transactions.forEach(tx => {
      (tx.items || []).forEach(item => {
        if (item.category && item.category.trim() && item.category !== '未分類') {
          set.add(item.category.trim());
        }
      });
    });
    return Array.from(set).sort();
  }, [products, transactions]);

  // Set page title for chatbot context
  useEffect(() => {
    setPageTitle('比較分析');
    setChatContext('平日/休日、月別曜日対比、店舗間の比較分析画面');
  }, [setPageTitle, setChatContext]);

  // Adjust fetchDateRange in transaction-context to encompass maximum needed window
  useEffect(() => {
    const now = new Date();
    // Fetch last 120 days to cover past months easily
    const from = startOfDay(subDays(now, 120));
    const to = endOfDay(now);
    if (setFetchDateRange) {
      setFetchDateRange({ from, to });
    }
  }, [setFetchDateRange]);

  // Available months list (last 6 months)
  const availableMonths = useMemo(() => {
    const list: { label: string; value: string }[] = [];
    const base = new Date();
    for (let i = 0; i < 6; i++) {
      const d = subMonths(base, i);
      list.push({
        label: format(d, 'yyyy年M月'),
        value: format(d, 'yyyy-MM'),
      });
    }
    return list;
  }, []);

  // Determine Condition A and Condition B parameters based on active tab
  const conditionConfig = useMemo(() => {
    const now = new Date();

    if (activeTab === 'dow') {
      // Date range for sampling
      let rangeFrom = subDays(now, 30);
      let rangeTo = now;
      let rangeLabel = '直近30日間';

      if (dowRangePreset === 'current-month') {
        rangeFrom = startOfMonth(now);
        rangeTo = now;
        rangeLabel = '今月';
      } else if (dowRangePreset === 'prev-month') {
        const prev = subMonths(now, 1);
        rangeFrom = startOfMonth(prev);
        rangeTo = endOfMonth(prev);
        rangeLabel = '先月';
      } else if (dowRangePreset === '90days') {
        rangeFrom = subDays(now, 90);
        rangeTo = now;
        rangeLabel = '過去90日間';
      }

      if (dowPreset === 'weekday-weekend') {
        return {
          labelA: '平日 (月〜金)',
          labelB: '土日祝',
          subtitle: `${rangeLabel}（${format(rangeFrom, 'M/d')}〜${format(rangeTo, 'M/d')}）の集計`,
          predA: (d: Date) => {
            const info = getDayInfo(d);
            return isWithinInterval(d, { start: startOfDay(rangeFrom), end: endOfDay(rangeTo) }) && info.isWeekday;
          },
          predB: (d: Date) => {
            const info = getDayInfo(d);
            return isWithinInterval(d, { start: startOfDay(rangeFrom), end: endOfDay(rangeTo) }) && info.isWeekendOrHoliday;
          },
        };
      } else {
        // Custom DOW selection
        const nameA = customDOWsA.join('・') || '未選択';
        const nameB = customDOWsB.join('・') || '未選択';
        return {
          labelA: `条件A [${nameA}]`,
          labelB: `条件B [${nameB}]`,
          subtitle: `${rangeLabel}（${format(rangeFrom, 'M/d')}〜${format(rangeTo, 'M/d')}）の集計`,
          predA: (d: Date) => {
            const info = getDayInfo(d);
            return isWithinInterval(d, { start: startOfDay(rangeFrom), end: endOfDay(rangeTo) }) && customDOWsA.includes(info.dowName);
          },
          predB: (d: Date) => {
            const info = getDayInfo(d);
            return isWithinInterval(d, { start: startOfDay(rangeFrom), end: endOfDay(rangeTo) }) && customDOWsB.includes(info.dowName);
          },
        };
      }
    } else if (activeTab === 'period') {
      if (periodType === 'month-dow') {
        const [yA, mA] = monthA.split('-').map(Number);
        const [yB, mB] = monthB.split('-').map(Number);
        const startA = startOfMonth(new Date(yA, mA - 1, 1));
        const endA = endOfMonth(new Date(yA, mA - 1, 1));
        const startB = startOfMonth(new Date(yB, mB - 1, 1));
        const endB = endOfMonth(new Date(yB, mB - 1, 1));

        let dowFilterName = '全日';
        if (monthDowFilter === 'weekday') dowFilterName = '平日のみ';
        else if (monthDowFilter === 'weekend') dowFilterName = '土日祝のみ';
        else if (monthDowFilter !== 'all') dowFilterName = `${monthDowFilter}曜のみ`;

        const checkDow = (d: Date) => {
          if (monthDowFilter === 'all') return true;
          const info = getDayInfo(d);
          if (monthDowFilter === 'weekday') return info.isWeekday;
          if (monthDowFilter === 'weekend') return info.isWeekendOrHoliday;
          return info.dowName === monthDowFilter;
        };

        return {
          labelA: `${format(startA, 'yyyy年M月')} (${dowFilterName})`,
          labelB: `${format(startB, 'yyyy年M月')} (${dowFilterName})`,
          subtitle: `月別曜日対比フィルタ: ${dowFilterName}`,
          predA: (d: Date) => isWithinInterval(d, { start: startA, end: endA }) && checkDow(d),
          predB: (d: Date) => isWithinInterval(d, { start: startB, end: endB }) && checkDow(d),
        };
      } else {
        // Custom Date Range
        return {
          labelA: `期間A (${format(customDateRangeA.from, 'M/d')}〜${format(customDateRangeA.to, 'M/d')})`,
          labelB: `期間B (${format(customDateRangeB.from, 'M/d')}〜${format(customDateRangeB.to, 'M/d')})`,
          subtitle: '指定された2期間の直接対比',
          predA: (d: Date) => isWithinInterval(d, { start: startOfDay(customDateRangeA.from), end: endOfDay(customDateRangeA.to) }),
          predB: (d: Date) => isWithinInterval(d, { start: startOfDay(customDateRangeB.from), end: endOfDay(customDateRangeB.to) }),
        };
      }
    } else {
      // Store comparison
      let rangeFrom = subDays(now, 30);
      let rangeTo = now;
      let rangeLabel = '直近30日間';

      if (storeDateRange === 'current-month') {
        rangeFrom = startOfMonth(now);
        rangeTo = now;
        rangeLabel = '今月';
      } else if (storeDateRange === 'prev-month') {
        const prev = subMonths(now, 1);
        rangeFrom = startOfMonth(prev);
        rangeTo = endOfMonth(prev);
        rangeLabel = '先月';
      }

      const storeAName = storeAId === 'all' ? '全店舗合計' : stores.find(s => s.id === storeAId)?.name || '店舗A';
      const storeBName = storeBId === 'all' ? '全店舗合計' : stores.find(s => s.id === storeBId)?.name || '店舗B';

      return {
        labelA: storeAName,
        labelB: storeBName,
        subtitle: `${rangeLabel}（${format(rangeFrom, 'M/d')}〜${format(rangeTo, 'M/d')}）の店舗対比`,
        predA: (d: Date, sId?: string) => {
          const matchDate = isWithinInterval(d, { start: startOfDay(rangeFrom), end: endOfDay(rangeTo) });
          const matchStore = storeAId === 'all' ? true : sId === storeAId;
          return matchDate && matchStore;
        },
        predB: (d: Date, sId?: string) => {
          const matchDate = isWithinInterval(d, { start: startOfDay(rangeFrom), end: endOfDay(rangeTo) });
          const matchStore = storeBId === 'all' ? true : sId === storeBId;
          return matchDate && matchStore;
        },
      };
    }
  }, [
    activeTab,
    dowPreset,
    dowRangePreset,
    customDOWsA,
    customDOWsB,
    periodType,
    monthA,
    monthB,
    monthDowFilter,
    customDateRangeA,
    customDateRangeB,
    storeAId,
    storeBId,
    storeDateRange,
    stores,
  ]);

  // Global store filter (from header store selector if applied)
  const storeFilteredTransactions = useMemo(() => {
    if (activeTab === 'store') return transactions; // In store tab, we use storeA/storeB
    if (!selectedStoreIds || selectedStoreIds.length === 0) return transactions;
    return transactions.filter(t => !t.storeId || selectedStoreIds.includes(t.storeId));
  }, [transactions, selectedStoreIds, activeTab]);

  const storeFilteredWaste = useMemo(() => {
    if (activeTab === 'store') return wasteEntries;
    if (!selectedStoreIds || selectedStoreIds.length === 0) return wasteEntries;
    return wasteEntries.filter(w => !w.storeId || selectedStoreIds.includes(w.storeId));
  }, [wasteEntries, selectedStoreIds, activeTab]);

  // Aggregate Condition A & B
  const comparisonResult: ComparisonResult = useMemo(() => {
    const condA = aggregateConditionStats(
      storeFilteredTransactions,
      storeFilteredWaste,
      products,
      conditionConfig.predA,
      conditionConfig.labelA,
      globalCategory
    );

    const condB = aggregateConditionStats(
      storeFilteredTransactions,
      storeFilteredWaste,
      products,
      conditionConfig.predB,
      conditionConfig.labelB,
      globalCategory
    );

    return buildComparisonMatrix(condA, condB);
  }, [storeFilteredTransactions, storeFilteredWaste, products, conditionConfig, globalCategory]);

  // All 7 Days + Holiday Breakdown (for DOW mode -> 'all-days' view)
  const allDaysBreakdown = useMemo(() => {
    if (activeTab !== 'dow') return [];

    const now = new Date();
    let rangeFrom = subDays(now, 30);
    let rangeTo = now;

    if (dowRangePreset === 'current-month') {
      rangeFrom = startOfMonth(now);
      rangeTo = now;
    } else if (dowRangePreset === 'prev-month') {
      const prev = subMonths(now, 1);
      rangeFrom = startOfMonth(prev);
      rangeTo = endOfMonth(prev);
    } else if (dowRangePreset === '90days') {
      rangeFrom = subDays(now, 90);
      rangeTo = now;
    }

    return DOW_ALL.map(targetDow => {
      const stats = aggregateConditionStats(
        storeFilteredTransactions,
        storeFilteredWaste,
        products,
        (d: Date) => {
          const info = getDayInfo(d);
          const within = isWithinInterval(d, { start: startOfDay(rangeFrom), end: endOfDay(rangeTo) });
          return within && info.dowName === targetDow;
        },
        targetDow,
        globalCategory
      );

      const days = stats.summary.daysCount || 1;
      const avgSalesPerDay = Math.round(stats.summary.totalSales / days);
      const avgProfitPerDay = Math.round(stats.summary.totalGrossProfit / days);
      const topProduct = stats.productList[0]?.name || '—';

      return {
        dow: targetDow,
        daysCount: days,
        totalSales: stats.summary.totalSales,
        totalProfit: stats.summary.totalGrossProfit,
        avgSalesPerDay,
        avgProfitPerDay,
        grossProfitMargin: stats.summary.grossProfitMargin,
        wasteRate: stats.summary.wasteRate,
        discountRate: stats.summary.discountRate,
        topProduct,
      };
    });
  }, [activeTab, dowRangePreset, storeFilteredTransactions, storeFilteredWaste, products, globalCategory]);

  // AI Insights
  const aiInsights = useMemo(() => {
    return generateComparisonAiHeuristics(
      comparisonResult,
      activeTab,
      conditionConfig.labelA,
      conditionConfig.labelB
    );
  }, [comparisonResult, activeTab, conditionConfig]);

  // Filtered and sorted products for detailed matrix
  const categories = useMemo(() => {
    const set = new Set<string>();
    comparisonResult.comparedProducts.forEach(p => {
      if (p.category && p.category !== '未分類') set.add(p.category);
    });
    return Array.from(set).sort();
  }, [comparisonResult.comparedProducts]);

  // Low-volume products excluded from comparison (Pattern 1)
  const excludedComparedProducts = useMemo(() => {
    return comparisonResult.comparedProducts
      .filter(p => {
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        if (activeTab === 'period') {
          return Math.max(p.qtyA, p.qtyB) < minSalesThreshold;
        }
        return (p.qtyA + p.qtyB) < minSalesThreshold;
      })
      .sort((a, b) => (a.qtyA + a.qtyB) - (b.qtyA + b.qtyB));
  }, [comparisonResult.comparedProducts, selectedCategory, activeTab, minSalesThreshold]);

  const displayedComparedProducts = useMemo(() => {
    let list = comparisonResult.comparedProducts;

    if (excludeUnder30) {
      list = list.filter(p => {
        if (activeTab === 'period') {
          return Math.max(p.qtyA, p.qtyB) >= minSalesThreshold;
        }
        return (p.qtyA + p.qtyB) >= minSalesThreshold;
      });
    }

    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      let valA = (a as any)[sortKey] ?? 0;
      let valB = (b as any)[sortKey] ?? 0;
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (sortOrder === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
  }, [comparisonResult.comparedProducts, excludeUnder30, minSalesThreshold, activeTab, selectedCategory, searchQuery, sortKey, sortOrder]);

  // Filtered and sorted category rows for detailed category matrix
  const displayedCategoryRows = useMemo(() => {
    let list = comparisonResult.categoryRows || [];

    if (catSearchQuery.trim()) {
      const q = catSearchQuery.trim().toLowerCase();
      list = list.filter(c => c.category.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      let valA = (a as any)[catSortKey] ?? 0;
      let valB = (b as any)[catSortKey] ?? 0;
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (catSortOrder === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
  }, [comparisonResult.categoryRows, catSearchQuery, catSortKey, catSortOrder]);

  // Top 10 products for Condition A and Condition B
  const top10A = useMemo(() => {
    let list = comparisonResult.productsA;
    if (excludeUnder30) {
      list = list.filter(p => p.totalSoldQty >= minSalesThreshold);
    }
    return [...list].slice(0, 10);
  }, [comparisonResult.productsA, excludeUnder30, minSalesThreshold]);

  const top10B = useMemo(() => {
    let list = comparisonResult.productsB;
    if (excludeUnder30) {
      list = list.filter(p => p.totalSoldQty >= minSalesThreshold);
    }
    return [...list].slice(0, 10);
  }, [comparisonResult.productsB, excludeUnder30, minSalesThreshold]);

  // Category CSV Export
  const handleExportCategoryCsv = () => {
    const headers = [
      'カテゴリー名',
      `売上(${conditionConfig.labelA})`,
      `売上シェア(${conditionConfig.labelA})`,
      `売上(${conditionConfig.labelB})`,
      `売上シェア(${conditionConfig.labelB})`,
      '売上増減額',
      '売上増減率(%)',
      `粗利額(${conditionConfig.labelA})`,
      `粗利率(${conditionConfig.labelA})`,
      `粗利額(${conditionConfig.labelB})`,
      `粗利率(${conditionConfig.labelB})`,
      '粗利増減額',
      '粗利率差(pt)',
      `廃棄率(${conditionConfig.labelA})`,
      `廃棄率(${conditionConfig.labelB})`,
      '廃棄率差(pt)',
      `出数(${conditionConfig.labelA})`,
      `出数(${conditionConfig.labelB})`,
      '出数差',
      `商品数(${conditionConfig.labelA})`,
      `商品数(${conditionConfig.labelB})`,
      `主力商品(${conditionConfig.labelA})`,
      `主力商品(${conditionConfig.labelB})`,
      '部門特性判定',
    ];

    const rows = displayedCategoryRows.map(c => [
      c.category,
      c.salesA,
      `${c.salesShareA}%`,
      c.salesB,
      `${c.salesShareB}%`,
      c.salesDiff,
      `${c.salesDiffPercent}%`,
      c.profitA,
      `${c.marginA}%`,
      c.profitB,
      `${c.marginB}%`,
      c.profitDiff,
      `${c.marginDiff}pt`,
      `${c.wasteRateA}%`,
      `${c.wasteRateB}%`,
      `${c.wasteRateDiff}pt`,
      c.soldQtyA,
      c.soldQtyB,
      c.soldQtyB - c.soldQtyA,
      c.productCountA,
      c.productCountB,
      c.topProductA,
      c.topProductB,
      c.categoryTag,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `カテゴリー別比較分析_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'カテゴリー別CSVを出力しました', description: `${displayedCategoryRows.length}部門の比較データをダウンロードしました。` });
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      '商品コード',
      '商品名',
      'カテゴリー',
      '単価',
      `出数(${conditionConfig.labelA})`,
      `出数(${conditionConfig.labelB})`,
      '出数差',
      `粗利額(${conditionConfig.labelA})`,
      `粗利額(${conditionConfig.labelB})`,
      '粗利差',
      `粗利率(${conditionConfig.labelA})`,
      `粗利率(${conditionConfig.labelB})`,
      '粗利率差(pt)',
      `廃棄率(${conditionConfig.labelA})`,
      `廃棄率(${conditionConfig.labelB})`,
      '廃棄率差(pt)',
      `順位(${conditionConfig.labelA})`,
      `順位(${conditionConfig.labelB})`,
      '順位変動',
      '特性判定',
    ];

    const rows = displayedComparedProducts.map(p => [
      p.code,
      p.name,
      p.category,
      p.price,
      p.qtyA,
      p.qtyB,
      p.qtyDiff,
      p.profitA,
      p.profitB,
      p.profitDiff,
      `${p.marginA}%`,
      `${p.marginB}%`,
      `${p.marginDiff}%`,
      `${p.wasteRateA}%`,
      `${p.wasteRateB}%`,
      `${p.wasteRateDiff}%`,
      p.rankA || '-',
      p.rankB || '-',
      p.rankDiff,
      p.behaviorTag,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `比較分析_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'CSVを出力しました', description: `${displayedComparedProducts.length}品の比較データをダウンロードしました。` });
  };

  const handleCopyReport = () => {
    const text = `【比較分析 AI戦略レポート】
対象: ${conditionConfig.labelA} vs ${conditionConfig.labelB}
${conditionConfig.subtitle}

■ 全体総括
${aiInsights.headline}

■ 比較分析示唆
${aiInsights.insights.map((s, i) => `${i + 1}. ${s}`).join('\n')}

■ 重点改善アクション
${aiInsights.recommendations.map((r, i) => `・${r}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
    toast({ title: 'レポートをコピーしました' });
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-background border-2 border-rose-500/20 rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
            <GitCompare className="h-3 w-3" /> 新機能
          </span>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
            比較分析 (曜日・期間・店舗対比)
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCategoryCsv}
            className="h-8 text-xs font-bold gap-1 bg-white hover:bg-rose-50 border-rose-300 text-rose-800 shadow-2xs"
          >
            <Download className="h-3.5 w-3.5 text-rose-600" /> カテゴリー別CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 text-xs font-bold gap-1 bg-white hover:bg-slate-50 border-slate-300 shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" /> 商品別CSV
          </Button>
        </div>
      </div>

      {/* Main Mode Navigation (Tabs) */}
      <Card className="border shadow-xs">
        <CardContent className="p-3">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
            <TabsList className="grid grid-cols-3 w-full max-w-lg mx-auto h-10 p-1 bg-muted/80">
              <TabsTrigger value="dow" className="text-xs sm:text-sm font-black gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                <Calendar className="h-4 w-4 text-rose-600" />
                曜日比較
              </TabsTrigger>
              <TabsTrigger value="period" className="text-xs sm:text-sm font-black gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                <CalendarDays className="h-4 w-4 text-purple-600" />
                期間・月別対比
              </TabsTrigger>
              <TabsTrigger value="store" className="text-xs sm:text-sm font-black gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                <Building className="h-4 w-4 text-blue-600" />
                店舗間比較
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Sub-controls based on active tab */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* 1. 曜日比較コントロール */}
            {activeTab === 'dow' && (
              <div className="flex flex-wrap items-center gap-3 w-full">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-700">比較タイプ:</span>
                  <Select value={dowPreset} onValueChange={(val: any) => setDowPreset(val)}>
                    <SelectTrigger className="h-8 text-xs font-bold w-[160px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekday-weekend">⚖️ 平日 vs 土日祝</SelectItem>
                      <SelectItem value="custom">🎯 曜日指定対比</SelectItem>
                      <SelectItem value="all-days">📊 全曜日一覧サマリー</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-700">集計対象期間:</span>
                  <Select value={dowRangePreset} onValueChange={(val: any) => setDowRangePreset(val)}>
                    <SelectTrigger className="h-8 text-xs font-bold w-[140px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30days">直近30日間</SelectItem>
                      <SelectItem value="current-month">今月 (当月)</SelectItem>
                      <SelectItem value="prev-month">先月 (前月)</SelectItem>
                      <SelectItem value="90days">過去90日間</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {dowPreset === 'custom' && (
                  <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200/80 w-full mt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        条件Aの曜日:
                      </span>
                      {DOW_ALL.map(d => (
                        <label key={`A-${d}`} className="flex items-center gap-1 text-[11px] font-bold cursor-pointer">
                          <Checkbox
                            checked={customDOWsA.includes(d)}
                            onCheckedChange={(checked) => {
                              if (checked) setCustomDOWsA(prev => [...prev, d]);
                              else setCustomDOWsA(prev => prev.filter(x => x !== d));
                            }}
                            className="h-3.5 w-3.5"
                          />
                          {d}
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        条件Bの曜日:
                      </span>
                      {DOW_ALL.map(d => (
                        <label key={`B-${d}`} className="flex items-center gap-1 text-[11px] font-bold cursor-pointer">
                          <Checkbox
                            checked={customDOWsB.includes(d)}
                            onCheckedChange={(checked) => {
                              if (checked) setCustomDOWsB(prev => [...prev, d]);
                              else setCustomDOWsB(prev => prev.filter(x => x !== d));
                            }}
                            className="h-3.5 w-3.5"
                          />
                          {d}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. 期間比較コントロール (月別曜日対比対応) */}
            {activeTab === 'period' && (
              <div className="flex flex-wrap items-center gap-3 w-full">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-700">期間指定モード:</span>
                  <Select value={periodType} onValueChange={(val: any) => setPeriodType(val)}>
                    <SelectTrigger className="h-8 text-xs font-bold w-[180px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month-dow">⭐ 月別対比 (月別曜日対比)</SelectItem>
                      <SelectItem value="custom-range">📆 任意期間 A vs B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {periodType === 'month-dow' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-600">比較月A:</span>
                      <Select value={monthA} onValueChange={setMonthA}>
                        <SelectTrigger className="h-8 text-xs font-bold w-[120px] bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMonths.map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <span className="text-slate-400 font-bold">vs</span>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-600">比較月B:</span>
                      <Select value={monthB} onValueChange={setMonthB}>
                        <SelectTrigger className="h-8 text-xs font-bold w-[120px] bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMonths.map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 月別曜日対比フィルタ */}
                    <div className="flex items-center gap-1.5 ml-auto bg-purple-50 p-1.5 rounded-lg border border-purple-200">
                      <span className="font-black text-purple-900 flex items-center gap-1">
                        <Filter className="h-3 w-3" /> 月別曜日対比:
                      </span>
                      <Select value={monthDowFilter} onValueChange={setMonthDowFilter}>
                        <SelectTrigger className="h-7 text-[11px] font-bold w-[140px] bg-white border-purple-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">🌟 全日 (月間全体)</SelectItem>
                          <SelectItem value="weekday">💼 平日のみ対比</SelectItem>
                          <SelectItem value="weekend">🎪 土日祝のみ対比</SelectItem>
                          <SelectItem value="日">日曜のみ対比</SelectItem>
                          <SelectItem value="土">土曜のみ対比</SelectItem>
                          <SelectItem value="金">金曜のみ対比</SelectItem>
                          <SelectItem value="月">月曜のみ対比</SelectItem>
                          <SelectItem value="祝">祝日のみ対比</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 w-full">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">期間A:</span>
                      <DatePickerWithRange
                        date={customDateRangeA}
                        setDate={(r) => r?.from && r?.to && setCustomDateRangeA({ from: r.from, to: r.to })}
                      />
                    </div>
                    <span className="text-slate-400 font-bold">vs</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">期間B:</span>
                      <DatePickerWithRange
                        date={customDateRangeB}
                        setDate={(r) => r?.from && r?.to && setCustomDateRangeB({ from: r.from, to: r.to })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. 店舗間比較コントロール */}
            {activeTab === 'store' && (
              <div className="flex flex-wrap items-center gap-3 w-full">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">店舗A:</span>
                  <Select value={storeAId} onValueChange={setStoreAId}>
                    <SelectTrigger className="h-8 text-xs font-bold w-[160px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全店舗合計</SelectItem>
                      {stores.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <span className="text-slate-400 font-bold">vs</span>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">店舗B:</span>
                  <Select value={storeBId} onValueChange={setStoreBId}>
                    <SelectTrigger className="h-8 text-xs font-bold w-[160px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全店舗合計</SelectItem>
                      {stores.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <span className="font-bold text-slate-600">期間:</span>
                  <Select value={storeDateRange} onValueChange={(val: any) => setStoreDateRange(val)}>
                    <SelectTrigger className="h-8 text-xs font-bold w-[120px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30days">直近30日間</SelectItem>
                      <SelectItem value="current-month">今月 (当月)</SelectItem>
                      <SelectItem value="prev-month">先月 (前月)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Global Category Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 w-full pt-2.5 mt-2 border-t border-slate-200/80 bg-rose-50/50 -mx-1 px-3 py-2 rounded-xl border border-rose-200/60">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-slate-800 flex items-center gap-1.5 text-xs">
                  <Tag className="h-3.5 w-3.5 text-rose-600" />
                  対象カテゴリー絞り込み:
                </span>
                <Select value={globalCategory} onValueChange={setGlobalCategory}>
                  <SelectTrigger className="h-7 text-xs font-bold w-[170px] bg-white border-rose-300 shadow-2xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🌟 全カテゴリー (全体集計)</SelectItem>
                    {allAvailableCategories.map(c => (
                      <SelectItem key={c} value={c}>🏷️ {c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {globalCategory !== 'all' && (
                  <Badge variant="outline" className="bg-rose-100 text-rose-900 border-rose-300 font-bold text-[11px] gap-1">
                    <span>選択中: {globalCategory}</span>
                    <button
                      onClick={() => setGlobalCategory('all')}
                      className="ml-1 hover:text-rose-950 font-black cursor-pointer text-xs"
                      title="全体集計に戻す"
                    >
                      ×
                    </button>
                  </Badge>
                )}
              </div>

              {/* Low-volume Filter Toggle (Pattern 1) in Global Bar */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-rose-200">
                  <Switch
                    id="global-exclude-low-qty"
                    checked={excludeUnder30}
                    onCheckedChange={setExcludeUnder30}
                    className="data-[state=checked]:bg-emerald-600 scale-75"
                  />
                  <label htmlFor="global-exclude-low-qty" className="text-[11px] font-bold text-slate-700 cursor-pointer select-none whitespace-nowrap">
                    低出数商品({minSalesThreshold}個未満)を除外
                  </label>
                </div>
                {excludeUnder30 && excludedComparedProducts.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsExcludedModalOpen(true)}
                    className="h-6 text-[10px] font-bold text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100 px-2 gap-1"
                  >
                    <span>除外: {excludedComparedProducts.length}品</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* If 'all-days' view selected in DOW mode: Render 7 Days + Holiday Breakdown */}
      {activeTab === 'dow' && dowPreset === 'all-days' ? (
        <Card className="border-2 border-slate-300 shadow-xs">
          <CardHeader className="p-3.5 pb-2 bg-slate-50 border-b">
            <CardTitle className="text-sm font-black flex items-center gap-2 text-slate-900">
              <Calendar className="h-4 w-4 text-primary" />
              全曜日一括対比サマリー（月〜日・祝日の営業特性）
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {conditionConfig.subtitle} における曜日別1日あたり平均指標と主要看板商品
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 space-y-4">
            {/* Bar Chart comparing Daily Avg Sales & Profit across DOWs */}
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allDaysBreakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="dow" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `¥${Math.round(val / 1000)}k`} />
                  <RechartsTooltip
                    formatter={(val: any, name: any) => [`¥${Number(val).toLocaleString()}`, name === 'avgSalesPerDay' ? '1日平均売上' : '1日平均粗利']}
                    labelFormatter={(l) => `${l}曜日・祝日`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                  <Bar dataKey="avgSalesPerDay" name="1日平均売上" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgProfitPerDay" name="1日平均粗利" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* DOW Summary Cards in Horizontal Grid (iPad & Desktop friendly) */}
            <div className="overflow-x-auto pb-2 -mx-1 px-1">
              <div className="grid grid-cols-8 min-w-[760px] gap-2">
                {allDaysBreakdown.map((item) => {
                  const isSun = item.dow === '日' || item.dow === '祝';
                  const isSat = item.dow === '土';
                  const headerBg = isSun ? 'bg-rose-50 text-rose-900 border-rose-200' :
                                   isSat ? 'bg-blue-50 text-blue-900 border-blue-200' :
                                   'bg-slate-50 text-slate-800 border-slate-200';

                  return (
                    <Card key={item.dow} className="border shadow-2xs flex flex-col justify-between">
                      <div className={cn("p-1.5 text-center font-black text-xs border-b", headerBg)}>
                        {item.dow}曜 ({item.daysCount}日)
                      </div>
                      <div className="p-2 space-y-1.5 text-center flex-1 flex flex-col justify-center">
                        <div>
                          <p className="text-[10px] text-muted-foreground">平均売上</p>
                          <p className="text-xs font-black text-slate-900 tabular-nums">
                            ¥{item.avgSalesPerDay.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">粗利率</p>
                          <p className="text-xs font-black text-emerald-700 tabular-nums">
                            {item.grossProfitMargin}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">廃棄率</p>
                          <p className={cn("text-xs font-bold tabular-nums", item.wasteRate > 7 ? "text-rose-600" : "text-slate-600")}>
                            {item.wasteRate}%
                          </p>
                        </div>
                        <div className="pt-1 border-t border-slate-100">
                          <p className="text-[9px] text-muted-foreground truncate" title={item.topProduct}>
                            👑 {item.topProduct}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Normal 2-Condition Comparison View */}
      {!(activeTab === 'dow' && dowPreset === 'all-days') && (
        <>
          {/* Side-by-Side KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* 1. 売上高比較 */}
            <Card className="border shadow-xs bg-white">
              <CardContent className="p-3 space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground">売上高の比較</span>
                <div className="flex items-baseline justify-between gap-1">
                  <div className="space-y-0.5">
                    <p className="text-xs text-rose-800 font-bold truncate" title={conditionConfig.labelA}>
                      A: ¥{comparisonResult.summaryA.totalSales.toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-800 font-bold truncate" title={conditionConfig.labelB}>
                      B: ¥{comparisonResult.summaryB.totalSales.toLocaleString()}
                    </p>
                  </div>
                  <Badge className={cn(
                    "text-[10px] font-black shrink-0",
                    comparisonResult.diffSummary.salesDiff >= 0 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-800"
                  )}>
                    {comparisonResult.diffSummary.salesDiff >= 0 ? '+' : ''}¥{comparisonResult.diffSummary.salesDiff.toLocaleString()}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* 2. 粗利額比較 */}
            <Card className="border shadow-xs bg-white">
              <CardContent className="p-3 space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground">粗利額の比較</span>
                <div className="flex items-baseline justify-between gap-1">
                  <div className="space-y-0.5">
                    <p className="text-xs text-rose-800 font-bold truncate" title={conditionConfig.labelA}>
                      A: ¥{comparisonResult.summaryA.totalGrossProfit.toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-800 font-bold truncate" title={conditionConfig.labelB}>
                      B: ¥{comparisonResult.summaryB.totalGrossProfit.toLocaleString()}
                    </p>
                  </div>
                  <Badge className={cn(
                    "text-[10px] font-black shrink-0",
                    comparisonResult.diffSummary.profitDiff >= 0 ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                  )}>
                    {comparisonResult.diffSummary.profitDiff >= 0 ? '+' : ''}¥{comparisonResult.diffSummary.profitDiff.toLocaleString()}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* 3. 粗利率比較 */}
            <Card className="border shadow-xs bg-white">
              <CardContent className="p-3 space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground">粗利率 (利益率)</span>
                <div className="flex items-baseline justify-between gap-1">
                  <div className="space-y-0.5">
                    <p className="text-xs text-rose-800 font-bold">
                      A: {comparisonResult.summaryA.grossProfitMargin}%
                    </p>
                    <p className="text-xs text-blue-800 font-bold">
                      B: {comparisonResult.summaryB.grossProfitMargin}%
                    </p>
                  </div>
                  <Badge className={cn(
                    "text-[10px] font-black shrink-0",
                    comparisonResult.diffSummary.marginDiff >= 0 ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-rose-100 text-rose-900 border border-rose-300"
                  )}>
                    {comparisonResult.diffSummary.marginDiff >= 0 ? '+' : ''}{comparisonResult.diffSummary.marginDiff} pt
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* 4. 廃棄率比較 */}
            <Card className="border shadow-xs bg-white">
              <CardContent className="p-3 space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground">廃棄率 (ロス率)</span>
                <div className="flex items-baseline justify-between gap-1">
                  <div className="space-y-0.5">
                    <p className="text-xs text-rose-800 font-bold">
                      A: {comparisonResult.summaryA.wasteRate}%
                    </p>
                    <p className="text-xs text-blue-800 font-bold">
                      B: {comparisonResult.summaryB.wasteRate}%
                    </p>
                  </div>
                  <Badge className={cn(
                    "text-[10px] font-black shrink-0",
                    comparisonResult.diffSummary.wasteRateDiff <= 0 ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                  )}>
                    {comparisonResult.diffSummary.wasteRateDiff <= 0 ? '' : '+'}{comparisonResult.diffSummary.wasteRateDiff} pt
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Strategic Comparison Report Callout */}
          <Card className="border-2 border-purple-300/80 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-white shadow-xs">
            <CardHeader className="p-3 sm:p-4 pb-2 border-b border-purple-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-purple-600 text-white shadow-2xs">
                  <Sparkles className="h-4 w-4" />
                </span>
                <CardTitle className="text-sm sm:text-base font-black text-purple-950">
                  AI比較戦略診断（{conditionConfig.labelA} vs {conditionConfig.labelB}）
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyReport}
                className="h-7 text-xs font-bold gap-1 bg-white hover:bg-purple-50 border-purple-200 text-purple-900 shadow-2xs"
              >
                {copiedReport ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copiedReport ? 'コピー完了' : 'レポートをコピー'}
              </Button>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-4 space-y-3">
              {/* Headline */}
              <div className="p-3 rounded-xl bg-white border border-purple-200/70 shadow-2xs">
                <p className="text-xs sm:text-sm font-bold text-slate-850 leading-relaxed">
                  {aiInsights.headline}
                </p>
              </div>

              {/* Insights Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1.5">
                  <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> 主要な実績・数値ギャップ
                  </span>
                  <ul className="text-xs text-emerald-900 space-y-1 font-medium list-disc list-inside">
                    {aiInsights.insights.map((s, idx) => (
                      <li key={idx} className="leading-snug">{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1.5">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-600" /> 店舗オペレーション改善アクション
                  </span>
                  <ul className="text-xs text-amber-900 space-y-1 font-bold list-disc list-inside">
                    {aiInsights.recommendations.map((r, idx) => (
                      <li key={idx} className="leading-snug">{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top 10 Products Side-by-Side Comparison (iPad friendly) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1 font-bold">
              <span>💡 上位10品 偏差値ランキングの横並び対比（カーソルを合わせると両方で連動表示）</span>
              <span className="hidden sm:inline-block text-[11px]">↑↓は順位差</span>
            </div>

            <div className="overflow-x-auto pb-2 -mx-1 px-1">
              <div className="grid grid-cols-2 min-w-[640px] gap-3">
                {/* Column A */}
                <Card className="border-2 border-rose-300 shadow-xs flex flex-col bg-card">
                  <CardHeader className="p-2.5 pb-2 border-b bg-rose-50/90 flex flex-row items-center justify-between">
                    <div>
                      <div className="font-black text-xs text-rose-950 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                        <span>{conditionConfig.labelA} の上位10品</span>
                      </div>
                      <p className="text-[10px] text-rose-800/80 mt-0.5 font-medium">
                        売上: ¥{comparisonResult.summaryA.totalSales.toLocaleString()} ・ 粗利率: {comparisonResult.summaryA.grossProfitMargin}%
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-white border-rose-300 text-rose-800 font-bold">
                      {comparisonResult.productsA.length}品中
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-1 flex-1 space-y-0.5">
                    {top10A.map((p, idx) => (
                      <div
                        key={p.code}
                        onMouseEnter={() => setHoveredProductCode(p.code)}
                        onMouseLeave={() => setHoveredProductCode(null)}
                        className={cn(
                          "flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer transition-all",
                          hoveredProductCode === p.code
                            ? "bg-amber-100 text-amber-950 font-black ring-2 ring-amber-400 shadow-2xs z-10 scale-[1.01]"
                            : "hover:bg-muted/60 text-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                            idx === 0 ? "bg-amber-500 text-white" :
                            idx === 1 ? "bg-slate-400 text-white" :
                            idx === 2 ? "bg-amber-700 text-white" :
                            "text-slate-400 font-bold"
                          )}>
                            {idx + 1}
                          </span>
                          <span className="truncate text-xs font-bold">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <span className="text-[10px] text-slate-500 tabular-nums">出数:{p.totalSoldQty}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-black tabular-nums bg-rose-100 text-rose-900 border border-rose-200">
                            偏差値 {p.compositeScore}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Column B */}
                <Card className="border-2 border-blue-300 shadow-xs flex flex-col bg-card">
                  <CardHeader className="p-2.5 pb-2 border-b bg-blue-50/90 flex flex-row items-center justify-between">
                    <div>
                      <div className="font-black text-xs text-blue-950 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                        <span>{conditionConfig.labelB} の上位10品</span>
                      </div>
                      <p className="text-[10px] text-blue-800/80 mt-0.5 font-medium">
                        売上: ¥{comparisonResult.summaryB.totalSales.toLocaleString()} ・ 粗利率: {comparisonResult.summaryB.grossProfitMargin}%
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-white border-blue-300 text-blue-800 font-bold">
                      {comparisonResult.productsB.length}品中
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-1 flex-1 space-y-0.5">
                    {top10B.map((p, idx) => {
                      const matchRow = comparisonResult.comparedProducts.find(r => r.code === p.code);
                      const rankDiff = matchRow?.rankDiff ?? 0;

                      return (
                        <div
                          key={p.code}
                          onMouseEnter={() => setHoveredProductCode(p.code)}
                          onMouseLeave={() => setHoveredProductCode(null)}
                          className={cn(
                            "flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer transition-all",
                            hoveredProductCode === p.code
                              ? "bg-amber-100 text-amber-950 font-black ring-2 ring-amber-400 shadow-2xs z-10 scale-[1.01]"
                              : "hover:bg-muted/60 text-slate-800"
                          )}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className={cn(
                              "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                              idx === 0 ? "bg-amber-500 text-white" :
                              idx === 1 ? "bg-slate-400 text-white" :
                              idx === 2 ? "bg-amber-700 text-white" :
                              "text-slate-400 font-bold"
                            )}>
                              {idx + 1}
                            </span>
                            <span className="truncate text-xs font-bold">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-1">
                            {rankDiff > 0 && <span className="text-[10px] text-emerald-600 font-black">↑{rankDiff}</span>}
                            {rankDiff < 0 && <span className="text-[10px] text-rose-500 font-bold">↓{Math.abs(rankDiff)}</span>}
                            {rankDiff === 0 && <span className="text-[10px] text-slate-300 font-medium">=</span>}
                            <span className="text-[10px] text-slate-500 tabular-nums">出数:{p.totalSoldQty}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-black tabular-nums bg-blue-100 text-blue-900 border border-blue-200">
                              偏差値 {p.compositeScore}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Detailed Analysis View Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant={detailViewMode === 'categories' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDetailViewMode('categories')}
                className={cn(
                  "h-8 text-xs font-black gap-1.5 shadow-2xs transition-all",
                  detailViewMode === 'categories'
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-50 border-slate-300"
                )}
              >
                <Tag className="h-3.5 w-3.5" />
                🏷️ カテゴリー別 比較マトリクス ({displayedCategoryRows.length}部門)
              </Button>
              <Button
                variant={detailViewMode === 'products' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDetailViewMode('products')}
                className={cn(
                  "h-8 text-xs font-black gap-1.5 shadow-2xs transition-all",
                  detailViewMode === 'products'
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-50 border-slate-300"
                )}
              >
                <Package className="h-3.5 w-3.5" />
                📦 商品別 差分マトリクス ({displayedComparedProducts.length}品)
              </Button>
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              {detailViewMode === 'categories'
                ? '※部門単位での売上シェア・粗利率・廃棄率を比較します'
                : '※商品単位での出数・粗利・廃棄率・順位変動を比較します'}
            </div>
          </div>

          {/* 1. Category Comparison Mode */}
          {detailViewMode === 'categories' ? (
            <Card className="border shadow-xs">
              <CardHeader className="p-3.5 pb-2 border-b bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-black flex items-center gap-2 text-slate-900">
                    <Tag className="h-4 w-4 text-rose-600" />
                    カテゴリー別 差分分析マトリクス ({displayedCategoryRows.length}部門)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {conditionConfig.labelA} と {conditionConfig.labelB} の部門別売上高・売上シェア・粗利率・廃棄率の総合対比
                  </CardDescription>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-44">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="カテゴリー名検索..."
                      value={catSearchQuery}
                      onChange={(e) => setCatSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs bg-white"
                    />
                  </div>

                  <Select value={catSortKey} onValueChange={setCatSortKey}>
                    <SelectTrigger className="h-8 text-xs font-bold w-[140px] bg-white">
                      <SelectValue placeholder="並び替え" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salesB">条件B売上順</SelectItem>
                      <SelectItem value="salesDiff">売上増減額順</SelectItem>
                      <SelectItem value="profitDiff">粗利増減額順</SelectItem>
                      <SelectItem value="marginDiff">粗利率改善順</SelectItem>
                      <SelectItem value="wasteRateDiff">廃棄率変化順</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCatSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="h-8 px-2 text-xs font-bold bg-white"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    {catSortOrder === 'desc' ? '降順' : '昇順'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCategoryCsv}
                    className="h-8 text-xs font-bold gap-1 bg-white hover:bg-rose-50 border-rose-300 text-rose-800 shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5 text-rose-600" /> CSV出力
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-3 space-y-4">
                {/* Category Bar Chart */}
                {displayedCategoryRows.length > 0 && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <BarChart3 className="h-4 w-4 text-purple-600" />
                        カテゴリー別 売上実績比較（{conditionConfig.labelA} vs {conditionConfig.labelB}）
                      </span>
                      <span className="text-[11px] text-muted-foreground">単位: 円</span>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={displayedCategoryRows} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="category" tick={{ fontSize: 11, fontWeight: 'bold' }} interval={0} angle={-15} textAnchor="end" height={40} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `¥${Math.round(val / 1000)}k`} />
                          <RechartsTooltip
                            formatter={(val: any, name: any) => [`¥${Number(val).toLocaleString()}`, name === 'salesA' ? conditionConfig.labelA : conditionConfig.labelB]}
                            labelFormatter={(label) => `部門: ${label}`}
                          />
                          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                          <Bar dataKey="salesA" name={conditionConfig.labelA} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="salesB" name={conditionConfig.labelB} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Category Table */}
                <div className="overflow-x-auto border rounded-xl">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100/70 hover:bg-slate-100/70 text-[11px]">
                        <TableHead className="w-[140px] font-black text-slate-800">カテゴリー名</TableHead>
                        <TableHead className="text-right font-bold text-rose-800">A売上 (構成比)</TableHead>
                        <TableHead className="text-right font-bold text-blue-800">B売上 (構成比)</TableHead>
                        <TableHead className="text-right font-black text-slate-900">売上差</TableHead>
                        <TableHead className="text-right font-bold text-rose-800">A粗利 (粗利率)</TableHead>
                        <TableHead className="text-right font-bold text-blue-800">B粗利 (粗利率)</TableHead>
                        <TableHead className="text-right font-black text-slate-900">粗利差</TableHead>
                        <TableHead className="text-right font-bold text-rose-800">A廃棄率</TableHead>
                        <TableHead className="text-right font-bold text-blue-800">B廃棄率</TableHead>
                        <TableHead className="text-right font-black text-slate-900">廃棄率差</TableHead>
                        <TableHead className="text-center font-black text-slate-700">主力商品 (B)</TableHead>
                        <TableHead className="text-center font-black text-slate-700">部門特性判定</TableHead>
                        <TableHead className="text-center font-black text-slate-700">商品詳細</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedCategoryRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={13} className="text-center py-8 text-muted-foreground text-xs">
                            該当するカテゴリーデータがありません
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayedCategoryRows.map((c) => {
                          const isProfitPositive = c.profitDiff >= 0;
                          const isMarginPositive = c.marginDiff >= 0;
                          const isWasteImproved = c.wasteRateDiff <= 0;

                          return (
                            <TableRow key={c.category} className="text-xs transition-colors hover:bg-muted/50">
                              <TableCell className="font-bold text-slate-900">
                                <span className="flex items-center gap-1.5">
                                  <Tag className="h-3 w-3 text-rose-600 shrink-0" />
                                  <span className="truncate max-w-[120px]" title={c.category}>{c.category}</span>
                                </span>
                                <span className="text-[10px] text-muted-foreground block ml-4">
                                  {c.productCountB}品
                                </span>
                              </TableCell>

                              {/* 売上 */}
                              <TableCell className="text-right tabular-nums text-slate-700">
                                <div>¥{c.salesA.toLocaleString()}</div>
                                <span className="text-[10px] text-muted-foreground">({c.salesShareA}%)</span>
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-slate-700">
                                <div>¥{c.salesB.toLocaleString()}</div>
                                <span className="text-[10px] text-muted-foreground">({c.salesShareB}%)</span>
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-black">
                                <div className={c.salesDiff >= 0 ? "text-blue-700" : "text-rose-600"}>
                                  {c.salesDiff >= 0 ? `+¥${c.salesDiff.toLocaleString()}` : `¥${c.salesDiff.toLocaleString()}`}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  ({c.salesDiffPercent >= 0 ? `+${c.salesDiffPercent}%` : `${c.salesDiffPercent}%`})
                                </span>
                              </TableCell>

                              {/* 粗利 */}
                              <TableCell className="text-right tabular-nums text-slate-700">
                                <div>¥{c.profitA.toLocaleString()}</div>
                                <span className="text-[10px] text-emerald-700 font-bold">{c.marginA}%</span>
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-slate-700">
                                <div>¥{c.profitB.toLocaleString()}</div>
                                <span className="text-[10px] text-emerald-700 font-bold">{c.marginB}%</span>
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-black">
                                <div className={isProfitPositive ? "text-emerald-700" : "text-rose-600"}>
                                  {isProfitPositive ? `+¥${c.profitDiff.toLocaleString()}` : `¥${c.profitDiff.toLocaleString()}`}
                                </div>
                                <span className={cn("text-[10px] font-bold", isMarginPositive ? "text-emerald-700" : "text-rose-600")}>
                                  {isMarginPositive ? `+${c.marginDiff}pt` : `${c.marginDiff}pt`}
                                </span>
                              </TableCell>

                              {/* 廃棄率 */}
                              <TableCell className="text-right tabular-nums text-slate-600">{c.wasteRateA}%</TableCell>
                              <TableCell className="text-right tabular-nums text-slate-600">{c.wasteRateB}%</TableCell>
                              <TableCell className="text-right tabular-nums font-bold">
                                <span className={isWasteImproved ? "text-emerald-700" : "text-rose-600"}>
                                  {c.wasteRateDiff <= 0 ? `${c.wasteRateDiff}pt` : `+${c.wasteRateDiff}pt`}
                                </span>
                              </TableCell>

                              {/* 主力商品 */}
                              <TableCell className="text-center text-[11px] font-bold text-slate-800">
                                <span className="truncate max-w-[130px] inline-block" title={c.topProductB}>
                                  👑 {c.topProductB}
                                </span>
                              </TableCell>

                              {/* 部門特性判定 */}
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] font-black px-1.5 py-0.5",
                                    c.categoryTag === '成長牽引部門' ? "bg-blue-100 text-blue-950 border-blue-300" :
                                    c.categoryTag === '利益改善部門' ? "bg-emerald-100 text-emerald-950 border-emerald-300" :
                                    c.categoryTag === 'ロス悪化注意' ? "bg-rose-100 text-rose-950 border-rose-300" :
                                    c.categoryTag === '縮小傾向' ? "bg-slate-200 text-slate-800 border-slate-300" :
                                    "bg-amber-100 text-amber-950 border-amber-300"
                                  )}
                                >
                                  {c.categoryTag}
                                </Badge>
                              </TableCell>

                              {/* ドリルダウン操作 */}
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCategory(c.category);
                                    setDetailViewMode('products');
                                  }}
                                  className="h-6 px-2 text-[10px] font-black text-rose-700 hover:bg-rose-100 border border-rose-200"
                                >
                                  商品を見る ({c.productCountB})
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* 2. Product Comparison Mode */
            <Card className="border shadow-xs">
              <CardHeader className="p-3.5 pb-2 border-b bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-black flex items-center gap-2 text-slate-900">
                    <Package className="h-4 w-4 text-primary" />
                    全商品 差分分析マトリクス ({displayedComparedProducts.length}品)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {conditionConfig.labelA} と {conditionConfig.labelB} の商品別出数・粗利・廃棄率・順位の直接差分
                  </CardDescription>
                </div>

              {/* Filter and Search Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-44">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="商品名・コード検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs bg-white"
                  />
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-8 text-xs font-bold w-[120px] bg-white">
                    <SelectValue placeholder="部門" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全カテゴリー</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Low-volume Filter Toggle (Pattern 1) */}
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-slate-200">
                  <Switch
                    id="compare-exclude-low-qty"
                    checked={excludeUnder30}
                    onCheckedChange={setExcludeUnder30}
                    className="data-[state=checked]:bg-emerald-600 scale-90"
                  />
                  <label htmlFor="compare-exclude-low-qty" className="text-xs font-bold text-slate-700 cursor-pointer select-none whitespace-nowrap">
                    低出数を除外
                  </label>
                </div>

                {excludeUnder30 && (
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={String(minSalesThreshold)}
                      onValueChange={(val) => setMinSalesThreshold(Number(val))}
                    >
                      <SelectTrigger className="w-[125px] h-8 text-xs font-bold bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10" className="text-xs">10個未満を除外</SelectItem>
                        <SelectItem value="30" className="text-xs font-bold text-emerald-700">30個未満 (標準)</SelectItem>
                        <SelectItem value="50" className="text-xs">50個未満を除外</SelectItem>
                      </SelectContent>
                    </Select>

                    {excludedComparedProducts.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsExcludedModalOpen(true)}
                        className="h-8 text-xs font-bold text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100 px-2.5 gap-1 shrink-0"
                      >
                        <Sliders className="h-3 w-3 text-amber-600" />
                        <span>除外: {excludedComparedProducts.length}品</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100/70 hover:bg-slate-100/70 text-[11px]">
                    <TableHead className="w-[180px] font-black text-slate-800">商品名</TableHead>
                    <TableHead className="w-[80px] font-black text-slate-700">カテゴリー</TableHead>
                    <TableHead className="w-[70px] text-right font-black text-slate-700">単価</TableHead>
                    
                    {/* 出数 */}
                    <TableHead className="text-right font-bold text-rose-800">A出数</TableHead>
                    <TableHead className="text-right font-bold text-blue-800">B出数</TableHead>
                    <TableHead
                      onClick={() => {
                        setSortKey('qtyDiff');
                        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      }}
                      className="text-right font-black text-slate-900 cursor-pointer hover:bg-slate-200"
                    >
                      出数差 {sortKey === 'qtyDiff' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </TableHead>

                    {/* 粗利 */}
                    <TableHead className="text-right font-bold text-rose-800">A粗利</TableHead>
                    <TableHead className="text-right font-bold text-blue-800">B粗利</TableHead>
                    <TableHead
                      onClick={() => {
                        setSortKey('profitDiff');
                        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      }}
                      className="text-right font-black text-slate-900 cursor-pointer hover:bg-slate-200"
                    >
                      粗利差 {sortKey === 'profitDiff' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </TableHead>

                    {/* 粗利率 */}
                    <TableHead className="text-right font-bold text-rose-800">A粗利率</TableHead>
                    <TableHead className="text-right font-bold text-blue-800">B粗利率</TableHead>
                    <TableHead
                      onClick={() => {
                        setSortKey('marginDiff');
                        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      }}
                      className="text-right font-black text-slate-900 cursor-pointer hover:bg-slate-200"
                    >
                      粗利率差 {sortKey === 'marginDiff' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </TableHead>

                    {/* 廃棄率 */}
                    <TableHead className="text-right font-bold text-rose-800">A廃棄率</TableHead>
                    <TableHead className="text-right font-bold text-blue-800">B廃棄率</TableHead>
                    <TableHead
                      onClick={() => {
                        setSortKey('wasteRateDiff');
                        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      }}
                      className="text-right font-black text-slate-900 cursor-pointer hover:bg-slate-200"
                    >
                      廃棄率差 {sortKey === 'wasteRateDiff' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </TableHead>

                    {/* 順位 & 判定 */}
                    <TableHead className="text-center font-black text-slate-700">順位(A→B)</TableHead>
                    <TableHead className="text-center font-black text-slate-700">特性判定</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedComparedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={17} className="text-center py-8 text-muted-foreground text-xs">
                        該当する商品データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedComparedProducts.map((p) => {
                      const isProfitPositive = p.profitDiff >= 0;
                      const isMarginPositive = p.marginDiff >= 0;
                      const isWasteImproved = p.wasteRateDiff <= 0;

                      return (
                        <TableRow
                          key={p.code}
                          className={cn(
                            "text-xs transition-colors hover:bg-muted/50",
                            hoveredProductCode === p.code ? "bg-amber-50" : ""
                          )}
                        >
                          <TableCell className="font-bold text-slate-900">
                            <span className="block truncate max-w-[170px]" title={p.name}>{p.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{p.code}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-[11px] font-medium">{p.category}</TableCell>
                          <TableCell className="text-right tabular-nums text-slate-700">¥{p.price.toLocaleString()}</TableCell>

                          {/* 出数 */}
                          <TableCell className="text-right tabular-nums text-slate-600 font-medium">{p.qtyA}</TableCell>
                          <TableCell className="text-right tabular-nums text-slate-600 font-medium">{p.qtyB}</TableCell>
                          <TableCell className="text-right tabular-nums font-black">
                            <span className={p.qtyDiff >= 0 ? "text-blue-700" : "text-slate-500"}>
                              {p.qtyDiff >= 0 ? `+${p.qtyDiff}` : p.qtyDiff}
                            </span>
                          </TableCell>

                          {/* 粗利 */}
                          <TableCell className="text-right tabular-nums text-slate-600 font-medium">¥{p.profitA.toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums text-slate-600 font-medium">¥{p.profitB.toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums font-black">
                            <span className={isProfitPositive ? "text-emerald-700" : "text-rose-600"}>
                              {isProfitPositive ? `+¥${p.profitDiff.toLocaleString()}` : `¥${p.profitDiff.toLocaleString()}`}
                            </span>
                          </TableCell>

                          {/* 粗利率 */}
                          <TableCell className="text-right tabular-nums text-slate-600">{p.marginA}%</TableCell>
                          <TableCell className="text-right tabular-nums text-slate-600">{p.marginB}%</TableCell>
                          <TableCell className="text-right tabular-nums font-bold">
                            <span className={isMarginPositive ? "text-emerald-700" : "text-rose-600"}>
                              {isMarginPositive ? `+${p.marginDiff}` : p.marginDiff} pt
                            </span>
                          </TableCell>

                          {/* 廃棄率 */}
                          <TableCell className="text-right tabular-nums text-slate-600">{p.wasteRateA}%</TableCell>
                          <TableCell className="text-right tabular-nums text-slate-600">{p.wasteRateB}%</TableCell>
                          <TableCell className="text-right tabular-nums font-bold">
                            <span className={isWasteImproved ? "text-emerald-700" : "text-rose-600"}>
                              {p.wasteRateDiff <= 0 ? `${p.wasteRateDiff}` : `+${p.wasteRateDiff}`} pt
                            </span>
                          </TableCell>

                          {/* 順位 */}
                          <TableCell className="text-center tabular-nums text-[11px] font-bold">
                            <span className="text-slate-500">{p.rankA || '-'}</span>
                            <span className="mx-1 text-slate-300">→</span>
                            <span className="text-slate-900 font-black">{p.rankB || '-'}</span>
                            {p.rankDiff !== 0 && (
                              <span className={cn("ml-1 font-black", p.rankDiff > 0 ? "text-emerald-600" : "text-rose-500")}>
                                {p.rankDiff > 0 ? `(↑${p.rankDiff})` : `(↓${Math.abs(p.rankDiff)})`}
                              </span>
                            )}
                          </TableCell>

                          {/* 判定バッジ */}
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-black px-1.5 py-0.5",
                                p.behaviorTag === '両輪エース' ? "bg-amber-100 text-amber-950 border-amber-300" :
                                p.behaviorTag === '利益改善型' ? "bg-emerald-100 text-emerald-950 border-emerald-300" :
                                p.behaviorTag === 'ロス急増型' ? "bg-rose-100 text-rose-950 border-rose-300" :
                                p.behaviorTag === 'B特化型' ? "bg-blue-100 text-blue-950 border-blue-300" :
                                p.behaviorTag === 'A特化型' ? "bg-purple-100 text-purple-950 border-purple-300" :
                                "bg-slate-100 text-slate-700 border-slate-200"
                              )}
                            >
                              {p.behaviorTag}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </>
    )}

    {/* Excluded Low-Volume Products Modal */}
    <Dialog open={isExcludedModalOpen} onOpenChange={setIsExcludedModalOpen}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base sm:text-lg font-black flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Sliders className="h-5 w-5 text-amber-600" />
                <span>除外された低出数商品一覧 ({excludedComparedProducts.length}品)</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {activeTab === 'period'
                  ? `いずれの期間でも販売数量が ${minSalesThreshold}個 未満のため、比較分析から除外されています。`
                  : `販売数量が ${minSalesThreshold}個 未満のため、比較分析から除外されています。`}
                メニュー改廃や廃番・見直しの検討にご活用ください。
              </DialogDescription>
            </div>
            <Badge variant="outline" className="text-amber-800 bg-amber-50 border-amber-300 font-bold shrink-0">
              基準: {minSalesThreshold}個未満
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3">
          {excludedComparedProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              指定された条件（{minSalesThreshold}個未満）に該当する低出数商品はありません。
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/60 sticky top-0 z-10 backdrop-blur-sm">
                  <TableRow className="text-[11px] font-bold">
                    <TableHead className="w-[90px]">コード</TableHead>
                    <TableHead className="min-w-[170px]">商品名</TableHead>
                    <TableHead className="w-[100px]">カテゴリー</TableHead>
                    <TableHead className="text-right w-[70px]">単価</TableHead>
                    <TableHead className="text-right w-[85px]">{conditionConfig.labelA} 出数</TableHead>
                    <TableHead className="text-right w-[85px]">{conditionConfig.labelB} 出数</TableHead>
                    <TableHead className="text-right w-[85px]">合計出数</TableHead>
                    <TableHead className="text-right w-[95px]">{conditionConfig.labelB} 粗利</TableHead>
                    <TableHead className="text-right w-[80px]">{conditionConfig.labelB} 廃棄率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs divide-y">
                  {excludedComparedProducts.map((p) => (
                    <TableRow key={p.code} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono text-muted-foreground text-[11px]">{p.code}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-slate-100">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                          {p.category || '未分類'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-600">
                        ¥{p.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700">
                        {p.qtyA.toLocaleString()} 個
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700">
                        {p.qtyB.toLocaleString()} 個
                      </TableCell>
                      <TableCell className="text-right font-black text-amber-700 dark:text-amber-400">
                        {(p.qtyA + p.qtyB).toLocaleString()} 個
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ¥{p.profitB.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <span className={cn(p.wasteRateB >= 15 ? "text-rose-600 font-bold" : "text-slate-600")}>
                          {p.wasteRateB.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>※ 全商品を含めて比較したい場合は、画面の「低出数を除外」スイッチをOFFにしてください。</span>
          <Button size="sm" variant="outline" onClick={() => setIsExcludedModalOpen(false)}>
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
  );
}
