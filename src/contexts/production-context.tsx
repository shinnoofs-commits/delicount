'use client';

import type { ProductionEntry } from '@/lib/types';
import React, { createContext, useState, useContext, useCallback, useEffect, useMemo } from 'react';
import { useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { useAdmin } from '@/hooks/use-admin';
import { useStores } from './store-context';
import { useStoreSelection } from './store-selection-context';
import { collection, doc, setDoc, onSnapshot, query, Unsubscribe } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ProductionContextType {
  productionEntries: ProductionEntry[];
  loading: boolean;
  addProductionEntry: (productionEntry: Omit<ProductionEntry, 'id' | 'userId'>) => Promise<void>;
}

export const ProductionContext = createContext<ProductionContextType | undefined>(undefined);

export function ProductionProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { isAdmin, isAdminLoading } = useAdmin();
  const { userStore, loading: storesLoading } = useStores();
  const { selectedStoreIds } = useStoreSelection();
  
  const [productionEntries, setProductionEntries] = useState<ProductionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !user || isUserLoading || isAdminLoading || storesLoading) return;
    
    setProductionEntries([]);
    setLoading(true);
    
    // 重複を排除した店舗IDリスト
    const uniqueStoreIds = Array.from(new Set(isAdmin ? selectedStoreIds : (userStore ? [userStore.id] : [])));
    
    if (uniqueStoreIds.length === 0) {
      setLoading(false);
      return;
    }
    
    const unsubscribers: Unsubscribe[] = [];

    uniqueStoreIds.forEach(storeId => {
      const q = query(collection(firestore, 'stores', storeId, 'production'));
      const unsub = onSnapshot(q, (snapshot) => {
        setProductionEntries(prev => {
          const otherEntries = prev.filter(e => e.storeId !== storeId);
          const currentStoreEntries = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              storeId,
              date: data.date.toDate(),
            } as ProductionEntry;
          });
          return [...otherEntries, ...currentStoreEntries];
        });
        setLoading(false);
      }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `stores/${storeId}/production`, operation: 'list' }));
        setLoading(false);
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach(unsub => unsub());

  }, [firestore, user, isUserLoading, isAdmin, isAdminLoading, userStore, selectedStoreIds, storesLoading]);


  const addProductionEntry = useCallback(async (productionEntryData: Omit<ProductionEntry, 'id' | 'userId'>) => {
    if (!firestore || !user) return;

    // 日付に基づいた固定IDを使用することで、1日1件の確定データとして上書き保存する（二重計上防止）
    const dateId = format(productionEntryData.date, 'yyyy-MM-dd');
    const entryRef = doc(firestore, 'stores', productionEntryData.storeId, 'production', dateId);
    
    const newEntry = {
      ...productionEntryData,
      userId: user.uid,
    };
    
    try {
      await setDoc(entryRef, newEntry);
      toast({ 
        title: '製造実績を記録しました', 
        description: `計 ${productionEntryData.totalProductionCount.toLocaleString()} 個を確定しました。` 
      });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: entryRef.path, 
        operation: 'write', 
        requestResourceData: newEntry,
      }));
    }
  }, [firestore, user, toast]);


  const value = useMemo(() => ({ 
    productionEntries, 
    loading,
    addProductionEntry,
  }), [productionEntries, loading, addProductionEntry]);

  return (
    <ProductionContext.Provider value={value}>
      {children}
    </ProductionContext.Provider>
  );
}

export function useProduction() {
  const context = useContext(ProductionContext);
  if (context === undefined) {
    throw new Error('useProduction must be used within a ProductionProvider');
  }
  return context;
}
