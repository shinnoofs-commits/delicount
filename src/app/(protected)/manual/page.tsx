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
        title: "システムコンセプト：利益を最大化する「廃棄DX」",
        description: "データを見るだけの管理から、利益を創出する攻めの管理へ。",
        icon: ShieldCheck,
        points: [
            "【機会損失の最小化】: 廃棄を「単なるゴミ」ではなく「失った売上」として売価ベースで可視化します。",
            "【現場判断の高速化】: タブレットでの操作を前提とした特大フォント（16px〜26px）と直感的なUI。",
            "【データの整合性】: 1日1つの「代表天気」を自動同期し、分析のノイズを排除します。",
            "【店舗別最適化】: 各店舗の立地や客層に合わせた「曜日別・天気別製造計画」を基盤にします。"
        ],
        important: "「作りすぎ」による廃棄ロスと「少なすぎ」による機会損失。この両端を極限まで削ぎ落とすことが本システムの目的です。",
        outcome: "営業利益率の向上、発注・製造精度の属人化からの脱却"
    },
    {
        title: "現場向け入力：ミスを防ぎ、実態を正確に記録",
        description: "忙しい現場でも、数タップで「真の実績」を構築します。",
        icon: ClipboardCheck,
        points: [
            "【廃棄入力】: カテゴリー選択から商品をタップするだけのPOSスタイル。売価合計がリアルタイムに変動し、ロスの重みを実感させます。",
            "【製造補正登録】: 予定数に対する「補正（＋/－）」を記録。「計画＋補正＝最終製造数」として計算されるため、正確な廃棄率が算出されます。",
            "【代表天気の確定】: その日の最初の入力時に天気を取得。同一日の全データに同期され、天気別分析の精度を100%に保ちます。",
            "【陳列時間帯の管理】: 10:00/12:00/15:00のどの枠に並べるかを商品別に管理。ピーク時に合わせた品揃えを実現します。"
        ],
        important: "「補正機能」でマイナス値を入力することで、欠品による販売チャンスの喪失もデータとして蓄積できます。",
        outcome: "データ入力負担の軽減、分析用データの完全な整合性確保"
    },
    {
        title: "4×2グリッド分析：全曜日の傾向を1画面で俯瞰",
        description: "全8曜日（月〜日・祝）を並列比較し、改善ポイントを即座に特定します。",
        icon: BarChart3,
        points: [
            "【全画面一覧比較】: 横4列×縦2列のグリッド配置。曜日を跨いだ廃棄率の傾向を一目で比較可能です。",
            "【廃棄率順ソート】: 各カード内は「対策優先度の高い順」に商品を自動整列。放置すべきでない商品が最上部に並びます。",
            "【特大フォント表示】: 商品名・製造数・廃棄数を同じ16pxサイズで表示。現場での視認性を極限まで高めています。",
            "【詳細ドリルダウン】: 曜日をタップすれば「天気別廃棄率」を、カテゴリーをタップすれば「機会損失額（売価）」を詳細確認。"
        ],
        important: "「特定の曜日だけ、特定の商品の廃棄率が常に高い」といった、人間の直感では気づきにくいパターンを発見してください。",
        outcome: "曜日別製造計画の科学利益体質の構築、ロスの早期発見"
    },
    {
        title: "AI改善提案 (Gemini)：データを利益に変えるアドバイス",
        description: "蓄積された膨大なデータを、Gemini 2.5 Flashが24時間体制で分析します。",
        icon: Sparkles,
        points: [
            "【オンデマンド分析】: 「先月」「今月」「週間」などの期間を任意に指定。必要な時だけAIを走らせることで通信コストを最適化します。",
            "【具体的なアクション案】: 「雨の日の午後の廃棄が30%多いので、15時の製造を2個減らすべき」といった、即実行可能な指示を出力。",
            "【4つのインサイト】: 「廃棄削減」「機会損失」「天気パターン」「時間帯最適化」の視点からバランス良く提案。",
            "【推定影響の算出】: その提案を実行した場合に、どれだけのコスト削減や売上向上が見込めるかを可視化します。"
        ],
        important: "AIはあなたの店舗の「専属コンサルタント」です。定期的に分析を実行し、製造計画のブラッシュアップに役立ててください。",
        outcome: "店長の分析業務の自動化、データに基づいた客観的な改善サイクルの確立"
    },
    {
        title: "運用フロー：利益最大化への4ステップ",
        description: "本システムを最大限に活用し、店舗運営を次のステージへ。",
        icon: Zap,
        points: [
            "Step 1【計画】: 曜日別・天気別のベース製造数を設定。陳列時間帯を割り振ります。",
            "Step 2【記録】: 日々の廃棄と補正数を正確に入力。代表天気はシステムが自動で管理します。",
            "Step 3【分析】: 週次・月次で「4×2グリッド」を確認。異常値が出ている曜日・商品を見つけます。",
            "Step 4【改善】: AIの提案を参考に計画を修正。このサイクルを回すことで、廃棄率は確実に低下します。"
        ],
        important: "システムは導入がゴールではありません。Step 4の「計画の修正」を継続することで、店舗の収益構造は劇的に改善されます。",
        outcome: "「感覚」に頼らない店舗運営、持続可能な利益体質の構築"
    }
]

