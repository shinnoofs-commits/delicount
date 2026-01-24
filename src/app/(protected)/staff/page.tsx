
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdmin } from "@/hooks/use-admin";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


export default function StaffPage() {
    const { isAdmin, isAdminLoading } = useAdmin();
    const router = useRouter();

    useEffect(() => {
        if (!isAdminLoading && !isAdmin) {
            router.replace('/pos');
        }
    }, [isAdmin, isAdminLoading, router]);

    if (isAdminLoading || !isAdmin) {
        return <div>Loading...</div>; // Or a proper loader
    }
    
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
    )
}
