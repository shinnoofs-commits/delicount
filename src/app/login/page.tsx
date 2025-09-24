'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { users } from '@/lib/data';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';

export default function LoginPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = () => {
    if (selectedUserId) {
      login(selectedUserId);
      router.push('/pos');
    }
  };
  
  const roleToJapanese = (role: 'admin' | 'employee') => {
    return role === 'admin' ? '管理者' : '従業員';
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Icons.logo className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">SwiftPOSへようこそ</CardTitle>
          <CardDescription>サインインするユーザーを選択してください</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="user">ユーザー</Label>
              <Select onValueChange={setSelectedUserId}>
                <SelectTrigger id="user">
                  <SelectValue placeholder="ユーザーを選択" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({roleToJapanese(user.role)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleLogin} disabled={!selectedUserId} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              サインイン
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
