
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirebase, initializeFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function SignupPage() {
  const { auth, user: currentUser, isUserLoading } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('admin');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isUserLoading && currentUser) {
      router.replace('/pos');
    }
  }, [currentUser, isUserLoading, router]);

  const handleSignup = async () => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: name });
      
      const { firestore } = initializeFirebase();

      // Always create a store entry for the new user
      const storeData = {
          name: name, // Using user's name as store name
          email: email,
          userId: user.uid,
      };
      const storesCollection = collection(firestore, 'stores');
      addDoc(storesCollection, storeData).catch((e) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: storesCollection.path,
              operation: 'create',
              requestResourceData: storeData
          }));
      });

      // If the role is admin, create an admin role document
      if (role === 'admin') {
          const adminRoleData = {
              name: name,
              role: 'admin',
              email: email,
          };
          const adminRoleDocRef = doc(firestore, 'roles_admin', user.uid);
          
          setDoc(adminRoleDocRef, adminRoleData).catch((e) => {
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: adminRoleDocRef.path,
                  operation: 'create',
                  requestResourceData: adminRoleData
              }));
          });
      }
      
      toast({ title: 'アカウントを登録しました', description: 'ログインページに移動します。' });
      router.replace('/login');

    } catch (error: any) {
      console.error(error);
      let description = 'アカウント登録に失敗しました。';
      if (error.code === 'auth/email-already-in-use') {
        description = 'このメールアドレスは既に使用されています。';
      } else if (error.code === 'auth/weak-password') {
        description = 'パスワードは6文字以上である必要があります。';
      } else if (error.message) {
        description = error.message;
      }
      toast({
        variant: 'destructive',
        title: '登録エラー',
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isUserLoading || (!isUserLoading && currentUser)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Icons.logo className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">アカウント登録</CardTitle>
          <CardDescription>新しいアカウントを作成します。役割を選択してください。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">名前（店舗名）</Label>
            <Input
              id="name"
              placeholder="山田 太郎"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>役割</Label>
            <RadioGroup
                value={role}
                onValueChange={setRole}
                className="flex gap-4 pt-1"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="admin" id="role-admin" />
                    <Label htmlFor="role-admin" className="font-normal">本部</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="store" id="role-store" />
                    <Label htmlFor="role-store" className="font-normal">店舗</Label>
                </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button onClick={handleSignup} disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            登録
          </Button>
          <div className="text-center text-sm">
            すでにアカウントをお持ちですか？{' '}
            <Link href="/login" className="underline">
              ログイン
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
