const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  const stores = await db.collection('stores').get();
  for (const store of stores.docs) {
    console.log("Checking store", store.id);
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
    console.log(`Found ${posProducts.size} unique products in POS for ${store.id}`);

    const boxesSnap = await store.ref.collection('product_boxes').get();
    const existingCodes = new Set();
    const existingIds = new Set();
    for (const box of boxesSnap.docs) {
      const prods = box.data().products || [];
      for (const p of prods) {
        existingCodes.add(String(p.productCode));
        existingIds.add(String(p.id));
      }
    }
    
    const missing = [];
    for (const [id, item] of posProducts.entries()) {
      if (!existingIds.has(String(id)) && !existingCodes.has(String(item.productCode))) {
        missing.push(item);
      }
    }
    
    console.log(`Missing ${missing.length} products to register for ${store.id}`);
    
    // Add to '未分類'
    if (missing.length > 0) {
      const boxRef = store.ref.collection('product_boxes').doc('未分類');
      const boxSnap = await boxRef.get();
      const existing = boxSnap.exists ? (boxSnap.data().products || []) : [];
      
      const newProds = missing.map(m => ({
        id: m.productId,
        name: m.name,
        price: m.unitPrice,
        productCode: m.productCode,
        category: "未分類",
        isActive: false
      }));
      
      await boxRef.set({
        id: "未分類",
        storeId: store.id,
        products: [...existing, ...newProds]
      }, { merge: true });
      console.log(`Added ${missing.length} products to 未分類 for ${store.id}`);
    }
  }
}
run().then(() => process.exit(0)).catch(console.error);
