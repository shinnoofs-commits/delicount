
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
  addProduct: (storeId: string, product: Omit<Product, 'id' | 'storeId'>) => Promise<void>;
  updateProduct: (storeId: string, product: Product) => Promise<void>;
  deleteProducts: (storeId: string, productIds: string[]) => void;
  importProductsFromCSV: (products: Omit<Product, 'id' | 'storeId'>[]) => void;
}

export const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const { userStore, stores } = useStores();
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

  const saveAdminProduct = useCallback(async (productData: Omit<Product, 'id' | 'storeId'>) => {
    if (!firestore || !stores || stores.length === 0) return;
    if (!productData.productCode) {
        toast({ variant: 'destructive', title: '商品コードがありません', description: '同期には商品コードが必須です。'});
        return;
    }
    
    const processingToast = toast({ title: '全店舗の商品を同期中...' });
    
    try {
        const batch = writeBatch(firestore);

        for (const store of stores) {
            const productsCollection = collection(firestore, 'stores', store.id, 'products');
            const q = query(productsCollection, where('productCode', '==', productData.productCode));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // Add new
                const newDocRef = doc(productsCollection);
                batch.set(newDocRef, productData);
            } else {
                // Update existing
                querySnapshot.forEach(docToUpdate => {
                    batch.update(docToUpdate.ref, productData as {[x: string]: any});
                });
            }
        }

        await batch.commit();
        processingToast.dismiss();
        toast({ title: "商品を全店舗で同期しました", description: `「${productData.name}」の情報が全店舗に反映されました。` });
    } catch(e) {
        processingToast.dismiss();
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'stores/{storeId}/products', operation: 'write', requestResourceData: productData }));
    }
  }, [firestore, stores, toast]);


  const addProduct = useCallback(async (storeId: string, productData: Omit<Product, 'id' | 'storeId'>) => {
    if (isAdmin) {
        await saveAdminProduct(productData);
    } else {
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
        setDoc(productRef, data, { merge: true })
          .then(() => {
            toast({ title: "商品を更新しました", description: `「${productData.name}」を更新しました。` });
          })
          .catch(e => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: productRef.path, operation: 'update', requestResourceData: data,
            }));
          });
    }
  }, [firestore, toast, isAdmin, saveAdminProduct]);


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
  
  const importProductsFromCSV = useCallback(async (newProducts: Omit<Product, 'id' | 'storeId'>[]) => {
    if (!firestore || !isAdmin || stores.length === 0) {
      toast({
        variant: 'destructive',
        title: 'インポート失敗',
        description: '対象となる店舗がありません。'
      });
      return;
    }

    let totalNewCount = 0;
    let totalUpdateCount = 0;
    const failedStores: string[] = [];
    const processingToast = toast({ title: 'CSVインポート処理中...', description: `全${stores.length}店舗の商品データを更新しています。` });

    await Promise.all(stores.map(async (store) => {
      try {
        const productsCollection = collection(firestore, 'stores', store.id, 'products');
        const existingProductsSnap = await getDocs(productsCollection);
        
        const existingProductMap = new Map<string, string>(); // Map productCode to docId
        existingProductsSnap.forEach(doc => {
          const data = doc.data();
          if (data.productCode) {
            existingProductMap.set(data.productCode, doc.id);
          }
        });

        const batch = writeBatch(firestore);
        let newCount = 0;
        let updateCount = 0;
        
        newProducts.forEach(product => {
            if (!product.productCode) return;
            const existingId = existingProductMap.get(product.productCode);
            
            const productDataForStore = { ...product };

            if (existingId) {
                const docRef = doc(productsCollection, existingId);
                batch.update(docRef, productDataForStore as { [x: string]: any });
                updateCount++;
            } else {
                const docRef = doc(productsCollection);
                batch.set(docRef, productDataForStore);
                newCount++;
            }
        });

        await batch.commit();
        totalNewCount += newCount;
        totalUpdateCount += updateCount;
      } catch (error) {
        console.error(`Failed to import products for store ${store.name}:`, error);
        failedStores.push(store.name);
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `stores/${store.id}/products`, operation: 'write'}));
      }
    }));

    processingToast.dismiss();

    if (failedStores.length > 0) {
      toast({
        variant: 'destructive',
        title: "CSVインポート一部失敗",
        description: `次の店舗への反映に失敗しました: ${failedStores.join(', ')}。`
      });
    } else {
      toast({ 
        title: "CSVインポート完了", 
        description: `全${stores.length}店舗に商品を反映しました。合計で新規${totalNewCount}件、更新${totalUpdateCount}件を処理しました。`
      });
    }
  }, [firestore, isAdmin, stores, toast]);

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
