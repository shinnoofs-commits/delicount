'use client';

import type { ProductionEntry } from '@/lib/types';
import React, { createContext, useState, useContext, useCallback, useEffect, useMemo } from 'react';
import { useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { useAdmin } from '@/hooks/use-admin';
import { useStores } from './store-context';
import { useStoreSelection } from './store-selection-context';
import { collection, addDoc, onSnapshot, query, Unsubscribe } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface ProductionContextType {
  productionEntries: ProductionEntry[];
  loading: boolean;
  addProductionEntry: (productionEntry: Omit<ProductionEntry, 'id' | 'userId'>) => void;
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
    
    // リセットして二重計上を防ぐ
    setProductionEntries([]);
    setLoading(true);
    
    const storeIdsToFetch = isAdmin ? selectedStoreIds : (userStore ? [userStore.id] : []);
    
    if (storeIdsToFetch.length === 0) {
      setLoading(false);
      return;
    }
    
    const unsubscribers: Unsubscribe[] = [];

    storeIdsToFetch.forEach(storeId => {
      const q = query(collection(firestore, 'stores', storeId, 'production'));
      const unsub = onSnapshot(q, (snapshot) => {
        setProductionEntries(prev => {
          const otherEntries = prev.filter(e => e.storeId !== storeId);
          const currentStoreEntries = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
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


  const addProductionEntry = useCallback((productionEntryData: Omit<ProductionEntry, 'id' | 'userId'>) => {
    if (!firestore || !user) return;

    const productionCollection = collection(firestore, 'stores', productionEntryData.storeId, 'production');
    const newEntry = {
      ...productionEntryData,
      userId: user.uid,
    };
    
    addDoc(productionCollection, newEntry)
      .then(() => {
        toast({ title: '製造数を記録しました', description: `合計製造数 ${productionEntryData.totalProductionCount.toLocaleString()} 個が記録されました` });
      })
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: productionCollection.path, 
          operation: 'create', 
          requestResourceData: newEntry,
        }));
      });
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
