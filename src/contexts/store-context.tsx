
'use client';

import type { Store } from '@/lib/types';
import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface StoreContextType {
  stores: Store[];
  loading: boolean;
  addStore: (store: Omit<Store, 'id'>) => void;
  updateStore: (store: Store) => void;
  deleteStore: (storeId: string) => void;
  getStoreById: (storeId: string) => Store | undefined;
}

export const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const storesCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'stores');
  }, [firestore]);

  const { data: stores, isLoading: loading } = useCollection<Omit<Store, 'id'>>(storesCollection);

  const addStore = useCallback(async (storeData: Omit<Store, 'id'>) => {
    if (!storesCollection) return;
    try {
      await addDoc(storesCollection, {
          ...storeData,
          createdAt: serverTimestamp(),
      });
      toast({ title: "店舗を追加しました", description: `「${storeData.name}」を登録しました。` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "エラー", description: error.message });
    }
  }, [storesCollection, toast]);

  const updateStore = useCallback(async (storeData: Store) => {
    if (!firestore) return;
    const storeRef = doc(firestore, 'stores', storeData.id);
    try {
        await setDoc(storeRef, {
            ...storeData
        }, { merge: true });
        toast({ title: "店舗情報を更新しました", description: `「${storeData.name}」を更新しました。` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "エラー", description: error.message });
    }
  }, [firestore, toast]);

  const deleteStore = useCallback(async (storeId: string) => {
    if (!firestore) return;
    const storeRef = doc(firestore, 'stores', storeId);
    try {
        await deleteDoc(storeRef);
        toast({ title: "店舗を削除しました" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "エラー", description: error.message });
    }
  }, [firestore, toast]);

  const getStoreById = useCallback((storeId: string) => {
      return stores?.find(s => s.id === storeId);
  }, [stores]);
  
  const value = useMemo(() => ({
    stores: stores || [],
    loading,
    addStore,
    updateStore,
    deleteStore,
    getStoreById
  }), [stores, loading, addStore, updateStore, deleteStore, getStoreById]);

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStores() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStores must be used within a StoreProvider');
  }
  return context;
}
