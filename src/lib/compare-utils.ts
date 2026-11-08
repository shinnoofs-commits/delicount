import type { Transaction, WasteEntry, Product } from '@/lib/types';
import holiday_jp from '@holiday-jp/holiday_jp';
import { format } from 'date-fns';

export interface DayInfo {
  date: Date;
  dowIndex: number; // 0=Sun, 1=Mon, ..., 6=Sat
  dowName: string; // '日', '月', '火', '水', '木', '金', '土', '祝'
  isHoliday: boolean;
  isWeekend: boolean;
  isWeekendOrHoliday: boolean;
  isWeekday: boolean; // Mon-Fri and NOT holiday
}

const DOW_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

export function getDayInfo(date: Date): DayInfo {
  const d = new Date(date);
  const dowIndex = d.getDay();
  const isHoliday = holiday_jp.isHoliday(d);
  const isWeekend = dowIndex === 0 || dowIndex === 6;
  const isWeekendOrHoliday = isWeekend || isHoliday;
  const isWeekday = !isWeekend && !isHoliday;
  const dowName = isHoliday ? '祝' : DOW_NAMES[dowIndex];

  return {
    date: d,
    dowIndex,
    dowName,
    isHoliday,
    isWeekend,
    isWeekendOrHoliday,
    isWeekday,
  };
}

export interface ConditionProductStat {
  code: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  regSalesQty: number;
  discSalesQty: number;
  totalSoldQty: number;
  wasteQty: number;
  totalPreparedQty: number;
  salesAmount: number;
  grossProfit: number;
  grossProfitMargin: number; // %
  wasteCost: number;
  wasteRate: number; // %
  discountRate: number; // %
  compositeScore?: number; // 偏差値 (50 base)
  rank?: number;
}

export interface ConditionSummary {
  conditionLabel: string;
  daysCount: number;
  totalSales: number;
  totalGrossProfit: number;
  grossProfitMargin: number; // %
  totalSoldQty: number;
  totalWasteQty: number;
  totalWasteCost: number;
  wasteRate: number; // %
  discountRate: number; // %
  productCount: number;
}

export interface ComparedProductRow {
  code: string;
  name: string;
  category: string;
  price: number;
  // Condition A
  salesA: number;
  profitA: number;
  marginA: number;
  qtyA: number;
  wasteRateA: number;
  discountRateA: number;
  rankA: number | null;
  scoreA: number | null;
  // Condition B
  salesB: number;
  profitB: number;
  marginB: number;
  qtyB: number;
  wasteRateB: number;
  discountRateB: number;
  rankB: number | null;
  scoreB: number | null;
  // Differences (B - A)
  salesDiff: number;
  profitDiff: number;
  marginDiff: number; // pt
  qtyDiff: number;
  wasteRateDiff: number; // pt (negative means waste rate improved)
  rankDiff: number; // positive means rank improved in B
  scoreDiff: number;
  // Analytical tag
  behaviorTag: 'A特化型' | 'B特化型' | '両輪エース' | '利益改善型' | 'ロス急増型' | '標準推移';
}

export interface ComparedCategoryRow {
  category: string;
  // Condition A
  salesA: number;
  profitA: number;
  marginA: number; // %
  soldQtyA: number;
  wasteQtyA: number;
  wasteCostA: number;
  wasteRateA: number; // %
  discountRateA: number; // %
  productCountA: number;
  salesShareA: number; // % of total sales A
  topProductA: string;

  // Condition B
  salesB: number;
  profitB: number;
  marginB: number; // %
  soldQtyB: number;
  wasteQtyB: number;
  wasteCostB: number;
  wasteRateB: number; // %
  discountRateB: number; // %
  productCountB: number;
  salesShareB: number; // % of total sales B
  topProductB: string;

