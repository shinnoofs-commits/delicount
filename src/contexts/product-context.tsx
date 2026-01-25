
'use client';

import type { Product } from '@/lib/types';
import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, addDoc, setDoc, deleteDoc, writeBatch, serverTimestamp, getDocs, query, where, Query, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/use-admin';
import { useStores } from './store-context';
import { useStoreSelection } from './store-selection-context';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  addProduct: (storeId: string, product: Omit<Product, 'id' | 'storeId'>) => void;
  updateProduct: (storeId: string, product: Product) => void;
  deleteProducts: (storeId: string, productIds: string[]) => void;
  importProductsFromCSV: (storeId: string, products: Omit<Product, 'id' | 'storeId'>[]) => void;
}

export const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const { userStore } = useStores();
  const { selectedStoreIds } = useStoreSelection();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    setLoading(true);

    const storeIdsToFetch = isAdmin ? selectedStoreIds : (userStore ? [userStore.id] : []);

    if (storeIdsToFetch.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const unsubscribes: Unsubscribe[] = [];
    const allProducts: { [storeId: string]: Product[] } = {};

    storeIdsToFetch.forEach(storeId => {
      const productsCollection = collection(firestore, 'stores', storeId, 'products');
      const unsubscribe = onSnapshot(productsCollection, (snapshot) => {
        const storeProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), storeId } as Product));
        allProducts[storeId] = storeProducts;

        const flattenedProducts = Object.values(allProducts).flat();
        setProducts(flattenedProducts);
        setLoading(false);

      }, (error) => {
        console.error(`Error fetching products for store ${storeId}:`, error);
        setLoading(false);
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [firestore, isAdmin, userStore, selectedStoreIds]);


  const addProduct = useCallback((storeId: string, productData: Omit<Product, 'id' | 'storeId'>) => {
    if (!firestore) return;
    const productsCollection = collection(firestore, 'stores', storeId, 'products');
    addDoc(productsCollection, productData)
      .then(() => {
        toast({ title: "商品を追加しました", description: `「${productData.name}」を登録しました。` });
      })
      .catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: productsCollection.path, operation: 'create', requestResourceData: productData,
        }));
    });
  }, [firestore, toast]);

  const updateProduct = useCallback((storeId: string, productData: Product) => {
    if (!firestore) return;
    const { id, ...data } = productData;
    const productRef = doc(firestore, 'stores', storeId, 'products', id);
    setDoc(productRef, data, { merge: true })
      .then(() => {
        toast({ title: "商品を更新しました", description: `「${productData.name}」を更新しました。` });
      })
      .catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: productRef.path, operation: 'update', requestResourceData: data,
        }));
      });
  }, [firestore, toast]);

  const deleteProducts = useCallback((storeId: string, productIds: string[]) => {
    if (!firestore) return;
    const productsCollection = collection(firestore, 'stores', storeId, 'products');
    const batch = writeBatch(firestore);
    productIds.forEach(productId => {
      const productRef = doc(productsCollection, productId);
      batch.delete(productRef);
    });
    batch.commit()
      .then(() => {
        toast({ title: `${productIds.length}件の商品を削除しました` });
      })
      .catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: productsCollection.path, operation: 'write', 
        }));
      });
  }, [firestore, toast]);
  
  const importProductsFromCSV = useCallback((storeId: string, newProducts: Omit<Product, 'id' | 'storeId'>[]) => {
    if (!firestore) return;
    const productsCollection = collection(firestore, 'stores', storeId, 'products');
    const batch = writeBatch(firestore);
    newProducts.forEach(product => {
        const docRef = doc(productsCollection);
        batch.set(docRef, product);
    });

    batch.commit()
      .then(() => {
        toast({ title: "CSVインポート完了", description: `${newProducts.length}件の商品をインポートしました。` });
      })
      .catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: productsCollection.path, operation: 'write'}));
      });
  }, [firestore, toast]);

  const value = useMemo(() => ({
    products,
    loading,
    addProduct,
    updateProduct,
    deleteProducts,
    importProductsFromCSV
  }), [products, loading, addProduct, updateProduct, deleteProducts, importProductsFromCSV]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}
