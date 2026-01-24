'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LogoutPage() {
    const auth = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        signOut(auth).then(() => {
            toast({ title: 'ログアウトしました' });
            router.replace('/login');
        }).catch((error) => {
            console.error('Logout failed', error);
            toast({
                variant: 'destructive',
                title: 'ログアウトに失敗しました',
                description: 'もう一度お試しください。',
            });
            router.replace('/pos');
        });
    }, [auth, router, toast]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">ログアウトしています...</p>
        </div>
    );
}
