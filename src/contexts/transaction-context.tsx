'use client';

import type { Transaction, WasteEntry, WasteItem, WeatherType, DailyTransactionBox, DailyWasteBox } from '@/lib/types';
import React, { createContext, useState, useContext, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { useAdmin } from '@/hooks/useAdmin';
import { useStores } from './store-context';
import { useStoreSelection } from './store-selection-context';
import { collection, doc, writeBatch, updateDoc, onSnapshot, query, Unsubscribe, where, getDocs, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, endOfDay, startOfMonth, format } from 'date-fns';

interface TransactionContextType {
  transactions: Transaction[];
  wasteEntries: WasteEntry[];
  loading: boolean;
  addWasteEntry: (wasteEntry: Omit<WasteEntry, 'id' | 'userId'>) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  deleteWasteEntries: (storeId: string, entryIds: string[]) => Promise<void>;
  updateWasteEntry: (storeId: string, entryId: string, date: Date, items: WasteItem[], totalWasteCost: number, weather: WeatherType) => Promise<void>;
  updateDailyWeather: (storeId: string, date: Date, weather: WeatherType) => Promise<void>;
  updateTransaction: (storeId: string, txId: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransactions: (storeId: string, txIds: string[]) => Promise<void>;
  fetchDateRange: { from: Date; to: Date };
  setFetchDateRange: (range: { from: Date; to: Date }) => void;
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // In-memory cache for daily boxes (key: `${storeId}_${YYYY-MM-DD}`)
  // Eliminates redundant network queries and provides instant zero-delay rendering
  const txBoxCacheRef = useRef<Map<string, { date: Date; txs: Transaction[] }>>(new Map());
  const wasteBoxCacheRef = useRef<Map<string, { date: Date; entries: WasteEntry[] }>>(new Map());

  // Default to current month: aligns with analysis pages (/abc-analysis, /cross-analysis)
  // to eliminate the initial redundant 7-day query and double-fetch on first load.
  const [fetchDateRange, setFetchDateRangeState] = useState<{ from: Date; to: Date }>(() => {
    const today = new Date();
    return { from: startOfMonth(today), to: endOfDay(today) };
  });

  const setFetchDateRange = useCallback((range: { from: Date; to: Date }) => {
    if (!range.from) return;
    const to = range.to || range.from;
    const newFrom = startOfDay(range.from);
    const newTo = endOfDay(to);
    setFetchDateRangeState(prev => {
      if (prev.from.getTime() === newFrom.getTime() && prev.to.getTime() === newTo.getTime()) {
        return prev;
      }
      return { from: newFrom, to: newTo };
    });
  }, []);

  useEffect(() => {
    if (!firestore || !user || isUserLoading || isAdminLoading || storesLoading) {
      if (!isUserLoading && !user) setLoading(false);
      return;
    }

    const uniqueStoreIds = Array.from(new Set(isAdmin ? selectedStoreIds : (userStore ? [userStore.id] : [])));

    if (uniqueStoreIds.length === 0) {
      setWasteEntries([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    const fromDate = startOfDay(fetchDateRange.from);
    const toDate = endOfDay(fetchDateRange.to);

    // 1. Immediately hydrate state from in-memory cache if available (zero-delay instant render)
    const cachedTxs: Transaction[] = [];
    const cachedWastes: WasteEntry[] = [];
    let hasAllStoresInCache = uniqueStoreIds.length > 0;

    uniqueStoreIds.forEach(storeId => {
      let storeHasData = false;
      for (const [key, val] of txBoxCacheRef.current.entries()) {
        if (key.startsWith(`${storeId}_`) && val.date >= fromDate && val.date <= toDate) {
          cachedTxs.push(...val.txs);
          storeHasData = true;
        }
      }
      for (const [key, val] of wasteBoxCacheRef.current.entries()) {
        if (key.startsWith(`${storeId}_`) && val.date >= fromDate && val.date <= toDate) {
          cachedWastes.push(...val.entries);
          storeHasData = true;
        }
      }
      if (!storeHasData) hasAllStoresInCache = false;
    });

    if (cachedTxs.length > 0 || cachedWastes.length > 0) {
      setTransactions(cachedTxs);
      setWasteEntries(cachedWastes);
      if (hasAllStoresInCache) {
        setLoading(false);
      }
    } else {
      setLoading(true);
    }

    const unsubscribers: Unsubscribe[] = [];
    let pendingTxFetches = uniqueStoreIds.length;

    uniqueStoreIds.forEach(storeId => {
      // Fetch Daily Wastes via onSnapshot
      const q = query(
        collection(firestore, 'stores', storeId, 'daily_wastes'),
        where('date', '>=', fromDate),
        where('date', '<=', toDate)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        let currentStoreEntries: WasteEntry[] = [];

        snapshot.docs.forEach(doc => {
          const box = doc.data() as DailyWasteBox;
          const dateStr = doc.id;
          const d: any = box.date;
          const boxDate = d?.toDate ? d.toDate() : new Date(d);

          if (box.entries && Array.isArray(box.entries)) {
            const entriesWithStore = box.entries.map(e => ({
              ...e,
              storeId,
              date: boxDate
            }));
            currentStoreEntries.push(...entriesWithStore);
            // Cache per daily box
            wasteBoxCacheRef.current.set(`${storeId}_${dateStr}`, {
              date: boxDate,
              entries: entriesWithStore
            });
          }
        });

        setWasteEntries(prev => {
          const otherEntries = prev.filter(e => e.storeId !== storeId);
          return [...otherEntries, ...currentStoreEntries];
        });
      }, (error) => {
        if (user) {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `stores/${storeId}/daily_wastes`, operation: 'list' }));
        }
      });
      unsubscribers.push(unsub);

      // Fetch Daily Transactions via getDocs
      const fetchTransactionsBox = async () => {
        try {
          const qt = query(
            collection(firestore, 'stores', storeId, 'daily_transactions'),
            where('date', '>=', fromDate),
            where('date', '<=', toDate)
          );
          const snapshot = await getDocs(qt);

          let allTxs: Transaction[] = [];
          snapshot.docs.forEach(doc => {
            const data = doc.data() as DailyTransactionBox;
            const dateStr = doc.id;
            const d: any = data.date;
            const boxDate = d?.toDate ? d.toDate() : new Date(d);

            if (data.transactions && Array.isArray(data.transactions)) {
              const txsWithStore = data.transactions.map(t => ({
                ...t,
                storeId,
                // @ts-ignore
                date: (t.date && typeof t.date === 'object' && typeof t.date.toDate === 'function') ? t.date.toDate() : new Date(t.date as any)
              }));
              allTxs.push(...txsWithStore);
              // Cache per daily box
              txBoxCacheRef.current.set(`${storeId}_${dateStr}`, {
                date: boxDate,
                txs: txsWithStore
              });
            }
          });

          setTransactions(prev => {
            const otherTransactions = prev.filter(t => t.storeId !== storeId);
            return [...otherTransactions, ...allTxs];
          });
        } catch (error) {
          console.error("Fetch daily transactions error:", error);
          if (user) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `stores/${storeId}/daily_transactions`, operation: 'list' }));
          }
        } finally {
          pendingTxFetches--;
          if (pendingTxFetches <= 0) {
            setLoading(false);
          }
        }
      };

      fetchTransactionsBox();
    });

    return () => unsubscribers.forEach(unsub => unsub());

  }, [firestore, user, isUserLoading, isAdmin, isAdminLoading, userStore, selectedStoreIds, storesLoading, fetchDateRange]);


  const lastWasteSubmissionRef = useRef<{ hash: string; timestamp: number } | null>(null);

  const addWasteEntry = useCallback(async (wasteEntryData: Omit<WasteEntry, 'id' | 'userId'>) => {
    if (!firestore || !user) return;
    const dateObj = new Date(wasteEntryData.date);
    const dateStr = format(dateObj, 'yyyy-MM-dd');

    // Context-level deduplication guard against rapid duplicate submissions
    const itemsHash = (wasteEntryData.items || []).map(i => `${i.productId}:${i.quantity}`).sort().join(',');
    const submissionKey = `${wasteEntryData.storeId}_${dateStr}_${itemsHash}_${wasteEntryData.totalWasteCost}`;
    const now = Date.now();
    if (
      lastWasteSubmissionRef.current &&
      lastWasteSubmissionRef.current.hash === submissionKey &&
      now - lastWasteSubmissionRef.current.timestamp < 3000
    ) {
      console.warn('Duplicate addWasteEntry call suppressed within 3000ms window:', submissionKey);
      return;
    }
    lastWasteSubmissionRef.current = { hash: submissionKey, timestamp: now };

    const boxRef = doc(firestore, 'stores', wasteEntryData.storeId, 'daily_wastes', dateStr);

    const newEntry = {
      ...wasteEntryData,
      id: doc(collection(firestore, 'dummy')).id,
      userId: user.uid,
    };

    try {
      const boxSnap = await getDoc(boxRef);
      if (boxSnap.exists()) {
        const data = boxSnap.data() as DailyWasteBox;
        await updateDoc(boxRef, {
          entries: [...(data.entries || []), newEntry]
        });
      } else {
        await setDoc(boxRef, {
          id: dateStr,
          storeId: wasteEntryData.storeId,
          date: startOfDay(dateObj),
          entries: [newEntry]
        });
      }
      wasteBoxCacheRef.current.delete(`${wasteEntryData.storeId}_${dateStr}`);
      toast({ title: '廃棄を登録しました', description: `合計廃棄額 ¥${wasteEntryData.totalWasteCost.toLocaleString()} が記録されました` });
    } catch (e) {
      if (user) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: boxRef.path, operation: 'create', requestResourceData: newEntry,
        }));
      }
    }
  }, [firestore, user, toast]);

  const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id'>) => {
    if (!firestore || !user) return;

    const dateObj = new Date(transactionData.date);
    const dateStr = format(dateObj, 'yyyy-MM-dd');
    const boxRef = doc(firestore, 'stores', transactionData.storeId, 'daily_transactions', dateStr);

    try {
      const newTx = {
        ...transactionData,
        id: crypto.randomUUID(),
        entryType: 'STOCK_CHECK'
      };
      
      const boxSnap = await getDoc(boxRef);
      if (boxSnap.exists()) {
        const data = boxSnap.data() as DailyTransactionBox;
        await updateDoc(boxRef, {
          transactions: [...(data.transactions || []), newTx]
        });
      } else {
        await setDoc(boxRef, {
          id: dateStr,
          storeId: transactionData.storeId,
          date: startOfDay(dateObj),
          transactions: [newTx]
        });
      }

      txBoxCacheRef.current.delete(`${transactionData.storeId}_${dateStr}`);
      setTransactions(prev => [...prev, { ...newTx, storeId: transactionData.storeId, date: dateObj } as Transaction]);

      toast({
        title: '値引き時在庫を記録しました',
        description: `記録が完了しました`
      });
    } catch (e) {
      if (user) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: boxRef.path, operation: 'create', requestResourceData: transactionData,
        }));
      }
    }
  }, [firestore, user, toast]);

  const deleteWasteEntries = useCallback(async (storeId: string, entryIds: string[]) => {
    if (!firestore || !user) return;
    try {
      const groupedByDate = new Map<string, string[]>();
      entryIds.forEach(id => {
         const entry = wasteEntries.find(e => e.id === id);
         if (entry) {
            const dateStr = format(new Date(entry.date), 'yyyy-MM-dd');
            if (!groupedByDate.has(dateStr)) groupedByDate.set(dateStr, []);
            groupedByDate.get(dateStr)!.push(id);
         }
      });
      
      const batch = writeBatch(firestore);
      for (const [dateStr, idsToDelete] of groupedByDate.entries()) {
         const boxRef = doc(firestore, 'stores', storeId, 'daily_wastes', dateStr);
         const boxSnap = await getDoc(boxRef);
         if (boxSnap.exists()) {
            const boxData = boxSnap.data() as DailyWasteBox;
            const filteredEntries = boxData.entries.filter(e => !idsToDelete.includes(e.id));
            batch.update(boxRef, { entries: filteredEntries });
         }
      }
      await batch.commit();
      groupedByDate.forEach((_, dateStr) => wasteBoxCacheRef.current.delete(`${storeId}_${dateStr}`));
      toast({ title: `${entryIds.length}件のデータを削除しました` });
    } catch (error) {
      if (user) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `stores/${storeId}/daily_wastes`, operation: 'delete',
        }));
      }
    }
  }, [firestore, toast, user, wasteEntries]);

  const updateDailyWeather = useCallback(async (storeId: string, date: Date, weather: WeatherType) => {
    if (!firestore || !user) return;
    const dateStr = format(new Date(date), 'yyyy-MM-dd');
    const boxRef = doc(firestore, 'stores', storeId, 'daily_wastes', dateStr);
    try {
      const boxSnap = await getDoc(boxRef);
      if (boxSnap.exists()) {
        const boxData = boxSnap.data() as DailyWasteBox;
        const updatedEntries = boxData.entries.map(e => ({ ...e, weather }));
        await updateDoc(boxRef, { entries: updatedEntries });
        wasteBoxCacheRef.current.delete(`${storeId}_${dateStr}`);
      }
    } catch (e) {
      console.error('Failed to sync daily weather by querying', e);
      if (user) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `stores/${storeId}/daily_wastes`, operation: 'update', requestResourceData: { weather }
        }));
      }
    }
  }, [firestore, user]);

  const updateWasteEntry = useCallback(async (storeId: string, entryId: string, date: Date, items: WasteItem[], totalWasteCost: number, weather: WeatherType) => {
    if (!firestore || !user) return;

    const dateStr = format(new Date(date), 'yyyy-MM-dd');
    const boxRef = doc(firestore, 'stores', storeId, 'daily_wastes', dateStr);
    
    try {
      const boxSnap = await getDoc(boxRef);
      if (boxSnap.exists()) {
        const boxData = boxSnap.data() as DailyWasteBox;
        const updatedEntries = boxData.entries.map(e => {
           if (e.id === entryId) {
              return { ...e, items, totalWasteCost, weather };
           }
           return { ...e, weather };
        });
        await updateDoc(boxRef, { entries: updatedEntries });
        wasteBoxCacheRef.current.delete(`${storeId}_${dateStr}`);
        toast({ title: 'データを更新しました' });
      }
    } catch (error) {
      if (user) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: boxRef.path, operation: 'update', requestResourceData: { items, totalWasteCost, weather }
        }));
      }
    }
  }, [firestore, toast, user]);
  
  const updateTransaction = useCallback(async (storeId: string, txId: string, data: Partial<Transaction>) => {
    if (!firestore || !user) return;
    
    const existingTx = transactions.find(t => t.id === txId && t.storeId === storeId);
    if (!existingTx) return;
    
    const dateStr = format(new Date(existingTx.date), 'yyyy-MM-dd');
    const boxRef = doc(firestore, 'stores', storeId, 'daily_transactions', dateStr);
    
    try {
      const boxSnap = await getDoc(boxRef);
      if (boxSnap.exists()) {
        const boxData = boxSnap.data() as DailyTransactionBox;
        const updatedTxs = boxData.transactions.map(t => t.id === txId ? { ...t, ...data } : t);
        await updateDoc(boxRef, { transactions: updatedTxs });
        txBoxCacheRef.current.delete(`${storeId}_${dateStr}`);
        
        setTransactions(prev => prev.map(t => t.id === txId ? { ...t, ...data } as Transaction : t));
        toast({ title: '在庫データを更新しました' });
      }
    } catch (e) {
      if (user) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: boxRef.path, operation: 'update', requestResourceData: data
        }));
      }
    }
  }, [firestore, user, toast, transactions]);

  const deleteTransactions = useCallback(async (storeId: string, txIds: string[]) => {
    if (!firestore || !user) return;
    
    try {
      const groupedByDate = new Map<string, string[]>();
      txIds.forEach(id => {
        const tx = transactions.find(t => t.id === id);
        if (tx) {
           const dateStr = format(new Date(tx.date), 'yyyy-MM-dd');
           if (!groupedByDate.has(dateStr)) groupedByDate.set(dateStr, []);
           groupedByDate.get(dateStr)!.push(id);
        }
      });
      
      const batch = writeBatch(firestore);
      for (const [dateStr, idsToDelete] of groupedByDate.entries()) {
        const boxRef = doc(firestore, 'stores', storeId, 'daily_transactions', dateStr);
        const boxSnap = await getDoc(boxRef);
        if (boxSnap.exists()) {
          const boxData = boxSnap.data() as DailyTransactionBox;
          const filteredTxs = boxData.transactions.filter(t => !idsToDelete.includes(t.id));
          batch.update(boxRef, { transactions: filteredTxs });
        }
      }
      
      await batch.commit();
      groupedByDate.forEach((_, dateStr) => txBoxCacheRef.current.delete(`${storeId}_${dateStr}`));
      
      setTransactions(prev => prev.filter(t => !txIds.includes(t.id)));
      toast({ title: `${txIds.length}件のデータを削除しました` });
    } catch (e) {
      if (user) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `stores/${storeId}/daily_transactions`, operation: 'delete'
        }));
      }
    }
  }, [firestore, user, toast, transactions]);

  const value = useMemo(() => ({
    transactions,
    wasteEntries,
    loading,
    addWasteEntry,
    addTransaction,
    deleteWasteEntries,
    updateWasteEntry,
    updateDailyWeather,
    updateTransaction,
    deleteTransactions,
    fetchDateRange,
    setFetchDateRange,
  }), [transactions, wasteEntries, loading, addWasteEntry, addTransaction, deleteWasteEntries, updateWasteEntry, updateDailyWeather, updateTransaction, deleteTransactions, fetchDateRange, setFetchDateRange]);

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
