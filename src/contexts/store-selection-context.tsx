'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useStores } from './store-context';
import { useAdmin } from '@/hooks/useAdmin';

interface StoreSelectionContextType {
  selectedStoreIds: string[];
  setSelectedStoreIds: React.Dispatch<React.SetStateAction<string[]>>;
}

const StoreSelectionContext = createContext<StoreSelectionContextType | undefined>(undefined);

export function StoreSelectionProvider({ children }: { children: React.ReactNode }) {
  const { stores, loading: storesLoading } = useStores();
  const { isAdmin } = useAdmin();
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  // Selected stores default to empty, letting users select them explicitly.
  useEffect(() => {
    // Keep empty by default
  }, []);

  const value = useMemo(() => ({
    selectedStoreIds,
    setSelectedStoreIds,
  }), [selectedStoreIds]);

  return (
    <StoreSelectionContext.Provider value={value}>
      {children}
    </StoreSelectionContext.Provider>
  );
}

export function useStoreSelection() {
  const context = useContext(StoreSelectionContext);
  if (context === undefined) {
    throw new Error('useStoreSelection must be used within a StoreSelectionProvider');
  }
  return context;
}
