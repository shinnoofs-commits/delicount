
'use client';

import type { Store, AdminRole } from '@/lib/types';
import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, addDoc, setDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/use-admin';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

interface StoreContextType {
  stores: Store[];
  userStore: Store | undefined;
  adminRoles: AdminRole[];
  loading: boolean;
  addStore: (store: Omit<Store, 'id' | 'userId'> & { password?: string }) => void;
  updateStore: (store: Omit<Store, 'userId' | 'email'>) => void;
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

  const storesQuery = useMemoFirebase(() => {
    if (!firestore || isAdminLoading || !user) return null;

    if (isAdmin) {
      return collection(firestore, 'stores');
    } else {
      return query(collection(firestore, 'stores'), where('userId', '==', user.uid));
    }
  }, [firestore, user, isAdmin, isAdminLoading]);

  const { data: storeData, isLoading: isStoresLoading } = useCollection<Store>(storesQuery);

  const adminRolesCollection = useMemoFirebase(() => {
    if (firestore && isAdmin) {
      return collection(firestore, 'roles_admin');
    }
    return null;
  }, [firestore, isAdmin]);

  const { data: adminRolesData, isLoading: isAdminRolesLoading } = useCollection<AdminRole>(adminRolesCollection);

  const stores = storeData || [];
  const adminRoles = adminRolesData || [];
  
  const userStore = useMemo(() => {
    if (isAdmin || !user || !stores) return undefined;
    return stores.find(s => s.userId === user.uid);
  }, [isAdmin, user, stores]);

  const loading = isStoresLoading || isAdminLoading || (isAdmin && isAdminRolesLoading);

  const addStore = useCallback(async (storeData: { name: string; email: string; password?: string }) => {
    if (!firestore) return;

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
      const roleDocRef = doc(rolesAdminCollection, newUserId);
      const roleData = {
        name: storeData.name,
        email: storeData.email,
        role: 'admin',
      };
      await setDoc(roleDocRef, roleData);

      const adminStoresCollection = collection(firestore, 'stores');
      const storeDataForFirestore = {
        name: storeData.name,
        email: storeData.email,
        userId: newUserId,
        createdAt: serverTimestamp(),
      };
      await addDoc(adminStoresCollection, storeDataForFirestore);
      
      toast({ title: "店舗アカウントを追加しました", description: `「${storeData.name}」を管理者として登録しました。` });

    } catch (error: any) {
      let description = '店舗アカウントの作成に失敗しました。';
      if (error.code === 'auth/email-already-in-use') {
        description = 'このメールアドレスは既に使用されています。';
      } else if (error.code === 'auth/weak-password') {
        description = 'パスワードは6文字以上である必要があります。';
      } else if (error.code === 'permission-denied') {
        description = 'データベースへの書き込み権限がありません。';
      }
      toast({ variant: 'destructive', title: "エラー", description });
    } finally {
      await deleteApp(secondaryApp);
    }
  }, [firestore, toast]);

  const updateStore = useCallback((storeData: Omit<Store, 'userId' | 'email'>) => {
    if (!firestore || !isAdmin) return;
    const storeRef = doc(firestore, 'stores', storeData.id);
    const dataToUpdate = { name: storeData.name };
    setDoc(storeRef, dataToUpdate, { merge: true })
      .then(() => {
        toast({ title: "店舗情報を更新しました", description: `「${storeData.name}」を更新しました。` });
      })
      .catch((error: any) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: storeRef.path, operation: 'update', requestResourceData: dataToUpdate
        }));
      });
  }, [firestore, toast, isAdmin]);

  const deleteStore = useCallback((storeId: string) => {
    if (!firestore || !isAdmin) return;
    const storeRef = doc(firestore, 'stores', storeId);
    deleteDoc(storeRef)
      .then(() => {
        toast({ 
          title: "店舗を削除しました",
          description: "店舗データのみ削除されました。ログインアカウントの削除はFirebaseコンソールから手動で行う必要があります。"
        });
      })
      .catch((error: any) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: storeRef.path, operation: 'delete'
        }));
      });
  }, [firestore, toast, isAdmin]);

  const getStoreById = useCallback((storeId: string) => {
      return stores.find(s => s.id === storeId);
  }, [stores]);
  
  const toggleAdminRole = useCallback((store: Store) => {
    if (!firestore || !isAdmin) return;
    if (store.userId === user?.uid) {
      toast({ variant: 'destructive', title: '操作不可', description: '自分自身の役割は変更できません。'});
      return;
    }

    const roleDocRef = doc(firestore, 'roles_admin', store.userId);
    const isAdminNow = adminRoles.some(r => r.id === store.userId);

    if (isAdminNow) {
        deleteDoc(roleDocRef)
          .then(() => {
            toast({ title: '役割が変更されました', description: `「${store.name}」は店舗アカウントになりました。` });
          })
          .catch((e) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: roleDocRef.path,
              operation: 'delete'
            }));
          });
    } else {
        const roleData = {
            name: store.name,
            email: store.email,
            role: 'admin',
        };
        setDoc(roleDocRef, roleData)
          .then(() => {
            toast({ title: '役割が変更されました', description: `「${store.name}」は管理者アカウントになりました。` });
          })
          .catch((e) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: roleDocRef.path,
              operation: 'create',
              requestResourceData: roleData
            }));
          });
    }
  }, [firestore, isAdmin, toast, adminRoles, user]);


  const value = useMemo(() => ({
    stores,
    userStore,
    adminRoles,
    loading,
    addStore,
    updateStore,
    deleteStore,
    getStoreById,
    toggleAdminRole,
  }), [stores, userStore, adminRoles, loading, addStore, updateStore, deleteStore, getStoreById, toggleAdminRole]);

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