  // Differences (B - A)
  salesDiff: number;
  salesDiffPercent: number; // %
  profitDiff: number;
  profitDiffPercent: number; // %
  marginDiff: number; // pt
  wasteRateDiff: number; // pt
  salesShareDiff: number; // pt
  categoryTag: '成長牽引部門' | '利益改善部門' | 'ロス悪化注意' | '安定主力部門' | '縮小傾向';
}

export interface ComparisonResult {
  summaryA: ConditionSummary;
  summaryB: ConditionSummary;
  diffSummary: {
    salesDiff: number;
    salesDiffPercent: number;
    profitDiff: number;
    profitDiffPercent: number;
    marginDiff: number;
    qtyDiff: number;
    wasteRateDiff: number;
    wasteCostDiff: number;
  };
  productsA: ConditionProductStat[];
  productsB: ConditionProductStat[];
  comparedProducts: ComparedProductRow[];
  categoryRows: ComparedCategoryRow[];
}

/**
 * Canonical product resolver identical to score-analysis
 */
export function buildProductResolver(products: Product[]) {
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

    const canonicalCode = (master?.productCode || rawCode || master?.id || rawId || '').trim();
    const canonicalName = (master?.name || rawName || canonicalCode || '不明な商品').trim();
    const groupKey = canonicalCode ? `code:${canonicalCode}` : `name:${canonicalName.toLowerCase().replace(/[\s　]+/g, '')}`;
    const category = (master?.category || item.category || '惣菜').trim();

    const price = master?.price ?? item.unitPrice ?? 0;
    const costPrice = master?.costPrice ?? item.costPrice ?? (price > 0 ? price * 0.4 : 0);

    return { groupKey, canonicalCode: canonicalCode || canonicalName, canonicalName, category, price, costPrice };
  };

  return { resolveProductInfo };
}

/**
 * Aggregates transactions and waste into product stats for a given filter condition
 */
