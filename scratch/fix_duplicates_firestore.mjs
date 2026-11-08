import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

let app;
try {
  // Try to use service account key from .env if available
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: "ver41-13613744-4a01f"
    });
  } else {
    throw new Error("No FIREBASE_SERVICE_ACCOUNT_KEY in .env");
  }
} catch (e) {
  console.error("Error initializing Firebase Admin:", e.message);
  process.exit(1);
}

const db = getFirestore(app);

async function fixDuplicates() {
  const stores = await db.collection("stores").get();
  
  for (const s of stores.docs) {
    console.log(`Processing Store: ${s.data().name} (${s.id})`);
    const boxes = await db.collection(`stores/${s.id}/product_boxes`).get();
    
    for (const b of boxes.docs) {
      const data = b.data();
      const prods = data.products || [];
      let changed = false;
      
      const updatedProds = prods.map(p => {
        let newP = { ...p };
        const name = String(p.name || "");
        
        // Rule 1: 20331 duplicates
        if (name.includes("八丁味噌の豚串カツ")) {
          if (newP.productCode !== "20331-1") {
            console.log(`  Updating ${name} code to 20331-1`);
            newP.productCode = "20331-1";
            changed = true;
          }
        } else if (name.includes("横濱醤油唐揚げ（3個") || name.includes("横濱醤油唐揚げ(3個")) {
          if (newP.productCode !== "20331") {
            console.log(`  Updating ${name} code to 20331`);
            newP.productCode = "20331";
            changed = true;
          }
        }
        
        // Rule 2: 11102 duplicates
        if (name === "ひじきおこわ") {
          if (newP.productCode !== "11102-1") {
            console.log(`  Updating ${name} code to 11102-1`);
            newP.productCode = "11102-1";
            changed = true;
          }
        } else if (name.includes("ひじきおこわ300g") || name.includes("ひじきおこわ　300g")) {
          if (newP.productCode !== "11102") {
            console.log(`  Updating ${name} code to 11102`);
            newP.productCode = "11102";
            changed = true;
          }
        }
        
        return newP;
      });
      
      if (changed) {
        console.log(`  Saving updates to box: ${b.id}`);
        await b.ref.update({ products: updatedProds });
      }
    }
  }
  console.log("Done.");
}

fixDuplicates().catch(console.error);
