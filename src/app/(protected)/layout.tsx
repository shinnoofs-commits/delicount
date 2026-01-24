
'use client';

import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAdmin } from '@/hooks/use-admin';

import {
  Package,
  ShoppingCart,
  LineChart,
  PanelLeft,
  PieChart,
  BookText,
  Building,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { UserNav } from '@/components/user-nav';
import { Icons } from '@/components/icons';
import { Loader2 } from 'lucide-react';
import { TransactionProvider } from '@/contexts/transaction-context';
import { ProductProvider } from '@/contexts/product-context';
import { StoreProvider } from '@/contexts/store-context';


const navItems = [
  { href: '/pos', icon: ShoppingCart, label: '廃棄入力', adminOnly: false },
  { href: '/dashboard', icon: LineChart, label: 'ダッシュボード', adminOnly: true },
  { href: '/abc-analysis', icon: PieChart, label: 'ABC分析', adminOnly: true },
  { href: '/products', icon: Package, label: '商品', adminOnly: true },
  { href: '/stores', icon: Building, label: '店舗一覧', adminOnly: true },
  { href: '/staff', icon: Users, label: 'スタッフ管理', adminOnly: true },
  { href: '/manual', icon: BookText, label: '操作説明', adminOnly: false },
];

function MainNav({ onLinkClick }: { onLinkClick: () => void }) {
  const pathname = usePathname();
  const { isAdmin } = useAdmin();
  
  const filteredNavItems = useMemo(() => {
    if (isAdmin) return navItems;
    return navItems.filter(item => !item.adminOnly);
  }, [isAdmin]);

  return (
    <nav className="grid items-start px-4 text-sm font-medium">
        {filteredNavItems.map((item) => (
            <Link
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                    pathname.startsWith(item.href) && 'bg-accent text-primary'
                )}
            >
                <item.icon className="h-4 w-4" />
                {item.label}
            </Link>
        ))}
    </nav>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { isAdmin, isAdminLoading } = useAdmin();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);
  
  const breadcrumbItems = useMemo(() => {
    const pathParts = pathname.split('/').filter(part => part);
    const items = pathParts.map((part, index) => {
      const href = '/' + pathParts.slice(0, index + 1).join('/');
      const navItem = navItems.find(item => item.href === href);
      const label = navItem?.label || part.charAt(0).toUpperCase() + part.slice(1);
      return {
        href,
        label,
        isPage: index === pathParts.length - 1,
      };
    });
    return [{ href: '/', label: '廃棄分析ツール' }, ...items];
  }, [pathname]);

  if (isUserLoading || !user || isAdminLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const handleLinkClick = () => {
    setIsSheetOpen(false);
  }

  const sidebarContent = (
     <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-6">
          <Link href="/pos" className="flex items-center gap-2 font-semibold" onClick={handleLinkClick}>
            <Icons.logo className="h-6 w-6" />
            <span className="">廃棄分析ツール</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <MainNav onLinkClick={handleLinkClick} />
        </div>
      </div>
  );


  return (
    <StoreProvider>
      <ProductProvider>
        <TransactionProvider>
          <div className="min-h-screen w-full">
            <div className="flex flex-col">
              <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button size="icon" variant="outline" className="shrink-0">
                      <PanelLeft className="h-5 w-5" />
                      <span className="sr-only">メニューを開閉</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] p-0">
                    {sidebarContent}
                  </SheetContent>
                </Sheet>

                <div className="hidden md:block">
                  <Breadcrumb>
                    <BreadcrumbList>
                      {breadcrumbItems.map((item, index) => (
                        <React.Fragment key={item.href}>
                          <BreadcrumbItem>
                            {item.isPage ? (
                              <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link href={item.href}>{item.label}</Link>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                          {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
                        </React.Fragment>
                      ))}
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>

                <div className="relative ml-auto flex-1 md:grow-0">
                  {/* Search can be implemented later */}
                </div>
                <UserNav />
              </header>
              <main className="flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                {children}
              </main>
            </div>
          </div>
        </TransactionProvider>
      </ProductProvider>
    </StoreProvider>
  );
}
