'use client';

import * as React from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useStores } from '@/contexts/store-context';
import { StoreSelector } from '@/components/ui/store-selector';
import { Badge } from '@/components/ui/badge';

export function HeaderStoreSelector() {
  const { isAdmin, isAdminLoading } = useAdmin();
  const { userStore, loading } = useStores();

  if (isAdminLoading || loading) {
    return <div className="h-9 w-[150px] animate-pulse bg-muted rounded-md mr-4" />;
  }

  if (isAdmin) {
    return (
      <div className="mr-4">
        <StoreSelector />
      </div>
    );
  }

  return (
    <div className="mr-4 flex items-center">
      <Badge variant="outline" className="bg-background h-6 px-2 text-[12px] font-normal">
        {userStore?.name || '店舗未設定'}
      </Badge>
    </div>
  );
}
