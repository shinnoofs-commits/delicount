import { Firestore, collection, getDocs, writeBatch, doc, query, orderBy, limit, addDoc, deleteDoc, Timestamp, setDoc } from 'firebase/firestore';
import { FirebaseStorage, ref, uploadBytes, getDownloadURL, deleteObject, getBytes } from 'firebase/storage';
import { Transaction } from './types';

export interface POSBackupMetadata {
  id: string;
  timestamp: Date;
  transactionCount: number;
  fileName: string;
  storagePath: string;
}

export class POSBackupService {
  constructor(private firestore: Firestore, private storage: FirebaseStorage) {}

  /**
   * 現在の全取引データを取得してJSONファイルとしてバックアップ
   */
  async createBackup(storeId: string): Promise<string> {
    const txCollection = collection(this.firestore, 'stores', storeId, 'daily_transactions');
    const snapshot = await getDocs(txCollection);
    
    let totalTransactionCount = 0;
    const transactions = snapshot.docs.map(d => {
      const data = d.data();
      const txs = data.transactions || [];
      totalTransactionCount += txs.length;
      return {
        ...data,
        id: d.id,
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
        transactions: txs.map((t: any) => ({
           ...t,
           date: t.date?.toDate ? t.date.toDate().toISOString() : t.date
        }))
      };
    });

    if (transactions.length === 0) {
      return 'No data to backup';
    }

    const timestamp = new Date();
    const fileName = `pos_backup_${timestamp.getTime()}.json`;
    const storagePath = `stores/${storeId}/backups/${fileName}`;
    const storageRef = ref(this.storage, storagePath);

    // JSON化してアップロード
    const jsonStr = JSON.stringify(transactions);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    await uploadBytes(storageRef, blob);

    // メタデータをFirestoreに保存
    const metadataCollection = collection(this.firestore, 'stores', storeId, 'pos_backup_metadata');
    await addDoc(metadataCollection, {
      timestamp: Timestamp.fromDate(timestamp),
      transactionCount: totalTransactionCount,
      fileName,
      storagePath
    });

    // 5件を超えた古いバックアップを削除
    await this.cleanupOldBackups(storeId);

    return storagePath;
  }

  /**
   * バックアップ履歴の取得（最新5件程度）
   */
  async listBackups(storeId: string): Promise<POSBackupMetadata[]> {
    const metadataCollection = collection(this.firestore, 'stores', storeId, 'pos_backup_metadata');
    const q = query(metadataCollection, orderBy('timestamp', 'desc'), limit(10)); // 少し多めに取って後で調整
    const snapshot = await getDocs(q);

    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp.toDate()
    } as POSBackupMetadata));
  }

  /**
   * 指定したバックアップから復元
   */
  async restoreBackup(storeId: string, backup: POSBackupMetadata): Promise<void> {
    const storageRef = ref(this.storage, backup.storagePath);
    const buffer = await getBytes(storageRef);
    const jsonStr = new TextDecoder().decode(buffer);
    const transactions = JSON.parse(jsonStr) as any[];

    // 1. 現在の取引データを削除
    const txCollection = collection(this.firestore, 'stores', storeId, 'daily_transactions');
    const currentSnapshot = await getDocs(txCollection);
    
    let batch = writeBatch(this.firestore);
    let count = 0;
    for (const d of currentSnapshot.docs) {
      batch.delete(d.ref);
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(this.firestore);
        count = 0;
      }
    }
    if (count > 0) await batch.commit();

    // 2. バックアップから復元
    batch = writeBatch(this.firestore);
    count = 0;
    for (const tx of transactions) {
      const txRef = doc(txCollection, tx.id);
      const { id: _, ...data } = tx;
      
      data.date = data.date ? Timestamp.fromDate(new Date(data.date)) : null;
      data.transactions = (data.transactions || []).map((t: any) => ({
         ...t,
         date: t.date ? Timestamp.fromDate(new Date(t.date)) : null
      }));
      
      batch.set(txRef, data);
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(this.firestore);
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
  }

  /**
   * バックアップの削除
   */
  async deleteBackup(storeId: string, backup: POSBackupMetadata): Promise<void> {
    // Storageから削除
    try {
      const storageRef = ref(this.storage, backup.storagePath);
      await deleteObject(storageRef);
    } catch (e) {
      console.warn("Storage item already deleted or missing", e);
    }

    // Firestoreからメタデータを削除
    const metadataRef = doc(this.firestore, 'stores', storeId, 'pos_backup_metadata', backup.id);
    await deleteDoc(metadataRef);
  }

  private async cleanupOldBackups(storeId: string) {
    const backups = await this.listBackups(storeId);
    if (backups.length > 5) {
      const toDelete = backups.slice(5);
      for (const b of toDelete) {
        await this.deleteBackup(storeId, b);
      }
    }
  }
}
