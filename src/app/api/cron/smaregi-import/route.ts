import { NextRequest, NextResponse } from 'next/server';
import { getSmaregiAccessToken, fetchTransactions, transformSmaregiTransaction } from '@/lib/smaregi';
import { adminDb } from '@/lib/firebase-admin';
import { Transaction } from '@/lib/types';
import { syncDailyProductionToDeliSupporter } from '@/lib/sync-delisupporter';

export const maxDuration = 300; // Allow execution up to 5 minutes if on Vercel or App Hosting (requires correct billing setup)

export async function GET(request: NextRequest) {
  // 1. Verify the Cron Secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Determine target date (Default to today JST)
    const url = new URL(request.url);
    const now = new Date();
    let targetDateStr = url.searchParams.get('date');
    if (!targetDateStr) {
      // Get today's date in JST, but shift by 4 hours so that early morning runs (e.g., 1:00 AM)
      // fetch data for the "previous day" (business day).
      // UTC + 9 hours for JST, minus 4 hours for business day cutoff
      const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000) - (4 * 60 * 60 * 1000));
      targetDateStr = jstDate.toISOString().split('T')[0];
    }

    console.log(`Starting Smaregi Import for date: ${targetDateStr}`);

    // 3. Get Smaregi Access Token
    const accessToken = await getSmaregiAccessToken();

    // 4. Fetch Transactions from Smaregi
    // Note: If you have multiple stores on the same contract, you might need to filter by store ID.
    // For now, we fetch all transactions for the contract.
    const transactionsData = await fetchTransactions(targetDateStr, accessToken);
    const smaregiTransactions = transactionsData || []; // Adjust based on actual API response structure

    // Assuming smaregiTransactions is an array of transactions
    // 5. Transform and save to Firestore
    
    // Get all stores from Firestore to map store IDs
    const storesSnap = await adminDb.collection('stores').get();
    
    // Map Smaregi Store ID to Firebase Store ID
    // Based on previous CSV import mapping: 1=港南台, 2=本厚木, 3=西川口
    const smaregiIdToFbId = new Map<string, string>();
    
    storesSnap.forEach(doc => {
      const storeName = doc.data().name || '';
      if (storeName.includes('港南台')) {
        smaregiIdToFbId.set('1', doc.id);
      } else if (storeName.includes('本厚木')) {
        smaregiIdToFbId.set('2', doc.id);
      } else if (storeName.includes('西川口')) {
        smaregiIdToFbId.set('3', doc.id);
      } else if (doc.data().smaregiStoreId) {
        smaregiIdToFbId.set(String(doc.data().smaregiStoreId), doc.id);
      }
    });

    const storeDailyGroups = new Map<string, Transaction[]>(); // storeId -> Array of Transactions

    for (const sTx of smaregiTransactions) {
      // Map Smaregi store ID
      const sStoreId = String(sTx.storeId);
      const fbStoreId = smaregiIdToFbId.get(sStoreId);
      
      // If store is not mapped, we skip importing those transactions to avoid mixing data
      if (!fbStoreId) continue;

      const tx = transformSmaregiTransaction(sTx, fbStoreId);
      
      if (!tx) continue;

      if (!storeDailyGroups.has(fbStoreId)) {
        storeDailyGroups.set(fbStoreId, []);
      }
      storeDailyGroups.get(fbStoreId)!.push(tx);
    }

    // Write to Firestore using batches
    let opCount = 0;
    let batch = adminDb.batch();

    for (const [storeId, txs] of storeDailyGroups.entries()) {
      const boxRef = adminDb.collection('stores').doc(storeId).collection('daily_transactions').doc(targetDateStr);
      
      // Since the API returns the full source of truth for the day, and we want to remove
      // transactions that were canceled (which are filtered out and thus not in `txs`),
      // we completely overwrite the day's transactions instead of merging.
      const finalTxs: Transaction[] = txs;

      
      batch.set(boxRef, {
         id: targetDateStr,
         storeId,
         date: new Date(targetDateStr), // Using JS Date, firebase-admin will save as Timestamp
         transactions: finalTxs
      }, { merge: true });
      
      opCount++;
      if (opCount >= 490) {
        await batch.commit();
        batch = adminDb.batch();
        opCount = 0;
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }

    // 6. DeliSupporterへの実績連携（夜間締め実行時のみ、または明示的パラメータ指定時）
    const nowJstHour = (now.getUTCHours() + 9) % 24;
    const isEodRun = url.searchParams.get('syncDeliSupporter') === 'true' || (nowJstHour >= 21 || nowJstHour <= 5);
    const isAutoSyncEnabled = process.env.AUTO_SYNC_DELISUPPORTER !== 'false';

    const syncResults: any[] = [];

    if (isEodRun && isAutoSyncEnabled && storeDailyGroups.size > 0) {
      console.log(`[Auto-Sync] Triggering DeliSupporter actuals sync for date: ${targetDateStr}`);
      for (const storeId of storeDailyGroups.keys()) {
        try {
          const syncRes = await syncDailyProductionToDeliSupporter({
            storeId,
            date: targetDateStr,
            dryRun: false,
          });
          syncResults.push({ storeId, status: 'success', summary: syncRes.summary });
        } catch (syncErr: any) {
          console.error(`[Auto-Sync] Failed to sync store ${storeId} to DeliSupporter:`, syncErr);
          syncResults.push({ storeId, status: 'error', error: syncErr.message });
        }
      }
    }

    console.log(`Successfully imported ${smaregiTransactions.length} transactions.`);
    return NextResponse.json({
      success: true,
      count: smaregiTransactions.length,
      date: targetDateStr,
      delisupporterSync: syncResults.length > 0 ? syncResults : undefined,
    });

  } catch (error: any) {
    console.error('Smaregi Import Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
