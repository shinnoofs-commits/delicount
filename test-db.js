require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
}

const db = admin.firestore();

async function check() {
  const stores = ['1', '2', '3']; // just to find the store
  const storeQuery = await db.collection('stores').get();
  
  for (const doc of storeQuery.docs) {
    const txRef = db.collection('stores').doc(doc.id).collection('daily_transactions').doc('2026-07-14');
    const snap = await txRef.get();
    if (snap.exists) {
      const data = snap.data();
      const txs = data.transactions || [];
      console.log(`Store ${doc.data().name} has ${txs.length} transactions on 2026-07-14`);
      
      let targetCount = 0;
      let cancelCount = 0;
      let returnCount = 0;
      
      txs.forEach(tx => {
        let isCancel = false; // We don't have this field in `Transaction` type, but let's see if we missed it
        tx.items.forEach(item => {
          if (item.name.includes('横濱幕の内弁当')) {
            targetCount += item.quantity;
            console.log(`- Tx ${tx.id}: Qty ${item.quantity}`);
          }
        });
      });
      console.log(`Total 横濱幕の内弁当: ${targetCount}`);
    }
  }
}

check().catch(console.error);
