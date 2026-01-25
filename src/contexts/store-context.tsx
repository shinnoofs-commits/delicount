
'use client';

import type { Store, AdminRole } from '@/lib/types';
import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, addDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/use-admin';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

interface StoreContextType {
  stores: Store[];
  adminRoles: AdminRole[];
  loading: boolean;
  addStore: (store: Omit<Store, 'id' | 'userId'> & { password?: string }) => void;
  updateStore: (store: Store) => void;
  deleteStore: (storeId: string) => void;
  getStoreById: (storeId: string) => Store | undefined;
  toggleAdminRole: (store: Store) => void;
}

export const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const { isAdmin, isAdminLoading } = useAdmin();

  const storesCollection = useMemoFirebase(() => {
    if (firestore && isAdmin) {
      return collection(firestore, 'stores');
    }
    return null;
  }, [firestore, isAdmin]);

  const { data: storeData, isLoading: isStoresLoading } = useCollection<Store>(storesCollection);

  const adminRolesCollection = useMemoFirebase(() => {
    if (firestore && isAdmin) {
      return collection(firestore, 'roles_admin');
    }
    return null;
  }, [firestore, isAdmin]);

  const { data: adminRolesData, isLoading: isAdminRolesLoading } = useCollection<AdminRole>(adminRolesCollection);

  const stores = isAdmin ? (storeData || []) : [];
  const adminRoles = isAdmin ? (adminRolesData || []) : [];
  
  const loading = isAdminLoading || (isAdmin && (isStoresLoading || isAdminRolesLoading));

  const addStore = useCallback(async (storeData: { name: string; email: string; password?: string }) => {
    if (!firestore || !isAdmin) return;

    if (!storeData.password) {
      toast({ variant: 'destructive', title: 'エラー', description: 'パスワードが指定されていません。' });
      return;
    }

    const secondaryAppName = `store-creation-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, storeData.email, storeData.password);
      const newUserId = userCredential.user.uid;
      
      const rolesAdminCollection = collection(firestore, 'roles_admin');
      await setDoc(doc(rolesAdminCollection, newUserId), {
        name: storeData.name,
        email: storeData.email,
        role: 'admin',
      });

      const adminStoresCollection = collection(firestore, 'stores');
      await addDoc(adminStoresCollection, {
        name: storeData.name,
        email: storeData.email,
        userId: newUserId,
        createdAt: serverTimestamp(),
      });
      
      toast({ title: "店舗アカウントを追加しました", description: `「${storeData.name}」を管理者として登録しました。` });

    } catch (error: any) {
      let description = '店舗アカウントの作成に失敗しました。';
      if (error.code === 'auth/email-already-in-use') {
        description = 'このメールアドレスは既に使用されています。';
      } else if (error.code === 'auth/weak-password') {
        description = 'パスワードは6文字以上である必要があります。';
      }
      toast({ variant: 'destructive', title: "エラー", description });
    } finally {
      await deleteApp(secondaryApp);
    }
  }, [firestore, toast, isAdmin]);

  const updateStore = useCallback(async (storeData: Partial<Store> & { id: string }) => {
    if (!firestore || !isAdmin) return;
    const storeRef = doc(firestore, 'stores', storeData.id);
    try {
        await setDoc(storeRef, {
            name: storeData.name
        }, { merge: true });
        toast({ title: "店舗情報を更新しました", description: `「${storeData.name}」を更新しました。` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "エラー", description: error.message });
    }
  }, [firestore, toast, isAdmin]);

  const deleteStore = useCallback(async (storeId: string) => {
    if (!firestore || !isAdmin) return;
    const storeRef = doc(firestore, 'stores', storeId);
    try {
        await deleteDoc(storeRef);
        toast({ 
          title: "店舗を削除しました",
          description: "店舗データのみ削除されました。ログインアカウントの削除はFirebaseコンソールから手動で行う必要があります。"
        });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "エラー", description: error.message });
    }
  }, [firestore, toast, isAdmin]);

  const getStoreById = useCallback((storeId: string) => {
      return stores.find(s => s.id === storeId);
  }, [stores]);
  
  const toggleAdminRole = useCallback(async (store: Store) => {
    if (!firestore || !isAdmin) return;
    if (store.userId === user?.uid) {
      toast({ variant: 'destructive', title: '操作不可', description: '自分自身の役割は変更できません。'});
      return;
    }

    const roleDocRef = doc(firestore, 'roles_admin', store.userId);
    const isAdminNow = adminRoles.some(r => r.id === store.userId);

    try {
        if (isAdminNow) {
            await deleteDoc(roleDocRef);
            toast({ title: '役割が変更されました', description: `「${store.name}」は店舗アカウントになりました。` });
        } else {
            await setDoc(roleDocRef, {
                name: store.name,
                email: store.email,
                role: 'admin',
            });
            toast({ title: '役割が変更されました', description: `「${store.name}」は管理者アカウントになりました。` });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: "エラー", description: error.message });
    }
  }, [firestore, isAdmin, toast, adminRoles, user]);


  const value = useMemo(() => ({
    stores,
    adminRoles,
    loading,
    addStore,
    updateStore,
    deleteStore,
    getStoreById,
    toggleAdminRole,
  }), [stores, adminRoles, loading, addStore, updateStore, deleteStore, getStoreById, toggleAdminRole]);

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStores() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStores must be used within a StoreProvider');
  }
  return context;
}
