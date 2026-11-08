/**
 * @fileOverview Waste Reduction & Production Optimization Tool for S-Count Agent (Read-Only)
 */

import { DelicountDataService } from '../data-service';

export const getWasteOptimizationToolDeclaration = {
  name: 'getWasteOptimization',
  description: '店舗の廃棄ロス削減および製造ロット最適化のためのインサイト（過剰製造アラート・減産推奨品、即完売している攻めの増産推奨品、時間帯別改善策）を取得します。',
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

export async function executeGetWasteOptimization(
  service: DelicountDataService,
  args: { storeCode?: string }
) {
  try {
    const opt = service.getWasteOptimization(args.storeCode || 'hon-atsugi');
    return {
      success: true,
      storeName: opt.storeName,
      evaluatedPeriod: opt.evaluatedPeriod,
      overproductionAlerts: opt.overproductionAlerts,
      opportunityGainers: opt.opportunityGainers,
      actionableInsights: opt.actionableInsights,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
