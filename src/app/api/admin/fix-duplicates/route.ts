import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const stores = await adminDb.collection("stores").get();
    const results = [];
    for (const s of stores.docs) {
      const boxes = await adminDb.collection(`stores/${s.id}/product_boxes`).get();
      for (const b of boxes.docs) {
        const prods = b.data().products || [];
        const seen = new Set();
        let changed = false;
        
        const duplicates = [];
        const updatedProds = prods.map((p: any) => {
          let newP = { ...p };
          const name = String(p.name || "");
          
          if (name.includes("八丁味噌の豚串カツ") && newP.productCode !== "20331-1") {
            newP.productCode = "20331-1";
            changed = true;
          } else if ((name.includes("横濱醤油唐揚げ（3個") || name.includes("横濱醤油唐揚げ(3個")) && newP.productCode !== "20331") {
            newP.productCode = "20331";
            changed = true;
          }
          
          if (name === "ひじきおこわ" && newP.productCode !== "11102-1") {
            newP.productCode = "11102-1";
            changed = true;
          } else if ((name.includes("ひじきおこわ300g") || name.includes("ひじきおこわ　300g")) && newP.productCode !== "11102") {
            newP.productCode = "11102";
            changed = true;
          }
          return newP;
        });

        if (changed) {
          await b.ref.update({ products: updatedProds });
          results.push({ store: s.data().name, box: b.id, updated: true });
        }
      }
    }
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
