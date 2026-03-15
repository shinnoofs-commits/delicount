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
  BookText,
  Building,
  Sigma,
  Factory,
  CalendarDays,
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

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { UserNav } from '@/components/user-nav';
import { Icons } from '@/components/icons';
import { Loader2 } from 'lucide-react';
import { TransactionProvider } from '@/contexts/transaction-context';
import { ProductProvider } from '@/contexts/product-context';
import { StoreProvider } from '@/contexts/store-context';
import { StoreSelectionProvider } from '@/contexts/store-selection-context';
import { ProductionProvider } from '@/contexts/production-context';


const navItems = [
  { href: '/pos', icon: ShoppingCart, label: '廃棄入力', adminOnly: false },
  { href: '/production', icon: Factory, label: '製造数入力', adminOnly: false },
  { href: '/production-planning', icon: CalendarDays, label: '製造計画', adminOnly: false },
  { href: '/dashboard', icon: LineChart, label: 'ダッシュボード', adminOnly: false },
  { href: '/abc-analysis', icon: Sigma, label: 'ABC分析', adminOnly: false },
  { href: '/products', icon: Package, label: '商品', adminOnly: false },
  { href: '/stores', icon: Building, label: '店舗一覧', adminOnly: true },
  { href: '/manual', icon: BookText, label: '操作説明', adminOnly: false },
];

function MainNav({ onLinkClick, isAdmin }: { onLinkClick: () => void, isAdmin: boolean }) {
  const pathname = usePathname();
  
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
    
    const mappedItems = pathParts.map((part, index) => {
      const href = '/' + pathParts.slice(0, index + 1).join('/');
      const navItem = navItems.find(item => item.href === href);
      const label = navItem?.label || part.charAt(0).toUpperCase() + part.slice(1);
      return {
        href,
        label,
        isPage: index === pathParts.length - 1,
      };
    });

    const allItems: { href: string; label: string; isPage: boolean }[] = [
      {
        href: '/',
        label: '商品構成・廃棄管理パートナー',
        isPage: pathParts.length === 0,
      },
      ...mappedItems,
    ];

    return allItems;
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
            <span className="">商品構成・廃棄管理パートナー</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <MainNav onLinkClick={handleLinkClick} isAdmin={isAdmin} />
        </div>
      </div>
  );


  return (
    <StoreProvider>
      <StoreSelectionProvider>
        <ProductProvider>
          <ProductionProvider>
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
                        <SheetHeader className="sr-only">
                          <SheetTitle>サイドバーメニュー</SheetTitle>
                          <SheetDescription>
                            アプリケーションの各ページに移動するためのナビゲーションメニューです。
                          </SheetDescription>
                        </SheetHeader>
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
          </ProductionProvider>
        </ProductProvider>
      </StoreSelectionProvider>
    </StoreProvider>
  );
}
