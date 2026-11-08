'use client';

import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  Server, 
  ShieldCheck, 
  ArrowRight, 
  Activity, 
  Package, 
  ArrowRightLeft, 
  Cpu, 
  Clock, 
  Layers, 
  Sparkles, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle,
  Code2,
  GitBranch,
  KeyRound,
  FileCode,
  Calendar,
  Cloud,
  Calculator
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Info } from 'lucide-react';

const Tip = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <Alert className="bg-blue-50/80 border-blue-200 p-3.5 my-3 rounded-xl">
    <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
    <div className="ml-2">
      <AlertTitle className="text-blue-900 font-bold text-sm mb-1">{title}</AlertTitle>
      <AlertDescription className="text-blue-800 text-xs font-medium leading-relaxed">
        {children}
      </AlertDescription>
    </div>
  </Alert>
);

export default function AdminDocsPage() {
    const { isAdmin, isAdminLoading } = useAdmin();

    if (isAdminLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh]">
                <ShieldCheck className="h-20 w-20 text-destructive/50 mb-4" />
                <h1 className="text-3xl font-black text-slate-800">アクセス権限がありません</h1>
                <p className="text-slate-500 mt-2 text-sm">システム仕様書はシステム管理者（SYSTEM_ADMIN）専用です。</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50/50 p-4 lg:p-6 w-full overflow-hidden">
            <div className="max-w-6xl w-full mx-auto flex flex-col h-full space-y-4">
                
                {/* ヘッダー */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 shrink-0 gap-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black tracking-wider">SYSTEM SPECIFICATION</Badge>
                            <span className="text-xs text-slate-400 font-bold">Ver 4.1 Production</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                            <ShieldCheck className="h-7 w-7 text-primary" />
                            システム仕様書・アーキテクチャ設計書
                        </h1>
                        <p className="text-xs md:text-sm text-slate-600 font-medium mt-0.5">
                            システムの動作原理、各機能の仕様、外部システム（スマレジ・デリサポーター・GCP）連携の詳細
                        </p>
                    </div>
                </div>

                <Tabs defaultValue="overview" className="w-full flex-1 flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-5 mb-3 h-11 bg-slate-200/60 p-1 rounded-xl shrink-0">
                        <TabsTrigger value="overview" className="text-xs md:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs">全体構成・仕組み</TabsTrigger>
                        <TabsTrigger value="integration" className="text-xs md:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs">外部アプリ連携</TabsTrigger>
                        <TabsTrigger value="features" className="text-xs md:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs">機能詳細仕様</TabsTrigger>
                        <TabsTrigger value="database" className="text-xs md:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs">DB設計 (Box)</TabsTrigger>
                        <TabsTrigger value="maintenance" className="text-xs md:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs">運用・セキュリティ</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-16 space-y-4">
                        
                        {/* ========================================================= */}
                        {/* タブ1: 全体構成・仕組み */}
                        {/* ========================================================= */}
                        <TabsContent value="overview" className="mt-0 space-y-5">
                            <Card className="border-slate-200 shadow-xs bg-white">
                                <CardHeader className="py-4 px-6 border-b">
                                    <CardTitle className="text-lg font-black flex items-center gap-2">
                                        <Cpu className="h-5 w-5 text-primary" />
                                        1. システムの目的と全体動作の仕組み
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4 text-xs md:text-sm text-slate-700 leading-relaxed">
                                    <p>
                                        <strong>Deli・COUNT（デリカウント）</strong>は、惣菜・弁当店における「値引き販売」と「廃棄ロス」のデータを網羅的に収集・分析し、
                                        利益を最大化する適正製造計画と、発注管理システム「デリサポーター（DeliSupporter）」への実績自動連動を実現する基幹データプラットフォームです。
                                    </p>
                                    
                                    <div className="p-4 bg-slate-50 border rounded-xl space-y-3">
                                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                            <GitBranch className="h-4 w-4 text-primary" /> 1日の全体データ循環サイクル
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                                            <div className="p-3 bg-white border rounded-lg space-y-1">
                                              <span className="font-bold text-slate-500">1. 日中〜夜間</span>
                                              <p className="font-black text-slate-800">店頭販売（スマレジ）</p>
                                              <p className="text-slate-600">店頭での通常売上、シール値引き（20%, 30%, 40%引）がスマレジPOSに記録。</p>
                                            </div>
                                            <div className="p-3 bg-orange-50/60 border border-orange-200 rounded-lg space-y-1">
                                              <span className="font-bold text-orange-600">2. 閉店後 (~22:00)</span>
                                              <p className="font-black text-orange-950">廃棄登録（デリカウント）</p>
                                              <p className="text-orange-900">店舗スタッフがタブレットから廃棄入力。Firestoreの `daily_wastes` に保存。</p>
                                            </div>
                                            <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg space-y-1">
                                              <span className="font-bold text-indigo-600">3. 22:10 JST 自動実行</span>
                                              <p className="font-black text-indigo-950">バッチ同期（Cloud Scheduler）</p>
                                              <p className="text-indigo-900">スマレジAPIから当日の売上を取得。売上＋廃棄から「実製造数」を合算算出。</p>
                                            </div>
                                            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-1">
                                              <span className="font-bold text-emerald-600">4. 即時反映 & 発注連動</span>
                                              <p className="font-black text-emerald-950">デリサポ反映・発注更新</p>
                                              <p className="text-emerald-900">デリサポーターの `productionOverrides` へ送信され、週3回発注計算へ直結。</p>
                                            </div>
                                        </div>
                                    </div>

                                    <Tip title="「実製造数」の算出原理">
                                        POSレジのみでは「何個作ったか」は分かりません。デリカウントでは、
                                        <code className="mx-1 px-1.5 py-0.5 bg-white border rounded font-mono font-bold text-primary">実製造数 ＝ スマレジ総売上数 ＋ POS廃棄数</code>
                                        として完全自動逆算し、手入力の手間ゼロで正確な製造実績を確定させています。
                                    </Tip>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200 shadow-xs bg-white">
                                <CardHeader className="py-4 px-6 border-b">
                                    <CardTitle className="text-lg font-black flex items-center gap-2">
                                        <Server className="h-5 w-5 text-primary" />
                                        2. 技術スタック・インフラ構成
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                        <div className="p-4 bg-slate-50 rounded-xl border space-y-2">
                                            <p className="font-bold text-slate-900 text-sm">フロントエンド / アプリケーション層</p>
                                            <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                                                <li><strong>フレームワーク:</strong> Next.js 15 (App Router, React 19)</li>
                                                <li><strong>言語:</strong> TypeScript (厳格な型安全性を維持)</li>
                                                <li><strong>スタイリング:</strong> Tailwind CSS, Radix UI (shadcn/ui)</li>
                                                <li><strong>ホスティング基盤:</strong> Firebase App Hosting (us-central1, 高速SSR)</li>
                                            </ul>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border space-y-2">
                                            <p className="font-bold text-slate-900 text-sm">バックエンド / クラウドインフラ層</p>
                                            <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                                                <li><strong>データベース:</strong> Google Cloud Firestore (NoSQL ボックス設計)</li>
                                                <li><strong>認証基盤:</strong> Firebase Authentication (Email/Password & Role制御)</li>
                                                <li><strong>スケジュール自動実行:</strong> Google Cloud Scheduler (22:10 JST日次起動)</li>
                                                <li><strong>外部通信:</strong> REST API, OAuth 2.0 (Smaregi Platform API)</li>
                                            </ul>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ========================================================= */}
                        {/* タブ2: 外部アプリ連携 */}
                        {/* ========================================================= */}
                        <TabsContent value="integration" className="mt-0 space-y-5">
                            
                            {/* スマレジ連携 */}
                            <Card className="border-slate-200 shadow-xs bg-white">
                                <CardHeader className="py-4 px-6 border-b">
                                    <CardTitle className="text-lg font-black flex items-center gap-2">
                                        <Cloud className="h-5 w-5 text-blue-600" />
                                        3.1. スマレジ（Smaregi Platform API）連携仕様
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4 text-xs leading-relaxed text-slate-700">
                                    <p>
                                        店頭で発生した売上・値引き販売トランザクションを、スマレジのクラウドAPIから日次で自動抽出します。
                                    </p>
                                    <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
                                        <p className="font-bold text-slate-900 text-sm">認証・通信プロトコル</p>
                                        <ul className="space-y-1 text-slate-600 list-disc list-inside">
                                            <li><strong>認証方式:</strong> OAuth 2.0 Client Credentials Grant</li>
                                            <li><strong>トークンエンドポイント:</strong> <code>https://id.smaregi.jp/app/{'{contract_id}'}/token</code></li>
                                            <li><strong>スコープ:</strong> <code>pos.transactions:read</code></li>
                                            <li><strong>取引取得エンドポイント:</strong> <code>https://api.smaregi.jp/{'{contract_id}'}/pos/transactions</code></li>
                                        </ul>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
                                        <p className="font-bold text-slate-900 text-sm">店舗コードマッピング仕様</p>
                                        <p className="text-slate-600">スマレジ側の店舗番号（Store ID）を、デリカウント内の店舗IDへ自動変換します：</p>
                                        <div className="grid grid-cols-3 gap-2 text-center font-mono">
                                            <div className="bg-white p-2 border rounded">スマレジ <code>1</code> ➔ 港南台店</div>
                                            <div className="bg-white p-2 border rounded">スマレジ <code>2</code> ➔ 本厚木店</div>
                                            <div className="bg-white p-2 border rounded">スマレジ <code>3</code> ➔ 西川口店</div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
                                        <p className="font-bold text-slate-900 text-sm">値引き区分自動判別ロジック</p>
                                        <p className="text-slate-600">
                                            スマレジから取得した明細から、単品値引き率（<code>discountRate: 20, 30, 40</code>）および一括按分値引きを解析し、
                                            「定価販売」「20%引」「30%引」「40%引」の各バケットに振り分けて保存します。
                                            なお、会計後に返品・キャンセルされた伝票（<code>status: cancel</code>）は自動除外されます。
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* デリサポーター連携 */}
                            <Card className="border-indigo-200 shadow-xs bg-white">
                                <CardHeader className="py-4 px-6 border-b bg-indigo-50/30">
                                    <CardTitle className="text-lg font-black flex items-center gap-2 text-indigo-950">
                                        <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
                                        3.2. デリサポーター（DeliSupporter）連携仕様
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4 text-xs leading-relaxed text-slate-700">
                                    <p>
                                        デリカウントで集計された当日の「実製造数（売上＋廃棄）」を、発注管理システム「デリサポーター」のFirestoreコレクション（<code>productionOverrides</code>）へ送信・同期します。
                                    </p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
                                            <p className="font-bold text-slate-900 text-sm">通信・セキュリティ仕様</p>
                                            <ul className="space-y-1 text-slate-600 list-disc list-inside">
                                                <li><strong>本番送信先:</strong> <code>https://asia-northeast1-fir-01278470-c0ea3.cloudfunctions.net/syncProductionActuals</code></li>
                                                <li><strong>認証ヘッダー:</strong> <code>x-api-key: delicount-sync-secret-2026</code></li>
                                                <li><strong>送信タイミング:</strong> 毎日 22:10 JST（Cloud Scheduler）＋ 管理画面手動送信</li>
                                                <li><strong>商品コード正規化:</strong> 先頭ゼロを除去（例: <code>040092</code> ➔ <code>40092</code>）</li>
                                            </ul>
                                        </div>

                                        <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
                                            <p className="font-bold text-slate-900 text-sm">書き込み先ドキュメント構造（productionOverrides）</p>
                                            <p className="text-slate-600">ドキュメントID: <code>{'{storeId}'}_{'{date}'}_{'{productId}'}</code></p>
                                            <ul className="space-y-1 text-slate-600 list-disc list-inside font-mono text-[11px]">
                                                <li>salesQuantity: スマレジ売上数</li>
                                                <li>wasteQuantity: POS廃棄数</li>
                                                <li>quantity: 実製造数 (sales + waste)</li>
                                                <li>source: &quot;delicount_sync&quot;</li>
                                            </ul>
                                        </div>
                                    </div>

                                    {/* 納品サイクル */}
                                    <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2">
                                        <p className="font-bold text-indigo-950 text-sm flex items-center gap-1.5">
                                            <Calendar className="h-4 w-4 text-indigo-600" /> 仕入先納品日設定と週3回発注スケジュール連動
                                        </p>
                                        <p className="text-slate-700 text-xs">
                                            主要包材・資材仕入先（スミダパッケージ・オカベ）の納品可能曜日は<strong>「火曜・木曜・土曜」</strong>です。<br/>
                                            デリカウントから実績が連携されると、デリサポーター側の発注エンジン（<code>calculateDeliveryDate</code>）が直前の納品日に使用量を集約し、必要発注数を自動計算します。
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 font-medium text-slate-800">
                                            <div className="bg-white p-2.5 rounded border text-[11px]">
                                                <strong>金曜 22:10 実績確定</strong><br/>
                                                ➔ 翌週 火・水 製造分 ➔ <strong>火曜 納品</strong>
                                            </div>
                                            <div className="bg-white p-2.5 rounded border text-[11px]">
                                                <strong>日曜 22:10 実績確定</strong><br/>
                                                ➔ 翌週 木・金 製造分 ➔ <strong>木曜 納品</strong>
                                            </div>
                                            <div className="bg-white p-2.5 rounded border text-[11px]">
                                                <strong>火曜 22:10 実績確定</strong><br/>
                                                ➔ 週末 土・日・翌月 製造分 ➔ <strong>土曜 納品</strong>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Cloud Scheduler */}
                            <Card className="border-slate-200 shadow-xs bg-white">
                                <CardHeader className="py-4 px-6 border-b">
                                    <CardTitle className="text-lg font-black flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-emerald-600" />
                                        3.3. Google Cloud Scheduler 自動実行仕様
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-3 text-xs text-slate-700">
                                    <ul className="space-y-1.5 list-disc list-inside">
                                        <li><strong>ジョブ名:</strong> <code>projects/ver41-13613744-4a01f/locations/us-central1/jobs/smaregi-daily-import</code></li>
                                        <li><strong>実行スケジュール:</strong> <code>10 22 * * *</code> (日本時間 毎日 22:10:00)</li>
                                        <li><strong>ターゲットURI:</strong> <code>https://studio--ver41-13613744-4a01f.us-central1.hosted.app/api/cron/smaregi-import</code></li>
                                        <li><strong>認証方式:</strong> HTTP Header <code>Authorization: Bearer {'{CRON_SECRET}'}</code></li>
                                        <li><strong>タイムアウト対策:</strong> Next.js Serverless Function 設定 <code>maxDuration = 300</code> (5分間)、Firestoreバッチコミットは490件ごとに分割コミット。</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ========================================================= */}
                        {/* タブ3: 機能詳細仕様 */}
                        {/* ========================================================= */}
                        <TabsContent value="features" className="mt-0 space-y-5">
                            
                            {/* ABC分析詳細仕様 */}
                            <Card className="border-slate-200 shadow-xs bg-white">
                                <CardHeader className="py-4 px-6 border-b">
                                    <CardTitle className="text-lg font-black flex items-center gap-2">
                                        <Calculator className="h-5 w-5 text-orange-600" />
                                        4.1. 廃棄クロス分析（/abc-analysis）詳細仕様
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
                                    
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-slate-900 text-sm">同一商品名統合ロジック（名寄せアルゴリズム）</h4>
                                        <p>
                                            POSデータや廃棄データにおいて、商品IDや商品コードに変更履歴や揺れがある場合でも、
                                            正規化された同一商品名（全角・半角スペース除去、全角括弧を半角統一、英字小文字化）をキーとして同一行に合算集計します。
                                            これにより、過去データが分裂して表示される不具合を根本的に防止しています。
                                        </p>
                                    </div>

                                    <hr />

                                    <div className="space-y-2">
                                        <h4 className="font-bold text-slate-900 text-sm">値引き率別個数の集計とソート仕様</h4>
                                        <p>
                                            売上トランザクションの明細から、以下の4区分で販売個数と比率（製造数比）を集計・表示します：
                                        </p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px]">
                                            <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded">
                                                <strong>定価販売 (regSales)</strong><br/>値引きなしの販売個数・率
                                            </div>
                                            <div className="p-2.5 bg-orange-50 border border-orange-100 rounded">
                                                <strong>20%引 (d20Sales)</strong><br/>軽度値引きの販売個数・率
                                            </div>
                                            <div className="p-2.5 bg-orange-50 border border-orange-100 rounded">
                                                <strong>30%引 (d30Sales)</strong><br/>中度値引きの販売個数・率
                                            </div>
                                            <div className="p-2.5 bg-red-50 border border-red-100 rounded">
                                                <strong>40%引 (d40Sales)</strong><br/>大幅見切りの販売個数・率
                                            </div>
                                        </div>
                                        <p className="text-slate-600 mt-1">
                                            ※率（％）をメイン表示とし、販売個数を <code>(個数)</code> として併記します。各カラムのヘッダーをクリックすると、<strong>「その値引き率（%）」をキーとして降順・昇順でソート</strong>されます。
                                        </p>
                                    </div>

                                    <hr />

                                    <div className="space-y-2">
                                        <h4 className="font-bold text-slate-900 text-sm">主要計算指標の数式定義</h4>
                                        <ul className="space-y-1.5 list-disc list-inside">
                                            <li><strong>製造数:</strong> 製造実績数（＝ 総売上個数 ＋ 廃棄個数）※日次実績がない期間はマスタ標準製造数</li>
                                            <li><strong>定価販売数:</strong> 総販売数 −（20%引 ＋ 30%引 ＋ 40%引）</li>
                                            <li><strong>値引損失額:</strong> ∑（定価 × 各値引き率 × 値引き個数）</li>
                                            <li><strong>廃棄損失額:</strong> 廃棄個数 × 原価</li>
                                            <li><strong>実質売上額:</strong> 定価売上額 − 値引損失額</li>
                                            <li><strong>実質粗利益額:</strong> 実質売上額 −（製造数 × 原価）</li>
                                            <li><strong>消化率:</strong> 総販売個数 ÷ 製造数 × 100 (%)</li>
                                            <li><strong>RegSellIndex:</strong> 定価販売率 × 消化率（定価で売り切る力を示す独自指標）</li>
                                        </ul>
                                    </div>

                                    <hr />

                                    <div className="space-y-2">
                                        <h4 className="font-bold text-slate-900 text-sm">CSVエクスポート仕様</h4>
                                        <p>
                                            「CSV出力」実行時、画面のテーブルに表示されている全カラム（商品コード、商品名、部門、製造売上、製造原価率、実質売上、実質粗利額、実質原価率、実質売上率、製造個数、定価販売個数・率、20%引個数・率、30%引個数・率、40%引個数・率、値引販売個数・率、消化個数率、廃棄個数・率、値引額・率、廃棄額・率）を完全一致でUTF-8 BOM付きCSVとして出力します。
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* その他の機能仕様 */}
                            <Card className="border-slate-200 shadow-xs bg-white">
                                <CardHeader className="py-4 px-6 border-b">
                                    <CardTitle className="text-lg font-black flex items-center gap-2">
                                        <Layers className="h-5 w-5 text-primary" />
                                        4.2. 各機能モジュールの動作仕様
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4 text-xs text-slate-700">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-3.5 bg-slate-50 rounded-xl border space-y-1">
                                            <p className="font-bold text-slate-900 text-sm">廃棄入力 (/pos)</p>
                                            <p className="text-slate-600">タッチUI、天候選択、カテゴリー別フィルタリング、数量プラスマイナス、Firestoreの `daily_wastes` コレクションへの日別ドキュメント保存。</p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50 rounded-xl border space-y-1">
                                            <p className="font-bold text-slate-900 text-sm">詳細クロス分析 (/cross-analysis)</p>
                                            <p className="text-slate-600">曜日（月〜日）× 天候（晴・曇・雨）のマトリクス集計。特定天候時の廃棄急増パターンや過剰製造を検出。</p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50 rounded-xl border space-y-1">
                                            <p className="font-bold text-slate-900 text-sm">AI偏差値分析 (/score-analysis)</p>
                                            <p className="text-slate-600">カテゴリ内における商品の総合戦闘力を「T-Score（偏差値）」としてスコアリング。主力商品と改廃検討商品を自動分類。</p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50 rounded-xl border space-y-1">
                                            <p className="font-bold text-slate-900 text-sm">比較分析 (/compare-analysis)</p>
                                            <p className="text-slate-600">期間比較（今月 vs 先月、前年同月）および店舗間比較（本厚木 vs 港南台）による施策効果の検証。</p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50 rounded-xl border space-y-1">
                                            <p className="font-bold text-slate-900 text-sm">商品マスタ (/products)</p>
                                            <p className="text-slate-600">部門別ボックス管理、晴れ/雨×各曜日の標準製造数設定、CSVインポート/エクスポートによる一括改定対応。</p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50 rounded-xl border space-y-1">
                                            <p className="font-bold text-slate-900 text-sm">システム管理 (/system)</p>
                                            <p className="text-slate-600">JSONバックアップと復元、デリサポ連携シミュレーション（Dry-Run）および本番送信、日別ボックス化マイグレーション。</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ========================================================= */}
                        {/* タブ4: データベース設計 */}
                        {/* ========================================================= */}
                        <TabsContent value="database" className="mt-0 space-y-5">
                            <Card className="border-slate-200 shadow-xs bg-white">
                                <CardHeader className="py-4 px-6 border-b">
                                    <CardTitle className="text-lg font-black flex items-center gap-2">
                                        <Database className="h-5 w-5 text-blue-500" />
                                        5. データベース設計（NoSQL ボックスアーキテクチャ）
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4 text-xs md:text-sm text-slate-700">
                                    <p>
                                        Firestore（NoSQL）の読み取りコストを極限まで削減し、大規模な期間集計をミリ秒単位で高速レスポンスするために<strong>「ボックス化アーキテクチャ」</strong>を採用しています。
                                    </p>

                                    <Tip title="ボックス化によるコスト削減効果">
                                        通常設計では1商品・1取引＝1ドキュメント（1ヶ月で数千〜数万ドキュメントの読み取り）になりますが、
                                        日別・部門別に「箱（Box）」として集約することで、<strong>1ヶ月の集計でもわずか30〜60ドキュメントの読み取りに圧縮</strong>されます（95%以上のコスト削減）。
                                    </Tip>

                                    <div className="space-y-4 mt-4 font-mono text-xs">
                                        <div className="p-3.5 bg-slate-50 rounded-xl border">
                                            <p className="font-bold text-slate-900 font-sans text-sm mb-1">① stores/{'{storeId}'}/daily_transactions/{'{YYYY-MM-DD}'}</p>
                                            <p className="text-slate-600 font-sans text-xs mb-2">1日分の全スマレジ取引データを1つのドキュメントに集約。</p>
                                            <pre className="bg-white p-3 rounded border text-[11px] overflow-x-auto text-slate-800">
{`{
  "id": "2026-10-20",
  "storeId": "MyIPMYpz2OvqHJFH4zwc",
  "date": "Timestamp(2026-10-20)",
  "transactions": [
    {
      "id": "tx_99812",
      "date": "2026-10-20T18:32:00Z",
      "items": [
        {
          "productId": "40092",
          "name": "和牛すき焼きとだし巻き玉子御膳",
          "price": 1080,
          "quantity": 2,
          "discountType": "percentage",
          "discountValue": 20
        }
      ]
    }
  ]
}`}
                                            </pre>
                                        </div>

                                        <div className="p-3.5 bg-slate-50 rounded-xl border">
                                            <p className="font-bold text-slate-900 font-sans text-sm mb-1">② stores/{'{storeId}'}/daily_wastes/{'{YYYY-MM-DD}'}</p>
                                            <p className="text-slate-600 font-sans text-xs mb-2">1日分の廃棄登録明細と当日の天候データを1ドキュメントに集約。</p>
                                            <pre className="bg-white p-3 rounded border text-[11px] overflow-x-auto text-slate-800">
{`{
  "id": "2026-10-20",
  "storeId": "MyIPMYpz2OvqHJFH4zwc",
  "date": "Timestamp(2026-10-20)",
  "weather": "晴れ",
  "entries": [
    {
      "category": "弁当",
      "items": [
        { "productCode": "40092", "name": "和牛すき焼きとだし巻き玉子御膳", "quantity": 1 }
      ]
    }
  ]
}`}
                                            </pre>
                                        </div>

                                        <div className="p-3.5 bg-slate-50 rounded-xl border">
                                            <p className="font-bold text-slate-900 font-sans text-sm mb-1">③ stores/{'{storeId}'}/product_boxes/{'{category}'}</p>
                                            <p className="text-slate-600 font-sans text-xs mb-2">部門（弁当、揚物、サラダ等）ごとに商品定義と曜日・天候別標準製造数を格納。</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ========================================================= */}
                        {/* タブ5: 運用保守・セキュリティ */}
                        {/* ========================================================= */}
                        <TabsContent value="maintenance" className="mt-0 space-y-5">
                            
                            <Card className="border-slate-200 shadow-xs bg-white">
                                <CardHeader className="py-4 px-6 border-b">
                                    <CardTitle className="text-lg font-black flex items-center gap-2">
                                        <KeyRound className="h-5 w-5 text-primary" />
                                        6.1. セキュリティ設計・権限管理（Role-Based Access）
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-3 text-xs text-slate-700 leading-relaxed">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-xl border space-y-2">
                                            <span className="font-bold text-slate-900 text-sm">SYSTEM_ADMIN（システム管理者）</span>
                                            <p className="text-slate-600">全店舗データの読み書き、全店舗の切り替え、POSインポート、システム仕様書閲覧、バックアップ・復元、デリサポ連携実行が可能。</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border space-y-2">
                                            <span className="font-bold text-slate-900 text-sm">USER（一般店舗スタッフ）</span>
                                            <p className="text-slate-600">所属店舗のデータのみ閲覧・廃棄入力が可能。管理画面や他店舗データへのアクセスはシステムレベルで完全に遮断。</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200 shadow-xs bg-white">
                                <CardHeader className="py-4 px-6 border-b">
                                    <CardTitle className="text-lg font-black flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                                        6.2. 運用保守・トラブルシューティング
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-3 text-xs text-slate-700 leading-relaxed">
                                    <div className="space-y-3">
                                        <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-1">
                                            <p className="font-bold text-slate-900">Q1. 22:10の自動同期でデータが連携されなかった場合</p>
                                            <p className="text-slate-600">
                                                スマレジのネットワーク遅延やApp Hostingの初回起動等で同期が未完了だった場合、
                                                上部メニューの「システム管理（/system）」➔「デリサポーター実績連携」から対象日を選択し、
                                                <strong>「本番送信を実行」</strong>を押すことで、いつでも手動で再同期が可能です。
                                            </p>
                                        </div>

                                        <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-1">
                                            <p className="font-bold text-slate-900">Q2. スマレジAPIの通信障害や仕様変更が発生した場合</p>
                                            <p className="text-slate-600">
                                                「POSインポート（/admin/import）」画面から、スマレジ管理画面でダウンロードした「日別取引CSV」を直接ドラッグ＆ドロップすることで、APIを使わずに完全復旧できます。
                                            </p>
                                        </div>

                                        <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-1">
                                            <p className="font-bold text-slate-900">Q3. 画面のアップデート内容が古いまま表示される場合</p>
                                            <p className="text-slate-600">
                                                ブラウザに前回のキャッシュが残っている可能性があるため、<strong>`Ctrl + Shift + R`（Macは `Cmd + Shift + R`）</strong>でブラウザの強制ハードリロードを行ってください。
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                    </div>
                </Tabs>
            </div>
        </div>
    );
}
