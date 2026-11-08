import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
dotenv.config(); // load .env if any

// We need to use FIREBASE_CONFIG or google application credentials, but for local tests we can try connecting via standard ADC
try {
  initializeApp({ projectId: "ver41-13613744-4a01f" });
} catch (e) {
  // If no ADC is found, it will fail.
  console.log("Initialize App failed", e);
}

const db = getFirestore();
async function check() {
  const stores = await db.collection("stores").get();
  let found = 0;
  let noCode = 0;
  for (const s of stores.docs) {
    const boxes = await db.collection(`stores/${s.id}/product_boxes`).get();
    for (const b of boxes.docs) {
      const products = b.data().products || [];
      for (const p of products) {
        if (p.name === "あじの甘酢あんかけ" || p.name.includes("バンドル値引")) {
          console.log(s.id, p.name, "productCode:", p.productCode);
          found++;
        }
        if (!p.productCode) {
          noCode++;
        }
      }
    }
  }
  console.log("Total matched:", found, "Total missing code overall:", noCode);
}
check().catch(console.error);
