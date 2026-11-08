/**
 * @fileOverview Discount & POS Analysis Tool for S-Count Agent (Read-Only)
 */

import { DelicountDataService } from '../data-service';

export const getDiscountAnalysisToolDeclaration = {
  name: 'getDiscountAnalysis',
  description: '店舗のスマレジPOS取引実績から、定価販売率、総売上、値引き損失額、値引きワースト商品ランキング、時間帯別値引き集中傾向を取得します。',
  parameters: {
    type: 'OBJECT',
    properties: {
      storeCode: {
        type: 'STRING',
        description: '対象店舗コード（例: "hon-atsugi" または "本厚木"）',
      },
    },
    required: [],
  },
};

export async function executeGetDiscountAnalysis(
  service: DelicountDataService,
  args: { storeCode?: string }
) {
  try {
    const analysis = service.analyzeHonAtsugiPOS();
    return {
      success: true,
      storeName: analysis.storeName,
      period: analysis.period,
      summary: {
        totalSalesCount: analysis.totalSalesCount,
        totalSalesAmount: `￥${analysis.totalSalesAmount.toLocaleString()}`,
        regularSalesCount: analysis.regularSalesCount,
        regularSalesRate: `${analysis.regularSalesRate}%`,
        discountSalesCount: analysis.discountSalesCount,
        totalDiscountLoss: `￥${analysis.totalDiscountLoss.toLocaleString()}`,
      },
      topDiscountedProducts: analysis.topDiscountedProducts.slice(0, 5),
      hourlyConcentration: analysis.hourlyDiscountDistribution.slice(0, 3),
      departmentSummary: analysis.departmentSummary.slice(0, 5),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