export default function ManualPage() {
  return (
    <div className="flex flex-col gap-6 py-6 items-center min-h-screen bg-muted/30">
        <div className="text-center max-w-3xl px-4 space-y-2">
            <Badge variant="outline" className="px-4 py-1 border-primary text-primary font-bold">BUSINESS GUIDE</Badge>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
                商品構成・廃棄管理パートナー <span className="text-primary">Manual</span>
            </h1>
            <p className="text-muted-foreground text-lg font-medium">
                データ駆動型の店舗運営を実現し、機会損失を最小化するための完全ガイド
            </p>
        </div>

      <Carousel className="w-full max-w-5xl px-12">
        <CarouselContent>
          {manualSlides.map((slide, index) => (
            <CarouselItem key={index}>
              <div className="p-2">
                <Card className="min-h-[620px] border-none shadow-2xl overflow-hidden bg-background flex flex-col">
                  <CardHeader className="bg-slate-900 text-white p-8 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/20 rounded-xl">
                                <slide.icon className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <p className="text-primary text-xs font-bold uppercase tracking-widest">Chapter {index + 1}</p>
                                <CardTitle className="text-3xl font-black">{slide.title}</CardTitle>
                            </div>
                        </div>
                        <Badge className="bg-primary text-primary-foreground text-xl font-black h-12 w-12 rounded-full flex items-center justify-center">
                            {index + 1}
                        </Badge>
                    </div>
                    <CardDescription className="text-slate-300 text-lg font-medium">{slide.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 p-8 flex flex-col justify-between space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ul className="space-y-5">
                            {slide.points.slice(0, 2).map((point, pIndex) => (
                                <li key={pIndex} className="flex gap-4 group">
                                    <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0 group-hover:scale-150 transition-transform" />
                                    <span className="text-[15px] font-bold leading-relaxed text-slate-700">{point}</span>
                                </li>
                            ))}
                        </ul>
                        <ul className="space-y-5">
                            {slide.points.slice(2).map((point, pIndex) => (
                                <li key={pIndex} className="flex gap-4 group">
                                    <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0 group-hover:scale-150 transition-transform" />
                                    <span className="text-[15px] font-bold leading-relaxed text-slate-700">{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <div className="p-5 rounded-2xl bg-primary/5 border-2 border-primary/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Zap className="h-12 w-12 text-primary" />
                            </div>
                            <Badge variant="default" className="mb-3 bg-primary text-primary-foreground font-black px-3 py-1">運用成功の鍵</Badge>
                            <p className="font-black text-slate-800 text-lg leading-relaxed">{slide.important}</p>
                        </div>

                        <div className="flex items-center gap-3 text-sm font-black text-slate-500 bg-muted/50 p-3 rounded-lg">
                            <ArrowRight className="h-4 w-4 text-primary" />
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
        <CarouselPrevious className="h-12 w-12 border-2" />
        <CarouselNext className="h-12 w-12 border-2" />
      </Carousel>

      <div className="flex flex-col items-center gap-4 mt-4">
        <p className="text-[11px] text-muted-foreground font-bold tracking-widest uppercase opacity-60">
            Smart Waste Management System v2.0 | Optimized for Tablet & Desktop
        </p>
        <div className="flex gap-2">
            {[0,1,2,3,4].map(i => (
                <div key={i} className="h-1.5 w-8 rounded-full bg-slate-200" />
            ))}
        </div>
      </div>
    </div>
  );
}
