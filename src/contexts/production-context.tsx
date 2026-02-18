'use client';

import type { ProductionEntry } from '@/lib/types';
import React, { createContext, useState, useContext, useCallback, useEffect, useMemo } from 'react';
import { useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { useAdmin } from '@/hooks/use-admin';
import { useStores } from './store-context';
import { useStoreSelection } from './store-selection-context';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface ProductionContextType {
  productionEntries: ProductionEntry[];
  loading: boolean;
  addProductionEntry: (productionEntry: Omit<ProductionEntry, 'id' | 'userId'>) => void;
  refetchProductionEntries: () => void;
}

export const ProductionContext = createContext<ProductionContextType | undefined>(undefined);

export function ProductionProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const { userStore } = useStores();
  const { selectedStoreIds } = useStoreSelection();
  
  const [productionEntries, setProductionEntries] = useState<ProductionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);

  const refetchProductionEntries = useCallback(() => setRefreshCount(c => c + 1), []);

  useEffect(() => {
    if (!firestore) return;
    
    const fetchProductionEntries = async () => {
      setLoading(true);
      const storeIdsToFetch = isAdmin ? selectedStoreIds : (userStore ? [userStore.id] : []);
      
      if (storeIdsToFetch.length === 0) {
        setProductionEntries([]);
        setLoading(false);
        return;
      }
      
      try {
        const productionPromises = storeIdsToFetch.map(storeId => 
          getDocs(collection(firestore, 'stores', storeId, 'production'))
        );
        
        const productionSnapshots = await Promise.all(productionPromises);

        const allProductionEntries = productionSnapshots.flatMap(snapshot => {
          return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              date: data.date.toDate(),
            } as ProductionEntry;
          });
        });

        setProductionEntries(allProductionEntries);

      } catch (error) {
        if (error instanceof Error && (error.message.includes('permission-denied') || (error as any).code === 'permission-denied')) {
           errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'stores/{storeId}/production', operation: 'list' }));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProductionEntries();

  }, [firestore, isAdmin, userStore, selectedStoreIds, refreshCount]);


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
        refetchProductionEntries();
      })
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: productionCollection.path, 
          operation: 'create', 
          requestResourceData: newEntry,
        }));
      });
  }, [firestore, user, toast, refetchProductionEntries]);


  const value = useMemo(() => ({ 
    productionEntries, 
    loading,
    addProductionEntry,
    refetchProductionEntries,
  }), [productionEntries, loading, addProductionEntry, refetchProductionEntries]);

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

    