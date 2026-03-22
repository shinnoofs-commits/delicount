'use client';

import type { Product, DailyProduction, DisplayTimeSlot } from '@/lib/types';
import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { collection, doc, addDoc, setDoc, writeBatch, query, where, getDocs, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/use-admin';
import { useStores } from './store-context';
import { useStoreSelection } from './store-selection-context';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  addProduct: (storeId: string, product: Omit<Product, 'id' | 'storeId' | 'dailyProductionSunny' | 'dailyProductionRainy'>) => Promise<void>;
  updateProduct: (storeId: string, product: Product) => Promise<void>;
  deleteProducts: (storeId: string, productIds: string[]) => void;
  importProductsFromCSV: (products: Omit<Product, 'id' | 'storeId'>[]) => void;
  syncAllProducts: (sourceStoreId: string) => Promise<void>;
  updateSchedules: (storeId: string, schedules: Record<string, Partial<DailyProduction>>, weatherPattern: 'sunny' | 'rainy', timeSlots?: Record<string, DisplayTimeSlot[]>) => Promise<void>;
  bulkUpdateProducts: (storeId: string, productsToUpdate: Pick<Product, 'id' | 'category' | 'pricePattern'>[]) => Promise<void>;
  refetchProducts: () => void;
}

export const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { isAdmin, isAdminLoading } = useAdmin();
  const { userStore, stores, loading: storesLoading } = useStores();
  const { selectedStoreIds } = useStoreSelection();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(() => {
    if (!firestore || !user || isUserLoading || isAdminLoading || storesLoading) return;

    // 店舗選択が変更されたタイミングで、一旦リストを空にして二重計上を防ぐ
    setProducts([]);
    setLoading(true);
    
    const storeIdsToFetch = isAdmin ? selectedStoreIds : (userStore ? [userStore.id] : []);

    if (storeIdsToFetch.length === 0) {
      setLoading(false);
      return;
    }
    
    const unsubscribers: Unsubscribe[] = [];

    storeIdsToFetch.forEach(storeId => {
      const q = query(collection(firestore, 'stores', storeId, 'products'));
      const unsub = onSnapshot(q, (snapshot) => {
        setProducts(prev => {
          const otherProducts = prev.filter(p => p.storeId !== storeId);
          const currentStoreProducts = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(), 
            storeId 
          } as Product));
          return [...otherProducts, ...currentStoreProducts];
        });
        setLoading(false);
      }, (error) => {
        if (user) {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `stores/${storeId}/products`, operation: 'list' }));
        }
        setLoading(false);
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach(unsub => unsub());
    
  }, [firestore, user, isUserLoading, isAdmin, isAdminLoading, userStore, selectedStoreIds, storesLoading]);

  useEffect(() => {
    if (user && !isUserLoading) {
      const unsub = fetchProducts();
      return () => unsub?.();
    }
  }, [fetchProducts, user, isUserLoading]);

  const saveAdminProduct = useCallback(async (productData: Omit<Product, 'id' | 'storeId'>) => {
    if (!firestore || !stores || stores.length === 0) return;
    const processingToast = toast({ title: '全店舗の商品を同期中...' });
    try {
        const batch = writeBatch(firestore);
        for (const store of stores) {
            const productsCollection = collection(firestore, 'stores', store.id, 'products');
            const q = query(productsCollection, where('productCode', '==', productData.productCode));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                const newDocRef = doc(productsCollection);
                batch.set(newDocRef, productData);
            } else {
                querySnapshot.forEach(docToUpdate => {
                    batch.update(docToUpdate.ref, productData as {[x: string]: any});
                });
            }
        }
        await batch.commit();
        processingToast.dismiss();
        toast({ title: "同期完了" });
    } catch(e) {
        processingToast.dismiss();
    }
  }, [firestore, stores, toast]);

  const addProduct = useCallback(async (storeId: string, productData: Omit<Product, 'id' | 'storeId'>) => {
    const dataWithSchedules = {
      ...productData,
      dailyProductionSunny: productData.dailyProductionSunny || { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, holiday: 0 },
      dailyProductionRainy: productData.dailyProductionRainy || { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, holiday: 0 }
    };
    if (isAdmin) {
        await saveAdminProduct(dataWithSchedules);
    } else {
        if (!firestore) return;
        const productsCollection = collection(firestore, 'stores', storeId, 'products');
        addDoc(productsCollection, dataWithSchedules).then(() => {
            toast({ title: "商品を追加しました" });
        });
    }
  }, [firestore, toast, isAdmin, saveAdminProduct]);

  const updateProduct = useCallback(async (storeId: string, productData: Product) => {
    if (isAdmin) {
        const { id, storeId: _storeId, ...dataToSync } = productData;
        await saveAdminProduct(dataToSync);
    } else {
        if (!firestore) return;
        const { id, ...data } = productData;
        const productRef = doc(firestore, 'stores', storeId, 'products', id);
        setDoc(productRef, data, { merge: true }).then(() => {
            toast({ title: "更新完了" });
        });
    }
  }, [firestore, toast, isAdmin, saveAdminProduct]);

  const deleteProducts = useCallback((storeId: string, productIds: string[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    productIds.forEach(productId => {
      batch.delete(doc(firestore, 'stores', storeId, 'products', productId));
    });
    batch.commit().then(() => toast({ title: "削除完了" }));
  }, [firestore, toast]);

  const updateSchedules = useCallback(async (storeId: string, schedules: Record<string, Partial<DailyProduction>>, weatherPattern: 'sunny' | 'rainy', timeSlots?: Record<string, DisplayTimeSlot[]>) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const key = weatherPattern === 'rainy' ? 'dailyProductionRainy' : 'dailyProductionSunny';
    Object.entries(schedules).forEach(([productId, dailyProduction]) => {
      const productRef = doc(firestore, 'stores', storeId, 'products', productId);
      const updateData: any = { [key]: dailyProduction };
      if (timeSlots && timeSlots[productId]) {
        updateData.displayTimeSlots = timeSlots[productId];
      }
      batch.update(productRef, updateData);
    });
    try {
      await batch.commit();
      toast({ title: "製造計画を保存しました。" });
    } catch (e) {
      toast({ variant: 'destructive', title: '保存エラー' });
    }
  }, [firestore, toast]);

  const bulkUpdateProducts = useCallback(async (storeId: string, productsToUpdate: Pick<Product, 'id' | 'category' | 'pricePattern'>[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    productsToUpdate.forEach(p => {
      batch.update(doc(firestore, 'stores', storeId, 'products', p.id), { category: p.category, pricePattern: p.pricePattern });
    });
    await batch.commit();
    toast({ title: "一括更新完了" });
  }, [firestore, toast]);

  const importProductsFromCSV = useCallback(async (newProducts: Omit<Product, 'id' | 'storeId'>[]) => {
    if (!firestore || !userStore) return;
    const batch = writeBatch(firestore);
    newProducts.forEach(product => {
        const newDocRef = doc(collection(firestore, 'stores', userStore.id, 'products'));
        batch.set(newDocRef, {
            ...product,
            dailyProductionSunny: { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, holiday: 0 },
            dailyProductionRainy: { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, holiday: 0 }
        });
    });
    await batch.commit();
    toast({ title: "CSVインポート完了" });
  }, [firestore, userStore, toast]);

  const syncAllProducts = useCallback(async (sourceStoreId: string) => {
    if (!firestore || !isAdmin || !stores) return;
    const sourceProducts = products.filter(p => p.storeId === sourceStoreId);
    const processingToast = toast({ title: '全店舗へ商品データを同期中...' });
    try {
        for (const store of stores) {
            if (store.id === sourceStoreId) continue;
            const batch = writeBatch(firestore);
            const targetProductsCollection = collection(firestore, 'stores', store.id, 'products');
            for (const srcProd of sourceProducts) {
                const { id, storeId: _, ...data } = srcProd;
                const q = query(targetProductsCollection, where('productCode', '==', srcProd.productCode));
                const snap = await getDocs(q);
                if (snap.empty) {
                    batch.set(doc(targetProductsCollection), data);
                } else {
                    snap.forEach(d => batch.update(d.ref, data as any));
                }
            }
            await batch.commit();
        }
        processingToast.dismiss();
        toast({ title: "全店舗の同期が完了しました" });
    } catch (e) {
        processingToast.dismiss();
        toast({ variant: 'destructive', title: "同期エラー" });
    }
  }, [firestore, isAdmin, stores, products, toast]);

  const value = useMemo(() => ({
    products,
    loading,
    addProduct,
    updateProduct,
    deleteProducts,
    importProductsFromCSV,
    syncAllProducts,
    updateSchedules,
    bulkUpdateProducts,
    refetchProducts: fetchProducts,
  }), [products, loading, addProduct, updateProduct, deleteProducts, importProductsFromCSV, syncAllProducts, updateSchedules, bulkUpdateProducts, fetchProducts]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) throw new Error('useProducts must be used within a ProductProvider');
  return context;
}
