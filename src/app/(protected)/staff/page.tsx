'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdmin } from "@/hooks/use-admin";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";


export default function StaffPage() {
    const { isAdmin, isAdminLoading } = useAdmin();
    const router = useRouter();

    useEffect(() => {
        // Redirect if loading is finished and the user is not an admin.
        if (!isAdminLoading && !isAdmin) {
            router.replace('/pos');
        }
    }, [isAdmin, isAdminLoading, router]);

    // Show a loader while checking for admin status.
    if (isAdminLoading) {
        return (
            <div className="flex h-[400px] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    // This part will be rendered only for admins after loading is complete.
    // The redirect in useEffect handles non-admins.
    if (isAdmin) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>スタッフ管理</CardTitle>
                    <CardDescription>この機能は現在開発中です。今後のアップデートをお待ちください。</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>ここでは、店舗に所属するスタッフの追加や役割の管理ができるようになります。</p>
                </CardContent>
            </Card>
        );
    }

    // Render nothing while the redirect for non-admins is in progress.
    return null;
}