export function aggregateConditionStats(
  transactions: Transaction[],
  wasteEntries: WasteEntry[],
  products: Product[],
  predicate: (date: Date, storeId?: string) => boolean,
  label: string,
  targetCategory?: string
): { summary: ConditionSummary; productList: ConditionProductStat[] } {
  const { resolveProductInfo } = buildProductResolver(products);

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

  const activeDates = new Set<string>();

  // 1. Filtered Transactions
  transactions.forEach(tx => {
    const txDate = new Date(tx.date);
    if (!predicate(txDate, tx.storeId)) return;
    activeDates.add(format(txDate, 'yyyy-MM-dd'));

    (tx.items || []).forEach(item => {
      const { groupKey, canonicalCode, canonicalName, category, price, costPrice } = resolveProductInfo(item);
      if (!canonicalName || canonicalName === 'レジ袋' || canonicalName.includes('レジ袋') || canonicalName === '値引き' || canonicalName === '未分類') return;
      if (targetCategory && targetCategory !== 'all' && category !== targetCategory) return;

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
        if (canonicalName && (!stat.name || stat.name === stat.code)) stat.name = canonicalName;
        if (category && category !== '未分類' && (stat.category === '未分類' || stat.category === '惣菜')) stat.category = category;
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

      const itemPrice = (item.unitPrice && item.unitPrice > 0) ? item.unitPrice : price;
      const linePrice = itemPrice * qty;
      const discountVal = item.discountRate ? (linePrice * item.discountRate) : 0;
      stat.salesAmount += Math.max(0, linePrice - discountVal);
    });
  });

  // 2. Filtered Waste Entries
  wasteEntries.forEach(entry => {
    const entryDate = new Date(entry.date);
    if (!predicate(entryDate, entry.storeId)) return;
    activeDates.add(format(entryDate, 'yyyy-MM-dd'));

    (entry.items || []).forEach(item => {
      const { groupKey, canonicalCode, canonicalName, category, price, costPrice } = resolveProductInfo(item);
      if (!canonicalName || canonicalName.includes('レジ袋') || canonicalName === '値引き') return;
      if (targetCategory && targetCategory !== 'all' && category !== targetCategory) return;

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
        if (canonicalName && (!stat.name || stat.name === stat.code)) stat.name = canonicalName;
        if (category && category !== '未分類' && (stat.category === '未分類' || stat.category === '惣菜')) stat.category = category;
        if (stat.price === 0 && price > 0) stat.price = price;
        if (stat.costPrice === 0 && costPrice > 0) stat.costPrice = costPrice;
      }

      stat.wasteQty += (item.quantity || 0);
    });
  });

  // Derived metrics
  let totalSales = 0;
  let totalGrossProfit = 0;
  let totalSoldQty = 0;
  let totalWasteQty = 0;
  let totalWasteCost = 0;

  const rawList: ConditionProductStat[] = [];

  productMap.forEach(stat => {
    const totalSold = stat.regSalesQty + stat.discSalesQty;
    const totalPrep = totalSold + stat.wasteQty;
    const grossProfit = Math.round(stat.salesAmount - (stat.costPrice * totalSold));
    const grossMargin = stat.salesAmount > 0 ? (grossProfit / stat.salesAmount) * 100 : 0;
    const wasteCost = Math.round(stat.costPrice * stat.wasteQty);
    const wasteRate = totalPrep > 0 ? (stat.wasteQty / totalPrep) * 100 : 0;
    const discRate = totalSold > 0 ? (stat.discSalesQty / totalSold) * 100 : 0;

    totalSales += stat.salesAmount;
    totalGrossProfit += grossProfit;
    totalSoldQty += totalSold;
    totalWasteQty += stat.wasteQty;
    totalWasteCost += wasteCost;

    rawList.push({
      code: stat.code,
      name: stat.name,
      category: stat.category,
      price: stat.price,
      costPrice: stat.costPrice,
      regSalesQty: stat.regSalesQty,
      discSalesQty: stat.discSalesQty,
      totalSoldQty: totalSold,
      wasteQty: stat.wasteQty,
      totalPreparedQty: totalPrep,
      salesAmount: Math.round(stat.salesAmount),
      grossProfit,
      grossProfitMargin: Number(grossMargin.toFixed(1)),
      wasteCost,
      wasteRate: Number(wasteRate.toFixed(1)),
      discountRate: Number(discRate.toFixed(1)),
    });
  });

  // Compute Standard Deviation Score (偏差値)
  const n = rawList.length;
  if (n > 0) {
    const meanSales = rawList.reduce((acc, p) => acc + p.salesAmount, 0) / n;
    const meanProfit = rawList.reduce((acc, p) => acc + p.grossProfit, 0) / n;
    const meanMargin = rawList.reduce((acc, p) => acc + p.grossProfitMargin, 0) / n;
    const meanWasteRate = rawList.reduce((acc, p) => acc + p.wasteRate, 0) / n;
    const meanDiscRate = rawList.reduce((acc, p) => acc + p.discountRate, 0) / n;

    const calcStd = (values: number[], mean: number) => {
      if (values.length <= 1) return 1;
      const v = values.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / values.length;
      return Math.sqrt(v) || 1;
    };

    const stdSales = calcStd(rawList.map(p => p.salesAmount), meanSales);
    const stdProfit = calcStd(rawList.map(p => p.grossProfit), meanProfit);
    const stdMargin = calcStd(rawList.map(p => p.grossProfitMargin), meanMargin);
    const stdWaste = calcStd(rawList.map(p => p.wasteRate), meanWasteRate);
    const stdDisc = calcStd(rawList.map(p => p.discountRate), meanDiscRate);

    const toScore = (val: number, mean: number, std: number, invert = false) => {
      const z = (val - mean) / (std || 1);
      const s = invert ? 50 - 10 * z : 50 + 10 * z;
      return Math.max(20, Math.min(80, Math.round(s * 10) / 10));
    };

    rawList.forEach(p => {
      const scoreSales = toScore(p.salesAmount, meanSales, stdSales);
      const scoreProfit = toScore(p.grossProfit, meanProfit, stdProfit);
      const scoreMargin = toScore(p.grossProfitMargin, meanMargin, stdMargin);
      const scoreWaste = toScore(p.wasteRate, meanWasteRate, stdWaste, true);
      const scoreDisc = toScore(p.discountRate, meanDiscRate, stdDisc, true);

      // Profit-focused weight (Margin 35% + Profit 20% + Sales 15% + Waste 15% + Disc 15%)
      p.compositeScore = Number((
        scoreMargin * 0.35 +
        scoreProfit * 0.20 +
        scoreSales * 0.15 +
        scoreWaste * 0.15 +
        scoreDisc * 0.15
      ).toFixed(1));
    });

    rawList.sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));
    rawList.forEach((p, idx) => {
      p.rank = idx + 1;
    });
  }

  const overallMargin = totalSales > 0 ? (totalGrossProfit / totalSales) * 100 : 0;
  const overallPrep = totalSoldQty + totalWasteQty;
  const overallWasteRate = overallPrep > 0 ? (totalWasteQty / overallPrep) * 100 : 0;
  const overallDiscRate = totalSoldQty > 0 ? (rawList.reduce((acc, p) => acc + p.discSalesQty, 0) / totalSoldQty) * 100 : 0;

  const summary: ConditionSummary = {
    conditionLabel: label,
    daysCount: activeDates.size || 1,
    totalSales: Math.round(totalSales),
    totalGrossProfit: Math.round(totalGrossProfit),
    grossProfitMargin: Number(overallMargin.toFixed(1)),
    totalSoldQty,
    totalWasteQty,
    totalWasteCost,
    wasteRate: Number(overallWasteRate.toFixed(1)),
    discountRate: Number(overallDiscRate.toFixed(1)),
    productCount: rawList.length,
  };

  return { summary, productList: rawList };
}

