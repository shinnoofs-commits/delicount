import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stores = await adminDb.collection('stores').get();
    let totalAdded = 0;
    const details: any = {};
    
    for (const store of stores.docs) {
      const posSnap = await store.ref.collection('daily_transactions').get();
      const posProducts = new Map();
      for (const doc of posSnap.docs) {
        const txs = doc.data().transactions || [];
        for (const tx of txs) {
          for (const item of tx.items) {
            posProducts.set(item.productId, item);
          }
        }
      }
      
      const boxesSnap = await store.ref.collection('product_boxes').get();
      const existingCodes = new Set();
      const existingIds = new Set();
      for (const box of boxesSnap.docs) {
        const prods = box.data().products || [];
        for (const p of prods) {
          existingCodes.add(String(p.productCode || '').replace(/^0+/, ''));
          existingIds.add(String(p.id));
        }
      }
      
      const missing = [];
      for (const [id, item] of posProducts.entries()) {
        const pCode = String(item.productCode || '').replace(/^0+/, '');
        if (!existingIds.has(String(id)) && (!pCode || !existingCodes.has(pCode))) {
          missing.push(item);
        }
      }
      
      if (missing.length > 0) {
        // "未分類" (Uncategorized)
        const boxRef = store.ref.collection('product_boxes').doc('\u672A\u5206\u985E');
        const boxSnap = await boxRef.get();
        const existing = boxSnap.exists ? (boxSnap.data()?.products || []) : [];
        
        const newProds = missing.map(m => ({
          id: m.productId,
          name: m.name || '',
          price: m.unitPrice || 0,
          productCode: m.productCode || '',
          category: '\u672A\u5206\u985E',
          isActive: false
        }));
        
        await boxRef.set({
          id: '\u672A\u5206\u985E',
          storeId: store.id,
          products: [...existing, ...newProds]
        }, { merge: true });
        
        totalAdded += missing.length;
        details[store.id] = missing.length;
      }
    }
    
    return NextResponse.json({ success: true, totalAdded, details });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
