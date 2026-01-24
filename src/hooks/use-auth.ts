
'use client';
import { useUser, useAuth as useFirebaseAuth } from '@/firebase';

export function useAuth() {
  const { user, isUserLoading: loading } = useUser();
  const auth = useFirebaseAuth();

  // This hook is now a compatibility layer.
  // The actual login/logout logic is handled directly with Firebase in components.
  const login = () => {
    // Deprecated: login logic is now in login/signup pages
    console.warn('useAuth().login() is deprecated.');
  };
  const logout = () => {
    // Deprecated: logout logic is in UserNav
    return auth.signOut();
  };

  return { user, loading, login, logout };
}
