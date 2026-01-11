
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { TransactionProvider } from '@/contexts/transaction-context';

import {
  Package,
  Home,
  ShoppingCart,
  LineChart,
  PanelLeft,
  PieChart,
  BookText,
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

const navItems = [
  { href: '/pos', icon: ShoppingCart, label: '廃棄入力', adminOnly: false },
  { href: '/dashboard', icon: LineChart, label: 'ダッシュボード', adminOnly: true },
  { href: '/abc-analysis', icon: PieChart, label: 'ABC分析', adminOnly: true },
  { href: '/products', icon: Package, label: '商品', adminOnly: true },
  { href: '/manual', icon: BookText, label: '操作説明', adminOnly: false },
];

function MainNav({ userRole, onLinkClick }: { userRole: 'admin' | 'employee', onLinkClick: () => void }) {
  const pathname = usePathname();
  const filteredNavItems = navItems.filter(item => !item.adminOnly || userRole === 'admin');

  return (
    <nav className="grid items-start px-4 text-sm font-medium">
      <Link
        href="/pos"
        className="flex items-center gap-3 rounded-lg bg-primary px-3 py-2 text-primary-foreground transition-all hover:bg-primary/90"
        onClick={onLinkClick}
      >
        <Icons.logo className="h-6 w-6" />
        <span>廃棄分析ツール</span>
      </Link>
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

function ProtectedLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);
  
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

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const currentNavItem = navItems.find(item => pathname.startsWith(item.href));
  if (currentNavItem?.adminOnly && user.role !== 'admin') {
     router.replace('/pos');
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4">リダイレクト中...</p>
        </div>
     );
  }
  
  const handleLinkClick = () => {
    setIsSheetOpen(false);
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-background lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-6">
            <Link href="/pos" className="flex items-center gap-2 font-semibold">
              <Icons.logo className="h-6 w-6" />
              <span className="">廃棄分析ツール</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <MainNav userRole={user.role} onLinkClick={() => {}} />
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
           <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="lg:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">メニューを開閉</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
               <div className="flex h-14 items-center border-b px-6">
                <Link href="/pos" className="flex items-center gap-2 font-semibold">
                  <Icons.logo className="h-6 w-6" />
                  <span className="">廃棄分析ツール</span>
                </Link>
              </div>
              <div className="flex-1 overflow-auto py-2">
                <MainNav userRole={user.role} onLinkClick={handleLinkClick} />
              </div>
            </SheetContent>
          </Sheet>

          <Breadcrumb className="hidden lg:flex">
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
  );
}


export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TransactionProvider>
      <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
    </TransactionProvider>
  )
}
