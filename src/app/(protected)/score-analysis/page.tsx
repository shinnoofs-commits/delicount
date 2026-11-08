'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTransactions } from '@/contexts/transaction-context';
import { useProducts } from '@/contexts/product-context';
import { useStoreSelection } from '@/contexts/store-selection-context';
import { useStores } from '@/contexts/store-context';
import { 
  Award, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, 
  Sparkles, Filter, Search, Download, HelpCircle, ArrowUpDown, 
  RefreshCw, CheckCircle2, ChevronRight, BarChart3, Info,
  LayoutList, Layers, Loader2, Zap, Copy, Check, CheckSquare, Square,
  BookOpen, Sliders
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useChatbotContext } from '@/contexts/chatbot-context';
import { useToast } from '@/hooks/use-toast';
import { getScoreInsights, type ScoreInsightsOutput } from '@/ai/flows/score-insights-flow';

// Presets for weights
const WEIGHT_PRESETS = [
  {
    id: 'balance',
    name: 'バランス型 (均等)',
    weights: { sales: 0.17, profit: 0.17, profitMargin: 0.17, qty: 0.17, waste: 0.16, discount: 0.16 },
    desc: '売上・粗利額・粗利率・出数・廃棄抑制・定価力を均等に総合評価します。'
  },
  {
    id: 'profit',
    name: '粗利・収益重視',
    weights: { sales: 0.15, profit: 0.20, profitMargin: 0.35, qty: 0.10, waste: 0.10, discount: 0.10 },
    desc: '粗利率（マージン率35%）と粗利額（20%）を最重要視し、手元に残る利益貢献度を評価します。'
  },
  {
    id: 'waste',
    name: 'ロス削減重視',
    weights: { sales: 0.10, profit: 0.10, profitMargin: 0.15, qty: 0.10, waste: 0.30, discount: 0.25 },
    desc: '廃棄ロス抑制と定価販売率（見切りを出さない力）を重視します。'
  },
  {
    id: 'volume',
    name: '出数・集客重視',
    weights: { sales: 0.30, profit: 0.10, profitMargin: 0.10, qty: 0.35, waste: 0.08, discount: 0.07 },
    desc: '多くの顧客に買われている人気商品・集客力を最優先に評価します。'
  }
];

interface ProductStat {
  code: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  totalSoldQty: number;
  regSalesQty: number;
  discSalesQty: number;
  wasteQty: number;
  productionQty: number;
  salesAmount: number;
  grossProfit: number;
  grossProfitMargin: number;
  wasteRate: number;
  discountRate: number;
  regSalesRate: number;
  salesScore?: number;
  profitScore?: number;
  profitMarginScore?: number;
  qtyScore?: number;
  wasteScore?: number;
  discountScore?: number;
  compositeScore?: number;
  balanceScore?: number;
  balanceRank?: number;
  profitModelScore?: number;
  profitRank?: number;
  wasteModelScore?: number;
  wasteRank?: number;
  volumeModelScore?: number;
  volumeRank?: number;
  typeBadge?: {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    description: string;
  };
}

