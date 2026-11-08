'use client';

import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAdmin } from '@/hooks/useAdmin';

import {
  Package,
  ShoppingCart,
  LineChart,
  PanelLeft,
  BookText,
  Building,
  Calculator,
  Factory,
  CalendarDays,
  Sparkles,
  Database,
  Home,
  Award,
  GitCompare,
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
import { HeaderStoreSelector } from '@/components/layout/header-store-selector';
import { ChatbotProvider } from '@/contexts/chatbot-context';
import { FloatingChatbot } from '@/components/ui/floating-chatbot';


const navItems = [
  { href: '/', icon: Home, label: 'ホーム', adminOnly: false },
  { href: '/pos', icon: ShoppingCart, label: '廃棄入力', adminOnly: false },
  { href: '/dashboard', icon: LineChart, label: 'ダッシュボード', adminOnly: false },
  { href: '/abc-analysis', icon: Calculator, label: '廃棄クロス分析', adminOnly: false },
  { href: '/cross-analysis', icon: LineChart, label: '詳細クロス分析', adminOnly: false },
  { href: '/score-analysis', icon: Sparkles, label: 'AI偏差値分析', adminOnly: false },
  { href: '/compare-analysis', icon: GitCompare, label: '比較分析', adminOnly: false },
  { href: '/products', icon: Package, label: '商品', adminOnly: true },
  { href: '/stores', icon: Building, label: '店舗一覧', adminOnly: true },
  { href: '/admin/import', icon: Database, label: 'POSインポート', adminOnly: true },
  { href: '/system', icon: Database, label: 'システム管理', adminOnly: true },
  { href: '/admin/docs', icon: BookText, label: 'システム仕様書', adminOnly: true },
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
  
  const filteredNavItems = useMemo(() => {
    if (isAdmin) return navItems;
    return navItems.filter(item => !item.adminOnly);
  }, [isAdmin]);

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
        label: 'Deli・COUNT',
        isPage: pathParts.length === 0,
      },
      ...mappedItems,
    ];

    return allItems;
  }, [pathname]);

  const handleLinkClick = () => {
    setIsSheetOpen(false);
  };

  if (isUserLoading || !user || isAdminLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const sidebarContent = (
     <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-bold" onClick={handleLinkClick}>
            <img src="/logo-deli-count.jpg" alt="Deli・COUNT" className="h-8 w-8 rounded-lg object-contain shadow-xs" />
            <span className="text-base tracking-tight text-slate-800">Deli・COUNT</span>
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
          <TransactionProvider>
            <ChatbotProvider>
              <div className="min-h-screen w-full">
                <div className="flex flex-col">
                <header className="flex h-14 items-center gap-3 border-b bg-background px-4 lg:px-6">
                  <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                      <Button size="icon" variant="outline" className="shrink-0 md:hidden">
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

                  <Link href="/" className="flex items-center gap-2 font-bold shrink-0 hover:opacity-90 transition-opacity">
                    <img src="/logo-deli-count.jpg" alt="Deli・COUNT" className="h-8 w-8 rounded-lg object-contain shadow-xs" />
                    <span className="font-black text-slate-900 tracking-tight hidden sm:inline">Deli・COUNT</span>
                  </Link>

                  <div className="hidden lg:block border-l pl-3 ml-1">
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
                  <HeaderStoreSelector />
                  <UserNav />
                </header>

                {/* Persistent Direct Menu Switcher Bar */}
                <nav className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 border-b bg-muted/40 text-xs font-semibold shadow-xs scrollbar-none">
                  {filteredNavItems.map((item) => {
                    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all text-xs font-bold",
                          isActive
                            ? "bg-orange-500 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                        )}
                      >
                        <item.icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-slate-500")} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                <main className="flex-1 flex-col gap-4 p-2 md:p-3">
                  {children}
                </main>
              </div>
            </div>
            <FloatingChatbot />
            </ChatbotProvider>
          </TransactionProvider>
        </ProductProvider>
      </StoreSelectionProvider>
    </StoreProvider>
  );
}