/**
 * Compares two conditions (A vs B) and produces side-by-side matrices
 */
export function buildComparisonMatrix(
  condA: { summary: ConditionSummary; productList: ConditionProductStat[] },
  condB: { summary: ConditionSummary; productList: ConditionProductStat[] }
): ComparisonResult {
  const mapA = new Map<string, ConditionProductStat>();
  condA.productList.forEach(p => mapA.set(p.code, p));

  const mapB = new Map<string, ConditionProductStat>();
  condB.productList.forEach(p => mapB.set(p.code, p));

  const allCodes = new Set<string>([...mapA.keys(), ...mapB.keys()]);

  const comparedRows: ComparedProductRow[] = [];

  allCodes.forEach(code => {
    const a = mapA.get(code);
    const b = mapB.get(code);

    const name = b?.name || a?.name || '不明な商品';
    const category = b?.category || a?.category || '惣菜';
    const price = b?.price || a?.price || 0;

    const salesA = a?.salesAmount || 0;
    const profitA = a?.grossProfit || 0;
    const marginA = a?.grossProfitMargin || 0;
    const qtyA = a?.totalSoldQty || 0;
    const wasteRateA = a?.wasteRate || 0;
    const discountRateA = a?.discountRate || 0;
    const rankA = a?.rank ?? null;
    const scoreA = a?.compositeScore ?? null;

    const salesB = b?.salesAmount || 0;
    const profitB = b?.grossProfit || 0;
    const marginB = b?.grossProfitMargin || 0;
    const qtyB = b?.totalSoldQty || 0;
    const wasteRateB = b?.wasteRate || 0;
    const discountRateB = b?.discountRate || 0;
    const rankB = b?.rank ?? null;
    const scoreB = b?.compositeScore ?? null;

    const salesDiff = salesB - salesA;
    const profitDiff = profitB - profitA;
    const marginDiff = Number((marginB - marginA).toFixed(1));
    const qtyDiff = qtyB - qtyA;
    const wasteRateDiff = Number((wasteRateB - wasteRateA).toFixed(1));
    const rankDiff = (rankA !== null && rankB !== null) ? (rankA - rankB) : (rankA === null ? 99 : -99);
    const scoreDiff = Number(((scoreB || 50) - (scoreA || 50)).toFixed(1));

    // Behavior classification
    let behaviorTag: ComparedProductRow['behaviorTag'] = '標準推移';
    if ((rankA !== null && rankA <= 5) && (rankB !== null && rankB <= 5)) {
      behaviorTag = '両輪エース';
    } else if (wasteRateDiff >= 5.0 && wasteRateB >= 8.0) {
      behaviorTag = 'ロス急増型';
    } else if (profitDiff > 10000 || marginDiff >= 5.0) {
      behaviorTag = '利益改善型';
    } else if ((rankB !== null && rankB <= 10) && (rankA === null || rankA > 15)) {
      behaviorTag = 'B特化型';
    } else if ((rankA !== null && rankA <= 10) && (rankB === null || rankB > 15)) {
      behaviorTag = 'A特化型';
    }

    comparedRows.push({
      code,
      name,
      category,
      price,
      salesA,
      profitA,
      marginA,
      qtyA,
      wasteRateA,
      discountRateA,
      rankA,
      scoreA,
      salesB,
      profitB,
      marginB,
      qtyB,
      wasteRateB,
      discountRateB,
      rankB,
      scoreB,
      salesDiff,
      profitDiff,
      marginDiff,
      qtyDiff,
      wasteRateDiff,
      rankDiff,
      scoreDiff,
      behaviorTag,
    });
  });

  const sumA = condA.summary;
  const sumB = condB.summary;

  const salesDiff = sumB.totalSales - sumA.totalSales;
  const salesDiffPercent = sumA.totalSales > 0 ? Number(((salesDiff / sumA.totalSales) * 100).toFixed(1)) : 0;

  const profitDiff = sumB.totalGrossProfit - sumA.totalGrossProfit;
  const profitDiffPercent = sumA.totalGrossProfit > 0 ? Number(((profitDiff / sumA.totalGrossProfit) * 100).toFixed(1)) : 0;

  const marginDiff = Number((sumB.grossProfitMargin - sumA.grossProfitMargin).toFixed(1));
  const qtyDiff = sumB.totalSoldQty - sumA.totalSoldQty;
  const wasteRateDiff = Number((sumB.wasteRate - sumA.wasteRate).toFixed(1));
  const wasteCostDiff = sumB.totalWasteCost - sumA.totalWasteCost;

  // Build Category Comparison Matrix
  const categoryMapA = new Map<string, {
    sales: number;
    profit: number;
    soldQty: number;
    wasteQty: number;
    wasteCost: number;
    discQty: number;
    productCount: number;
    topProduct: { name: string; sales: number };
  }>();

  condA.productList.forEach(p => {
    const cat = p.category || '惣菜';
    let c = categoryMapA.get(cat);
    if (!c) {
      c = { sales: 0, profit: 0, soldQty: 0, wasteQty: 0, wasteCost: 0, discQty: 0, productCount: 0, topProduct: { name: p.name, sales: p.salesAmount } };
      categoryMapA.set(cat, c);
    }
    c.sales += p.salesAmount;
    c.profit += p.grossProfit;
    c.soldQty += p.totalSoldQty;
    c.wasteQty += p.wasteQty;
    c.wasteCost += p.wasteCost;
    c.discQty += p.discSalesQty;
    c.productCount += 1;
    if (p.salesAmount > c.topProduct.sales) {
      c.topProduct = { name: p.name, sales: p.salesAmount };
    }
  });

  const categoryMapB = new Map<string, {
    sales: number;
    profit: number;
    soldQty: number;
    wasteQty: number;
    wasteCost: number;
    discQty: number;
    productCount: number;
    topProduct: { name: string; sales: number };
  }>();

  condB.productList.forEach(p => {
    const cat = p.category || '惣菜';
    let c = categoryMapB.get(cat);
    if (!c) {
      c = { sales: 0, profit: 0, soldQty: 0, wasteQty: 0, wasteCost: 0, discQty: 0, productCount: 0, topProduct: { name: p.name, sales: p.salesAmount } };
      categoryMapB.set(cat, c);
    }
    c.sales += p.salesAmount;
    c.profit += p.grossProfit;
    c.soldQty += p.totalSoldQty;
    c.wasteQty += p.wasteQty;
    c.wasteCost += p.wasteCost;
    c.discQty += p.discSalesQty;
    c.productCount += 1;
    if (p.salesAmount > c.topProduct.sales) {
      c.topProduct = { name: p.name, sales: p.salesAmount };
    }
  });

  const allCategories = new Set<string>([...categoryMapA.keys(), ...categoryMapB.keys()]);
  const categoryRows: ComparedCategoryRow[] = [];

  allCategories.forEach(cat => {
    const a = categoryMapA.get(cat);
    const b = categoryMapB.get(cat);

    const salesA = a?.sales || 0;
    const profitA = a?.profit || 0;
    const marginA = salesA > 0 ? Number(((profitA / salesA) * 100).toFixed(1)) : 0;
    const soldQtyA = a?.soldQty || 0;
    const wasteQtyA = a?.wasteQty || 0;
    const wasteCostA = a?.wasteCost || 0;
    const prepA = soldQtyA + wasteQtyA;
    const wasteRateA = prepA > 0 ? Number(((wasteQtyA / prepA) * 100).toFixed(1)) : 0;
    const discountRateA = soldQtyA > 0 ? Number((( (a?.discQty || 0) / soldQtyA) * 100).toFixed(1)) : 0;
    const productCountA = a?.productCount || 0;
    const salesShareA = sumA.totalSales > 0 ? Number(((salesA / sumA.totalSales) * 100).toFixed(1)) : 0;
    const topProductA = a?.topProduct?.name || '—';

    const salesB = b?.sales || 0;
    const profitB = b?.profit || 0;
    const marginB = salesB > 0 ? Number(((profitB / salesB) * 100).toFixed(1)) : 0;
    const soldQtyB = b?.soldQty || 0;
    const wasteQtyB = b?.wasteQty || 0;
    const wasteCostB = b?.wasteCost || 0;
    const prepB = soldQtyB + wasteQtyB;
    const wasteRateB = prepB > 0 ? Number(((wasteQtyB / prepB) * 100).toFixed(1)) : 0;
    const discountRateB = soldQtyB > 0 ? Number((( (b?.discQty || 0) / soldQtyB) * 100).toFixed(1)) : 0;
    const productCountB = b?.productCount || 0;
    const salesShareB = sumB.totalSales > 0 ? Number(((salesB / sumB.totalSales) * 100).toFixed(1)) : 0;
    const topProductB = b?.topProduct?.name || '—';

    const catSalesDiff = salesB - salesA;
    const catSalesDiffPercent = salesA > 0 ? Number(((catSalesDiff / salesA) * 100).toFixed(1)) : (salesB > 0 ? 100 : 0);
    const catProfitDiff = profitB - profitA;
    const catProfitDiffPercent = profitA > 0 ? Number(((catProfitDiff / profitA) * 100).toFixed(1)) : (profitB > 0 ? 100 : 0);
    const catMarginDiff = Number((marginB - marginA).toFixed(1));
    const catWasteRateDiff = Number((wasteRateB - wasteRateA).toFixed(1));
    const salesShareDiff = Number((salesShareB - salesShareA).toFixed(1));

    let categoryTag: ComparedCategoryRow['categoryTag'] = '安定主力部門';
    if (catWasteRateDiff >= 2.0 && wasteRateB >= 7.0) {
      categoryTag = 'ロス悪化注意';
    } else if (catProfitDiffPercent >= 10 && catProfitDiff > 0) {
      categoryTag = '利益改善部門';
    } else if (catSalesDiffPercent >= 10 && catSalesDiff > 0) {
      categoryTag = '成長牽引部門';
    } else if (catSalesDiffPercent <= -10 && catSalesDiff < 0) {
      categoryTag = '縮小傾向';
    }

    categoryRows.push({
      category: cat,
      salesA,
      profitA,
      marginA,
      soldQtyA,
      wasteQtyA,
      wasteCostA,
      wasteRateA,
      discountRateA,
      productCountA,
      salesShareA,
      topProductA,
      salesB,
      profitB,
      marginB,
      soldQtyB,
      wasteQtyB,
      wasteCostB,
      wasteRateB,
      discountRateB,
      productCountB,
      salesShareB,
      topProductB,
      salesDiff: catSalesDiff,
      salesDiffPercent: catSalesDiffPercent,
      profitDiff: catProfitDiff,
      profitDiffPercent: catProfitDiffPercent,
      marginDiff: catMarginDiff,
      wasteRateDiff: catWasteRateDiff,
      salesShareDiff,
      categoryTag,
    });
  });

  categoryRows.sort((a, b) => b.salesB - a.salesB);

  return {
    summaryA: sumA,
    summaryB: sumB,
    diffSummary: {
      salesDiff,
      salesDiffPercent,
      profitDiff,
      profitDiffPercent,
      marginDiff,
      qtyDiff,
      wasteRateDiff,
      wasteCostDiff,
    },
    productsA: condA.productList,
    productsB: condB.productList,
    comparedProducts: comparedRows,
    categoryRows,
  };
}

