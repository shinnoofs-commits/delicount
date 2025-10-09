
'use client';

import type { Transaction, WasteEntry } from '@/lib/types';
import { transactions as initialTransactions } from '@/lib/data';
import React, { createContext, useState, useContext, useCallback } from 'react';

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  wasteEntries: WasteEntry[];
  addWasteEntry: (wasteEntry: WasteEntry) => void;
}

export const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);

  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions(prevTransactions => [...prevTransactions, transaction]);
  }, []);

  const addWasteEntry = useCallback((wasteEntry: WasteEntry) => {
    setWasteEntries(prevEntries => [...prevEntries, wasteEntry]);
  }, []);


  return (
    <TransactionContext.Provider value={{ transactions, addTransaction, wasteEntries, addWasteEntry }}>
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
