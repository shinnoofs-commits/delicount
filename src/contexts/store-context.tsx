
'use client';

import type { Store } from '@/lib/types';
import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError, useAuth } from '@/firebase';
import { collection, doc, addDoc, setDoc, deleteDoc, serverTimestamp, query, where, writeBatch, getDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/useAdmin';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

interface StoreContextType {
  stores: Store[];
  userStore: Store | undefined;
  loading: boolean;
  addStore: (store: Omit<Store, 'id' | 'userId' | 'isAdmin'> & { password?: string }) => void;
  updateStore: (store: Omit<Store, 'userId' | 'email' | 'isAdmin'>) => void;
  deleteStore: (storeId: string) => void;
  getStoreById: (storeId: string) => Store | undefined;
  toggleAdminRole: (store: Store) => void;
  resetPassword: (email: string) => Promise<void>;
}

export const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { user } = useUser();
  const { isAdmin, isAdminLoading } = useAdmin();
  
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !user || isAdminLoading) {
      if (!isAdminLoading) setLoading(false);
      return;
    }
    
    setLoading(true);
    let storesQuery;
    if (isAdmin) {
      storesQuery = collection(firestore, 'stores');
    } else {
      storesQuery = query(collection(firestore, 'stores'), where('userId', '==', user.uid));
    }

    const unsub = onSnapshot(storesQuery, (snapshot) => {
      const fetchedStores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
      setStores(fetchedStores);
      setLoading(false);
    }, (e) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'stores',
          operation: 'list'
      }));
      setLoading(false);
    });

    return () => unsub();
  }, [firestore, user, isAdmin, isAdminLoading]);

  
  const userStore = useMemo(() => {
    if (isAdmin || !user || !stores) return undefined;
    return stores.find(s => s.userId === user.uid);
  }, [isAdmin, user, stores]);

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
      
      const storesCollection = collection(firestore, 'stores');
      const storeDataForFirestore = {
        name: storeData.name,
        email: storeData.email,
        userId: newUserId,
        createdAt: serverTimestamp(),
        isAdmin: false,
      };
      
      addDoc(storesCollection, storeDataForFirestore)
        .then(() => {
          toast({ title: "店舗アカウントを追加しました", description: `「${storeData.name}」を登録しました。` });
        })
        .catch(() => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: storesCollection.path,
                operation: 'create',
                requestResourceData: storeDataForFirestore,
            }));
        });

    } catch (error: any) {
      let description = '店舗アカウントの作成に失敗しました。';
      if (error.code === 'auth/email-already-in-use') {
        description = 'このメールアドレスは既に使用されています。';
      } else if (error.code === 'auth/weak-password') {
        description = 'パスワードは6文字以上である必要があります。';
      }
      toast({ variant: 'destructive', title: "認証エラー", description });
    } finally {
      deleteApp(secondaryApp);
    }
  }, [firestore, toast]);

  const updateStore = useCallback((storeData: Omit<Store, 'userId' | 'email' | 'isAdmin'>) => {
    if (!firestore || !isAdmin) return;
    const storeRef = doc(firestore, 'stores', storeData.id);
    const dataToUpdate = { name: storeData.name };
    setDoc(storeRef, dataToUpdate, { merge: true })
      .then(() => {
        toast({ title: "店舗情報を更新しました", description: `「${storeData.name}」を更新しました。` });
      })
      .catch(() => {
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
          description: "店舗データのみ削除されました。",
        });
      })
      .catch(() => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: storeRef.path, operation: 'delete'
        }));
      });
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
    const storeDocRef = doc(firestore, 'stores', store.id);

    try {
      const roleDocSnap = await getDoc(roleDocRef);
      const isCurrentlyAdmin = roleDocSnap.exists();
      const batch = writeBatch(firestore);

      if (isCurrentlyAdmin) {
        batch.delete(roleDocRef);
        batch.update(storeDocRef, { isAdmin: false });
      } else {
        const roleData = {
            name: store.name,
            email: store.email,
            role: 'admin',
        };
        batch.set(roleDocRef, roleData);
        batch.update(storeDocRef, { isAdmin: true });
      }
      
      await batch.commit();
      const newRole = isCurrentlyAdmin ? '店舗アカウント' : '管理者';
      toast({ title: '役割が変更されました', description: `「${store.name}」は${newRole}になりました。` });

    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: roleDocRef.path,
        operation: 'write',
      }));
    }
  }, [firestore, isAdmin, user, toast]);

  const resetPassword = useCallback(async (email: string) => {
    if (!auth) return;
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ 
        title: "再設定メールを送信しました", 
        description: `${email} 宛にパスワード再設定用のメールを送信しました。受信トレイをご確認ください。` 
      });
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: "送信エラー", 
        description: "パスワード再設定メールの送信に失敗しました。" 
      });
    }
  }, [auth, toast]);


  const value = useMemo(() => ({
    stores,
    userStore,
    loading,
    addStore,
    updateStore,
    deleteStore,
    getStoreById,
    toggleAdminRole,
    resetPassword,
  }), [stores, userStore, loading, addStore, updateStore, deleteStore, getStoreById, toggleAdminRole, resetPassword]);

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
