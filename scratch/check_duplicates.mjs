import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
dotenv.config();

try { initializeApp({ projectId: "ver41-13613744-4a01f" }); } catch (e) {}
const db = getFirestore();

async function check() {
  const stores = await db.collection("stores").get();
  for (const s of stores.docs) {
    console.log(`Store: ${s.data().name}`);
    const boxes = await db.collection(`stores/${s.id}/product_boxes`).get();
    for (const b of boxes.docs) {
      const prods = b.data().products || [];
      for (const p of prods) {
        if (String(p.productCode) === "20331" || String(p.productCode) === "11102" || String(p.name).includes("八丁味噌") || String(p.name).includes("ひじきおこわ") || String(p.name).includes("横濱醤油唐揚げ")) {
          console.log(`  - Code: ${p.productCode}, Name: ${p.name}, Category: ${p.category}, ID: ${p.id}`);
        }
      }
    }
  }
}
check().catch(console.error);
