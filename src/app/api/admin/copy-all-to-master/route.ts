import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET() {
  try {
    const storesSnap = await adminDb.collection('stores').get();
    const stores: any[] = [];
    
    for (const doc of storesSnap.docs) {
      if (doc.id === 'master' || doc.data().isMaster) continue;
      stores.push({ id: doc.id, ...doc.data() });
    }

    // Prioritize admin / headquarters store
    stores.sort((a, b) => {
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      return String(a.name || '').localeCompare(String(b.name || ''), 'ja');
    });

    const masterMap = new Map<string, any>();
    const allCategories = new Set<string>();
    let totalScanned = 0;

    for (const store of stores) {
      const boxesSnap = await adminDb.collection(`stores/${store.id}/product_boxes`).get();
      for (const boxDoc of boxesSnap.docs) {
        const boxData = boxDoc.data();
        const boxCat = String(boxData.category || boxDoc.id || '未分類').trim();
        const prods = boxData.products || [];

        for (const p of prods) {
          totalScanned++;
          const pCode = String(p.productCode || '').trim();
          const pName = String(p.name || '').trim();
          const pCat = String(p.category || boxCat || '未分類').trim();
          if (pCat) allCategories.add(pCat);

          const key = pCode ? `code_${pCode}` : `name_${pName}`;
          if (!masterMap.has(key)) {
            masterMap.set(key, {
              ...p,
              id: p.id || `master_${pCode || Date.now()}`,
              storeId: 'master',
              category: pCat,
              isActive: p.isActive !== undefined ? p.isActive : true,
            });
          } else {
            const existing = masterMap.get(key);
            if (store.isAdmin) {
              existing.name = pName || existing.name;
              if (p.price) existing.price = p.price;
              if (p.costPrice) existing.costPrice = p.costPrice;
              if (p.pricePattern) existing.pricePattern = p.pricePattern;
              if (p.category) existing.category = pCat;
              if (p.isFixedPrice !== undefined) existing.isFixedPrice = p.isFixedPrice;
            } else {
              if (!existing.price && p.price) existing.price = p.price;
              if (!existing.costPrice && p.costPrice) existing.costPrice = p.costPrice;
              if (!existing.pricePattern && p.pricePattern) existing.pricePattern = p.pricePattern;
            }
            if ((!existing.materials || existing.materials.length === 0) && p.materials && p.materials.length > 0) {
              existing.materials = p.materials;
            }
            if ((!existing.containers || existing.containers.length === 0) && p.containers && p.containers.length > 0) {
              existing.containers = p.containers;
            }
          }
        }
      }
    }

    // Group by category
    const categoryGroups = new Map<string, any[]>();
    for (const prod of masterMap.values()) {
      const cat = prod.category || '未分類';
      if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
      const { storeId: _, ...clean } = prod;
      categoryGroups.get(cat)!.push(clean);
    }

    // Write to stores/master/product_boxes
    const batch = adminDb.batch();
    for (const [cat, prods] of categoryGroups.entries()) {
      const boxRef = adminDb.collection('stores/master/product_boxes').doc(cat);
      batch.set(boxRef, {
        id: cat,
        storeId: 'master',
        category: cat,
        products: prods,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    const masterDocRef = adminDb.collection('stores').doc('master');
    const sortedCategories = Array.from(allCategories).sort();
    batch.set(masterDocRef, {
      name: 'マスタ商品',
      isMaster: true,
      categories: sortedCategories,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    await batch.commit();

    return NextResponse.json({
      success: true,
      storesScanned: stores.length,
      totalScanned,
      masterCount: masterMap.size,
      categoriesCount: sortedCategories.length,
      categories: sortedCategories,
    });
  } catch (error: any) {
    console.error('copy-all-to-master API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
