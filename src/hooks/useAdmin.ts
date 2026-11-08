'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function useAdmin() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const adminRoleRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'roles_admin', user.uid);
  }, [user, firestore]);

  const { data: adminRole, isLoading: isAdminLoading } = useDoc<{role: string}>(adminRoleRef);

  const isLoading = isUserLoading || isAdminLoading;

  return { isAdmin: adminRole?.role === 'admin', isAdminLoading: isLoading };
}
