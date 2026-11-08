import { adminDb } from '@/lib/firebase-admin';

export const DELICOUNT_TO_DELISUPPORTER_STORES: Record<string, { slug: string; name: string }> = {
  'MyIPMYpz2OvqHJFH4zwc': { slug: 'hon-atsugi', name: '本厚木' },
  '539lvCjZRUUrhxw1uy88': { slug: 'konandai', name: '港南台' },
  'vBENyaqdzHcG6upmNIj6': { slug: 'nishikawaguchi', name: '西川口' },
};

export interface DailyProductionItem {
  productCode: string;
  productName: string;
  sales: number;
  waste: number;
  quantity: number; // actual: sales + waste
}

export interface StoreDailyProductionResult {
  storeId: string;
  storeSlug: string;
  storeName: string;
  date: string;
  items: DailyProductionItem[];
}

export interface SyncDeliSupporterOptions {
  storeId: string; // DeliCount store doc ID or slug
  date: string;    // YYYY-MM-DD
  dryRun?: boolean;
  endpointUrl?: string;
  apiKey?: string;
}

/**
 * Aggregates daily actual production (sales from Smaregi transactions + POS waste)
 * for a specific store and date from DeliCount's Firestore.
 */
export async function getStoreDailyProduction(
  storeId: string,
  dateStr: string
): Promise<StoreDailyProductionResult> {
  const storeInfo = DELICOUNT_TO_DELISUPPORTER_STORES[storeId] || {
    slug: storeId,
    name: storeId,
  };

  const aggregated = new Map<string, { code: string; name: string; sales: number; waste: number }>();

  // 1. Fetch Daily Transactions for store & date
  const txRef = adminDb.collection('stores').doc(storeId).collection('daily_transactions').doc(dateStr);
  const txDoc = await txRef.get();

  if (txDoc.exists) {
    const txData = txDoc.data();
    const txs: any[] = txData?.transactions || [];
    for (const tx of txs) {
      const items: any[] = tx.items || [];
      for (const it of items) {
        const rawCode = it.productId || it.productCode || '';
        const normCode = String(rawCode).replace(/^0+/, '').trim();
        const pName = it.productName || it.name || '';
        const qty = Number(it.quantity) || 0;

        if (normCode) {
          if (!aggregated.has(normCode)) {
            aggregated.set(normCode, { code: normCode, name: pName, sales: 0, waste: 0 });
          }
          const cur = aggregated.get(normCode)!;
          cur.sales += qty;
          if (!cur.name && pName) cur.name = pName;
        }
      }
    }
  }

  // 2. Fetch Daily Waste for store & date
  const wasteRef = adminDb.collection('stores').doc(storeId).collection('daily_wastes').doc(dateStr);
  const wasteDoc = await wasteRef.get();

  if (wasteDoc.exists) {
    const wasteData = wasteDoc.data();
    const entries: any[] = wasteData?.entries || [];
    for (const entry of entries) {
      const items: any[] = entry.items || [];
      for (const it of items) {
        const rawCode = it.productCode || it.productId || '';
        const normCode = String(rawCode).replace(/^0+/, '').trim();
        const pName = it.name || it.productName || '';
        const qty = Number(it.quantity) || 0;

        if (normCode) {
          if (!aggregated.has(normCode)) {
            aggregated.set(normCode, { code: normCode, name: pName, sales: 0, waste: 0 });
          }
          const cur = aggregated.get(normCode)!;
          cur.waste += qty;
          if (!cur.name && pName) cur.name = pName;
        }
      }
    }
  }

  const items: DailyProductionItem[] = Array.from(aggregated.values()).map(a => ({
    productCode: a.code,
    productName: a.name,
    sales: a.sales,
    waste: a.waste,
    quantity: a.sales + a.waste,
  }));

  return {
    storeId,
    storeSlug: storeInfo.slug,
    storeName: storeInfo.name,
    date: dateStr,
    items,
  };
}

/**
 * Sends aggregated actual production data to DeliSupporter's sync endpoint.
 */
export async function syncDailyProductionToDeliSupporter(options: SyncDeliSupporterOptions) {
  const { storeId, date, dryRun = false } = options;
  const endpointUrl = options.endpointUrl ||
    process.env.DELISUPPORTER_SYNC_URL ||
    'https://asia-northeast1-fir-01278470-c0ea3.cloudfunctions.net/syncProductionActuals';
  const apiKey = options.apiKey ||
    process.env.DELISUPPORTER_SYNC_API_KEY ||
    'delicount-sync-secret-2026';

  // 1. Aggregate local DeliCount actuals
  const production = await getStoreDailyProduction(storeId, date);

  if (production.items.length === 0) {
    return {
      success: true,
      dryRun,
      storeId: production.storeSlug,
      date,
      message: 'No sales or waste data found for this store and date.',
      summary: { totalReceived: 0, matchedCount: 0, writtenCount: 0, skippedCount: 0 },
    };
  }

  // 2. Transmit to DeliSupporter
  const payload = {
    storeId: production.storeSlug,
    date,
    dryRun,
    items: production.items,
  };

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeliSupporter Sync API returned HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  return result;
}
