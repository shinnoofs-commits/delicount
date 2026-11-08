'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useAdmin } from '@/hooks/useAdmin';
import Link from 'next/link';
import { 
  Package, ShoppingCart, LineChart, BookText, Building, Calculator, Sparkles, Database, User, LogOut, Settings, FileText, ChevronRight, Award, GitCompare
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const mainNavItems = [
  { href: '/pos', icon: ShoppingCart, label: '廃棄入力', color: 'text-orange-500' },
  { href: '/dashboard', icon: LineChart, label: 'ダッシュボード', color: 'text-blue-500' },
  { href: '/abc-analysis', icon: Calculator, label: '廃棄クロス分析', color: 'text-green-500' },
  { href: '/cross-analysis', icon: LineChart, label: '詳細クロス分析', color: 'text-purple-500' },
  { href: '/score-analysis', icon: Sparkles, label: 'AI偏差値分析', color: 'text-amber-500' },
  { href: '/compare-analysis', icon: GitCompare, label: '比較分析', color: 'text-rose-600' },
];

const adminNavItems = [
  { href: '/products', icon: Package, label: '商品', color: 'text-indigo-500' },
  { href: '/stores', icon: Building, label: '店舗一覧', color: 'text-cyan-500' },
  { href: '/admin/import', icon: Database, label: 'POSインポート', color: 'text-rose-500' },
  { href: '/system', icon: Settings, label: 'システム管理', color: 'text-slate-500' },
  { href: '/admin/docs', icon: FileText, label: 'システム仕様書', color: 'text-slate-500' },
];

const commonNavItems = [
  { href: '/manual', icon: BookText, label: '操作説明', color: 'text-teal-500' },
];

export default function HomePage() {
  const { user, isUserLoading } = useUser();
  const { isAdmin, isAdminLoading } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = () => {
    router.push('/logout');
  };

  const leftItems = mainNavItems;
  const rightItems = useMemo(() => {
    if (isAdmin) return [...adminNavItems, ...commonNavItems];
    return commonNavItems;
  }, [isAdmin]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const roleName = isAdminLoading ? '読み込み中...' : (isAdmin ? '本部・管理者' : '店舗スタッフ');

  return (
    <div className="min-h-screen w-full relative bg-gradient-to-br from-[#fff1f2] via-[#fff6f6] to-[#fef2f2] overflow-x-hidden flex flex-col items-center justify-center font-sans">
      {/* Custom soft reddish dotted background using Tailwind arbitrary values */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-35 bg-[radial-gradient(#fca5a5_1.5px,transparent_1.5px)] [background-size:28px_28px]"></div>
      
      {/* Top bar */}
      <div className="absolute top-4 left-4 z-10">
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-100">
           <User className="h-5 w-5 text-rose-600" />
           <span className="font-bold text-slate-800 text-sm tracking-wide">{roleName}</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <Button variant="outline" className="bg-white/80 backdrop-blur-sm rounded-full shadow-sm border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-colors" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          ログアウト
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="z-10 w-full max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-12 mt-16 md:mt-0">
        
        {/* Left Nav Grid */}
        <div className="flex-1 w-full grid grid-cols-2 gap-4 md:gap-6 justify-items-end">
          {leftItems.map((item) => (
             <Link key={item.href} href={item.href} className="w-full max-w-[180px]">
               <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-3 aspect-square cursor-pointer group">
                 <div className={`p-4 rounded-2xl bg-slate-50 group-hover:scale-110 transition-transform ${item.color}`}>
                   <item.icon className="h-8 w-8" />
                 </div>
                 <div className="text-center">
                   <p className="font-black text-sm text-slate-800 leading-tight">{item.label}</p>
                 </div>
               </div>
             </Link>
          ))}
        </div>

        {/* Center Logo Area */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center scale-90 md:scale-100 my-8 md:my-0">
          <div className="relative mb-6 text-center flex flex-col items-center">
             <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl overflow-hidden shadow-md border-2 border-orange-100 mb-3 bg-white p-1">
                <img src="/logo-deli-count.jpg" alt="Deli・COUNT" className="w-full h-full object-contain rounded-2xl" />
             </div>
             <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Deli・COUNT</h1>
             <p className="text-orange-600 font-bold tracking-widest text-xs md:text-sm mt-1">値引き・廃棄マネジメント</p>
          </div>
          
          <div className="bg-white rounded-full shadow-sm border border-slate-200 px-6 py-3 flex items-center gap-6 font-bold text-sm text-slate-600">
             <Link href="/" className="hover:text-orange-600 transition-colors flex items-center gap-1.5"><span className="text-orange-500">🏠</span> 1. ホーム</Link>
             <Link href="/manual" className="hover:text-orange-600 transition-colors flex items-center gap-1.5"><span className="text-orange-500">📖</span> 2. マニュアル</Link>
             {isAdmin && <Link href="/system" className="hover:text-orange-600 transition-colors flex items-center gap-1.5"><span className="text-orange-500">⚙️</span> 3. 管理者</Link>}
          </div>
        </div>

        {/* Right Nav Grid */}
        <div className="flex-1 w-full grid grid-cols-2 gap-4 md:gap-6 justify-items-start">
          {rightItems.map((item) => (
             <Link key={item.href} href={item.href} className="w-full max-w-[180px]">
               <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-3 aspect-square cursor-pointer group">
                 <div className={`p-4 rounded-2xl bg-slate-50 group-hover:scale-110 transition-transform ${item.color}`}>
                   <item.icon className="h-8 w-8" />
                 </div>
                 <div className="text-center">
                   <p className="font-black text-sm text-slate-800 leading-tight">{item.label}</p>
                 </div>
               </div>
             </Link>
          ))}
        </div>
      </div>

      {/* Bottom Message Area Mock */}
      <div className="z-10 w-full max-w-3xl mt-16 mb-8 px-4">
        <div className="flex items-center justify-between mb-3 px-2">
           <h3 className="text-rose-700 font-bold flex items-center gap-2">
             <Sparkles className="h-4 w-4" /> 新着メッセージ
           </h3>
           <Link href="#" className="text-xs font-bold text-slate-400 hover:text-slate-600">すべて見る &gt;</Link>
        </div>
        <div className="bg-rose-50/50 backdrop-blur-sm border border-rose-100 rounded-2xl p-5 shadow-sm">
           <div className="flex justify-between items-start mb-2">
             <span className="bg-rose-200 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full">システム通知</span>
             <span className="text-xs text-slate-400 font-bold">Today 00:00</span>
           </div>
           <h4 className="font-black text-slate-800 text-sm mb-1">【アップデート】新しいホーム画面について</h4>
           <p className="text-xs text-slate-600 font-medium">Deli・COUNTの初期画面が新しくなりました。各機能へのアクセスがより直感的になります。</p>
        </div>
      </div>
    </div>
  );
}
