
'use client';

import type { Transaction, WasteEntry } from '@/lib/types';
import React, { createContext, useState, useContext, useCallback, useEffect, useMemo } from 'react';
import { useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { useAdmin } from '@/hooks/use-admin';
import { useStores } from './store-context';
import { useStoreSelection } from './store-selection-context';
import { collection, addDoc, serverTimestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface TransactionContextType {
  transactions: Transaction[];
  wasteEntries: WasteEntry[];
  loading: boolean;
  addWasteEntry: (wasteEntry: Omit<WasteEntry, 'id' | 'date'>) => void;
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

  useEffect(() => {
    if (!firestore) return;
    
    setLoading(true);
    const storeIdsToFetch = isAdmin ? selectedStoreIds : (userStore ? [userStore.id] : []);
    
    if (storeIdsToFetch.length === 0) {
      setWasteEntries([]);
      setLoading(false);
      return;
    }
    
    const unsubscribes: Unsubscribe[] = [];
    const allWasteEntries: { [storeId: string]: WasteEntry[] } = {};

    storeIdsToFetch.forEach(storeId => {
      const wasteCollection = collection(firestore, 'stores', storeId, 'waste');
      const unsubscribe = onSnapshot(wasteCollection, snapshot => {
        const storeWaste = snapshot.docs.map(doc => {
          const data = doc.data();
          return { 
            id: doc.id,
            ...data,
            date: data.date.toDate(),
           } as WasteEntry
        });

        allWasteEntries[storeId] = storeWaste;
        const flattenedWaste = Object.values(allWasteEntries).flat();
        setWasteEntries(flattenedWaste);
        setLoading(false);

      }, (error) => {
        console.error(`Error fetching waste entries for store ${storeId}:`, error);
        setLoading(false);
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    }

  }, [firestore, isAdmin, userStore, selectedStoreIds]);


  const addWasteEntry = useCallback((wasteEntryData: Omit<WasteEntry, 'id' | 'date'>) => {
    if (!firestore || !user) return;

    const wasteCollection = collection(firestore, 'stores', wasteEntryData.storeId, 'waste');
    const newEntry = {
      ...wasteEntryData,
      date: serverTimestamp(),
      userId: user.uid,
    };
    
    addDoc(wasteCollection, newEntry)
      .then(() => {
        toast({ title: '廃棄を記録しました', description: `合計廃棄額 ¥${wasteEntryData.totalWasteCost.toLocaleString()} が記録されました` });
      })
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: wasteCollection.path, 
          operation: 'create', 
          requestResourceData: newEntry,
        }));
      });
  }, [firestore, user, toast]);


  const value = useMemo(() => ({ 
    transactions: [], // Not used currently
    wasteEntries, 
    loading,
    addWasteEntry 
  }), [wasteEntries, loading, addWasteEntry]);

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
