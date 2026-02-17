
'use client';

import type { Product, DailyProduction } from '@/lib/types';
import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, addDoc, setDoc, deleteDoc, writeBatch, serverTimestamp, getDocs, query, where, Query, onSnapshot, Unsubscribe, collectionGroup } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/use-admin';
import { useStores } from './store-context';
import { useStoreSelection } from './store-selection-context';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  addProduct: (storeId: string, product: Omit<Product, 'id' | 'storeId' | 'dailyProduction'>) => Promise<void>;
  updateProduct: (storeId: string, product: Product) => Promise<void>;
  deleteProducts: (storeId: string, productIds: string[]) => void;
  importProductsFromCSV: (products: Omit<Product, 'id' | 'storeId'>[]) => void;
  syncAllProducts: (sourceStoreId: string) => Promise<void>;
  updateSchedules: (storeId: string, schedules: Record<string, Partial<DailyProduction>>) => Promise<void>;
  refetchProducts: () => void;
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
  const [refreshCount, setRefreshCount] = useState(0);

  const refetchProducts = useCallback(() => setRefreshCount(c => c + 1), []);

  useEffect(() => {
    if (!firestore) return;

    const fetchProducts = async () => {
      setLoading(true);

      const storeIdsToFetch = isAdmin ? selectedStoreIds : (userStore ? [userStore.id] : []);

      if (storeIdsToFetch.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }
      
      try {
        const productPromises = storeIdsToFetch.map(storeId => 
          getDocs(collection(firestore, 'stores', storeId, 'products'))
        );
        
        const productSnapshots = await Promise.all(productPromises);

        const allProducts = productSnapshots.flatMap((snapshot, index) => {
          const storeId = storeIdsToFetch[index];
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), storeId } as Product));
        });

        setProducts(allProducts);

      } catch (error) {
        if (error instanceof Error && (error.message.includes('permission-denied') || (error as any).code === 'permission-denied')) {
           errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'stores/{storeId}/products', operation: 'list' }));
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
    
  }, [firestore, isAdmin, userStore, selectedStoreIds, refreshCount]);

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
        refetchProducts();
        processingToast.dismiss();
        toast({ title: "商品を全店舗で同期しました", description: `「${productData.name}」の情報が全店舗に反映されました。` });
    } catch(e) {
        processingToast.dismiss();
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'stores/{storeId}/products', operation: 'write', requestResourceData: productData }));
    }
  }, [firestore, stores, toast, refetchProducts]);


  const addProduct = useCallback(async (storeId: string, productData: Omit<Product, 'id' | 'storeId' | 'dailyProduction'>) => {
    const productDataWithSchedule = {
      ...productData,
      dailyProduction: { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, holiday: 0 }
    };

    if (isAdmin) {
        await saveAdminProduct(productDataWithSchedule);
    } else {
        if (!firestore) return;
        const productsCollection = collection(firestore, 'stores', storeId, 'products');
        addDoc(productsCollection, productDataWithSchedule)
          .then(() => {
            refetchProducts();
            toast({ title: "商品を追加しました", description: `「${productData.name}」を登録しました。` });
          })
          .catch(e => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: productsCollection.path, operation: 'create', requestResourceData: productDataWithSchedule,
            }));
        });
    }
  }, [firestore, toast, isAdmin, saveAdminProduct, refetchProducts]);


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
            refetchProducts();
            toast({ title: "商品を更新しました", description: `「${productData.name}」を更新しました。` });
          })
          .catch(e => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: productRef.path, operation: 'update', requestResourceData: data,
            }));
          });
    }
  }, [firestore, toast, isAdmin, saveAdminProduct, refetchProducts]);


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
        refetchProducts();
        toast({ title: `${productIds.length}件の商品を削除しました` });
      })
      .catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: productsCollection.path, operation: 'write', 
        }));
      });
  }, [firestore, toast, refetchProducts]);
  
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
        failedStores.push(store.name);
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `stores/${store.id}/products`, operation: 'write'}));
      }
    }));

    processingToast.dismiss();
    refetchProducts();

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
  }, [firestore, isAdmin, stores, toast, refetchProducts]);

  const syncAllProducts = useCallback(async (sourceStoreId: string) => {
    if (!firestore || !isAdmin) return;
    
    if (stores.length <= 1) {
        toast({
            variant: 'default',
            title: '同期不要',
            description: '管理対象の店舗が1つしかないため、同期処理は不要です。'
        });
        return;
    }

    const sourceProducts = products.filter(p => p.storeId === sourceStoreId);
    if (sourceProducts.length === 0) {
        toast({
            variant: 'destructive',
            title: '同期失敗',
            description: '同期元となる店舗に商品が登録されていません。'
        });
        return;
    }

    const targetStores = stores.filter(s => s.id !== sourceStoreId);
    let totalUpdateCount = 0;
    let totalNewCount = 0;
    const failedStores: string[] = [];
    const processingToast = toast({ title: '全店舗へ商品データを同期中...', description: `処理が完了するまでお待ちください...` });

    await Promise.all(targetStores.map(async (store) => {
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
            
            sourceProducts.forEach(product => {
                if (!product.productCode) return;
                
                const existingId = existingProductMap.get(product.productCode);
                
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, storeId, ...productDataForStore } = product;

                if (existingId) {
                    const docRef = doc(productsCollection, existingId);
                    batch.update(docRef, productDataForStore as { [x: string]: any });
                    updateCount++;
                } else {
                    const newDocRef = doc(productsCollection);
                    batch.set(newDocRef, productDataForStore);
                    newCount++;
                }
            });

            await batch.commit();
            totalNewCount += newCount;
            totalUpdateCount += updateCount;
        } catch (error) {
            failedStores.push(store.name);
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `stores/${store.id}/products`, operation: 'write'}));
        }
    }));

    processingToast.dismiss();
    refetchProducts();

    if (failedStores.length > 0) {
        toast({
            variant: 'destructive',
            title: "一括同期が一部失敗しました",
            description: `次の店舗への同期に失敗しました: ${failedStores.join(', ')}。`
        });
    } else {
        toast({ 
            title: "一括同期が完了しました", 
            description: `${targetStores.length}店舗に商品を同期しました。合計で新規${totalNewCount}件、更新${totalUpdateCount}件を処理しました。`
        });
    }
  }, [firestore, isAdmin, stores, products, toast, refetchProducts]);

 const updateSchedules = useCallback(async (storeId: string, schedules: Record<string, Partial<DailyProduction>>) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    Object.entries(schedules).forEach(([productId, dailyProduction]) => {
      const productRef = doc(firestore, 'stores', storeId, 'products', productId);
      batch.update(productRef, { dailyProduction });
    });

    try {
      await batch.commit();
      refetchProducts();
      toast({ title: "製造予定数を一括更新しました。" });
    } catch (e) {
       errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `stores/${storeId}/products`, operation: 'write', 
      }));
    }
  }, [firestore, toast, refetchProducts]);


  const value = useMemo(() => ({
    products,
    loading,
    addProduct,
    updateProduct,
    deleteProducts,
    importProductsFromCSV,
    syncAllProducts,
    updateSchedules,
    refetchProducts,
  }), [products, loading, addProduct, updateProduct, deleteProducts, importProductsFromCSV, syncAllProducts, updateSchedules, refetchProducts]);

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
