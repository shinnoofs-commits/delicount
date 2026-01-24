
'use client';

import type { Product } from '@/lib/types';
import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, addDoc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/use-admin';
import { useStores } from './store-context';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  hasStores: boolean;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  deleteProducts: (productIds: string[]) => void;
  getProductById: (productId: string) => Product | undefined;
  importProductsFromCSV: (products: (Omit<Product, 'id'> & {id?: string})[]) => void;
}

export const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin, isAdminLoading } = useAdmin();
  const { stores, loading: storesLoading } = useStores();

  const hasStores = stores.length > 0;

  // For now, only admin can manage products, and we'll use the first store.
  // This needs to be expanded with a store selector UI for admins.
  const currentStoreId = useMemo(() => (isAdmin && stores.length > 0 ? stores[0].id : null), [isAdmin, stores]);

  const productsCollection = useMemoFirebase(() => {
    if (firestore && currentStoreId) {
      return collection(firestore, 'stores', currentStoreId, 'products');
    }
    // TODO: Handle non-admin users to view their store's products
    return null;
  }, [firestore, currentStoreId]);

  const { data: productData, isLoading: isProductsLoading } = useCollection<Product>(productsCollection);

  const products = useMemo(() => productData || [], [productData]);
  const loading = isAdminLoading || storesLoading || isProductsLoading;

  const addProduct = useCallback((productData: Omit<Product, 'id'>) => {
    if (!productsCollection) {
        toast({
            variant: "destructive",
            title: "店舗がありません",
            description: "商品を追加するには、まず店舗を登録してください。",
        });
        return;
    }
    addDoc(productsCollection, productData)
      .then(() => {
        toast({ title: "商品を追加しました", description: `「${productData.name}」を登録しました。` });
      })
      .catch(() => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: productsCollection.path,
          operation: 'create',
          requestResourceData: productData,
        }));
      });
  }, [productsCollection, toast]);

  const updateProduct = useCallback((productData: Product) => {
    if (!productsCollection) {
        toast({
            variant: "destructive",
            title: "店舗がありません",
            description: "商品を更新するには、まず店舗を登録してください。",
        });
        return;
    }
    const productRef = doc(productsCollection, productData.id);
    setDoc(productRef, productData, { merge: true })
      .then(() => {
        toast({ title: "商品を更新しました", description: `「${productData.name}」を更新しました。` });
      })
      .catch(() => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: productRef.path,
          operation: 'update',
          requestResourceData: productData,
        }));
      });
  }, [productsCollection, toast]);

  const deleteProduct = useCallback((productId: string) => {
    if (!productsCollection) {
        toast({
            variant: "destructive",
            title: "店舗がありません",
            description: "商品を削除するには、まず店舗を登録してください。",
        });
        return;
    }
    const productRef = doc(productsCollection, productId);
    deleteDoc(productRef)
      .then(() => {
         toast({ title: "商品を削除しました" });
      })
      .catch(() => {
         errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: productRef.path,
            operation: 'delete',
        }));
      });
  }, [productsCollection, toast]);

  const deleteProducts = useCallback((productIds: string[]) => {
    if (!productsCollection || !firestore) {
      toast({ variant: 'destructive', title: 'エラー', description: '店舗が選択されていません。' });
      return;
    };
    const batch = writeBatch(firestore);
    productIds.forEach(productId => {
      const productRef = doc(productsCollection, productId);
      batch.delete(productRef);
    });
    batch.commit()
      .then(() => {
        toast({ title: `${productIds.length}件の商品を削除しました` });
      })
      .catch(() => {
         errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: productsCollection.path,
            operation: 'write', 
         }));
      });
  }, [productsCollection, firestore, toast]);
  
  const getProductById = useCallback((productId: string) => {
      return products.find(p => p.id === productId);
  }, [products]);
  
  const importProductsFromCSV = useCallback((newProducts: (Omit<Product, 'id'> & {id?: string})[]) => {
    if (!productsCollection || !firestore) {
        toast({ variant: 'destructive', title: 'エラー', description: '店舗が選択されていません。' });
        return;
    };

    const batch = writeBatch(firestore);
    newProducts.forEach(product => {
        const docRef = doc(productsCollection);
        batch.set(docRef, product);
    });

    batch.commit()
        .then(() => {
            toast({
                title: "CSVインポート完了",
                description: `${newProducts.length}件の商品をインポートしました。`,
            });
        })
        .catch(() => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: productsCollection.path,
                operation: 'write',
            }));
        });
  }, [firestore, productsCollection, toast]);

  const value = useMemo(() => ({
    products,
    loading,
    hasStores,
    addProduct,
    updateProduct,
    deleteProduct,
    deleteProducts,
    getProductById,
    importProductsFromCSV
  }), [products, loading, hasStores, addProduct, updateProduct, deleteProduct, deleteProducts, getProductById, importProductsFromCSV]);

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
