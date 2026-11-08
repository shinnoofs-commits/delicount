import { NextRequest, NextResponse } from 'next/server';
import {
  DELICOUNT_TO_DELISUPPORTER_STORES,
  syncDailyProductionToDeliSupporter,
} from '@/lib/sync-delisupporter';

export const maxDuration = 180;

/**
 * POST /api/sync-delisupporter
 * Body:
 * {
 *   storeId?: string, // e.g. "MyIPMYpz2OvqHJFH4zwc" or "hon-atsugi" (omitted = all active stores)
 *   date?: string,    // "YYYY-MM-DD" (omitted = yesterday JST)
 *   dryRun?: boolean  // default: false
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { storeId, dryRun = false } = body;

    let targetDate = body.date;
    if (!targetDate) {
      // Default to yesterday in JST
      const now = new Date();
      const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
      targetDate = jstDate.toISOString().split('T')[0];
    }

    const targetStoreIds = storeId
      ? [storeId]
      : Object.keys(DELICOUNT_TO_DELISUPPORTER_STORES);

    const results = [];

    for (const sid of targetStoreIds) {
      try {
        const res = await syncDailyProductionToDeliSupporter({
          storeId: sid,
          date: targetDate,
          dryRun: Boolean(dryRun),
        });
        results.push({ storeId: sid, status: 'success', data: res });
      } catch (err: any) {
        console.error(`Sync failed for store ${sid}:`, err);
        results.push({ storeId: sid, status: 'error', error: err.message });
      }
    }

    const hasErrors = results.some(r => r.status === 'error');
    return NextResponse.json(
      {
        success: !hasErrors,
        targetDate,
        dryRun: Boolean(dryRun),
        results,
      },
      { status: hasErrors ? 207 : 200 }
    );
  } catch (err: any) {
    console.error('Error in /api/sync-delisupporter:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
