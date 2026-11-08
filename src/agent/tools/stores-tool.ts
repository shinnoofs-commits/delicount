/**
 * @fileOverview Store List Tool for S-Count Agent (Read-Only)
 */

import { DelicountDataService } from '../data-service';

export const getStoresToolDeclaration = {
  name: 'getStores',
  description: 'デリカウントに登録されている店舗一覧（本厚木店、港南台店、西川口店など）を取得します。',
  parameters: {
    type: 'OBJECT',
    properties: {},
  },
};

export async function executeGetStores(service: DelicountDataService) {
  try {
    const stores = service.getStores();
    return {
      success: true,
      count: stores.length,
      stores: stores.map(s => ({
        storeId: s.id,
        storeCode: s.code,
        storeName: s.name,
        hasData: s.hasLocalData,
      })),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
