'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  LayoutDashboard, 
  Settings, 
  Info, 
  ShieldCheck, 
  ChevronRight, 
  Activity, 
  Package, 
  TrendingDown, 
  Database,
  Calculator,
  Sparkles,
  GitCompare,
  ArrowRightLeft,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers
} from 'lucide-react';
import { useAdmin } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";

// 専門用語・指標の注釈コンポーネント
const Term = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <span className="group relative inline-block cursor-help">
    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-primary/30 text-primary bg-primary/5 mx-0.5 hover:bg-primary hover:text-white">
      {title}
    </span>
    <div className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl border border-slate-700 pointer-events-none">
      <div className="font-bold border-b border-slate-700 pb-1 mb-1 flex items-center gap-1">
        <Info className="h-3 w-3" /> {title} の解説
      </div>
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
    </div>
  </span>
);

export default function ManualPage() {
  const { isAdmin } = useAdmin();
  const [activeTab, setActiveTab] = useState<string>("intro");

  const menuItems = [
    { id: "intro", label: "はじめに", icon: BookOpen },
    { id: "daily", label: "日々の業務フロー", icon: Activity },
    { id: "dashboard", label: "ダッシュボード", icon: LayoutDashboard },
    { id: "analysis", label: "廃棄クロス分析", icon: Calculator },
    { id: "sub-analysis", label: "その他分析機能", icon: TrendingDown },
    { id: "products", label: "商品マスタ管理", icon: Package },
    { id: "system", label: "システム管理・連携", icon: ArrowRightLeft },
    ...(isAdmin ? [{ id: "admin", label: "管理者向け機能", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="fixed inset-0 top-16 bg-slate-50 flex overflow-hidden">
      {/* サイドバー */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100">
          <Badge className="mb-2 bg-primary/10 text-primary border-none font-black tracking-widest text-[10px]">USER GUIDE</Badge>
          <h2 className="text-xl font-black text-slate-900">操作説明書</h2>
          <p className="text-xs text-slate-500 mt-1">Deli・COUNT 実務マニュアル</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 text-left",
                activeTab === item.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20 translate-x-1" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
              {activeTab === item.id && <ChevronRight className="ml-auto h-4 w-4 shrink-0" />}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <Settings className="h-3 w-3" /> System Version 4.1
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto bg-slate-50 scroll-smooth">
        <div className="max-w-4xl mx-auto p-8 pb-24">
          
          {/* --- 1. はじめに --- */}
          {activeTab === "intro" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header>
                <Badge className="mb-2 bg-orange-100 text-orange-700 border-none font-bold">ABOUT DELI-COUNT</Badge>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-tight">
                  Deli・COUNT 操作説明
                </h1>
                <p className="text-base text-slate-600 leading-relaxed font-medium">
                  <strong>Deli・COUNT（デリカウント）</strong>は、惣菜・弁当店における「値引き販売」「廃棄ロス」を徹底的に可視化し、
                  利益を最大化する最適な製造・発注計画を実現するためのクラウド型店舗DXシステムです。
                </p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-slate-200">
                  <CardHeader className="p-4 pb-2">
                    <Activity className="h-6 w-6 text-orange-500 mb-1" />
                    <CardTitle className="text-base font-bold">1. 廃棄ロスの削減</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-xs text-slate-600 leading-normal">
                    毎日の廃棄個数・金額・廃棄率をリアルタイムに集計。ロスが大きい原因商品を即座に特定します。
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardHeader className="p-4 pb-2">
                    <Calculator className="h-6 w-6 text-primary mb-1" />
                    <CardTitle className="text-base font-bold">2. 値引率別の多角分析</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-xs text-slate-600 leading-normal">
                    定価販売、20%引、30%引、40%引の販売個数と比率を可視化。適正な製造数と値引きタイミングを判断できます。
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardHeader className="p-4 pb-2">
                    <ArrowRightLeft className="h-6 w-6 text-indigo-600 mb-1" />
                    <CardTitle className="text-base font-bold">3. 発注システム自動連携</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-xs text-slate-600 leading-normal">
                    売上＋廃棄から「実製造数」を算出し、発注管理システム（デリサポーター）へ毎晩自動同期します。
                  </CardContent>
                </Card>
              </div>

              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-black text-slate-900">
                    画面の見方と基本操作（店舗選択）
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Badge className="bg-slate-100 text-slate-700 border-none shrink-0 font-bold">1</Badge>
                    <div>
                      <p className="text-sm font-bold text-slate-800">店舗の切り替え</p>
                      <p className="text-xs text-slate-600 mt-0.5">画面右上の店舗選択ドロップダウン（本厚木、港南台、西川口など）から操作対象の店舗を選択します。管理者は全店舗のデータを切り替えて閲覧できます。</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-slate-100 text-slate-700 border-none shrink-0 font-bold">2</Badge>
                    <div>
                      <p className="text-sm font-bold text-slate-800">メニュー移動</p>
                      <p className="text-xs text-slate-600 mt-0.5">画面上部のオレンジ色のタブバー（または左上のサイドバーメニュー）をクリックすることで、各画面にワンクリックで移動できます。</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* --- 2. 日々の業務フロー --- */}
          {activeTab === "daily" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <header>
                <Badge className="mb-2 bg-emerald-100 text-emerald-700 border-none font-bold">DAILY WORKFLOW</Badge>
                <h1 className="text-3xl font-black text-slate-900 mb-2">日々の業務フロー</h1>
                <p className="text-slate-600 font-medium">店舗現場での作業は<strong>「閉店後の廃棄入力」のみ</strong>です。売上データの取り込みや発注システムへの連携はすべて自動で行われます。</p>
              </header>

              {/* フローダイアグラム */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> 1日の全体データフロー
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50 border rounded-xl space-y-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">STEP 1 (日中〜営業中)</span>
                    <p className="font-bold text-sm text-slate-800">スマレジ店頭レジ販売</p>
                    <p className="text-xs text-slate-600">店頭での定価販売・値引きシールの販売（20%, 30%, 40%等）がスマレジPOSに記録されます。</p>
                  </div>
                  <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider">STEP 2 (閉店後 〜22:00)</span>
                    <p className="font-bold text-sm text-orange-900">店舗スタッフの廃棄登録</p>
                    <p className="text-xs text-orange-800">「廃棄入力」画面を開き、売れ残った商品の廃棄個数を入力して保存します。</p>
                  </div>
                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">STEP 3 (22:10 自動実行)</span>
                    <p className="font-bold text-sm text-indigo-900">自動集計 & デリサポ連携</p>
                    <p className="text-xs text-indigo-800">クラウド側で売上＋廃棄を合算し、実製造数をデリサポーターへ自動送信します。</p>
                  </div>
                </div>
              </div>

              {/* 廃棄入力の手順 */}
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900">店舗での廃棄入力手順（「廃棄入力」画面）</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-xs items-start">
                    <div className="bg-primary/10 text-primary w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0">1</div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">「廃棄入力」画面を開く</p>
                      <p className="text-xs text-slate-500 mt-0.5">上部メニューの「廃棄入力」をクリックします。タッチパネルやiPad/スマートフォンからも快適に入力できます。</p>
                    </div>
                  </div>
                  <div className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-xs items-start">
                    <div className="bg-primary/10 text-primary w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0">2</div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">日付と天候の確認</p>
                      <p className="text-xs text-slate-500 mt-0.5">当日の日付と天候（晴れ・曇り・雨など）を選択します。天候データはABC分析での天候別傾向分析に使用されます。</p>
                    </div>
                  </div>
                  <div className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-xs items-start">
                    <div className="bg-primary/10 text-primary w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0">3</div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">部門選択と数量入力</p>
                      <p className="text-xs text-slate-500 mt-0.5">カテゴリ（弁当、揚げ物、サラダ等）をタップし、廃棄する商品の「＋」「−」ボタンまたはテンキーで廃棄数を入力します。</p>
                    </div>
                  </div>
                  <div className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-xs items-start">
                    <div className="bg-emerald-100 text-emerald-800 w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0">4</div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">「廃棄を記録」で保存</p>
                      <p className="text-xs text-slate-500 mt-0.5">画面右下の「廃棄を記録」ボタンを押すと、即座にクラウドデータベースに保存されます。同日中の再編集・追加登録も可能です。</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- 3. ダッシュボード --- */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <header>
                <Badge className="mb-2 bg-blue-100 text-blue-700 border-none font-bold">DASHBOARD</Badge>
                <h1 className="text-3xl font-black text-slate-900 mb-2">ダッシュボードの見方</h1>
                <p className="text-slate-600 font-medium">選択した店舗の「当日の販売状況」「値引き実績」「廃棄状況」がリアルタイムに表示されます。</p>
              </header>

              <div className="space-y-6">
                <section className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-900 text-base">主要KPIカード</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl">
                      <p className="text-[11px] font-bold text-blue-700 uppercase">実質売上高</p>
                      <p className="text-xs text-slate-600 mt-1">定価売上から値引き損失を差し引いた、店舗の実際の実績売上高です。</p>
                    </div>
                    <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                      <p className="text-[11px] font-bold text-emerald-700 uppercase">実質粗利益額</p>
                      <p className="text-xs text-slate-600 mt-1">実質売上から製造原価を差し引いた、純粋な手残り利益額です。</p>
                    </div>
                    <div className="p-3.5 bg-orange-50/60 border border-orange-100 rounded-xl">
                      <p className="text-[11px] font-bold text-orange-700 uppercase">値引販売率・個数</p>
                      <p className="text-xs text-slate-600 mt-1">販売総数のうち、値引きシール（20%, 30%, 40%）で売れた個数と比率です。</p>
                    </div>
                    <div className="p-3.5 bg-red-50/60 border border-red-100 rounded-xl">
                      <p className="text-[11px] font-bold text-red-700 uppercase">廃棄個数・廃棄率</p>
                      <p className="text-xs text-slate-600 mt-1">当日に廃棄された総点数と、製造数に対する廃棄率（ロス率）です。</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* --- 4. 廃棄クロス分析 --- */}
          {activeTab === "analysis" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <header>
                <Badge className="mb-2 bg-orange-100 text-orange-700 border-none font-bold">CORE FEATURE</Badge>
                <h1 className="text-3xl font-black text-slate-900 mb-2">廃棄クロス分析（/abc-analysis）</h1>
                <p className="text-slate-600 font-medium">本システムのコア機能です。期間中の全商品について、製造数、定価販売、値引き販売（20%, 30%, 40%）、廃棄を一覧集計し、収益とロス構造を丸裸にします。</p>
              </header>

              {/* 最新機能ハイライト */}
              <Card className="border-orange-200 bg-orange-50/30 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-base text-orange-950 font-bold">直近アップデートされた新機能・表示仕様</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-700 leading-relaxed">
                  <div className="p-3 bg-white rounded-lg border border-orange-100 space-y-1.5">
                    <p className="font-bold text-slate-900 text-sm">① 率（％）をメイン表示とし、販売個数を併記</p>
                    <p className="text-slate-600">
                      テーブル上で<strong>「75.0% (150個)」</strong>のように、率（％）をメインにしつつ販売個数も常に把握できます。<br/>
                      各カラムヘッダーをクリックすると、率順にダイレクトに並び替え（ソート）が可能です。
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-orange-100 space-y-1.5">
                    <p className="font-bold text-slate-900 text-sm">② 同一商品名の自動名寄せ（表記揺れ統合）</p>
                    <p className="text-slate-600">
                      過去のPOSデータや商品マスタで商品IDやコードが変更された場合でも、全角半角スペースや括弧を正規化し、**同一商品名のデータを1行に自動統合**して集計します。
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-orange-100 space-y-1.5">
                    <p className="font-bold text-slate-900 text-sm">③ 商品詳細モーダル（値引き内訳ビジュアルバー）</p>
                    <p className="text-slate-600">
                      商品名をクリックするとポップアップが開き、「定価販売」「20%引き」「30%引き」「40%引き」「廃棄」の各個数と構成バーをグラフで直感的に確認できます。
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-orange-100 space-y-1.5">
                    <p className="font-bold text-slate-900 text-sm">④ CSVエクスポート機能</p>
                    <p className="text-slate-600">
                      「CSV出力」ボタンをクリックすると、画面テーブルの全集計データ（各値引き率の個数・率、廃棄個数・金額、実質粗利など）をそのままCSVファイルとしてダウンロードできます。
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* テーブル項目の見方 */}
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900">集計テーブルの主要カラムと見方</h3>
                <div className="bg-white rounded-xl border divide-y text-xs">
                  <div className="p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <span className="font-bold text-slate-900">定価販売</span>
                    <span className="md:col-span-3 text-slate-600">定価（値引きなし）で売れた個数と、製造数に対する定価販売率（%）。これが高いほど利益率の高い優良商品です。</span>
                  </div>
                  <div className="p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <span className="font-bold text-slate-900">20%引 / 30%引 / 40%引</span>
                    <span className="md:col-span-3 text-slate-600">各値引き率で販売された個数と製造比率。40%引きが多い商品は見切り時間が遅すぎるか、夕方の製造過多の兆候です。</span>
                  </div>
                  <div className="p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <span className="font-bold text-slate-900">値引販売個数 / 個数率</span>
                    <span className="md:col-span-3 text-slate-600">値引き販売された全合計個数（20%＋30%＋40%）と率。マウスを合わせると内訳ツールチップが表示されます。</span>
                  </div>
                  <div className="p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <span className="font-bold text-slate-900">廃棄個数 / 廃棄個数率</span>
                    <span className="md:col-span-3 text-slate-600">売れ残って廃棄された個数と、製造数に対する廃棄率（%）。赤色で強調表示されます。</span>
                  </div>
                  <div className="p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <span className="font-bold text-slate-900">値引額 / 廃棄額</span>
                    <span className="md:col-span-3 text-slate-600">値引きによる売上損失額および廃棄による原価損失額の合計です。</span>
                  </div>
                  <div className="p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <span className="font-bold text-slate-900">実質粗利額 / 実質原価率</span>
                    <span className="md:col-span-3 text-slate-600">定価売上から値引きロスと廃棄ロスを差し引いた、最終的な実質利益と実質原価率です。</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- 5. その他分析機能 --- */}
          {activeTab === "sub-analysis" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <header>
                <Badge className="mb-2 bg-indigo-100 text-indigo-700 border-none font-bold">ADVANCED ANALYTICS</Badge>
                <h1 className="text-3xl font-black text-slate-900 mb-2">その他分析機能</h1>
                <p className="text-slate-600 font-medium">多角的な切り口で店舗運営を最適化するための分析画面群です。</p>
              </header>

              <div className="grid grid-cols-1 gap-6">
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-indigo-600" />
                      詳細クロス分析（/cross-analysis）
                    </CardTitle>
                    <CardDescription>
                      「曜日」×「天候」などの掛け合わせで、商品の売れ行きや廃棄傾向をマトリクス集計します。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-600 space-y-2">
                    <p>・「雨の日の水曜日は特定のお弁当の廃棄が増える」「晴れの土曜日は揚げ物が売り切れる」といったパターンを発見できます。</p>
                    <p>・分析結果を基に、商品マスタの「曜日・天候別製造計画」を見直すことで、過剰製造を未然に防ぎます。</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      AI偏差値分析（/score-analysis）
                    </CardTitle>
                    <CardDescription>
                      カテゴリ内における商品の総合戦闘力を「偏差値（T-Score）」としてスコアリング表示します。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-600 space-y-2">
                    <p>・粗利貢献度、消化率、低廃棄率などを多面的に評価し、商品ごとに偏差値（総合スコア）を算出します。</p>
                    <p>・スコアの高い商品は「店舗のエース商品」、スコアの低い商品は「製造数削減または改廃対象」として一目で判断できます。</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <GitCompare className="h-5 w-5 text-blue-600" />
                      比較分析（/compare-analysis）
                    </CardTitle>
                    <CardDescription>
                      「今月と先月」「前年同月」「店舗間（本厚木 vs 港南台）」の推移を比較・対比します。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-600 space-y-2">
                    <p>・製造調整や値引き改善を行った施策の効果が、数字として現れているかを検証できます。</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* --- 6. 商品マスタ管理 --- */}
          {activeTab === "products" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <header>
                <Badge className="mb-2 bg-slate-100 text-slate-700 border-none font-bold">MASTER DATA</Badge>
                <h1 className="text-3xl font-black text-slate-900 mb-2">商品マスタ管理（/products）</h1>
                <p className="text-slate-600 font-medium">店舗で扱う商品の基本情報（定価・原価・部門）と、曜日・天候別の基準製造数を管理します。</p>
              </header>

              <div className="space-y-6">
                <section className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-900 text-base">商品の登録と編集</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                    <div className="p-4 bg-slate-50 rounded-xl border space-y-2">
                      <p className="font-bold text-slate-800 text-sm">個別登録・編集</p>
                      <p>「新規登録」ボタンから商品名、商品コード、カテゴリ（部門）、定価、原価を入力します。各商品カードの「編集」ボタンからいつでも変更可能です。</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border space-y-2">
                      <p className="font-bold text-slate-800 text-sm">曜日・天候別の標準製造数（重要）</p>
                      <p>月〜日の各曜日に対し、「晴れの日」「雨の日」の標準製造数を設定できます。日々の製造実績データがない日の比較基準やABC分析の基準母数として活用されます。</p>
                    </div>
                  </div>
                </section>

                <section className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-900 text-base">CSV一括インポート & エクスポート</h3>
                  <p className="text-xs text-slate-600">新メニューの改定時や他店舗への展開時など、大量のデータをCSVファイルで一括登録・更新できます。</p>
                  <div className="p-4 bg-slate-50 rounded-xl border text-xs text-slate-700 space-y-2">
                    <p className="font-bold text-slate-900">CSVインポートの手順:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>「エクスポート」から現在のマスタCSVをダウンロードします。</li>
                      <li>Excel等で商品情報や価格、製造数を編集します。</li>
                      <li>「インポート」から編集したCSVをアップロードすると、一括で上書き・追加されます。</li>
                    </ol>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* --- 7. システム管理・連携 --- */}
          {activeTab === "system" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <header>
                <Badge className="mb-2 bg-indigo-100 text-indigo-700 border-none font-bold">SYSTEM INTEGRATION</Badge>
                <h1 className="text-3xl font-black text-slate-900 mb-2">システム管理・デリサポ連携（/system）</h1>
                <p className="text-slate-600 font-medium">データのバックアップ、および発注・製造管理システム「デリサポーター」との実績連携を手動実行・確認できます。</p>
              </header>

              <div className="grid grid-cols-1 gap-6">
                {/* デリサポ連携 */}
                <Card className="border-indigo-200 bg-indigo-50/20 shadow-xs">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
                      <CardTitle className="text-base text-indigo-950 font-bold">デリサポーター実績連携機能</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      通常は毎晩22:10に自動同期されますが、昼間や過去日のデータ修正時などに手動で即時送信できます。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-slate-700">
                    <div className="p-3 bg-white rounded-lg border border-indigo-100 space-y-2">
                      <p className="font-bold text-slate-900">シミュレーション（Dry-Run）機能</p>
                      <p className="text-slate-600">
                        「シミュレーション実行」にチェックを入れて実行すると、データベースを書き換えることなく、
                        「スマレジ売上とPOS廃棄から何件の実製造数が集計され、デリサポ側マスタと何件一致するか」をプレビュー確認できます。
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-indigo-100 space-y-2">
                      <p className="font-bold text-slate-900">本番送信の手順</p>
                      <p className="text-slate-600">
                        対象店舗と対象日を選択し、「本番送信を実行」を押すと、デリサポーターの `productionOverrides`（日別製造調整）へ実績が即時反映されます。
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* バックアップと復元 */}
                <Card className="bg-white border-slate-200 shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Database className="h-5 w-5 text-primary" />
                      データのバックアップと復元（JSON）
                    </CardTitle>
                    <CardDescription className="text-xs">
                      店舗設定、商品マスタ、製造計画を丸ごと安全なJSONファイルとしてPCに保存・復元できます。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-slate-600">
                    <p>・<strong>バックアップ:</strong> 「全店舗」または「特定店舗」を選択してダウンロードします。新商品の一括登録前などに実行を推奨します。</p>
                    <p>・<strong>復元:</strong> 保存したJSONファイルをアップロードすることで、過去の時点のデータに巻き戻すことができます。</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* --- 8. 管理者向け機能 --- */}
          {activeTab === "admin" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <header>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-slate-900 text-white border-none font-bold">ADMIN ONLY</Badge>
                  <ShieldCheck className="h-5 w-5 text-slate-900" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 mb-2">管理者向け機能</h1>
                <p className="text-slate-600 font-medium">システム管理者（SYSTEM_ADMIN）のみがアクセス可能な管理メニューの解説です。</p>
              </header>

              <div className="space-y-4">
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Database className="h-5 w-5 text-primary" />
                      POSインポート（/admin/import）
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-600 space-y-2">
                    <p>スマレジAPIによる自動同期のほかに、過去データや通信障害時のバックアップとして、スマレジの「日別取引CSV」を手動でアップロードして一括取り込みできます。</p>
                    <p>取り込まれたデータは自動で単品値引き（20%, 30%, 40%）と一括値引き、通常売上に分類され、即座に分析に反映されます。</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary" />
                      店舗管理（/stores）
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-600 space-y-2">
                    <p>新規店舗の追加、スマレジ店舗IDの紐付け（港南台=1, 本厚木=2, 西川口=3等）、デリサポーター店舗スラッグ（hon-atsugi, konandai, nishikawaguchi）の紐付け設定を行います。</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