function HighlightedAiText({ text }: { text: string }) {
  if (!text) return null;
  const regex = /(\d+(?:\.\d+)?%|\d+品|\d+位|粗利率35%|粗利額20%|粗利率|粗利額|粗利貢献|粗利重視|廃棄率|廃棄ロス|値引き耐性|値引き率|定価販売力|出数|集客力|純売上|看板商品|大黒柱|改廃候補|隠れた名品|過剰製造|即効アクション)/g;
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) => {
        if (!part) return null;
        if (/^\d+(?:\.\d+)?%$/.test(part) || part === '粗利率35%' || part === '粗利額20%') {
          return (
            <span key={i} className="inline-block mx-0.5 px-1.5 py-0.5 rounded-md font-black text-purple-900 bg-purple-100 border border-purple-200 text-xs sm:text-sm shadow-2xs">
              {part}
            </span>
          );
        }
        if (part === '粗利率' || part === '粗利額' || part === '粗利貢献' || part === '粗利重視') {
          return (
            <span key={i} className="inline-block mx-0.5 px-1.5 py-0.5 rounded-md font-black text-emerald-900 bg-emerald-100 border border-emerald-300 text-xs sm:text-sm shadow-2xs">
              💰 {part}
            </span>
          );
        }
        if (part === '廃棄率' || part === '廃棄ロス' || part === '過剰製造' || part === '改廃候補') {
          return (
            <span key={i} className="inline-block mx-0.5 px-1.5 py-0.5 rounded-md font-black text-rose-900 bg-rose-100 border border-rose-300 text-xs sm:text-sm shadow-2xs">
              ⚠️ {part}
            </span>
          );
        }
        if (part === '出数' || part === '集客力' || part === '純売上') {
          return (
            <span key={i} className="inline-block mx-0.5 px-1.5 py-0.5 rounded-md font-black text-blue-900 bg-blue-100 border border-blue-300 text-xs sm:text-sm shadow-2xs">
              🚀 {part}
            </span>
          );
        }
        if (part === '看板商品' || part === '大黒柱' || part === '隠れた名品') {
          return (
            <span key={i} className="inline-block mx-0.5 px-1.5 py-0.5 rounded-md font-black text-amber-950 bg-amber-100 border border-amber-300 text-xs sm:text-sm shadow-2xs">
              👑 {part}
            </span>
          );
        }
        if (part === '値引き耐性' || part === '定価販売力' || part === '値引き率') {
          return (
            <span key={i} className="inline-block mx-0.5 px-1.5 py-0.5 rounded-md font-black text-indigo-900 bg-indigo-100 border border-indigo-300 text-xs sm:text-sm shadow-2xs">
              🛡️ {part}
            </span>
          );
        }
        if (/^\d+位$/.test(part) || /^\d+品$/.test(part)) {
          return (
            <span key={i} className="inline-block mx-0.5 px-1.5 py-0.5 rounded-md font-black text-slate-900 bg-slate-100 border border-slate-300 text-xs sm:text-sm">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export default function ScoreAnalysisPage() {
  const { transactions, wasteEntries, setFetchDateRange } = useTransactions();
  const { products } = useProducts();
  const { selectedStoreIds } = useStoreSelection();
  const { stores } = useStores();
  const { setChatContext, setPageTitle } = useChatbotContext();

  const [date, setDate] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return { from: subDays(today, 29), to: endOfDay(today) };
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('balance');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortKey, setSortKey] = useState<string>('compositeScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [detailProduct, setDetailProduct] = useState<ProductStat | null>(null);
  const [hoveredProductCode, setHoveredProductCode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'four-columns' | 'table' | 'charts' | 'all'>('four-columns');

  // Low-volume filter (Pattern 1)
  const [excludeUnder30, setExcludeUnder30] = useState<boolean>(true);
  const [minSalesThreshold, setMinSalesThreshold] = useState<number>(30);
  const [isExcludedModalOpen, setIsExcludedModalOpen] = useState<boolean>(false);

  const { toast } = useToast();
  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
  const [isAiDiagnosing, setIsAiDiagnosing] = useState(false);
  const [aiScoreOutput, setAiScoreOutput] = useState<ScoreInsightsOutput | null>(null);
  const [showAiReport, setShowAiReport] = useState(false);
  const [aiSource, setAiSource] = useState<'ai' | 'heuristic'>('heuristic');
  const [copiedReport, setCopiedReport] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState<Record<number, boolean>>({});

  const toggleTask = (index: number) => {
    setCheckedTasks(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Sync date range to transaction context
  useEffect(() => {
    if (date?.from && setFetchDateRange) {
      setFetchDateRange({
        from: startOfDay(date.from),
        to: date.to ? endOfDay(date.to) : endOfDay(date.from)
      });
    }
  }, [date, setFetchDateRange]);

  const currentStore = useMemo(() => {
    if (!selectedStoreIds || selectedStoreIds.length === 0) return null;
    return stores.find(s => selectedStoreIds.includes(s.id));
  }, [stores, selectedStoreIds]);

  const activeWeights = useMemo(() => {
    const p = WEIGHT_PRESETS.find(x => x.id === selectedPresetId);
    return p ? p.weights : WEIGHT_PRESETS[0].weights;
  }, [selectedPresetId]);

  // Aggregate product data
  const rawProductStats = useMemo(() => {
    // 1. Build Master Indexes (by Code, by ID, by Name)
    const masterByCode = new Map<string, Product>();
    const masterById = new Map<string, Product>();
    const masterByName = new Map<string, Product>();

    products.forEach(p => {
      if (p.id) masterById.set(String(p.id).trim(), p);
      if (p.productCode) {
        const c = String(p.productCode).trim();
        if (c) masterByCode.set(c, p);
      }
      if (p.name) {
        const n = String(p.name).trim();
        if (n) masterByName.set(n, p);
      }
    });

    const findMaster = (code?: string, id?: string, name?: string): Product | undefined => {
      const c = code?.trim();
      if (c && masterByCode.has(c)) return masterByCode.get(c);
      const i = id?.trim();
      if (i && masterById.has(i)) return masterById.get(i);
      const n = name?.trim();
      if (n && masterByName.has(n)) return masterByName.get(n);
      return undefined;
    };

    // Helper to resolve canonical metadata and consolidation group key
    const resolveProductInfo = (item: {
      productId?: string;
      productCode?: string;
      name?: string;
      unitPrice?: number;
      costPrice?: number;
      category?: string;
    }) => {
      const rawCode = (item.productCode || '').trim();
      const rawId = (item.productId || '').trim();
      const rawName = (item.name || '').trim();

      const master = findMaster(rawCode, rawId, rawName);

      // Canonical Code: Master code > item.productCode > Master ID > item.productId > rawName
      const canonicalCode = (master?.productCode || rawCode || master?.id || rawId || '').trim();

      // Canonical Name: Prefer Master's registered formal name, else rawName, else code
      const canonicalName = (master?.name || rawName || canonicalCode || '不明な商品').trim();

      // Group Key: If canonicalCode exists, group strictly by code! Otherwise group by normalized name.
      const groupKey = canonicalCode ? `code:${canonicalCode}` : `name:${canonicalName.toLowerCase().replace(/[\s　]+/g, '')}`;

      // Category: Master category > item category > '惣菜'
      const category = (master?.category || item.category || '惣菜').trim();

      // Price & CostPrice
      const price = master?.price ?? item.unitPrice ?? 0;
      const costPrice = master?.costPrice ?? item.costPrice ?? (price > 0 ? price * 0.4 : 0);

      return { groupKey, canonicalCode: canonicalCode || canonicalName, canonicalName, category, price, costPrice };
    };

    const productMap = new Map<string, {
      code: string;
      name: string;
      category: string;
      price: number;
      costPrice: number;
      regSalesQty: number;
      discSalesQty: number;
      wasteQty: number;
      salesAmount: number;
    }>();

    // Filter by selected stores if specified
    const filteredTransactions = selectedStoreIds.length > 0
      ? transactions.filter(t => !t.storeId || selectedStoreIds.includes(t.storeId))
      : transactions;
    const filteredWaste = selectedStoreIds.length > 0
      ? wasteEntries.filter(w => !w.storeId || selectedStoreIds.includes(w.storeId))
      : wasteEntries;

    // 1. Transactions
    filteredTransactions.forEach(tx => {
      (tx.items || []).forEach(item => {
        const { groupKey, canonicalCode, canonicalName, category, price, costPrice } = resolveProductInfo(item);
        if (!canonicalName || canonicalName === 'レジ袋' || canonicalName.includes('レジ袋') || canonicalName === '値引き' || canonicalName === '未分類') return;

        let stat = productMap.get(groupKey);
        if (!stat) {
          stat = {
            code: canonicalCode,
            name: canonicalName,
            category,
            price,
            costPrice,
            regSalesQty: 0,
            discSalesQty: 0,
            wasteQty: 0,
            salesAmount: 0,
          };
          productMap.set(groupKey, stat);
        } else {
          // If existing had placeholder name, update to better canonical name
          if (canonicalName && (!stat.name || stat.name === stat.code)) {
            stat.name = canonicalName;
          }
          if (category && category !== '未分類' && (stat.category === '未分類' || stat.category === '惣菜')) {
            stat.category = category;
          }
          if (stat.price === 0 && price > 0) stat.price = price;
          if (stat.costPrice === 0 && costPrice > 0) stat.costPrice = costPrice;
        }

        const qty = item.quantity || 0;
        const wasDisc = item.wasDiscounted || (item.discountRate && item.discountRate > 0);
        if (wasDisc) {
          stat.discSalesQty += qty;
        } else {
          stat.regSalesQty += qty;
        }

        // Calculate actual sales amount
        const itemPrice = (item.unitPrice && item.unitPrice > 0) ? item.unitPrice : price;
        const linePrice = itemPrice * qty;
        const discountVal = item.discountRate ? (linePrice * item.discountRate) : 0;
        stat.salesAmount += Math.max(0, linePrice - discountVal);
      });
    });

    // 2. Waste Entries
    filteredWaste.forEach(entry => {
      (entry.items || []).forEach(item => {
        const { groupKey, canonicalCode, canonicalName, category, price, costPrice } = resolveProductInfo(item);
        if (!canonicalName || canonicalName.includes('レジ袋') || canonicalName === '値引き') return;

        let stat = productMap.get(groupKey);
        if (!stat) {
          stat = {
            code: canonicalCode,
            name: canonicalName,
            category,
            price,
            costPrice,
            regSalesQty: 0,
            discSalesQty: 0,
            wasteQty: 0,
            salesAmount: 0,
          };
          productMap.set(groupKey, stat);
        } else {
          if (canonicalName && (!stat.name || stat.name === stat.code)) {
            stat.name = canonicalName;
          }
          if (category && category !== '未分類' && (stat.category === '未分類' || stat.category === '惣菜')) {
            stat.category = category;
          }
          if (stat.price === 0 && price > 0) stat.price = price;
          if (stat.costPrice === 0 && costPrice > 0) stat.costPrice = costPrice;
        }

        stat.wasteQty += (item.quantity || 0);
      });
    });

    // Compute derived rates
    const list: ProductStat[] = [];
    productMap.forEach(s => {
      const totalSoldQty = s.regSalesQty + s.discSalesQty;
      const productionQty = totalSoldQty + s.wasteQty;
      if (productionQty === 0) return; // Skip zero activity

      const grossProfit = s.salesAmount - (productionQty * s.costPrice);
      const wasteRate = productionQty > 0 ? (s.wasteQty / productionQty) * 100 : 0;
      const discountRate = totalSoldQty > 0 ? (s.discSalesQty / totalSoldQty) * 100 : 0;
      const regSalesRate = productionQty > 0 ? (s.regSalesQty / productionQty) * 100 : 0;
      const grossProfitMargin = s.salesAmount > 0 ? (grossProfit / s.salesAmount) * 100 : 0;

      list.push({
        ...s,
        totalSoldQty,
        productionQty,
        grossProfit: Math.round(grossProfit),
        grossProfitMargin: Number(grossProfitMargin.toFixed(1)),
        wasteRate: Number(wasteRate.toFixed(1)),
        discountRate: Number(discountRate.toFixed(1)),
        regSalesRate: Number(regSalesRate.toFixed(1)),
      });
    });

    return list;
  }, [transactions, wasteEntries, products, selectedStoreIds]);

  // Categories list
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    rawProductStats.forEach(p => {
      if (p.category && p.category !== '未分類') set.add(p.category);
    });
    return Array.from(set).sort();
  }, [rawProductStats]);

  // Low-volume products excluded from standard deviation population (Pattern 1)
  const excludedLowVolumeProducts = useMemo(() => {
    return rawProductStats.filter(p => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      return p.totalSoldQty < minSalesThreshold;
    }).sort((a, b) => a.totalSoldQty - b.totalSoldQty);
  }, [rawProductStats, selectedCategory, minSalesThreshold]);

  // Calculate standard deviation scores (偏差値)
  const scoredProducts = useMemo<ProductStat[]>(() => {
    // 1. Group definition (Category-based or All, and low-volume exclusion)
    const population = rawProductStats.filter(p => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (excludeUnder30 && p.totalSoldQty < minSalesThreshold) return false;
      return true;
    });

    const n = population.length;
    if (n === 0) return [];
    if (n === 1) {
      return population.map((p): ProductStat => ({
        ...p,
        salesScore: 50,
        profitScore: 50,
        profitMarginScore: 50,
        qtyScore: 50,
        wasteScore: 50,
        discountScore: 50,
        compositeScore: 50,
        balanceScore: 50,
        balanceRank: 1,
        profitModelScore: 50,
        profitRank: 1,
        wasteModelScore: 50,
        wasteRank: 1,
        volumeModelScore: 50,
        volumeRank: 1,
        typeBadge: { label: '標準型', variant: 'outline', description: '比較対象が単一のため基準値（50）です。' }
      }));
    }

    // Means
    const meanSales = population.reduce((acc, p) => acc + p.salesAmount, 0) / n;
    const meanProfit = population.reduce((acc, p) => acc + p.grossProfit, 0) / n;
    const meanProfitMargin = population.reduce((acc, p) => acc + p.grossProfitMargin, 0) / n;
    const meanQty = population.reduce((acc, p) => acc + p.totalSoldQty, 0) / n;
    const meanWasteRate = population.reduce((acc, p) => acc + p.wasteRate, 0) / n;
    const meanDiscountRate = population.reduce((acc, p) => acc + p.discountRate, 0) / n;

    // Standard deviations
    const calcStd = (values: number[], mean: number) => {
      if (values.length <= 1) return 1;
      const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
      return Math.sqrt(variance) || 1;
    };

    const stdSales = calcStd(population.map(p => p.salesAmount), meanSales);
    const stdProfit = calcStd(population.map(p => p.grossProfit), meanProfit);
    const stdProfitMargin = calcStd(population.map(p => p.grossProfitMargin), meanProfitMargin);
    const stdQty = calcStd(population.map(p => p.totalSoldQty), meanQty);
    const stdWasteRate = calcStd(population.map(p => p.wasteRate), meanWasteRate);
    const stdDiscountRate = calcStd(population.map(p => p.discountRate), meanDiscountRate);

    // Score function
    const toScore = (val: number, mean: number, std: number, inverted = false) => {
      const z = (val - mean) / (std || 1);
      const score = inverted ? 50 - 10 * z : 50 + 10 * z;
      return Math.max(20, Math.min(80, Math.round(score * 10) / 10));
    };

    const rawScored = population.map(item => {
      const salesScore = toScore(item.salesAmount, meanSales, stdSales);
      const profitScore = toScore(item.grossProfit, meanProfit, stdProfit);
      const profitMarginScore = toScore(item.grossProfitMargin, meanProfitMargin, stdProfitMargin);
      const qtyScore = toScore(item.totalSoldQty, meanQty, stdQty);
      const wasteScore = toScore(item.wasteRate, meanWasteRate, stdWasteRate, true);
      const discountScore = toScore(item.discountRate, meanDiscountRate, stdDiscountRate, true);

      // Pre-calculate 4 Strategy Models (All 6 criteria included across presets)
      const balanceScore = Number((
        salesScore * 0.166 +
        profitScore * 0.166 +
        profitMarginScore * 0.166 +
        qtyScore * 0.166 +
        wasteScore * 0.166 +
        discountScore * 0.17
      ).toFixed(1));

      // Profit Model: Margin 35% + Profit Amount 20%
      const profitModelScore = Number((
        profitMarginScore * 0.35 +
        profitScore * 0.20 +
        salesScore * 0.15 +
        wasteScore * 0.15 +
        discountScore * 0.10 +
        qtyScore * 0.05
      ).toFixed(1));

      const wasteModelScore = Number((
        wasteScore * 0.35 +
        discountScore * 0.25 +
        profitScore * 0.15 +
        profitMarginScore * 0.10 +
        salesScore * 0.10 +
        qtyScore * 0.05
      ).toFixed(1));

      const volumeModelScore = Number((
        qtyScore * 0.35 +
        salesScore * 0.25 +
        profitScore * 0.15 +
        profitMarginScore * 0.10 +
        discountScore * 0.10 +
        wasteScore * 0.05
      ).toFixed(1));

      // Active Preset Composite Score
      const compositeScore = Number((
        salesScore * (activeWeights.sales || 0) +
        profitScore * (activeWeights.profit || 0) +
        profitMarginScore * ((activeWeights as any).profitMargin || 0) +
        qtyScore * (activeWeights.qty || 0) +
        wasteScore * (activeWeights.waste || 0) +
        discountScore * (activeWeights.discount || 0)
      ).toFixed(1));

      // Persona diagnosis
      let typeBadge: {
        label: string;
        variant: 'default' | 'secondary' | 'destructive' | 'outline';
        description: string;
      } = { 
        label: '標準型', 
        variant: 'outline', 
        description: 'バランスのとれた平均的な推移の商品です。' 
      };

      if (compositeScore >= 60) {
        typeBadge = { 
          label: '👑 看板・大黒柱', 
          variant: 'default', 
          description: '売上・利益ともに店舗を牽引する絶対的エース商品です。欠品を防ぎ供給を維持してください。' 
        };
      } else if (salesScore >= 56 && (wasteScore <= 44 || discountScore <= 44)) {
        typeBadge = { 
          label: '⚠️ 過剰製造・疲弊型', 
          variant: 'destructive', 
          description: '出数は多いものの、値引き・廃棄ロスが多く利益を削っています。製造数や製造時間帯の見直しを推奨します。' 
        };
      } else if (wasteScore >= 56 && discountScore >= 56 && profitScore >= 48) {
        typeBadge = { 
          label: '💎 高効率・隠れた名品', 
          variant: 'secondary', 
          description: '売上規模は平均的ですが、定価で売れ廃棄が極めて少ない優等生です。製造数拡大のポテンシャルがあります。' 
        };
      } else if (compositeScore <= 42) {
        typeBadge = { 
          label: '🔄 要見直し・改廃候補', 
          variant: 'destructive', 
          description: '出数・粗利・ロス抑制の総合評価が低迷しています。価格見直し、または品揃えの改廃候補として検討してください。' 
        };
      }

      return {
        ...item,
        salesScore,
        profitScore,
        profitMarginScore,
        qtyScore,
        wasteScore,
        discountScore,
        compositeScore,
        balanceScore,
        profitModelScore,
        wasteModelScore,
        volumeModelScore,
        typeBadge,
      };
    });

    // Compute ranks for all 4 models
    const byBal = [...rawScored].sort((a, b) => (b.balanceScore || 0) - (a.balanceScore || 0));
    const balRankMap = new Map<string, number>();
    byBal.forEach((p, idx) => balRankMap.set(p.code, idx + 1));

    const byProf = [...rawScored].sort((a, b) => (b.profitModelScore || 0) - (a.profitModelScore || 0));
    const profRankMap = new Map<string, number>();
    byProf.forEach((p, idx) => profRankMap.set(p.code, idx + 1));

    const byWst = [...rawScored].sort((a, b) => (b.wasteModelScore || 0) - (a.wasteModelScore || 0));
    const wstRankMap = new Map<string, number>();
    byWst.forEach((p, idx) => wstRankMap.set(p.code, idx + 1));

    const byVol = [...rawScored].sort((a, b) => (b.volumeModelScore || 0) - (a.volumeModelScore || 0));
    const volRankMap = new Map<string, number>();
    byVol.forEach((p, idx) => volRankMap.set(p.code, idx + 1));

    return rawScored.map(p => ({
      ...p,
      balanceRank: balRankMap.get(p.code) || 0,
      profitRank: profRankMap.get(p.code) || 0,
      wasteRank: wstRankMap.get(p.code) || 0,
      volumeRank: volRankMap.get(p.code) || 0,
    }));
  }, [rawProductStats, selectedCategory, activeWeights, excludeUnder30, minSalesThreshold]);

  // Rankings for each of the 4 models (filtered by search)
  const fourModelRankings = useMemo(() => {
    if (scoredProducts.length === 0) return null;
    let list = scoredProducts;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }

    return {
      balance: [...list].sort((a, b) => (b.balanceScore || 0) - (a.balanceScore || 0)),
      profit: [...list].sort((a, b) => (b.profitModelScore || 0) - (a.profitModelScore || 0)),
      waste: [...list].sort((a, b) => (b.wasteModelScore || 0) - (a.wasteModelScore || 0)),
      volume: [...list].sort((a, b) => (b.volumeModelScore || 0) - (a.volumeModelScore || 0)),
    };
  }, [scoredProducts, searchQuery]);

  // Sorting & Filtering
  const displayedProducts = useMemo(() => {
    let list = scoredProducts;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      let valA: any = (a as any)[sortKey] ?? 0;
      let valB: any = (b as any)[sortKey] ?? 0;
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [scoredProducts, searchQuery, sortKey, sortOrder]);

  // Top Highlights
  const highlights = useMemo(() => {
    if (scoredProducts.length === 0) return null;
    const sortedByComposite = [...scoredProducts].sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));
    const topStar = sortedByComposite[0];
    const worstProduct = sortedByComposite[sortedByComposite.length - 1];

    // High efficiency: wasteScore + discountScore highest with positive profit
    const sortedByEfficiency = [...scoredProducts].sort((a, b) => {
      const effA = ((a.wasteScore || 0) + (a.discountScore || 0));
      const effB = ((b.wasteScore || 0) + (b.discountScore || 0));
      return effB - effA;
    });
    const topEfficiency = sortedByEfficiency[0];

    // High risk: high sales but low wasteScore
    const riskProducts = scoredProducts.filter(p => (p.salesScore || 0) >= 50 && (p.wasteScore || 0) <= 45);
    const highRisk = riskProducts.sort((a, b) => (a.wasteScore || 0) - (b.wasteScore || 0))[0] || null;

    return { topStar, topEfficiency, highRisk, worstProduct };
  }, [scoredProducts]);

  // Scatter plot data for 4-quadrant analysis
  const scatterData = useMemo(() => {
    return scoredProducts.map(p => {
      // X axis: 健全性 (定価力 + ロス抑制の平均偏差値)
      const healthScore = Number((((p.wasteScore || 50) + (p.discountScore || 50)) / 2).toFixed(1));
      // Y axis: 収益力 (売上 + 粗利の平均偏差値)
      const powerScore = Number((((p.salesScore || 50) + (p.profitScore || 50)) / 2).toFixed(1));

      return {
        name: p.name,
        category: p.category,
        x: healthScore,
        y: powerScore,
        composite: p.compositeScore,
        raw: p,
      };
    });
  }, [scoredProducts]);

  // Update AI Chat Context
  useEffect(() => {
    setPageTitle('AI偏差値分析');
    if (scoredProducts.length > 0) {
      const top5 = [...scoredProducts].sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0)).slice(0, 10);
      const worst5 = [...scoredProducts].sort((a, b) => (a.compositeScore || 0) - (b.compositeScore || 0)).slice(0, 5);

      setChatContext(JSON.stringify({
        page: 'AI偏差値分析',
        selectedCategory: selectedCategory === 'all' ? '全カテゴリー' : selectedCategory,
        selectedWeightPreset: WEIGHT_PRESETS.find(x => x.id === selectedPresetId)?.name,
        analyzedCount: scoredProducts.length,
        topRanked: top5.map(p => ({
          name: p.name,
          category: p.category,
          compositeScore: p.compositeScore,
          salesScore: p.salesScore,
          profitScore: p.profitScore,
          profitMarginScore: p.profitMarginScore,
          wasteScore: p.wasteScore,
          discountScore: p.discountScore,
          type: p.typeBadge?.label
        })),
        bottomRanked: worst5.map(p => ({
          name: p.name,
          category: p.category,
          compositeScore: p.compositeScore,
          salesScore: p.salesScore,
          profitScore: p.profitScore,
          profitMarginScore: p.profitMarginScore,
          wasteScore: p.wasteScore,
          discountScore: p.discountScore,
          type: p.typeBadge?.label
        }))
      }));
    }
  }, [scoredProducts, selectedCategory, selectedPresetId, setChatContext, setPageTitle]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  // Helper for score badge styling
  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-slate-100 text-slate-800';
    if (score >= 65) return 'bg-emerald-600 text-white font-black';
    if (score >= 58) return 'bg-emerald-100 text-emerald-800 font-bold border-emerald-300';
    if (score >= 45) return 'bg-slate-100 text-slate-700 font-medium';
    if (score >= 38) return 'bg-amber-100 text-amber-800 font-bold border-amber-300';
    return 'bg-rose-600 text-white font-black';
  };

  // CSV Export
  const exportCsv = () => {
    if (displayedProducts.length === 0) return;
    const headers = [
      '商品コード', '商品名', '部門', 
      'バランス型偏差値', 'バランス型順位',
      '粗利重視偏差値', '粗利重視順位',
      'ロス削減偏差値', 'ロス削減順位',
      '出数重視偏差値', '出数重視順位',
      '総合偏差値(選択中)', '診断タイプ', 
      '売上偏差値', '粗利額偏差値', '粗利率偏差値', '出数偏差値', '廃棄抑制偏差値', '定価力偏差値',
      '純売上金額', '粗利額', '粗利率(%)', '総出数', '廃棄数', '廃棄率(%)', '値引き率(%)'
    ];
    const rows = displayedProducts.map(p => [
      `"${p.code}"`, `"${p.name}"`, `"${p.category}"`, 
      p.balanceScore, p.balanceRank,
      p.profitModelScore, p.profitRank,
      p.wasteModelScore, p.wasteRank,
      p.volumeModelScore, p.volumeRank,
      p.compositeScore, `"${p.typeBadge?.label}"`,
      p.salesScore, p.profitScore, p.profitMarginScore, p.qtyScore, p.wasteScore, p.discountScore,
      p.salesAmount, p.grossProfit, p.grossProfitMargin, p.totalSoldQty, p.wasteQty, p.wasteRate, p.discountRate
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AI偏差値分析_${selectedCategory}_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = () => {
    if (!aiScoreOutput) return;
    const text = [
      `【AI偏差値分析 戦略診断レポート】`,
      `対象店舗: ${currentStore?.name || '全店舗'} | 部門: ${selectedCategory === 'all' ? '全カテゴリー' : selectedCategory}`,
      ``,
      `■ 全体総括`,
      aiScoreOutput.executiveSummary,
      ``,
      `■ 4モデル比較からの戦略示唆`,
      aiScoreOutput.modelComparisonInsights,
      ``,
      `■ 重点優先施策`,
      ...aiScoreOutput.strategicPriorities.map(p => 
        `・${p.title} (対象: ${p.targetProducts.join(', ')})\n  分析: ${p.analysis}\n  アクション: ${p.recommendedAction}\n  期待効果: ${p.expectedImpact}`
      ),
      ``,
      `■ 今週の即効チェックリスト`,
      ...aiScoreOutput.actionChecklist.map((c, i) => `[ ] ${c}`)
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    toast({ title: 'コピー完了', description: 'AI戦略診断レポートをクリップボードにコピーしました。' });
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const runAiScoreDiagnosis = async () => {
    if (scoredProducts.length === 0) {
      toast({ variant: 'destructive', title: '分析対象なし', description: '評価対象の商品データが存在しません。' });
      return;
    }

    setIsAiDiagnosing(true);
    try {
      const formattedProducts = scoredProducts.slice(0, 35).map(p => ({
        code: p.code,
        name: p.name,
        category: p.category,
        balanceScore: p.balanceScore || 50,
        balanceRank: p.balanceRank || 1,
        profitModelScore: p.profitModelScore || 50,
        profitRank: p.profitRank || 1,
        wasteModelScore: p.wasteModelScore || 50,
        wasteRank: p.wasteRank || 1,
        volumeModelScore: p.volumeModelScore || 50,
        volumeRank: p.volumeRank || 1,
        salesScore: p.salesScore || 50,
        profitScore: p.profitScore || 50,
        profitMarginScore: p.profitMarginScore || 50,
        qtyScore: p.qtyScore || 50,
        wasteScore: p.wasteScore || 50,
        discountScore: p.discountScore || 50,
        salesAmount: p.salesAmount,
        grossProfit: p.grossProfit,
        grossProfitMargin: p.grossProfitMargin,
        totalSoldQty: p.totalSoldQty,
        wasteQty: p.wasteQty,
        wasteRate: p.wasteRate,
        discountRate: p.discountRate,
      }));

      const periodLabel = date?.from
        ? (date.to ? `${format(date.from, 'yyyy/MM/dd')}〜${format(date.to, 'yyyy/MM/dd')}` : format(date.from, 'yyyy/MM/dd'))
        : '直近30日間';

      const result = await getScoreInsights({
        storeName: currentStore?.name || '全店舗',
        category: selectedCategory === 'all' ? '全カテゴリー' : selectedCategory,
        period: periodLabel,
        products: formattedProducts,
      });

      if (result.success) {
        setAiScoreOutput(result.data);
        setAiSource(result.source);
        setShowAiReport(true);
        toast({
          title: 'AI診断完了',
          description: result.source === 'ai' 
            ? 'Gemini 2.5 Flash による偏差値戦略診断レポートを生成しました。'
            : '中食・惣菜特化の偏差値アナリティクス診断レポートを生成しました。',
        });
      } else {
        toast({ variant: 'destructive', title: '診断エラー', description: result.error });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'エラー', description: err?.message || 'AI診断の実行中にエラーが発生しました。' });
    } finally {
      setIsAiDiagnosing(false);
    }
  };

  return (
    <div className="space-y-3 pb-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-background border-2 border-amber-500/20 rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="bg-amber-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
            <Award className="h-3 w-3" /> 新機能
          </span>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
            AI偏差値分析 (中食・惣菜特化)
          </h1>
          <span className="text-xs text-muted-foreground font-bold hidden md:inline-block">
            — 全6指標（売上・粗利・粗利率・出数・廃棄抑制・定価力）
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <DatePickerWithRange date={date} setDate={setDate} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCriteriaModalOpen(true)}
            className="h-8 font-bold gap-1.5 shadow-xs text-xs border-amber-500/40 text-amber-950 hover:bg-amber-50 bg-background/80"
          >
            <HelpCircle className="h-3.5 w-3.5 text-amber-600" /> 評価基準・ロジック
          </Button>
          <Button
            size="sm"
            onClick={runAiScoreDiagnosis}
            disabled={isAiDiagnosing || scoredProducts.length === 0}
            className="h-8 font-bold gap-1.5 shadow-xs text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
          >
            {isAiDiagnosing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {isAiDiagnosing ? 'AI診断中...' : 'AI偏差値診断'}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} className="h-8 font-bold gap-1 shadow-xs text-xs">
            <Download className="h-3.5 w-3.5" /> CSV出力
          </Button>
        </div>
      </div>

      {/* Control Bar: Categories, Search & View Mode */}
      <Card className="border shadow-xs bg-card/80 backdrop-blur-sm">
        <CardContent className="p-2.5 flex flex-col lg:flex-row items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 shrink-0">比較母集団:</span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[160px] h-8 text-xs font-bold bg-background">
                  <SelectValue placeholder="カテゴリー選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-bold">全カテゴリー (全社比較)</SelectItem>
                  {availableCategories.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-xs font-bold">{cat} (部門内比較)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-52 relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="商品名やコードで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 font-medium text-xs bg-background"
              />
            </div>

            {/* Low-volume Filter Toggle (Pattern 1) */}
            <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-2.5 sm:border-l border-border/60">
              <div className="flex items-center gap-1.5 bg-background/60 px-2 py-1 rounded-md border border-border/40">
                <Switch
                  id="exclude-low-qty"
                  checked={excludeUnder30}
                  onCheckedChange={setExcludeUnder30}
                  className="data-[state=checked]:bg-emerald-600 scale-90"
                />
                <label htmlFor="exclude-low-qty" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none whitespace-nowrap">
                  低出数を除外
                </label>
              </div>

              {excludeUnder30 && (
                <div className="flex items-center gap-1.5">
                  <Select
                    value={String(minSalesThreshold)}
                    onValueChange={(val) => setMinSalesThreshold(Number(val))}
                  >
                    <SelectTrigger className="w-[125px] h-8 text-xs font-bold bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10" className="text-xs">10個未満を除外</SelectItem>
                      <SelectItem value="30" className="text-xs font-bold text-emerald-700 dark:text-emerald-400">30個未満 (標準)</SelectItem>
                      <SelectItem value="50" className="text-xs">50個未満を除外</SelectItem>
                    </SelectContent>
                  </Select>

                  {excludedLowVolumeProducts.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsExcludedModalOpen(true)}
                      className="h-8 text-xs font-bold text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 px-2.5 gap-1 shrink-0"
                    >
                      <Sliders className="h-3 w-3 text-amber-600" />
                      <span>除外: {excludedLowVolumeProducts.length}品</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as any)} className="w-full lg:w-auto">
            <TabsList className="bg-muted/80 h-8 p-0.5 w-full lg:w-auto justify-center">
              <TabsTrigger value="four-columns" className="text-xs font-black gap-1.5 px-3 h-7 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                <LayoutList className="h-3.5 w-3.5 text-primary" /> 4モデル並列比較 (全{displayedProducts.length}品)
              </TabsTrigger>
              <TabsTrigger value="table" className="text-xs font-bold gap-1.5 px-3 h-7">
                <ArrowUpDown className="h-3.5 w-3.5 text-blue-600" /> 4モデル統合一覧表
              </TabsTrigger>
              <TabsTrigger value="charts" className="text-xs font-bold gap-1.5 px-3 h-7">
                <BarChart3 className="h-3.5 w-3.5 text-amber-600" /> 4象限・グラフ分析
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs font-bold gap-1.5 px-3 h-7">
                <Layers className="h-3.5 w-3.5 text-slate-600" /> フル表示
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* AI Strategic Diagnosis Report Panel */}
      {showAiReport && aiScoreOutput && (
        <Card className="border-2 border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-background shadow-lg">
          <CardHeader className="p-3.5 sm:p-4 pb-3 border-b border-purple-200/70 bg-purple-50/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <span className="p-2 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xs shrink-0 mt-0.5">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2 text-purple-950 flex-wrap">
                  AI偏差値・戦略診断レポート
                  <Badge variant="outline" className="text-xs bg-white border-purple-300 text-purple-800 font-bold px-2 py-0.5 shadow-2xs">
                    {aiSource === 'ai' ? 'Gemini 2.5 Flash' : '偏差値アナリティクス'}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-purple-900/80 mt-0.5 font-medium">
                  {currentStore?.name || '全店舗'} ・ {selectedCategory === 'all' ? '全カテゴリー' : selectedCategory}（全{scoredProducts.length}品）の6指標偏差値および4モデルを精査した提言
                </CardDescription>
                {/* Visual quick summary badges */}
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <Badge className="bg-purple-100 text-purple-950 border border-purple-200 text-xs font-bold gap-1 px-2.5 py-1">
                    <Award className="h-3.5 w-3.5 text-purple-600" />
                    診断対象: {scoredProducts.length}品
                  </Badge>
                  <Badge className="bg-emerald-100 text-emerald-950 border border-emerald-200 text-xs font-bold gap-1 px-2.5 py-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    重点施策: {aiScoreOutput.strategicPriorities.length}件
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-950 border border-blue-200 text-xs font-bold gap-1 px-2.5 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    即効アクション: {aiScoreOutput.actionChecklist.length}項目
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyReport}
                className="h-8 text-xs sm:text-sm font-bold gap-1.5 bg-white hover:bg-purple-50 border-purple-300 text-purple-900 shadow-2xs"
              >
                {copiedReport ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copiedReport ? 'コピー完了' : 'レポートをコピー'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAiReport(false)}
                className="h-8 text-xs sm:text-sm text-muted-foreground hover:text-slate-900 font-bold"
              >
                閉じる
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-3.5 sm:p-4 space-y-3.5">
            {/* Executive Summary */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border-2 border-purple-200/80 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-sm sm:text-base font-black text-purple-950 border-b border-purple-100 pb-1.5">
                <Zap className="h-4 w-4 text-purple-600 shrink-0" />
                <span>全体総括・店舗の現在地</span>
              </div>
              <p className="text-sm sm:text-[15px] text-slate-800 leading-relaxed font-medium">
                <HighlightedAiText text={aiScoreOutput.executiveSummary} />
              </p>
            </div>

            {/* Model Comparison Insight */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-amber-500/10 to-blue-500/15 border-2 border-emerald-300/60 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-sm sm:text-base font-black text-emerald-950 border-b border-emerald-200/60 pb-1.5">
                <span className="text-base">🔄</span>
                <span>4モデル比較からの戦略示唆（粗利率35%モデル vs 出数重視モデル）</span>
              </div>
              <p className="text-sm sm:text-[15px] text-slate-800 leading-relaxed font-medium">
                <HighlightedAiText text={aiScoreOutput.modelComparisonInsights} />
              </p>
            </div>

            {/* Strategic Priorities Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5">
              {aiScoreOutput.strategicPriorities.map((item, idx) => {
                const isProfit = item.title.includes('粗利') || item.title.includes('利益');
                const isWaste = item.title.includes('ロス') || item.title.includes('廃棄') || item.title.includes('改廃');
                const isVolume = item.title.includes('出数') || item.title.includes('集客') || item.title.includes('看板');

                const borderTheme = isProfit ? "border-emerald-300 bg-gradient-to-b from-emerald-50/40 via-white to-white" :
                                    isWaste ? "border-rose-300 bg-gradient-to-b from-rose-50/40 via-white to-white" :
                                    isVolume ? "border-blue-300 bg-gradient-to-b from-blue-50/40 via-white to-white" :
                                    "border-purple-300 bg-gradient-to-b from-purple-50/40 via-white to-white";

                return (
                  <div key={idx} className={cn("p-3.5 sm:p-4 rounded-2xl border-2 shadow-xs flex flex-col justify-between space-y-3", borderTheme)}>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                          {item.title}
                        </h4>
                        <div className="flex flex-wrap gap-1 shrink-0">
                          {item.targetProducts.map((pName, pIdx) => (
                            <Badge key={pIdx} className="text-xs px-2 py-0.5 font-bold bg-purple-100 text-purple-950 border border-purple-200">
                              🎯 {pName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                        <HighlightedAiText text={item.analysis} />
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      {/* Action Banner */}
                      <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/10 border-l-4 border-amber-500 shadow-2xs space-y-1">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-950">
                          <Zap className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>推奨アクション</span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                          <HighlightedAiText text={item.recommendedAction} />
                        </p>
                      </div>

                      {/* Impact Callout */}
                      <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 border-l-4 border-emerald-500 shadow-2xs space-y-1">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-emerald-950">
                          <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>期待効果</span>
                        </div>
                        <p className="text-xs sm:text-sm font-black text-emerald-800 leading-relaxed">
                          <HighlightedAiText text={item.expectedImpact} />
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Checklist */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/70 border-2 border-purple-200/80 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base font-black text-purple-950 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0" />
                  今週の即効アクションチェックリスト（店長用）
                </span>
                <Badge variant="outline" className="text-xs font-black bg-white border-purple-300 text-purple-800 px-2.5 py-0.5 shadow-2xs">
                  {Object.values(checkedTasks).filter(Boolean).length} / {aiScoreOutput.actionChecklist.length} 完了
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {aiScoreOutput.actionChecklist.map((task, idx) => {
                  const isChecked = !!checkedTasks[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleTask(idx)}
                      className={cn(
                        "flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border-2 text-xs sm:text-sm cursor-pointer transition-all shadow-2xs",
                        isChecked
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 line-through opacity-75"
                          : "bg-white border-purple-200/70 text-slate-900 hover:border-purple-400 hover:shadow-xs"
                      )}
                    >
                      {isChecked ? (
                        <CheckSquare className="h-5 w-5 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="h-5 w-5 text-purple-400 shrink-0" />
                      )}
                      <span className="font-bold text-xs sm:text-sm leading-snug">
                        <HighlightedAiText text={task} />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4-Model Side-by-Side Comparison View (shown in 'four-columns' or 'all') */}
      {(viewMode === 'four-columns' || viewMode === 'all') && fourModelRankings && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 font-bold">
            <span className="flex items-center gap-1.5">
              💡 商品にカーソルを合わせると全モデルで連動ハイライト表示されます（クリックで詳細カルテ）。
            </span>
            <span className="hidden sm:inline-block text-[11px]">
              ↑↓はバランス型（均等）からの順位変動
            </span>
          </div>

          {/* Horizontal scrollable wrapper for iPad portrait, landscape, and desktop */}
          <div className="w-full overflow-x-auto pb-3 -mx-1 px-1 sm:mx-0 sm:px-0">
            <div className="grid grid-cols-4 min-w-[760px] md:min-w-[820px] lg:min-w-0 gap-2 sm:gap-2.5">
              {/* 1. バランス型 */}
              <Card className="border-2 border-slate-300/80 shadow-xs flex flex-col bg-card">
                <CardHeader className="p-2 sm:p-2.5 pb-1.5 sm:pb-2 border-b bg-slate-50/90">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 sm:gap-1.5 font-black text-[11px] sm:text-xs text-slate-800 min-w-0">
                      <span className="text-sm shrink-0">⚖️</span>
                      <span className="truncate">バランス型 (均等)</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 py-0 h-4 font-bold bg-white text-slate-600 shrink-0">
                      基準モデル
                    </Badge>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    売上・粗利・出数・ロス全6指標を均等評価
                  </p>
                </CardHeader>
                <CardContent className="p-1 flex-1 overflow-y-auto max-h-[calc(100vh-210px)] space-y-0.5">
                  {fourModelRankings.balance.map((p, idx) => (
                    <div
                      key={p.code}
                      onMouseEnter={() => setHoveredProductCode(p.code)}
                      onMouseLeave={() => setHoveredProductCode(null)}
                      onClick={() => setDetailProduct(p)}
                      className={cn(
                        "flex items-center justify-between px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[11px] sm:text-xs cursor-pointer transition-all duration-100",
                        hoveredProductCode === p.code
                          ? "bg-amber-100 text-amber-950 font-black ring-2 ring-amber-400 shadow-2xs z-10 scale-[1.01]"
                          : "hover:bg-muted/60 text-slate-800"
                      )}
                    >
                      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
                        <span className={cn(
                          "w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black shrink-0",
                          idx === 0 ? "bg-amber-500 text-white" :
                          idx === 1 ? "bg-slate-400 text-white" :
                          idx === 2 ? "bg-amber-700 text-white" :
                          "text-slate-400 font-bold"
                        )}>
                          {idx + 1}
                        </span>
                        <span className="truncate text-[11px] sm:text-xs font-bold">{p.name}</span>
                      </div>
                      <span className={cn("px-1 sm:px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-black tabular-nums shrink-0 ml-1 shadow-2xs", getScoreColor(p.balanceScore))}>
                        {p.balanceScore}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 2. 粗利・収益重視 */}
              <Card className="border-2 border-emerald-400/60 shadow-xs flex flex-col bg-card">
                <CardHeader className="p-2 sm:p-2.5 pb-1.5 sm:pb-2 border-b bg-emerald-50/80">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 sm:gap-1.5 font-black text-[11px] sm:text-xs text-emerald-900 min-w-0">
                      <span className="text-sm shrink-0">💰</span>
                      <span className="truncate">粗利・収益重視型</span>
                    </div>
                    <Badge className="text-[9px] sm:text-[10px] px-1 py-0 h-4 font-black bg-emerald-600 text-white shrink-0">
                      粗利35%・額20%
                    </Badge>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-emerald-800/80 line-clamp-1 mt-0.5">
                    粗利率(35%)＋粗利額(20%)で真の利益貢献度最優先
                  </p>
                </CardHeader>
                <CardContent className="p-1 flex-1 overflow-y-auto max-h-[calc(100vh-210px)] space-y-0.5">
                  {fourModelRankings.profit.map((p, idx) => {
                    const rankDiff = (p.balanceRank || 0) - (idx + 1);
                    return (
                      <div
                        key={p.code}
                        onMouseEnter={() => setHoveredProductCode(p.code)}
                        onMouseLeave={() => setHoveredProductCode(null)}
                        onClick={() => setDetailProduct(p)}
                        className={cn(
                          "flex items-center justify-between px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[11px] sm:text-xs cursor-pointer transition-all duration-100",
                          hoveredProductCode === p.code
                            ? "bg-amber-100 text-amber-950 font-black ring-2 ring-amber-400 shadow-2xs z-10 scale-[1.01]"
                            : "hover:bg-muted/60 text-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
                          <span className={cn(
                            "w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black shrink-0",
                            idx === 0 ? "bg-emerald-600 text-white" :
                            idx === 1 ? "bg-emerald-500 text-white" :
                            idx === 2 ? "bg-emerald-400 text-white" :
                            "text-slate-400 font-bold"
                          )}>
                            {idx + 1}
                          </span>
                          <span className="truncate text-[11px] sm:text-xs font-bold">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-1">
                          {rankDiff > 0 && <span className="text-[9px] sm:text-[10px] text-emerald-600 font-black">↑{rankDiff}</span>}
                          {rankDiff < 0 && <span className="text-[9px] sm:text-[10px] text-rose-500 font-bold">↓{Math.abs(rankDiff)}</span>}
                          {rankDiff === 0 && <span className="text-[9px] sm:text-[10px] text-slate-300 font-medium">=</span>}
                          <span className={cn("px-1 sm:px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-black tabular-nums shadow-2xs", getScoreColor(p.profitModelScore))}>
                            {p.profitModelScore}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* 3. ロス削減重視 */}
              <Card className="border-2 border-blue-400/60 shadow-xs flex flex-col bg-card">
                <CardHeader className="p-2 sm:p-2.5 pb-1.5 sm:pb-2 border-b bg-blue-50/80">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 sm:gap-1.5 font-black text-[11px] sm:text-xs text-blue-900 min-w-0">
                      <span className="text-sm shrink-0">🛡️</span>
                      <span className="truncate">ロス削減重視型</span>
                    </div>
                    <Badge className="text-[9px] sm:text-[10px] px-1 py-0 h-4 font-black bg-blue-600 text-white shrink-0">
                      ロス抑制55%
                    </Badge>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-blue-800/80 line-clamp-1 mt-0.5">
                    廃棄抑制(30%)＋定価力(25%)を最優先
                  </p>
                </CardHeader>
                <CardContent className="p-1 flex-1 overflow-y-auto max-h-[calc(100vh-210px)] space-y-0.5">
                  {fourModelRankings.waste.map((p, idx) => {
                    const rankDiff = (p.balanceRank || 0) - (idx + 1);
                    return (
                      <div
                        key={p.code}
                        onMouseEnter={() => setHoveredProductCode(p.code)}
                        onMouseLeave={() => setHoveredProductCode(null)}
                        onClick={() => setDetailProduct(p)}
                        className={cn(
                          "flex items-center justify-between px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[11px] sm:text-xs cursor-pointer transition-all duration-100",
                          hoveredProductCode === p.code
                            ? "bg-amber-100 text-amber-950 font-black ring-2 ring-amber-400 shadow-2xs z-10 scale-[1.01]"
                            : "hover:bg-muted/60 text-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
                          <span className={cn(
                            "w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black shrink-0",
                            idx === 0 ? "bg-blue-600 text-white" :
                            idx === 1 ? "bg-blue-500 text-white" :
                            idx === 2 ? "bg-blue-400 text-white" :
                            "text-slate-400 font-bold"
                          )}>
                            {idx + 1}
                          </span>
                          <span className="truncate text-[11px] sm:text-xs font-bold">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-1">
                          {rankDiff > 0 && <span className="text-[9px] sm:text-[10px] text-emerald-600 font-black">↑{rankDiff}</span>}
                          {rankDiff < 0 && <span className="text-[9px] sm:text-[10px] text-rose-500 font-bold">↓{Math.abs(rankDiff)}</span>}
                          {rankDiff === 0 && <span className="text-[9px] sm:text-[10px] text-slate-300 font-medium">=</span>}
                          <span className={cn("px-1 sm:px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-black tabular-nums shadow-2xs", getScoreColor(p.wasteModelScore))}>
                            {p.wasteModelScore}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* 4. 出数・集客重視 */}
              <Card className="border-2 border-orange-400/60 shadow-xs flex flex-col bg-card">
                <CardHeader className="p-2 sm:p-2.5 pb-1.5 sm:pb-2 border-b bg-orange-50/80">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 sm:gap-1.5 font-black text-[11px] sm:text-xs text-orange-950 min-w-0">
                      <span className="text-sm shrink-0">🚀</span>
                      <span className="truncate">出数・集客重視型</span>
                    </div>
                    <Badge className="text-[9px] sm:text-[10px] px-1 py-0 h-4 font-black bg-orange-600 text-white shrink-0">
                      出数売上65%
                    </Badge>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-orange-900/80 line-clamp-1 mt-0.5">
                    販売出数(35%)＋売上規模(30%)を最優先
                  </p>
                </CardHeader>
                <CardContent className="p-1 flex-1 overflow-y-auto max-h-[calc(100vh-210px)] space-y-0.5">
                  {fourModelRankings.volume.map((p, idx) => {
                    const rankDiff = (p.balanceRank || 0) - (idx + 1);
                    return (
                      <div
                        key={p.code}
                        onMouseEnter={() => setHoveredProductCode(p.code)}
                        onMouseLeave={() => setHoveredProductCode(null)}
                        onClick={() => setDetailProduct(p)}
                        className={cn(
                          "flex items-center justify-between px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[11px] sm:text-xs cursor-pointer transition-all duration-100",
                          hoveredProductCode === p.code
                            ? "bg-amber-100 text-amber-950 font-black ring-2 ring-amber-400 shadow-2xs z-10 scale-[1.01]"
                            : "hover:bg-muted/60 text-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
                          <span className={cn(
                            "w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black shrink-0",
                            idx === 0 ? "bg-orange-600 text-white" :
                            idx === 1 ? "bg-orange-500 text-white" :
                            idx === 2 ? "bg-orange-400 text-white" :
                            "text-slate-400 font-bold"
                          )}>
                            {idx + 1}
                          </span>
                          <span className="truncate text-[11px] sm:text-xs font-bold">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-1">
                          {rankDiff > 0 && <span className="text-[9px] sm:text-[10px] text-emerald-600 font-black">↑{rankDiff}</span>}
                          {rankDiff < 0 && <span className="text-[9px] sm:text-[10px] text-rose-500 font-bold">↓{Math.abs(rankDiff)}</span>}
                          {rankDiff === 0 && <span className="text-[9px] sm:text-[10px] text-slate-300 font-medium">=</span>}
                          <span className={cn("px-1 sm:px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-black tabular-nums shadow-2xs", getScoreColor(p.volumeModelScore))}>
                            {p.volumeModelScore}
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
      )}

      {/* 4 Highlight Cards (shown in 'charts' or 'all') */}
      {(viewMode === 'charts' || viewMode === 'all') && highlights && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Top Star */}
          <Card className="border-2 border-emerald-500/30 bg-emerald-50/40 shadow-xs hover:shadow-md transition-shadow">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-emerald-800">
                <span className="flex items-center gap-1">👑 総合No.1 エース商品</span>
                <Badge className="bg-emerald-600 text-white font-black text-xs">偏差値 {highlights.topStar.compositeScore}</Badge>
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base line-clamp-1">{highlights.topStar.name}</h4>
                <p className="text-xs text-slate-500 font-bold">{highlights.topStar.category} / 定価: ¥{highlights.topStar.price.toLocaleString()}</p>
              </div>
              <div className="text-[11px] font-bold text-emerald-900 bg-emerald-100/60 p-2 rounded-xl">
                粗利額: ¥{highlights.topStar.grossProfit.toLocaleString()} | 廃棄率: {highlights.topStar.wasteRate}%
              </div>
            </CardContent>
          </Card>

          {/* Top Efficiency */}
          <Card className="border-2 border-blue-500/30 bg-blue-50/40 shadow-xs hover:shadow-md transition-shadow">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-blue-800">
                <span className="flex items-center gap-1">💎 定価力・ロス抑制トップ</span>
                <Badge className="bg-blue-600 text-white font-black text-xs">廃棄抑制 {highlights.topEfficiency.wasteScore}</Badge>
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base line-clamp-1">{highlights.topEfficiency.name}</h4>
                <p className="text-xs text-slate-500 font-bold">{highlights.topEfficiency.category} / 廃棄ロス率: {highlights.topEfficiency.wasteRate}%</p>
              </div>
              <div className="text-[11px] font-bold text-blue-900 bg-blue-100/60 p-2 rounded-xl">
                定価力偏差値: {highlights.topEfficiency.discountScore} | 値引き率: {highlights.topEfficiency.discountRate}%
              </div>
            </CardContent>
          </Card>

          {/* High Risk (Overproduction) */}
          <Card className={cn("border-2 shadow-xs hover:shadow-md transition-shadow", highlights.highRisk ? "border-amber-500/30 bg-amber-50/40" : "border-slate-200 bg-slate-50/40")}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-amber-800">
                <span className="flex items-center gap-1">⚠️ 過剰製造・ロス警戒</span>
                {highlights.highRisk && <Badge variant="destructive" className="font-black text-xs">廃棄偏差値 {highlights.highRisk.wasteScore}</Badge>}
              </div>
              {highlights.highRisk ? (
                <>
                  <div>
                    <h4 className="font-black text-slate-900 text-base line-clamp-1">{highlights.highRisk.name}</h4>
                    <p className="text-xs text-slate-500 font-bold">売上偏差値 {highlights.highRisk.salesScore} / 廃棄率: {highlights.highRisk.wasteRate}%</p>
                  </div>
                  <div className="text-[11px] font-bold text-amber-900 bg-amber-100/60 p-2 rounded-xl">
                    出数は好調ですが、廃棄で利益を圧迫中。製造数の適正化を。
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500 font-medium py-4">現在、過剰ロスの警戒商品は見当たりません。</p>
              )}
            </CardContent>
          </Card>

          {/* Worst / Reform Candidate */}
          <Card className="border-2 border-rose-500/30 bg-rose-50/40 shadow-xs hover:shadow-md transition-shadow">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-rose-800">
                <span className="flex items-center gap-1">🔄 要見直し・改廃検討</span>
                <Badge variant="destructive" className="font-black text-xs">総合偏差値 {highlights.worstProduct.compositeScore}</Badge>
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base line-clamp-1">{highlights.worstProduct.name}</h4>
                <p className="text-xs text-slate-500 font-bold">{highlights.worstProduct.category} / 粗利: ¥{highlights.worstProduct.grossProfit.toLocaleString()}</p>
              </div>
              <div className="text-[11px] font-bold text-rose-900 bg-rose-100/60 p-2 rounded-xl">
                出数・粗利ともに下位。レシピ改定または入替候補です。
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4-Quadrant Scatter Matrix Chart (shown in 'charts' or 'all') */}
      {(viewMode === 'charts' || viewMode === 'all') && (
        <Card className="border-2 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  商品ポートフォリオ 4象限マトリックス
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  横軸：ロス抑制・定価力偏差値（右ほど優秀） × 縦軸：売上・粗利規模偏差値（上ほど優秀）
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 看板</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> 高効率</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 過剰製造</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> 要見直し</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[360px] w-full relative">
              {/* Quadrant labels */}
              <div className="absolute top-2 right-4 text-[11px] font-black text-emerald-700 bg-emerald-50/90 px-2 py-1 rounded-md pointer-events-none border border-emerald-200">
                右上：稼ぎ頭・大黒柱 (高売上 & 低ロス)
              </div>
              <div className="absolute top-2 left-16 text-[11px] font-black text-amber-700 bg-amber-50/90 px-2 py-1 rounded-md pointer-events-none border border-amber-200">
                左上：過剰製造型 (高売上だがロス過多)
              </div>
              <div className="absolute bottom-10 right-4 text-[11px] font-black text-blue-700 bg-blue-50/90 px-2 py-1 rounded-md pointer-events-none border border-blue-200">
                右下：高効率・隠れた名品 (小粒だが利益確実)
              </div>
              <div className="absolute bottom-10 left-16 text-[11px] font-black text-rose-700 bg-rose-50/90 px-2 py-1 rounded-md pointer-events-none border border-rose-200">
                左下：要テコ入れ・改廃検討
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="ロス抑制・定価力偏差値" 
                    domain={[30, 70]} 
                    label={{ value: '← ロス多・値引き過多 | ロス抑制・定価力偏差値 →', position: 'bottom', offset: 0, fontSize: 11, fontWeight: 'bold' }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="売上・粗利規模偏差値" 
                    domain={[30, 70]} 
                    label={{ value: '売上・粗利規模偏差値', angle: -90, position: 'insideLeft', fontSize: 11, fontWeight: 'bold' }}
                  />
                  <ZAxis type="number" dataKey="composite" range={[60, 240]} name="総合偏差値" />
                  <RechartsTooltip 
                    cursor={{ strokeDasharray: '3 3' }} 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const p = data.raw;
                        return (
                          <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border-2 text-xs space-y-1 z-50">
                            <p className="font-black text-sm text-slate-900">{data.name}</p>
                            <p className="text-slate-500 font-bold">{data.category}</p>
                            <div className="pt-1 border-t space-y-0.5">
                              <p className="font-bold text-primary">総合偏差値: {data.composite}</p>
                              <p className="text-slate-600">売上・粗利偏差値: {data.y}</p>
                              <p className="text-slate-600">定価力・廃棄抑制偏差値: {data.x}</p>
                              <p className="text-slate-500">純売上: ¥{p.salesAmount.toLocaleString()} / 廃棄率: {p.wasteRate}%</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter 
                    data={scatterData} 
                    onClick={(entry) => setDetailProduct(entry.raw)}
                    className="cursor-pointer"
                  >
                    {scatterData.map((entry, index) => {
                      let fill = '#64748b';
                      if (entry.x >= 50 && entry.y >= 50) fill = '#10b981'; // Top-Right (Star)
                      else if (entry.x < 50 && entry.y >= 50) fill = '#f59e0b'; // Top-Left (Overproduction)
                      else if (entry.x >= 50 && entry.y < 50) fill = '#3b82f6'; // Bottom-Right (Efficient)
                      else fill = '#ef4444'; // Bottom-Left (Reform)
                      return <Cell key={`cell-${index}`} fill={fill} opacity={0.85} />;
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4-Model Unified Ranking Table (shown in 'table' or 'all') */}
      {(viewMode === 'table' || viewMode === 'all') && (
        <Card className="border-2 shadow-xs">
          <CardHeader className="py-2.5 px-3.5 border-b bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm sm:text-base font-black flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-500" />
                  4モデル統合 偏差値比較一覧表 ({displayedProducts.length}品)
                </CardTitle>
                <span className="text-[11px] text-muted-foreground hidden sm:inline-block font-medium">
                  — 各モデルのヘッダーをクリックして並び替え可能
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[calc(100vh-175px)]">
              <Table>
                <TableHeader className="bg-muted/60 sticky top-0 z-10 backdrop-blur-sm shadow-2xs">
                  <TableRow className="h-7.5 border-b">
                    <TableHead className="w-10 text-center font-black text-xs py-1 px-1.5">順位</TableHead>
                    <TableHead className="cursor-pointer font-black text-xs py-1 px-2 hover:text-primary" onClick={() => handleSort('name')}>
                      <span className="flex items-center gap-1">商品名 <ArrowUpDown className="h-2.5 w-2.5" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer font-black text-xs py-1 px-2 hover:text-primary" onClick={() => handleSort('category')}>
                      <span className="flex items-center gap-1">部門 <ArrowUpDown className="h-2.5 w-2.5" /></span>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer font-black text-xs py-1 px-1.5 hover:text-primary" onClick={() => handleSort('balanceScore')}>
                      <span className="flex items-center justify-center gap-1 text-slate-800">⚖️ バランス型 <ArrowUpDown className="h-2.5 w-2.5" /></span>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer font-black text-xs py-1 px-1.5 hover:text-primary" onClick={() => handleSort('profitModelScore')}>
                      <span className="flex items-center justify-center gap-1 text-emerald-700">💰 粗利重視 <ArrowUpDown className="h-2.5 w-2.5" /></span>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer font-black text-xs py-1 px-1.5 hover:text-primary" onClick={() => handleSort('wasteModelScore')}>
                      <span className="flex items-center justify-center gap-1 text-blue-700">🛡️ ロス削減 <ArrowUpDown className="h-2.5 w-2.5" /></span>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer font-black text-xs py-1 px-1.5 hover:text-primary" onClick={() => handleSort('volumeModelScore')}>
                      <span className="flex items-center justify-center gap-1 text-orange-700">🚀 出数重視 <ArrowUpDown className="h-2.5 w-2.5" /></span>
                    </TableHead>
                    <TableHead className="text-center font-black text-xs py-1 px-1.5">診断タイプ</TableHead>
                    <TableHead className="text-right cursor-pointer font-black text-xs py-1 px-2 hover:text-primary" onClick={() => handleSort('wasteScore')}>
                      <span className="flex items-center justify-end gap-1 text-emerald-700">廃棄抑制 <ArrowUpDown className="h-2.5 w-2.5" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer font-black text-xs py-1 px-2 hover:text-primary" onClick={() => handleSort('discountScore')}>
                      <span className="flex items-center justify-end gap-1 text-blue-700">定価力 <ArrowUpDown className="h-2.5 w-2.5" /></span>
                    </TableHead>
                    <TableHead className="text-right font-black text-xs py-1 px-2">実績（純売上 / 粗利(率) / 廃棄率）</TableHead>
                    <TableHead className="w-8 py-1 px-1"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-8 text-muted-foreground font-bold text-xs">
                        該当する商品データがありません。
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedProducts.map((p, idx) => (
                      <TableRow 
                        key={`${p.code}_${p.name}_${idx}`} 
                        onClick={() => setDetailProduct(p)} 
                        className="cursor-pointer hover:bg-amber-50/50 transition-colors group h-7.5"
                      >
                        <TableCell className="text-center font-black text-xs text-muted-foreground py-1 px-1.5">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 text-xs py-1 px-2 whitespace-nowrap">
                          <span className="font-black text-xs truncate max-w-[140px] inline-block align-middle">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-1 font-mono font-normal">({p.code})</span>
                        </TableCell>
                        <TableCell className="font-bold text-[11px] text-slate-600 py-1 px-2 whitespace-nowrap">
                          {p.category}
                        </TableCell>
                        <TableCell className="text-center py-1 px-1.5 whitespace-nowrap">
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-black inline-block shadow-2xs", getScoreColor(p.balanceScore))}>
                            {p.balanceScore} <span className="text-[10px] font-normal opacity-80">(#{p.balanceRank})</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-1 px-1.5 whitespace-nowrap">
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-black inline-block shadow-2xs", getScoreColor(p.profitModelScore))}>
                            {p.profitModelScore} <span className="text-[10px] font-normal opacity-80">(#{p.profitRank})</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-1 px-1.5 whitespace-nowrap">
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-black inline-block shadow-2xs", getScoreColor(p.wasteModelScore))}>
                            {p.wasteModelScore} <span className="text-[10px] font-normal opacity-80">(#{p.wasteRank})</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-1 px-1.5 whitespace-nowrap">
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-black inline-block shadow-2xs", getScoreColor(p.volumeModelScore))}>
                            {p.volumeModelScore} <span className="text-[10px] font-normal opacity-80">(#{p.volumeRank})</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-1 px-1.5 whitespace-nowrap">
                          <Badge variant={p.typeBadge?.variant || 'outline'} className="text-[10px] py-0 px-1.5 font-bold leading-tight h-5 inline-flex items-center">
                            {p.typeBadge?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-xs tabular-nums text-emerald-700 py-1 px-2">
                          {p.wasteScore}
                        </TableCell>
                        <TableCell className="text-right font-black text-xs tabular-nums text-blue-700 py-1 px-2">
                          {p.discountScore}
                        </TableCell>
                        <TableCell className="text-right text-[11px] text-slate-600 tabular-nums py-1 px-2 whitespace-nowrap">
                          ¥{p.salesAmount.toLocaleString()} / <span className="text-emerald-700 font-bold">¥{p.grossProfit.toLocaleString()} ({p.grossProfitMargin}%)</span> / <span className="text-rose-600 font-bold">{p.wasteRate}%</span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground group-hover:text-primary transition-colors py-1 px-1 w-6">
                          <ChevronRight className="h-3.5 w-3.5" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Detail Modal (Radar Chart & Diagnostics) */}
      <Dialog open={!!detailProduct} onOpenChange={(open) => !open && setDetailProduct(null)}>
        {detailProduct && (
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant={detailProduct.typeBadge?.variant || 'outline'} className="text-xs font-black">
                  {detailProduct.typeBadge?.label}
                </Badge>
                <span className="text-xs text-slate-500 font-bold">{detailProduct.category}</span>
              </div>
              <DialogTitle className="text-xl font-black text-slate-900 mt-1">
                {detailProduct.name}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium">
                コード: {detailProduct.code} | 定価: ¥{detailProduct.price.toLocaleString()} | 原価: ¥{detailProduct.costPrice.toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              {/* 4 Models Comparison Strip in Modal */}
              <div className="grid grid-cols-4 gap-2 bg-muted/40 p-2.5 rounded-xl text-center text-xs border">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">⚖️ バランス型</span>
                  <span className="font-black text-sm text-slate-800">{detailProduct.balanceScore}</span>
                  <span className="text-[10px] text-muted-foreground block font-bold">第{detailProduct.balanceRank}位</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 font-bold block">💰 粗利重視型</span>
                  <span className="font-black text-sm text-emerald-700">{detailProduct.profitModelScore}</span>
                  <span className="text-[10px] text-emerald-600 block font-bold">第{detailProduct.profitRank}位</span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-700 font-bold block">🛡️ ロス削減型</span>
                  <span className="font-black text-sm text-blue-700">{detailProduct.wasteModelScore}</span>
                  <span className="text-[10px] text-blue-600 block font-bold">第{detailProduct.wasteRank}位</span>
                </div>
                <div>
                  <span className="text-[10px] text-orange-700 font-bold block">🚀 出数重視型</span>
                  <span className="font-black text-sm text-orange-700">{detailProduct.volumeModelScore}</span>
                  <span className="text-[10px] text-orange-600 block font-bold">第{detailProduct.volumeRank}位</span>
                </div>
              </div>

              {/* Radar Chart and Score Bars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={[
                      { subject: '売上規模', score: detailProduct.salesScore, fullMark: 80 },
                      { subject: '粗利額', score: detailProduct.profitScore, fullMark: 80 },
                      { subject: '粗利率', score: detailProduct.profitMarginScore, fullMark: 80 },
                      { subject: '販売出数', score: detailProduct.qtyScore, fullMark: 80 },
                      { subject: '廃棄抑制', score: detailProduct.wasteScore, fullMark: 80 },
                      { subject: '定価力', score: detailProduct.discountScore, fullMark: 80 },
                    ]}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                      <PolarRadiusAxis domain={[30, 70]} tick={false} axisLine={false} />
                      <Radar name="偏差値" dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2.5 bg-muted/30 p-4 rounded-2xl border">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>純売上高偏差値:</span>
                    <span className="tabular-nums">{detailProduct.salesScore} (¥{detailProduct.salesAmount.toLocaleString()})</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>粗利額偏差値:</span>
                    <span className="tabular-nums text-emerald-700">{detailProduct.profitScore} (¥{detailProduct.grossProfit.toLocaleString()})</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>粗利率偏差値:</span>
                    <span className="tabular-nums text-teal-700">{detailProduct.profitMarginScore} ({detailProduct.grossProfitMargin}%)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>出数偏差値:</span>
                    <span className="tabular-nums">{detailProduct.qtyScore} ({detailProduct.totalSoldQty}個)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>廃棄抑制偏差値 (低ロス):</span>
                    <span className="tabular-nums text-emerald-700">{detailProduct.wasteScore} ({detailProduct.wasteRate}%)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>定価力偏差値 (見切り抑制):</span>
                    <span className="tabular-nums text-blue-700">{detailProduct.discountScore} (値引率 {detailProduct.discountRate}%)</span>
                  </div>
                  <div className="pt-2 border-t flex justify-between items-center text-sm font-black text-amber-900">
                    <span>総合評価偏差値:</span>
                    <span className="text-base">{detailProduct.compositeScore}</span>
                  </div>
                </div>
              </div>

              {/* Actionable Advice */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-1.5">
                <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-600" /> 実務改善アドバイス
                </h4>
                <p className="text-xs text-amber-950 font-medium leading-relaxed">
                  {detailProduct.typeBadge?.description}
                </p>
                {detailProduct.wasteScore && detailProduct.wasteScore < 45 && (
                  <p className="text-[11px] text-rose-700 font-bold pt-1">
                    💡 ロス率が {detailProduct.wasteRate}% と高めです。夕方のタイムセールを待たずに製造数を少し抑えるか、販売ピーク時間帯へ製造を集中させてください。
                  </p>
                )}
                {detailProduct.wasteScore && detailProduct.wasteScore > 60 && detailProduct.discountScore && detailProduct.discountScore > 60 && (
                  <p className="text-[11px] text-emerald-700 font-bold pt-1">
                    💡 廃棄がほぼ出ず定価で完売しています。販売機会ロスが生じている可能性が高いため、製造数を +5〜10% 増量するテストを推奨します。
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Criteria & Calculation Logic Explanation Dialog */}
      <Dialog open={isCriteriaModalOpen} onOpenChange={setIsCriteriaModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600">
                <HelpCircle className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black text-slate-900">
                  商品偏差値分析の評価基準・算出ロジック
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  惣菜（中食）の実務において商品の真の実力を多角的に測る「偏差値評価システム」の基準解説
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs text-slate-700">
            {/* 1. Why Deviation */}
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1.5">
              <h3 className="font-black text-amber-950 flex items-center gap-1.5 text-xs sm:text-sm">
                <span>📐</span> なぜ惣菜業に「偏差値（Tスコア）」が必要なのか？
              </h3>
              <p className="leading-relaxed">
                惣菜は<strong>「売上金額は大きいが原価率が高くロスも多い看板商品」</strong>や、
                <strong>「出数は控えめだが粗利率が60〜70%あり見切り耐性（定価力）が高い副菜・単品」</strong>など、
                単一の指標（売上だけ、出数だけ）では真の貢献度が測りにくい特徴があります。
              </p>
              <p className="leading-relaxed">
                本システムでは、単位の異なる金額（円）、個数（個）、比率（%）を、すべて<strong>「平均＝50、標準偏差＝10」の偏差値に正規化</strong>することで、
                同一のものさしで公平・客観的に統合評価します。
              </p>
            </div>

            {/* Score interpretation */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50/60 text-center">
                <div className="font-black text-emerald-800 text-sm">60 以上</div>
                <div className="text-[10px] text-emerald-700 font-bold">上位約16%（超優秀）</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">店舗を牽引する大黒柱</div>
              </div>
              <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/60 text-center">
                <div className="font-black text-blue-800 text-sm">50 〜 59</div>
                <div className="text-[10px] text-blue-700 font-bold">平均以上（堅調）</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">安定した主力・標準</div>
              </div>
              <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/60 text-center">
                <div className="font-black text-amber-800 text-sm">45 〜 49</div>
                <div className="text-[10px] text-amber-700 font-bold">平均やや下</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">テコ入れ・改善余地あり</div>
              </div>
              <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/60 text-center">
                <div className="font-black text-rose-800 text-sm">45 未満</div>
                <div className="text-[10px] text-rose-700 font-bold">下位約30%（要点検）</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">過剰製造または改廃候補</div>
              </div>
            </div>

            {/* 2. 6 Core Metrics */}
            <div className="space-y-2">
              <h3 className="font-black text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm">
                <span>🎯</span> 6つの基礎評価指標と算出根拠
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg border bg-card space-y-0.5">
                  <span className="font-bold text-slate-900">1. 純売上高 偏差値</span>
                  <p className="text-muted-foreground">値引き販売後の実際の売上金額。店舗の売上ボリュームへの直接貢献度を測ります。</p>
                </div>
                <div className="p-2.5 rounded-lg border bg-card space-y-0.5">
                  <span className="font-bold text-slate-900">2. 粗利額 偏差値</span>
                  <p className="text-muted-foreground">純売上高から仕入・製造原価を引いた金額。手元に稼ぎ出した利益の絶対額です。</p>
                </div>
                <div className="p-2.5 rounded-lg border bg-card space-y-0.5">
                  <span className="font-bold text-emerald-800">3. 粗利率 偏差値（マージン率）</span>
                  <p className="text-muted-foreground">粗利額 ÷ 純売上高。高マージン副菜や利益体質を支える商品の実力を浮き彫りにします。</p>
                </div>
                <div className="p-2.5 rounded-lg border bg-card space-y-0.5">
                  <span className="font-bold text-slate-900">4. 販売出数 偏差値</span>
                  <p className="text-muted-foreground">購入されたパック数・個数の総和。顧客の絶対的な支持率・客足の牽引力を評価します。</p>
                </div>
                <div className="p-2.5 rounded-lg border bg-card space-y-0.5">
                  <span className="font-bold text-amber-800">5. 廃棄抑制 偏差値（逆算）</span>
                  <p className="text-muted-foreground">廃棄率（廃棄数÷製造数）が<strong>低いほど高偏差値</strong>になる逆算ロジック。廃棄ロスを抑える優等生を評価します。</p>
                </div>
                <div className="p-2.5 rounded-lg border bg-card space-y-0.5">
                  <span className="font-bold text-blue-800">6. 定価力 偏差値（見切り耐性・逆算）</span>
                  <p className="text-muted-foreground">値引きに頼らず定価で売り切る力。値引き販売率が<strong>低いほど高偏差値</strong>になる逆算ロジックです。</p>
                </div>
              </div>
            </div>

            {/* 3. 4 Evaluation Models */}
            <div className="space-y-2">
              <h3 className="font-black text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm">
                <span>⚖️</span> 4つの評価モデルと重み配分比率（ウェイト）
              </h3>
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/60 text-[11px]">
                    <TableRow>
                      <TableHead className="font-bold">評価モデル</TableHead>
                      <TableHead className="font-bold text-center text-emerald-700">粗利率</TableHead>
                      <TableHead className="font-bold text-center">粗利額</TableHead>
                      <TableHead className="font-bold text-center">純売上</TableHead>
                      <TableHead className="font-bold text-center text-indigo-700">出数</TableHead>
                      <TableHead className="font-bold text-center text-amber-700">廃棄抑制</TableHead>
                      <TableHead className="font-bold text-center text-blue-700">定価力</TableHead>
                      <TableHead className="font-bold">主な戦略的狙い</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-[11px]">
                    <TableRow>
                      <TableCell className="font-black">⚖️ バランス型</TableCell>
                      <TableCell className="text-center font-bold">17%</TableCell>
                      <TableCell className="text-center font-bold">17%</TableCell>
                      <TableCell className="text-center font-bold">17%</TableCell>
                      <TableCell className="text-center font-bold">17%</TableCell>
                      <TableCell className="text-center font-bold">16%</TableCell>
                      <TableCell className="text-center font-bold">16%</TableCell>
                      <TableCell className="text-muted-foreground">総合的な実力を均等に測る基本ベンチマーク</TableCell>
                    </TableRow>
                    <TableRow className="bg-emerald-50/40">
                      <TableCell className="font-black text-emerald-950">💰 粗利・収益重視型</TableCell>
                      <TableCell className="text-center font-black text-emerald-700 text-xs">35%</TableCell>
                      <TableCell className="text-center font-bold text-emerald-700">20%</TableCell>
                      <TableCell className="text-center font-medium">15%</TableCell>
                      <TableCell className="text-center font-medium">10%</TableCell>
                      <TableCell className="text-center font-medium">10%</TableCell>
                      <TableCell className="text-center font-medium">10%</TableCell>
                      <TableCell className="text-emerald-900 font-medium">
                        高マージン副菜・単品を正当評価し、真に手元に残る利益体質へ改善
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-black text-amber-950">🛡️ ロス削減重視型</TableCell>
                      <TableCell className="text-center font-medium">15%</TableCell>
                      <TableCell className="text-center font-medium">10%</TableCell>
                      <TableCell className="text-center font-medium">10%</TableCell>
                      <TableCell className="text-center font-medium">5%</TableCell>
                      <TableCell className="text-center font-black text-amber-700 text-xs">35%</TableCell>
                      <TableCell className="text-center font-black text-blue-700 text-xs">25%</TableCell>
                      <TableCell className="text-muted-foreground">過剰製造や見切り常習品を警戒し、廃棄損・値引き損を極小化</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-black text-blue-950">🚀 出数・集客重視型</TableCell>
                      <TableCell className="text-center font-medium">10%</TableCell>
                      <TableCell className="text-center font-medium">10%</TableCell>
                      <TableCell className="text-center font-medium">25%</TableCell>
                      <TableCell className="text-center font-black text-indigo-700 text-xs">35%</TableCell>
                      <TableCell className="text-center font-medium">5%</TableCell>
                      <TableCell className="text-center font-medium">15%</TableCell>
                      <TableCell className="text-muted-foreground">来店客を惹きつける人気商品・店舗の活気を牽引するエースを評価</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 4. Persona Badges */}
            <div className="space-y-1.5">
              <h3 className="font-black text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm">
                <span>🏷️</span> 商品ペルソナ診断タイプ
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg border bg-card">
                  <span className="font-bold text-slate-900">👑 看板・大黒柱（偏差値60以上）</span>
                  <p className="text-muted-foreground">売上・利益ともに店舗を牽引する絶対的エース。欠品防止を最優先。</p>
                </div>
                <div className="p-2 rounded-lg border bg-card">
                  <span className="font-bold text-emerald-800">💎 隠れた優良品（粗利・定価力偏差値高い）</span>
                  <p className="text-muted-foreground">出数は控えめだが手元に確実に利益を残す商品。陳列拡大で化ける可能性大。</p>
                </div>
                <div className="p-2 rounded-lg border bg-rose-50/50 border-rose-200">
                  <span className="font-bold text-rose-800">⚠️ 過剰製造・疲弊型（売上高いがロス大）</span>
                  <p className="text-rose-900/80">作れば作るほど値引き・廃棄で利益を削る商品。減産や見切り運用見直し推奨。</p>
                </div>
                <div className="p-2 rounded-lg border bg-card">
                  <span className="font-bold text-slate-600">📉 改廃・見直し候補（全モデルで低迷）</span>
                  <p className="text-muted-foreground">偏差値45未満にとどまる商品。レシピリニューアルや棚割入替を検討。</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Excluded Low-Volume Products Modal */}
      <Dialog open={isExcludedModalOpen} onOpenChange={setIsExcludedModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base sm:text-lg font-black flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Sliders className="h-5 w-5 text-amber-600" />
                  <span>除外された低出数商品一覧 ({excludedLowVolumeProducts.length}品)</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  期間合計の販売数量が {minSalesThreshold}個 未満のため、偏差値の歪みを防ぐ目的で計算母集団から除外されています。メニュー改廃や廃番・見直しの検討にご活用ください。
                </DialogDescription>
              </div>
              <Badge variant="outline" className="text-amber-800 bg-amber-50 border-amber-300 font-bold shrink-0">
                基準: {minSalesThreshold}個未満
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3">
            {excludedLowVolumeProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                指定された条件（{minSalesThreshold}個未満）に該当する低出数商品はありません。
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/60 sticky top-0 z-10 backdrop-blur-sm">
                    <TableRow className="text-[11px] font-bold">
                      <TableHead className="w-[100px]">コード</TableHead>
                      <TableHead className="min-w-[180px]">商品名</TableHead>
                      <TableHead className="w-[100px]">カテゴリー</TableHead>
                      <TableHead className="text-right w-[90px]">販売数量</TableHead>
                      <TableHead className="text-right w-[110px]">売上金額</TableHead>
                      <TableHead className="text-right w-[100px]">粗利益</TableHead>
                      <TableHead className="text-right w-[80px]">粗利率</TableHead>
                      <TableHead className="text-right w-[80px]">廃棄率</TableHead>
                      <TableHead className="text-right w-[80px]">値引率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs divide-y">
                    {excludedLowVolumeProducts.map((p) => (
                      <TableRow key={p.code} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-mono text-muted-foreground text-[11px]">{p.code}</TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-slate-100">{p.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                            {p.category || '未分類'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-amber-700 dark:text-amber-400">
                          {p.totalSoldQty.toLocaleString()} 個
                        </TableCell>
                        <TableCell className="text-right font-medium">¥{p.salesAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">¥{p.grossProfit.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className={cn(p.grossProfitMargin >= 45 ? "text-emerald-700" : "text-slate-700")}>
                            {p.grossProfitMargin.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className={cn(p.wasteRate >= 15 ? "text-rose-600 font-bold" : "text-slate-600")}>
                            {p.wasteRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-600">
                          {p.discountRate.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>※ 母集団に含めて偏差値を算出したい場合は、画面上部の「低出数を除外」スイッチをOFFにしてください。</span>
            <Button size="sm" variant="outline" onClick={() => setIsExcludedModalOpen(false)}>
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
