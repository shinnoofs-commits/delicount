'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Badge } from "@/components/ui/badge";
import { Sparkles, BarChart3, Factory, ClipboardCheck, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

const manualSlides = [
    {
        title: "利益を最大化する「廃棄DX」",
        description: "データを見る管理から、利益を創出する攻めの管理へ。",
        icon: ShieldCheck,
        points: [
            "【機会損失の最小化】: 廃棄を「失った売上」として売価ベースで可視化。",
            "【現場判断の高速化】: タブレット前提の特大フォント（16〜26px）と直感UI。",
            "【データの整合性】: 1日1つの「代表天気」を自動同期し分析ノイズを排除。",
            "【店舗別最適化】: 立地・客層に合わせた「曜日別・天気別計画」を基盤に。"
        ],
        important: "「作りすぎ」と「少なすぎ」の両端を削ぎ落とすことが目的です。",
        outcome: "営業利益率の向上、属人化からの脱却"
    },
    {
        title: "現場入力：ミスを防ぎ記録",
        description: "忙しい現場でも数タップで正確な実績を構築します。",
        icon: ClipboardCheck,
        points: [
            "【廃棄入力】: 商品をタップするだけのPOSスタイル。売価がリアルタイム変動。",
            "【製造補正】: 予定数に対する「補正（＋/－）」を記録。最終製造数を自動算出。",
            "【代表天気の確定】: その日の初回入力時に天気を取得。全データに同期。",
            "【陳列管理】: 10:00/12:00/15:00の枠を商品別に管理。ピークに合わせた品揃え。"
        ],
        important: "「補正機能」のマイナス値で、欠品による販売チャンス喪失も蓄積可能。",
        outcome: "入力負担の軽減、分析データの完全な整合性"
    },
    {
        title: "4×2グリッド分析：全曜日俯瞰",
        description: "全8曜日を並列比較し、改善ポイントを即座に特定します。",
        icon: BarChart3,
        points: [
            "【全画面比較】: 横4列×縦2列。曜日を跨いだ廃棄率傾向を一目で比較。",
            "【優先順ソート】: カード内は「対策優先度の高い順」に商品を自動整列。",
            "【特大フォント】: 商品名・製造・廃棄を16pxで表示。現場視認性を極大化。",
            "【ドリルダウン】: 曜日タップで天気別、カテゴリタップで機会損失（売価）を確認。"
        ],
        important: "「特定の曜日だけ特定の商品の廃棄が高い」といったパターンを発見。",
        outcome: "曜日別製造計画の科学的ブラッシュアップ"
    },
    {
        title: "AI改善提案 (Gemini)",
        description: "膨大なデータをGemini 2.5 Flashが24時間体制で分析。",
        icon: Sparkles,
        points: [
            "【オンデマンド分析】: 「先月」「今月」「週間」を任意指定。通信コストを最適化。",
            "【具体アクション】: 「雨の日の午後の製造を2個減らすべき」等の即実行可能な指示。",
            "【4つのインサイト】: 「廃棄削減」「機会損失」「天気」「時間帯」の視点で提案。",
            "【推定影響】: 提案実行時のコスト削減や売上向上見込みを可視化。"
        ],
        important: "AIは店舗の専属コンサルです。定期的に実行し計画を更新してください。",
        outcome: "分析業務の自動化、客観的な改善サイクルの確立"
    },
    {
        title: "運用フロー：4ステップ",
        description: "システムを活用し、店舗運営を次のステージへ。",
        icon: Zap,
        points: [
            "Step 1【計画】: 曜日別・天気別のベース製造数と陳列時間帯を設定。",
            "Step 2【記録】: 日々の廃棄と補正数を正確に入力。天気は自動管理。",
            "Step 3【分析】: 週次・月次で「4×2グリッド」を確認。異常値を特定。",
            "Step 4【改善】: AI提案を参考に計画を修正。このサイクルで廃棄率を低下。"
        ],
        important: "Step 4の「計画修正」の継続こそが、収益構造を劇的に改善させます。",
        outcome: "「感覚」に頼らない、持続可能な利益体質の構築"
    }
]

export default function ManualPage() {
  return (
    <div className="flex flex-col gap-4 py-4 items-center min-h-screen bg-muted/30 overflow-y-auto">
        <div className="text-center max-w-2xl px-4 space-y-1">
            <Badge variant="outline" className="px-3 py-0.5 border-primary text-primary font-bold text-[10px]">BUSINESS GUIDE</Badge>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
                商品構成・廃棄管理パートナー <span className="text-primary">Manual</span>
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
                データ駆動型の店舗運営と機会損失の最小化を実現する完全ガイド
            </p>
        </div>

      <Carousel className="w-full max-w-4xl px-10">
        <CarouselContent>
          {manualSlides.map((slide, index) => (
            <CarouselItem key={index}>
              <div className="p-1">
                <Card className="min-h-[500px] border-none shadow-xl overflow-hidden bg-background flex flex-col">
                  <CardHeader className="bg-slate-900 text-white p-5 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-lg">
                                <slide.icon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-primary text-[10px] font-bold uppercase tracking-widest">Chapter {index + 1}</p>
                                <CardTitle className="text-xl font-black">{slide.title}</CardTitle>
                            </div>
                        </div>
                        <Badge className="bg-primary text-primary-foreground text-base font-black h-8 w-8 rounded-full flex items-center justify-center p-0">
                            {index + 1}
                        </Badge>
                    </div>
                    <CardDescription className="text-slate-300 text-sm font-medium">{slide.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 p-6 flex flex-col justify-between space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ul className="space-y-3">
                            {slide.points.slice(0, 2).map((point, pIndex) => (
                                <li key={pIndex} className="flex gap-3 group">
                                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0 group-hover:scale-125 transition-transform" />
                                    <span className="text-[13px] font-bold leading-snug text-slate-700">{point}</span>
                                </li>
                            ))}
                        </ul>
                        <ul className="space-y-3">
                            {slide.points.slice(2).map((point, pIndex) => (
                                <li key={pIndex} className="flex gap-3 group">
                                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0 group-hover:scale-125 transition-transform" />
                                    <span className="text-[13px] font-bold leading-snug text-slate-700">{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-1 opacity-10">
                                <Zap className="h-8 w-8 text-primary" />
                            </div>
                            <Badge variant="default" className="mb-2 bg-primary text-primary-foreground font-black px-2 py-0 text-[10px]">運用成功の鍵</Badge>
                            <p className="font-black text-slate-800 text-sm leading-relaxed">{slide.important}</p>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 bg-muted/50 p-2 rounded-lg">
                            <ArrowRight className="h-3 w-3 text-primary" />
                            <span>期待される成果:</span>
                            <span className="text-slate-900">{slide.outcome}</span>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="h-10 w-10 border-2" />
        <CarouselNext className="h-10 w-10 border-2" />
      </Carousel>

      <div className="flex flex-col items-center gap-3 mt-2">
        <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase opacity-60">
            v2.0 Compact Mode | Optimized for No-Scroll
        </p>
        <div className="flex gap-1.5">
            {[0,1,2,3,4].map(i => (
                <div key={i} className="h-1 w-6 rounded-full bg-slate-200" />
            ))}
        </div>
      </div>
    </div>
  );
}
