'use client';

import type { Transaction, WasteEntry, WasteItem } from '@/lib/types';
import React, { createContext, useState, useContext, useCallback, useEffect, useMemo } from 'react';
import { useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { useAdmin } from '@/hooks/use-admin';
import { useStores } from './store-context';
import { useStoreSelection } from './store-selection-context';
import { collection, addDoc, getDocs, doc, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface TransactionContextType {
  transactions: Transaction[];
  wasteEntries: WasteEntry[];
  loading: boolean;
  addWasteEntry: (wasteEntry: Omit<WasteEntry, 'id' | 'userId'>) => void;
  deleteWasteEntries: (storeId: string, entryIds: string[]) => Promise<void>;
  updateWasteEntry: (storeId: string, entryId: string, items: WasteItem[], totalWasteCost: number) => Promise<void>;
  refetchWasteEntries: () => void;
}

export const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const { userStore } = useStores();
  const { selectedStoreIds } = useStoreSelection();
  
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);

  const refetchWasteEntries = useCallback(() => setRefreshCount(c => c + 1), []);

  useEffect(() => {
    if (!firestore) return;
    
    const fetchWasteEntries = async () => {
      setLoading(true);
      const storeIdsToFetch = isAdmin ? selectedStoreIds : (userStore ? [userStore.id] : []);
      
      if (storeIdsToFetch.length === 0) {
        setWasteEntries([]);
        setLoading(false);
        return;
      }
      
      try {
        const wastePromises = storeIdsToFetch.map(storeId => 
          getDocs(collection(firestore, 'stores', storeId, 'waste'))
        );
        
        const wasteSnapshots = await Promise.all(wastePromises);

        const allWasteEntries = wasteSnapshots.flatMap((snapshot, index) => {
          const storeId = storeIdsToFetch[index];
          return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              storeId, // Ensure storeId is present
              date: data.date.toDate(),
            } as WasteEntry;
          });
        });

        setWasteEntries(allWasteEntries);

      } catch (error) {
        if (error instanceof Error && (error.message.includes('permission-denied') || (error as any).code === 'permission-denied')) {
           errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'stores/{storeId}/waste', operation: 'list' }));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWasteEntries();

  }, [firestore, isAdmin, userStore, selectedStoreIds, refreshCount]);


  const addWasteEntry = useCallback((wasteEntryData: Omit<WasteEntry, 'id' | 'userId'>) => {
    if (!firestore || !user) return;

    const wasteCollection = collection(firestore, 'stores', wasteEntryData.storeId, 'waste');
    const newEntry = {
      ...wasteEntryData,
      userId: user.uid,
    };
    
    addDoc(wasteCollection, newEntry)
      .then(() => {
        toast({ title: '廃棄を記録しました', description: `合計廃棄額 ¥${wasteEntryData.totalWasteCost.toLocaleString()} が記録されました` });
        refetchWasteEntries();
      })
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: wasteCollection.path, 
          operation: 'create', 
          requestResourceData: newEntry,
        }));
      });
  }, [firestore, user, toast, refetchWasteEntries]);

  const deleteWasteEntries = useCallback(async (storeId: string, entryIds: string[]) => {
    if (!firestore) return;
    
    const batch = writeBatch(firestore);
    entryIds.forEach(id => {
      const entryRef = doc(firestore, 'stores', storeId, 'waste', id);
      batch.delete(entryRef);
    });

    try {
      await batch.commit();
      toast({ title: `${entryIds.length}件のデータを削除しました` });
      refetchWasteEntries();
    } catch (error) {
       errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `stores/${storeId}/waste`,
          operation: 'delete',
        }));
    }
  }, [firestore, toast, refetchWasteEntries]);

  const updateWasteEntry = useCallback(async (storeId: string, entryId: string, items: WasteItem[], totalWasteCost: number) => {
    if (!firestore) return;
    const entryRef = doc(firestore, 'stores', storeId, 'waste', entryId);
    
    updateDoc(entryRef, {
      items,
      totalWasteCost
    }).then(() => {
      toast({ title: 'データを更新しました' });
      refetchWasteEntries();
    }).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: entryRef.path,
        operation: 'update',
        requestResourceData: { items, totalWasteCost }
      }));
    });
  }, [firestore, toast, refetchWasteEntries]);


  const value = useMemo(() => ({ 
    transactions: [], // Not used currently
    wasteEntries, 
    loading,
    addWasteEntry,
    deleteWasteEntries,
    updateWasteEntry,
    refetchWasteEntries,
  }), [wasteEntries, loading, addWasteEntry, deleteWasteEntries, updateWasteEntry, refetchWasteEntries]);

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}