/**
 * Generate heuristic strategic insights for the comparison
 */
export function generateComparisonAiHeuristics(
  comp: ComparisonResult,
  comparisonMode: 'dow' | 'period' | 'store',
  labelA: string,
  labelB: string
): {
  headline: string;
  insights: string[];
  recommendations: string[];
} {
  const { summaryA, summaryB, diffSummary, comparedProducts, categoryRows } = comp;

  const topGainers = [...comparedProducts].sort((a, b) => b.profitDiff - a.profitDiff).slice(0, 3);
  const wasteRisks = [...comparedProducts].filter(p => p.wasteRateB > 8.0 && p.wasteRateDiff > 2.0).slice(0, 3);

  let headline = '';
  const insights: string[] = [];
  const recommendations: string[] = [];

  if (diffSummary.profitDiff >= 0) {
    headline = `【${labelB}】は【${labelA}】に対し、粗利額が +¥${diffSummary.profitDiff.toLocaleString()}（${diffSummary.profitDiffPercent > 0 ? `+${diffSummary.profitDiffPercent}%` : '同等'}）と収益性が向上しています。`;
  } else {
    headline = `【${labelB}】は【${labelA}】に対し、粗利額が ¥${Math.abs(diffSummary.profitDiff).toLocaleString()}（${diffSummary.profitDiffPercent}%）減少しており、品揃えと仕込み配分の再点検が推奨されます。`;
  }

  // Insight 1: Margin & Waste dynamics
  if (diffSummary.marginDiff >= 0) {
    insights.push(`粗利率は ${summaryA.grossProfitMargin}% → ${summaryB.grossProfitMargin}%（+${diffSummary.marginDiff} pt）へ伸長。高粗利商品の販売構成比が高まっています。`);
  } else {
    insights.push(`粗利率は ${summaryA.grossProfitMargin}% → ${summaryB.grossProfitMargin}%（${diffSummary.marginDiff} pt）低下。値引き率や低利益率商品の比率増に注意が必要です。`);
  }

  // Insight 2: Waste comparison
  if (diffSummary.wasteRateDiff <= 0) {
    insights.push(`廃棄率は ${summaryA.wasteRate}% → ${summaryB.wasteRate}%（${diffSummary.wasteRateDiff} pt改善）と優れたロス抑制を維持しています。`);
  } else {
    insights.push(`廃棄率は ${summaryA.wasteRate}% → ${summaryB.wasteRate}%（+${diffSummary.wasteRateDiff} pt悪化）。${labelB}における時間帯別の過剰製造が懸念されます。`);
  }

  // Insight 3: Category dynamics if available
  if (categoryRows && categoryRows.length > 1) {
    const topGrowthCat = [...categoryRows].sort((a, b) => b.salesDiff - a.salesDiff)[0];
    const topMarginCat = [...categoryRows].sort((a, b) => b.profitDiff - a.profitDiff)[0];
    const wasteCat = [...categoryRows].filter(c => c.wasteRateDiff > 1.5 && c.wasteRateB > 6).sort((a, b) => b.wasteRateDiff - a.wasteRateDiff)[0];

    if (topGrowthCat && topGrowthCat.salesDiff > 0) {
      insights.push(`【カテゴリー動向】売上成長を最も牽引しているのは「${topGrowthCat.category}」部門（+¥${topGrowthCat.salesDiff.toLocaleString()} / 売上シェア${topGrowthCat.salesShareB}%）です。`);
    }
    if (topMarginCat && topMarginCat.profitDiff > 0 && topMarginCat.category !== topGrowthCat?.category) {
      insights.push(`【粗利貢献】粗利額の伸びが顕著なのは「${topMarginCat.category}」部門（粗利+¥${topMarginCat.profitDiff.toLocaleString()}、粗利率${topMarginCat.marginB}%）です。`);
    }
    if (wasteCat) {
      recommendations.push(`【部門ロス改善】「${wasteCat.category}」部門は廃棄率が ${wasteCat.wasteRateA}% → ${wasteCat.wasteRateB}%（+${wasteCat.wasteRateDiff}pt）と上昇しています。時間帯別の製造数調整を最優先で行ってください。`);
    }
  }

  // Insight 4: Leading shifts
  if (topGainers.length > 0 && topGainers[0].profitDiff > 0) {
    const names = topGainers.map(p => `「${p.name}」(+¥${p.profitDiff.toLocaleString()})`).join('、');
    insights.push(`商品別では ${names} が収益拡大の原動力となっています。`);
  }

  // Action Recommendations
  if (wasteRisks.length > 0) {
    const riskNames = wasteRisks.map(p => `「${p.name}」(廃棄率${p.wasteRateB}%)`).join('、');
    recommendations.push(`【ロス抑制】${labelB}で廃棄率が上昇している ${riskNames} は、ピーク後（14時・18時以降）の製造ロットを10〜20%削減してください。`);
  }

  if (topGainers.length > 0 && topGainers[0].profitDiff > 0) {
    recommendations.push(`【供給強化】${labelB}で粗利貢献が急伸している「${topGainers[0].name}」は、早期欠品を防ぐため追加仕込みの体制を整えてください。`);
  }

  if (comparisonMode === 'dow') {
    recommendations.push(`【曜日特性配分】平日と休日では売れ筋（個食・ランチ需要 vs ファミリー・オードブル需要）が明確に分かれます。曜日ごとの製造計画テーブルを反映してください。`);
  } else if (comparisonMode === 'period') {
    recommendations.push(`【月別曜日対比】暦の曜日並び（土日祝の日数）による影響を差し引き、同一曜日ごとの純粋な実績トレンドを製造基準数にフィードバックしてください。`);
  } else {
    recommendations.push(`【店舗間横展開】${labelA}と${labelB}でスコア差が大きい商品は、陳列位置や値引き開始時刻などの店舗オペレーションの差を検証し、好事例を横展開してください。`);
  }

  return { headline, insights, recommendations };
}
