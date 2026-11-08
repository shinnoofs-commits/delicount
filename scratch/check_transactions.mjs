import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
dotenv.config();

try {
  initializeApp({ projectId: "ver41-13613744-4a01f" });
} catch (e) {}

const db = getFirestore();
async function check() {
  const dates = ['2026-07-16', '2026-07-17'];
  const stores = await db.collection("stores").get();
  
  for (const s of stores.docs) {
    console.log(`\n=== Store: ${s.data().name} (${s.id}) ===`);
    for (const d of dates) {
      const doc = await db.collection(`stores/${s.id}/daily_transactions`).doc(d).get();
      if (doc.exists) {
        const txs = doc.data().transactions || [];
        let itemsCount = 0;
        let missingCode = 0;
        let sampleMissing = null;
        for (const tx of txs) {
          for (const item of tx.items) {
            itemsCount++;
            if (!item.productCode) {
              missingCode++;
              if (!sampleMissing) sampleMissing = item;
            }
          }
        }
        console.log(`Date ${d}: ${txs.length} txs, ${itemsCount} items. Items missing productCode: ${missingCode}`);
        if (sampleMissing) {
          console.log(`  Sample missing: ${JSON.stringify(sampleMissing)}`);
        }
      } else {
        console.log(`Date ${d}: No data`);
      }
      
      const wasteDoc = await db.collection(`stores/${s.id}/daily_waste`).doc(d).get();
      if (wasteDoc.exists) {
        const entries = wasteDoc.data().entries || [];
        let wasteItemsCount = 0;
        let wasteMissingCode = 0;
        let sampleWasteMissing = null;
        for (const entry of entries) {
          for (const item of entry.items) {
            wasteItemsCount++;
            if (!item.productCode) {
              wasteMissingCode++;
              if (!sampleWasteMissing) sampleWasteMissing = item;
            }
          }
        }
        console.log(`Waste Date ${d}: ${wasteItemsCount} items. Missing productCode: ${wasteMissingCode}`);
        if (sampleWasteMissing) {
           console.log(`  Sample waste missing: ${JSON.stringify(sampleWasteMissing)}`);
        }
      }
    }
  }
}
check().catch(console.error);
