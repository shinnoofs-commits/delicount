'use client';

import type { Product, DailyProduction, ProductBox } from '@/lib/types';
import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { collection, doc, addDoc, setDoc, getDoc, updateDoc, writeBatch, query, getDocs, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/useAdmin';
import { useStores } from './store-context';
import { useStoreSelection } from './store-selection-context';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  addProduct: (storeId: string, product: Omit<Product, 'id' | 'storeId' | 'dailyProductionSunny' | 'dailyProductionRainy'>) => Promise<void>;
  updateProduct: (storeId: string, product: Product, oldProductCode?: string, oldPrice?: number) => Promise<void>;
  deleteProducts: (storeId: string, productIds: string[]) => Promise<void>;
  importProductsFromCSV: (storeId: string, products: Omit<Product, 'id' | 'storeId'>[], mode: 'overwrite' | 'skip') => Promise<void>;
  syncAllProducts: (sourceStoreId: string) => Promise<void>;
  syncProductsToStores: (sourceStoreId: string, targetStoreIds: string[], options?: { updatePrice?: boolean }) => Promise<void>;
  updateSchedules: (storeId: string, schedules: Record<string, Partial<DailyProduction>>, weatherPattern: 'sunny' | 'rainy') => Promise<void>;
  bulkUpdateProducts: (storeId: string, productsToUpdate: Pick<Product, 'id' | 'category' | 'pricePattern'>[]) => Promise<void>;
  mergeDuplicateProducts: (storeId: string) => Promise<void>;
  toggleProductsFixedPrice: (storeId: string, productIds: string[], isFixed: boolean) => Promise<void>;
  toggleProductsActive: (storeId: string, productIds: string[], isActive: boolean) => Promise<void>;
  distributeProducts: (sourceStoreId: string, productIds: string[], targetStoreIds: string[], options: { updatePrice: boolean }) => Promise<void>;
  copyAllStoresToMaster: () => Promise<{ success: boolean; totalScanned: number; masterCount: number; categoryCount: number }>;
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

    let uniqueStoreIds: string[] = [];
    if (isAdmin) {
      const allStoreIds = stores.map(s => s.id);
      uniqueStoreIds = Array.from(new Set(['master', ...allStoreIds, ...selectedStoreIds]));
    } else {
      uniqueStoreIds = Array.from(new Set(['master', ...(userStore ? [userStore.id] : [])]));
    }
    
    setProducts([]);
    setLoading(true);
    
    if (uniqueStoreIds.length === 0) {
      setLoading(false);
      return;
    }
    
    const unsubscribers: Unsubscribe[] = [];

    uniqueStoreIds.forEach(storeId => {
      const q = query(collection(firestore, 'stores', storeId, 'product_boxes'));
      const unsub = onSnapshot(q, (snapshot) => {
        setProducts(prev => {
          const filtered = prev.filter(p => p.storeId !== storeId);
          let currentStoreProducts: Product[] = [];
          snapshot.docs.forEach(doc => {
            const box = doc.data() as ProductBox;
            if (box.products && Array.isArray(box.products)) {
              currentStoreProducts = currentStoreProducts.concat(
                 box.products.map(p => ({ ...p, storeId }))
              );
            }
          });
          return [...filtered, ...currentStoreProducts];
        });
        setLoading(false);
      }, (error) => {
        if (user) {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `stores/${storeId}/product_boxes`, operation: 'list' }));
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

  const applyProductChanges = async (storeId: string, storeProducts: Product[], mutator: (draft: Product[]) => Product[]) => {
    if (!firestore) return;
    const newStoreProducts = mutator([...storeProducts]);
    
    const allCategories = new Set<string>();
    storeProducts.forEach(p => allCategories.add(p.category || '未分類'));
    newStoreProducts.forEach(p => allCategories.add(p.category || '未分類'));

    const batch = writeBatch(firestore);
    allCategories.forEach(cat => {
       const boxRef = doc(firestore, 'stores', storeId, 'product_boxes', cat);
       const productsInCat = newStoreProducts.filter(p => (p.category || '未分類') === cat).map(({ storeId: _, ...data }) => data);
       
       if (productsInCat.length > 0) {
           batch.set(boxRef, {
              id: cat,
              storeId,
              category: cat,
              products: productsInCat,
              updatedAt: new Date()
           }, { merge: true });
       } else {
           batch.set(boxRef, {
              id: cat,
              storeId,
              category: cat,
              products: [],
              updatedAt: new Date()
           }, { merge: true });
       }
    });
    await batch.commit();
  };

  const saveAdminProduct = useCallback(async (productData: Omit<Product, 'id' | 'storeId'>) => {
    if (!firestore || !stores || stores.length === 0) return;
    const processingToast = toast({ title: '全店舗の商品を同期中...' });
    try {
        for (const store of stores) {
           const storeProducts = products.filter(p => p.storeId === store.id);
           await applyProductChanges(store.id, storeProducts, (draft) => {
              const matches = draft.filter(p => p.productCode === productData.productCode && p.price === productData.price);
              if (matches.length === 0) {
                 draft.push({
                   ...productData,
                   id: doc(collection(firestore, 'dummy')).id,
                   storeId: store.id
                 } as Product);
              } else {
                 matches.forEach(m => {
                    const idx = draft.findIndex(p => p.id === m.id);
                    if (idx !== -1) draft[idx] = { ...draft[idx], ...productData };
                 });
              }
              return draft;
           });
        }
        processingToast.dismiss();
        toast({ title: "同期完了" });
    } catch(e) {
        processingToast.dismiss();
    }
  }, [firestore, stores, products, toast]);

  const addProduct = useCallback(async (storeId: string, productData: Omit<Product, 'id' | 'storeId'>) => {
    if (!firestore) return;
    const storeProducts = products.filter(p => p.storeId === storeId);
    
    const newProduct: Product = {
      ...productData,
      id: doc(collection(firestore, 'dummy')).id,
      storeId,
      dailyProductionSunny: productData.dailyProductionSunny || { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, holiday: 0 },
      dailyProductionRainy: productData.dailyProductionRainy || { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, holiday: 0 }
    };
    
    try {
      await applyProductChanges(storeId, storeProducts, (draft) => {
        draft.push(newProduct);
        return draft;
      });

      // If added in master, cascade to all real stores
      if (storeId === 'master' && stores) {
        const realStores = stores.filter(s => s.id !== 'master' && !s.isMaster);
        for (const targetStore of realStores) {
          let targetProducts = products.filter(p => p.storeId === targetStore.id);
          if (targetProducts.length === 0) {
            const snap = await getDocs(collection(firestore, 'stores', targetStore.id, 'product_boxes'));
            snap.docs.forEach(d => {
              const b = d.data() as ProductBox;
              if (b.products && Array.isArray(b.products)) {
                targetProducts = targetProducts.concat(b.products.map(p => ({ ...p, storeId: targetStore.id })));
              }
            });
          }

          await applyProductChanges(targetStore.id, targetProducts, (draft) => {
            const exists = draft.some(p => p.productCode && p.productCode === newProduct.productCode);
            if (!exists) {
              draft.push({
                ...newProduct,
                id: doc(collection(firestore, 'dummy')).id,
                storeId: targetStore.id,
              });
            }
            return draft;
          });

          if (newProduct.category && newProduct.category.trim()) {
            try {
              const storeRef = doc(firestore, 'stores', targetStore.id);
              const storeSnap = await getDoc(storeRef);
              if (storeSnap.exists()) {
                const curCats = (storeSnap.data().categories as string[]) || [];
                if (!curCats.includes(newProduct.category.trim())) {
                  await updateDoc(storeRef, { categories: [...curCats, newProduct.category.trim()] });
                }
              }
            } catch (catErr) {
              console.warn('Category sync failed:', catErr);
            }
          }
        }
      }

      toast({ 
        title: "商品を追加しました",
        description: storeId === 'master' ? 'マスタ商品および全店舗に追加しました' : undefined,
      });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `stores/${storeId}/product_boxes`, operation: 'update'
      }));
    }
  }, [firestore, stores, products, toast]);

  const updateProduct = useCallback(async (storeId: string, productData: Product, oldProductCode?: string, oldPrice?: number) => {
    if (!firestore) return;
    const storeProducts = products.filter(p => p.storeId === storeId);
    try {
      await applyProductChanges(storeId, storeProducts, (draft) => {
        const idx = draft.findIndex(p => p.id === productData.id);
        if (idx !== -1) draft[idx] = productData;
        return draft;
      });
      
      if (oldPrice !== undefined && oldPrice !== productData.price) {
        const historyCollection = collection(firestore, 'stores', storeId, 'price_history');
        await addDoc(historyCollection, {
          productId: productData.id,
          productCode: productData.productCode,
          productName: productData.name,
          oldPrice: oldPrice,
          newPrice: productData.price,
          updatedAt: new Date(),
          updatedBy: user?.email || 'unknown'
        });
      }

      // If updating master, cascade category, pricePattern, price, etc. to ALL real stores
      if (storeId === 'master' && stores) {
        const realStores = stores.filter(s => s.id !== 'master' && !s.isMaster);
        for (const targetStore of realStores) {
          let targetProducts = products.filter(p => p.storeId === targetStore.id);
          if (targetProducts.length === 0) {
            const snap = await getDocs(collection(firestore, 'stores', targetStore.id, 'product_boxes'));
            snap.docs.forEach(d => {
              const b = d.data() as ProductBox;
              if (b.products && Array.isArray(b.products)) {
                targetProducts = targetProducts.concat(b.products.map(p => ({ ...p, storeId: targetStore.id })));
              }
            });
          }

          await applyProductChanges(targetStore.id, targetProducts, (draft) => {
            const matches = draft.filter(p => {
              const codeMatch = (productData.productCode && p.productCode === productData.productCode) ||
                                (oldProductCode && p.productCode === oldProductCode);
              const nameMatch = (!productData.productCode && p.name === productData.name);
              return codeMatch || nameMatch;
            });

            if (matches.length > 0) {
              matches.forEach(m => {
                const idx = draft.findIndex(p => p.id === m.id);
                if (idx !== -1) {
                  draft[idx] = {
                    ...draft[idx],
                    name: productData.name,
                    productCode: productData.productCode,
                    category: productData.category,
                    pricePattern: productData.pricePattern,
                    price: productData.price,
                    costPrice: productData.costPrice,
                    materials: productData.materials,
                    containers: productData.containers,
                  };
                }
              });
            } else {
              // Add product to store if not present
              draft.push({
                ...productData,
                id: doc(collection(firestore, 'dummy')).id,
                storeId: targetStore.id,
              } as Product);
            }
            return draft;
          });

          // Sync category to store's categories list if missing
          if (productData.category && productData.category.trim()) {
            try {
              const storeRef = doc(firestore, 'stores', targetStore.id);
              const storeSnap = await getDoc(storeRef);
              if (storeSnap.exists()) {
                const curCats = (storeSnap.data().categories as string[]) || [];
                if (!curCats.includes(productData.category.trim())) {
                  await updateDoc(storeRef, { categories: [...curCats, productData.category.trim()] });
                }
              }
            } catch (catErr) {
              console.warn('Category sync warning:', catErr);
            }
          }

          // Record price history for target store if price changed
          if (oldPrice !== undefined && oldPrice !== productData.price) {
            try {
              const historyCol = collection(firestore, 'stores', targetStore.id, 'price_history');
              await addDoc(historyCol, {
                productId: productData.id,
                productCode: productData.productCode,
                productName: productData.name,
                oldPrice: oldPrice,
                newPrice: productData.price,
                updatedAt: new Date(),
                updatedBy: user?.email ? `${user.email} (マスタ連動)` : 'マスタ連動',
              });
            } catch (hErr) {
              console.warn('Target store price history error:', hErr);
            }
          }
        }
      }

      toast({ 
        title: '更新完了',
        description: storeId === 'master' ? 'マスタ商品および全店舗へ変更（カテゴリー・パターン・価格）を反映しました' : undefined,
      });
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `stores/${storeId}/product_boxes`, operation: 'update'
      }));
    }
  }, [firestore, stores, products, user, toast]);

  const deleteProducts = useCallback(async (storeId: string, productIds: string[]) => {
    if (!firestore) return;
    const storeProducts = products.filter(p => p.storeId === storeId);
    try {
      await applyProductChanges(storeId, storeProducts, (draft) => {
        return draft.filter(p => !productIds.includes(p.id));
      });
      toast({ title: "削除完了" });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `stores/${storeId}/product_boxes`, operation: 'update' }));
      throw e;
    }
  }, [firestore, products, toast]);

  const updateSchedules = useCallback(async (storeId: string, schedules: Record<string, Partial<DailyProduction>>, weatherPattern: 'sunny' | 'rainy') => {
    if (!firestore) return;
    const storeProducts = products.filter(p => p.storeId === storeId);
    const key = weatherPattern === 'rainy' ? 'dailyProductionRainy' : 'dailyProductionSunny';
    try {
      await applyProductChanges(storeId, storeProducts, (draft) => {
         return draft.map(p => {
            if (schedules[p.id]) {
               return { ...p, [key]: schedules[p.id] };
            }
            return p;
         });
      });
      toast({ title: "製造計画を保存しました。" });
    } catch (e) {
      toast({ variant: 'destructive', title: '保存エラー' });
    }
  }, [firestore, products, toast]);

  const bulkUpdateProducts = useCallback(async (storeId: string, productsToUpdate: Pick<Product, 'id' | 'category' | 'pricePattern'>[]) => {
    if (!firestore) return;
    const storeProducts = products.filter(p => p.storeId === storeId);
    try {
      await applyProductChanges(storeId, storeProducts, (draft) => {
         const updatesMap = new Map(productsToUpdate.map(p => [p.id, p]));
         return draft.map(p => {
            if (updatesMap.has(p.id)) {
               const up = updatesMap.get(p.id)!;
               return { ...p, category: up.category, pricePattern: up.pricePattern };
            }
            return p;
         });
      });

      // If updating master, cascade category and pricePattern to ALL real stores
      if (storeId === 'master' && stores) {
        const codeUpdateMap = new Map<string, { category?: string; pricePattern?: string; name?: string }>();
        productsToUpdate.forEach(u => {
          const masterProd = storeProducts.find(p => p.id === u.id);
          if (masterProd) {
            const key = masterProd.productCode ? `code_${masterProd.productCode}` : `name_${masterProd.name}`;
            codeUpdateMap.set(key, { category: u.category, pricePattern: u.pricePattern, name: masterProd.name });
          }
        });

        const realStores = stores.filter(s => s.id !== 'master' && !s.isMaster);
        for (const targetStore of realStores) {
          let targetProducts = products.filter(p => p.storeId === targetStore.id);
          if (targetProducts.length === 0) {
            const snap = await getDocs(collection(firestore, 'stores', targetStore.id, 'product_boxes'));
            snap.docs.forEach(d => {
              const b = d.data() as ProductBox;
              if (b.products && Array.isArray(b.products)) {
                targetProducts = targetProducts.concat(b.products.map(p => ({ ...p, storeId: targetStore.id })));
              }
            });
          }

          await applyProductChanges(targetStore.id, targetProducts, (draft) => {
            return draft.map(p => {
              const key = p.productCode ? `code_${p.productCode}` : `name_${p.name}`;
              if (codeUpdateMap.has(key)) {
                const up = codeUpdateMap.get(key)!;
                return {
                  ...p,
                  ...(up.category !== undefined ? { category: up.category } : {}),
                  ...(up.pricePattern !== undefined ? { pricePattern: up.pricePattern } : {}),
                };
              }
              return p;
            });
          });

          // Sync missing categories to target store document
          const updatedCategories = Array.from(new Set(productsToUpdate.map(u => u.category).filter(Boolean)));
          if (updatedCategories.length > 0) {
            try {
              const storeRef = doc(firestore, 'stores', targetStore.id);
              const storeSnap = await getDoc(storeRef);
              if (storeSnap.exists()) {
                const curCats = (storeSnap.data().categories as string[]) || [];
                const mergedCats = Array.from(new Set([...curCats, ...updatedCategories]));
                if (mergedCats.length > curCats.length) {
                  await updateDoc(storeRef, { categories: mergedCats });
                }
              }
            } catch (catErr) {
              console.warn('Category sync warning:', catErr);
            }
          }
        }
      }

      toast({ 
        title: "一括更新完了",
        description: storeId === 'master' ? `${productsToUpdate.length}件のカテゴリー・パターンをマスタおよび全店舗へ反映しました` : undefined,
      });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `stores/${storeId}/product_boxes`, operation: 'update' }));
    }
  }, [firestore, stores, products, toast]);

  const importProductsFromCSV = useCallback(async (targetStoreId: string, newProducts: Omit<Product, 'id' | 'storeId'>[], mode: 'overwrite' | 'skip') => {
    if (!firestore) return;

    const storeId = targetStoreId || userStore?.id || (stores.length > 0 ? stores[0].id : '');
    if (!storeId) {
      toast({ variant: 'destructive', title: 'エラー', description: 'インポート先店舗が指定されていません。' });
      return;
    }

    const storeProducts = products.filter(p => p.storeId === storeId);
    const csvGroups = new Map<string, (Omit<Product, 'id' | 'storeId'> & { count: number })>();
    
    newProducts.forEach(p => {
      const key = `${p.productCode}-${p.name}`;
      if (csvGroups.has(key)) {
        const existing = csvGroups.get(key)!;
        csvGroups.set(key, {
          ...existing,
          price: existing.price + p.price,
          costPrice: (existing.costPrice || 0) + (p.costPrice || 0),
          count: existing.count + 1
        });
      } else {
        csvGroups.set(key, { ...p, count: 1 });
      }
    });

    let updateCount = 0;
    let createCount = 0;
    let skipCount = 0;
    const historyAdds: any[] = [];

    try {
      await applyProductChanges(storeId, storeProducts, (draft) => {
         for (const [key, csvProd] of csvGroups.entries()) {
           const existingIdx = draft.findIndex(p => 
             (p.productCode && p.productCode === csvProd.productCode) ||
             `${p.productCode}-${p.name}` === key ||
             p.name === csvProd.name
           );
           const avgCsvPrice = Math.round(csvProd.price / csvProd.count);
           const avgCsvCost = Math.round(((csvProd.costPrice || 0) / csvProd.count) * 100) / 100;

           if (existingIdx !== -1) {
             const existing = draft[existingIdx];
             if (mode === 'skip' || existing.isFixedPrice) {
               skipCount++;
               continue;
             }
             if (existing.price !== avgCsvPrice) {
                historyAdds.push({
                   productId: existing.id, productCode: existing.productCode,
                   productName: existing.name, oldPrice: existing.price,
                   newPrice: avgCsvPrice, updatedAt: new Date(),
                   updatedBy: user?.email || 'csv-import'
                });
             }
             draft[existingIdx] = {
               ...existing,
               name: csvProd.name || existing.name,
               productCode: csvProd.productCode || existing.productCode,
               price: avgCsvPrice,
               costPrice: avgCsvCost,
               category: csvProd.category || existing.category,
               pricePattern: csvProd.pricePattern || existing.pricePattern,
               materials: csvProd.materials && csvProd.materials.length > 0 ? csvProd.materials : existing.materials,
               containers: csvProd.containers && csvProd.containers.length > 0 ? csvProd.containers : existing.containers,
               isActive: existing.isActive !== undefined ? existing.isActive : true,
             };
             updateCount++;
           } else {
             draft.push({
               id: doc(collection(firestore, 'dummy')).id,
               storeId: storeId,
               name: csvProd.name,
               productCode: csvProd.productCode,
               price: avgCsvPrice,
               costPrice: avgCsvCost,
               category: csvProd.category || '未分類',
               pricePattern: csvProd.pricePattern || '',
               materials: csvProd.materials && csvProd.materials.length > 0 ? csvProd.materials : undefined,
               containers: csvProd.containers && csvProd.containers.length > 0 ? csvProd.containers : undefined,
               isActive: true,
               isFixedPrice: false,
               dailyProductionSunny: { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, holiday: 0 },
               dailyProductionRainy: { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, holiday: 0 }
             });
             createCount++;
           }
         }
         return draft;
      });

      if (historyAdds.length > 0) {
         const batch = writeBatch(firestore);
         historyAdds.forEach(h => {
            const ref = doc(collection(firestore, 'stores', storeId, 'price_history'));
            batch.set(ref, h);
         });
         await batch.commit();
      }

      // Sync categories to store if new category exists
      try {
        const storeRef = doc(firestore, 'stores', storeId);
        const storeSnap = await getDoc(storeRef);
        if (storeSnap.exists()) {
          const currentCategories = (storeSnap.data().categories as string[]) || [];
          const allNewCategories = new Set(currentCategories);
          newProducts.forEach(p => {
            if (p.category && p.category.trim()) {
              allNewCategories.add(p.category.trim());
            }
          });
          if (allNewCategories.size > currentCategories.length) {
            await updateDoc(storeRef, { categories: Array.from(allNewCategories) });
          }
        }
      } catch (catErr) {
        console.warn('Store categories update skipped:', catErr);
      }

      let desc = `${createCount}件を新規登録しました。`;
      if (mode === 'overwrite') {
        desc += ` ${updateCount}件を更新し、${skipCount}件（価格固定含む）をスキップしました。`;
      } else {
        desc += ` ${skipCount}件の既存商品をスキップしました。`;
      }

      toast({ title: "インポート完了", description: desc });
    } catch (e) {
       console.error("Import error", e);
       toast({ variant: "destructive", title: "インポート失敗", description: "データの保存中にエラーが発生しました。" });
    }
  }, [firestore, userStore, stores, user, products, toast]);

  const mergeDuplicateProducts = useCallback(async (storeId: string) => {
    if (!firestore) return;
    const storeProducts = products.filter(p => p.storeId === storeId);
    let mergeCount = 0;

    try {
       await applyProductChanges(storeId, storeProducts, (draft) => {
          const groups: Record<string, Product[]> = {};
          draft.forEach(p => {
             const key = `${p.productCode}-${p.name}`;
             if (!groups[key]) groups[key] = [];
             groups[key].push(p);
          });
          
          let nextDraft = [...draft];
          for (const key in groups) {
             const group = groups[key];
             if (group.length > 1) {
                const fixedProduct = group.find(p => p.isFixedPrice);
                let finalPrice = fixedProduct ? fixedProduct.price : Math.round(group.reduce((sum, p) => sum + p.price, 0) / group.length);
                let finalCost = fixedProduct ? fixedProduct.costPrice : Math.round(group.reduce((sum, p) => sum + p.costPrice, 0) / group.length);
                
                const mainProduct = group[0];
                const idsToRemove = group.slice(1).map(p => p.id);
                
                nextDraft = nextDraft.filter(p => !idsToRemove.includes(p.id));
                const mainIdx = nextDraft.findIndex(p => p.id === mainProduct.id);
                if (mainIdx !== -1) {
                   nextDraft[mainIdx] = { ...nextDraft[mainIdx], price: finalPrice, costPrice: finalCost };
                }
                mergeCount++;
             }
          }
          return nextDraft;
       });

       if (mergeCount > 0) {
         toast({ title: `${mergeCount}件の重複商品を統合しました` });
       } else {
         toast({ title: "重複する商品はありませんでした" });
       }
    } catch (e) {
       toast({ variant: 'destructive', title: '統合エラー' });
    }
  }, [firestore, products, toast]);

  const toggleProductsFixedPrice = useCallback(async (storeId: string, productIds: string[], isFixed: boolean) => {
    if (!firestore) return;
    const storeProducts = products.filter(p => p.storeId === storeId);
    try {
      await applyProductChanges(storeId, storeProducts, (draft) => {
         return draft.map(p => {
            if (productIds.includes(p.id)) return { ...p, isFixedPrice: isFixed };
            return p;
         });
      });
    } catch (e) {
      toast({ variant: 'destructive', title: '更新エラー' });
    }
  }, [firestore, products, toast]);

  const toggleProductsActive = useCallback(async (storeId: string, productIds: string[], isActive: boolean) => {
    if (!firestore) return;
    const storeProducts = products.filter(p => p.storeId === storeId);
    try {
      await applyProductChanges(storeId, storeProducts, (draft) => {
         return draft.map(p => {
            if (productIds.includes(p.id)) return { ...p, isActive };
            return p;
         });
      });
      toast({ title: isActive ? '運用対象に追加しました' : '運用対象から外しました' });
    } catch (e) {
      toast({ variant: 'destructive', title: '更新エラー' });
    }
  }, [firestore, products, toast]);

  const syncProductsToStores = useCallback(async (
    sourceStoreId: string, 
    targetStoreIds: string[], 
    options?: { updatePrice?: boolean }
  ) => {
    if (!firestore || !isAdmin || !stores || targetStoreIds.length === 0) return;
    const sourceProducts = products.filter(p => p.storeId === sourceStoreId);
    if (sourceProducts.length === 0) {
      toast({ variant: 'destructive', title: '同期エラー', description: '同期元の店舗に商品データがありません。' });
      return;
    }

    const targetStores = stores.filter(s => targetStoreIds.includes(s.id) && s.id !== sourceStoreId);
    if (targetStores.length === 0) {
      toast({ variant: 'destructive', title: 'エラー', description: '有効な同期先店舗が選択されていません。' });
      return;
    }

    const shouldUpdatePrice = options?.updatePrice !== false;
    const processingToast = toast({ title: `${targetStores.length}店舗へ商品データを同期中...` });
    try {
      for (const store of targetStores) {
        const targetProducts = products.filter(p => p.storeId === store.id);
        
        await applyProductChanges(store.id, targetProducts, (draft) => {
          for (const srcProd of sourceProducts) {
            const { id, storeId: _, ...data } = srcProd;
            const matches = draft.filter(p => 
              (srcProd.productCode && p.productCode === srcProd.productCode) || 
              p.name === srcProd.name
            );
            
            if (matches.length === 0) {
              draft.push({ ...data, id: doc(collection(firestore, 'dummy')).id, storeId: store.id } as Product);
            } else {
              matches.forEach(m => {
                const idx = draft.findIndex(p => p.id === m.id);
                if (idx !== -1) {
                  const updateData = { ...data };
                  if (!shouldUpdatePrice) {
                    delete (updateData as any).price;
                  }
                  draft[idx] = { ...draft[idx], ...updateData };
                }
              });
            }
          }
          return draft;
        });

        // Sync missing categories to target store document
        try {
          const storeRef = doc(firestore, 'stores', store.id);
          const storeSnap = await getDoc(storeRef);
          if (storeSnap.exists()) {
            const currentCategories = (storeSnap.data().categories as string[]) || [];
            const allNewCategories = new Set(currentCategories);
            sourceProducts.forEach(p => {
              if (p.category && p.category.trim()) {
                allNewCategories.add(p.category.trim());
              }
            });
            if (allNewCategories.size > currentCategories.length) {
              await updateDoc(storeRef, { categories: Array.from(allNewCategories) });
            }
          }
        } catch (catErr) {
          console.warn('Category sync warning for store:', store.id, catErr);
        }
      }
      processingToast.dismiss();
      toast({ title: `${targetStores.length}店舗への同期が完了しました` });
    } catch (e) {
      processingToast.dismiss();
      toast({ variant: 'destructive', title: "同期エラーが発生しました" });
      throw e;
    }
  }, [firestore, isAdmin, stores, products, toast]);

  const syncAllProducts = useCallback(async (sourceStoreId: string) => {
    if (!stores) return;
    const targetStoreIds = stores.filter(s => s.id !== sourceStoreId && s.id !== 'master' && !s.isMaster).map(s => s.id);
    await syncProductsToStores(sourceStoreId, targetStoreIds, { updatePrice: true });
  }, [stores, syncProductsToStores]);

  const distributeProducts = useCallback(async (
    sourceStoreId: string, 
    productIds: string[], 
    targetStoreIds: string[], 
    options: { updatePrice: boolean }
  ) => {
    if (!firestore || !isAdmin || !stores) return;
    const selectedProducts = products.filter(p => p.storeId === sourceStoreId && productIds.includes(p.id));
    if (selectedProducts.length === 0) return;

    const processingToast = toast({ title: `${targetStoreIds.length}店舗へ商品を展開中...` });
    try {
      for (const targetStoreId of targetStoreIds) {
        const targetProducts = products.filter(p => p.storeId === targetStoreId);
        
        await applyProductChanges(targetStoreId, targetProducts, (draft) => {
           for (const srcProd of selectedProducts) {
              const { id, storeId: _, ...data } = srcProd;
              const matches = draft.filter(p => p.productCode === srcProd.productCode);
              
              if (matches.length === 0) {
                 draft.push({ ...data, id: doc(collection(firestore, 'dummy')).id, storeId: targetStoreId } as Product);
              } else {
                 matches.forEach(m => {
                    const idx = draft.findIndex(p => p.id === m.id);
                    if (idx !== -1) {
                       const updateData = { ...data };
                       if (!options.updatePrice) {
                          delete (updateData as any).price;
                       }
                       draft[idx] = { ...draft[idx], ...updateData };
                    }
                 });
              }
           }
           return draft;
        });
      }
      processingToast.dismiss();
      toast({ title: "商品の展開が完了しました" });
    } catch (e) {
      processingToast.dismiss();
      toast({ variant: 'destructive', title: "展開エラーが発生しました" });
      throw e;
    }
  }, [firestore, isAdmin, stores, products, toast]);

  const copyAllStoresToMaster = useCallback(async () => {
    if (!firestore || !isAdmin || !stores) {
      return { success: false, totalScanned: 0, masterCount: 0, categoryCount: 0 };
    }

    const processingToast = toast({ title: '全店舗の商品をスキャンしてマスタに統合中...' });
    try {
      const realStores = stores.filter(s => s.id !== 'master' && !s.isMaster);
      // Prioritize admin / headquarters store
      const sortedStores = [...realStores].sort((a, b) => {
        if (a.isAdmin && !b.isAdmin) return -1;
        if (!a.isAdmin && b.isAdmin) return 1;
        return a.name.localeCompare(b.name, 'ja');
      });

      const masterMap = new Map<string, Product>();
      const allCategories = new Set<string>();
      let totalScanned = 0;

      for (const store of sortedStores) {
        let storeProds = products.filter(p => p.storeId === store.id);
        if (storeProds.length === 0) {
          const snap = await getDocs(collection(firestore, 'stores', store.id, 'product_boxes'));
          snap.docs.forEach(d => {
            const b = d.data() as ProductBox;
            if (b.products && Array.isArray(b.products)) {
              storeProds = storeProds.concat(b.products.map(p => ({ ...p, storeId: store.id })));
            }
          });
        }

        for (const p of storeProds) {
          totalScanned++;
          const pCode = String(p.productCode || '').trim();
          const pName = String(p.name || '').trim();
          const pCat = String(p.category || '未分類').trim();
          if (pCat) allCategories.add(pCat);

          const key = pCode ? `code_${pCode}` : `name_${pName}`;
          if (!masterMap.has(key)) {
            masterMap.set(key, {
              ...p,
              id: p.id || `master_${pCode || Date.now()}`,
              storeId: 'master',
              category: pCat,
              isActive: p.isActive !== undefined ? p.isActive : true,
            });
          } else {
            const existing = masterMap.get(key)!;
            if (store.isAdmin) {
              existing.name = pName || existing.name;
              if (p.price) existing.price = p.price;
              if (p.costPrice) existing.costPrice = p.costPrice;
              if (p.pricePattern) existing.pricePattern = p.pricePattern;
              if (p.category) existing.category = pCat;
              if (p.isFixedPrice !== undefined) existing.isFixedPrice = p.isFixedPrice;
            } else {
              if (!existing.price && p.price) existing.price = p.price;
              if (!existing.costPrice && p.costPrice) existing.costPrice = p.costPrice;
              if (!existing.pricePattern && p.pricePattern) existing.pricePattern = p.pricePattern;
            }
            if ((!existing.materials || existing.materials.length === 0) && p.materials && p.materials.length > 0) {
              existing.materials = p.materials;
            }
            if ((!existing.containers || existing.containers.length === 0) && p.containers && p.containers.length > 0) {
              existing.containers = p.containers;
            }
          }
        }
      }

      // Group by category and batch write to stores/master/product_boxes
      const categoryGroups = new Map<string, Product[]>();
      for (const prod of masterMap.values()) {
        const cat = prod.category || '未分類';
        if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
        categoryGroups.get(cat)!.push(prod);
      }

      const batch = writeBatch(firestore);
      categoryGroups.forEach((prods, cat) => {
        const boxRef = doc(firestore, 'stores', 'master', 'product_boxes', cat);
        batch.set(boxRef, {
          id: cat,
          storeId: 'master',
          category: cat,
          products: prods.map(({ storeId: _, ...clean }) => clean),
          updatedAt: new Date(),
        }, { merge: true });
      });

      const masterDocRef = doc(firestore, 'stores', 'master');
      batch.set(masterDocRef, {
        name: 'マスタ商品',
        isMaster: true,
        categories: Array.from(allCategories).sort(),
      }, { merge: true });

      await batch.commit();
      processingToast.dismiss();
      toast({
        title: '全店舗の商品をマスタに取り込みました',
        description: `${realStores.length}店舗から${totalScanned}品をスキャンし、${masterMap.size}品のマスタ商品として統合・登録しました。`
      });

      return {
        success: true,
        totalScanned,
        masterCount: masterMap.size,
        categoryCount: allCategories.size,
      };
    } catch (e: any) {
      processingToast.dismiss();
      console.error('Failed to copy all stores to master:', e);
      toast({ variant: 'destructive', title: '取り込みエラー', description: e.message || '処理中にエラーが発生しました。' });
      return { success: false, totalScanned: 0, masterCount: 0, categoryCount: 0 };
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
    syncProductsToStores,
    mergeDuplicateProducts,
    toggleProductsFixedPrice,
    toggleProductsActive,
    distributeProducts,
    copyAllStoresToMaster,
    updateSchedules,
    bulkUpdateProducts,
    refetchProducts: fetchProducts,
  }), [products, loading, addProduct, updateProduct, deleteProducts, importProductsFromCSV, syncAllProducts, syncProductsToStores, mergeDuplicateProducts, toggleProductsFixedPrice, toggleProductsActive, distributeProducts, copyAllStoresToMaster, updateSchedules, bulkUpdateProducts, fetchProducts]);

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
