
'use client';

import type { Transaction, WasteEntry } from '@/lib/types';
import React, { createContext, useState, useContext, useCallback, useEffect, useMemo } from 'react';
import { useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { useAdmin } from '@/hooks/use-admin';
import { useStores } from './store-context';
import { useStoreSelection } from './store-selection-context';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface TransactionContextType {
  transactions: Transaction[];
  wasteEntries: WasteEntry[];
  loading: boolean;
  addWasteEntry: (wasteEntry: Omit<WasteEntry, 'id' | 'userId'>) => void;
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

        const allWasteEntries = wasteSnapshots.flatMap(snapshot => {
          return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
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


  const value = useMemo(() => ({ 
    transactions: [], // Not used currently
    wasteEntries, 
    loading,
    addWasteEntry,
    refetchWasteEntries,
  }), [wasteEntries, loading, addWasteEntry, refetchWasteEntries]);

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

    