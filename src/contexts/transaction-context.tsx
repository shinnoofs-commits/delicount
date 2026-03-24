'use client';

import type { Transaction, WasteEntry, WasteItem, WeatherType } from '@/lib/types';
import React, { createContext, useState, useContext, useCallback, useEffect, useMemo } from 'react';
import { useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { useAdmin } from '@/hooks/use-admin';
import { useStores } from './store-context';
import { useStoreSelection } from './store-selection-context';
import { collection, addDoc, doc, deleteDoc, writeBatch, updateDoc, onSnapshot, query, Unsubscribe, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { isSameDay } from 'date-fns';

interface TransactionContextType {
  transactions: Transaction[];
  wasteEntries: WasteEntry[];
  loading: boolean;
  addWasteEntry: (wasteEntry: Omit<WasteEntry, 'id' | 'userId'>) => void;
  deleteWasteEntries: (storeId: string, entryIds: string[]) => Promise<void>;
  updateWasteEntry: (storeId: string, entryId: string, items: WasteItem[], totalWasteCost: number, weather?: WeatherType) => Promise<void>;
  updateDailyWeather: (storeId: string, date: Date, weather: WeatherType) => Promise<void>;
}

export const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { isAdmin, isAdminLoading } = useAdmin();
  const { userStore, loading: storesLoading } = useStores();
  const { selectedStoreIds } = useStoreSelection();
  
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !user || isUserLoading || isAdminLoading || storesLoading) {
        if (!isUserLoading && !user) setLoading(false);
        return;
    }
    
    setWasteEntries([]);
    setLoading(true);
    
    const uniqueStoreIds = Array.from(new Set(isAdmin ? selectedStoreIds : (userStore ? [userStore.id] : [])));
    
    if (uniqueStoreIds.length === 0) {
      setLoading(false);
      return;
    }

    const unsubscribers: Unsubscribe[] = [];

    uniqueStoreIds.forEach(storeId => {
      const q = query(collection(firestore, 'stores', storeId, 'waste'));
      const unsub = onSnapshot(q, (snapshot) => {
        setWasteEntries(prev => {
          const otherEntries = prev.filter(e => e.storeId !== storeId);
          const currentStoreEntries = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              storeId,
              date: data.date.toDate(),
            } as WasteEntry;
          });
          return [...otherEntries, ...currentStoreEntries];
        });
        setLoading(false);
      }, (error) => {
        if (user) {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `stores/${storeId}/waste`, operation: 'list' }));
        }
        setLoading(false);
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach(unsub => unsub());

  }, [firestore, user, isUserLoading, isAdmin, isAdminLoading, userStore, selectedStoreIds, storesLoading]);


  const addWasteEntry = useCallback((wasteEntryData: Omit<WasteEntry, 'id' | 'userId'>) => {
    if (!firestore || !user) return;

    const wasteCollection = collection(firestore, 'stores', wasteEntryData.storeId, 'waste');
    const newEntry = {
      ...wasteEntryData,
      userId: user.uid,
    };
    
    addDoc(wasteCollection, newEntry)
      .then(() => {
        toast({ title: '廃棄を記録しました', description: `合計廃棄額 ¥${wasteEntryData.totalWasteCost.toLocaleString()} が記録されました` });
      })
      .catch((e) => {
        if (user) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: wasteCollection.path, 
                operation: 'create', 
                requestResourceData: newEntry,
            }));
        }
      });
  }, [firestore, user, toast]);

  const deleteWasteEntries = useCallback(async (storeId: string, entryIds: string[]) => {
    if (!firestore || !user) return;
    
    const batch = writeBatch(firestore);
    entryIds.forEach(id => {
      const entryRef = doc(firestore, 'stores', storeId, 'waste', id);
      batch.delete(entryRef);
    });

    try {
      await batch.commit();
      toast({ title: `${entryIds.length}件のデータを削除しました` });
    } catch (error) {
       if (user) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `stores/${storeId}/waste`,
            operation: 'delete',
          }));
       }
    }
  }, [firestore, toast, user]);

  const updateDailyWeather = useCallback(async (storeId: string, date: Date, weather: WeatherType) => {
    if (!firestore || !user) return;

    const dayEntries = wasteEntries.filter(e => e.storeId === storeId && isSameDay(e.date, date));
    if (dayEntries.length === 0) return;

    const batch = writeBatch(firestore);
    dayEntries.forEach(entry => {
      const entryRef = doc(firestore, 'stores', storeId, 'waste', entry.id);
      batch.update(entryRef, { weather });
    });

    try {
      await batch.commit();
    } catch (e) {
      console.error('Failed to sync daily weather', e);
      if (user) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `stores/${storeId}/waste`,
            operation: 'update',
            requestResourceData: { weather }
        }));
      }
    }
  }, [firestore, wasteEntries, user]);

  const updateWasteEntry = useCallback(async (storeId: string, entryId: string, items: WasteItem[], totalWasteCost: number, weather?: WeatherType) => {
    if (!firestore || !user) return;
    
    if (weather) {
      const entry = wasteEntries.find(e => e.id === entryId);
      if (entry) {
        await updateDailyWeather(storeId, entry.date, weather);
      }
    }

    const entryRef = doc(firestore, 'stores', storeId, 'waste', entryId);
    const updateData: any = {
      items,
      totalWasteCost
    };
    
    if (weather) {
      updateData.weather = weather;
    }
    
    updateDoc(entryRef, updateData).then(() => {
      toast({ title: 'データを更新しました' });
    }).catch(error => {
      if (user) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: entryRef.path,
            operation: 'update',
            requestResourceData: updateData
          }));
      }
    });
  }, [firestore, toast, wasteEntries, user, updateDailyWeather]);

  const value = useMemo(() => ({ 
    transactions: [],
    wasteEntries, 
    loading,
    addWasteEntry,
    deleteWasteEntries,
    updateWasteEntry,
    updateDailyWeather,
  }), [wasteEntries, loading, addWasteEntry, deleteWasteEntries, updateWasteEntry, updateDailyWeather]);

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}
