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
import { Sparkles, BarChart3, ClipboardCheck, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

const manualSlides = [
    {
        title: "利益を最大化する「廃棄DX」",
        description: "データ管理から、利益を創出する攻めの運営へ。",
        icon: ShieldCheck,
        points: [
            "【機会損失最小化】: 廃棄を「失った売上」として売価で可視化。",
            "【現場判断の高速化】: タブレット前提の特大フォントUI。",
            "【データ整合性】: 前日までの確定データのみを集計しノイズを排除。",
            "【店舗最適化】: 曜日・天気別計画を利益の基盤に。"
        ],
        important: "「作りすぎ」と「少なすぎ」の両端を削ぎ落とすことが目的です。",
        outcome: "営業利益率の向上、属人化からの脱却"
    },
    {
        title: "現場入力：実績優先ロジック",
        description: "入力負担を最小化しつつ正確なデータを構築。",
        icon: ClipboardCheck,
        points: [
            "【実績登録】: 計画をベースに「今日の最終製造数」を確定記録。",
            "【0ベース集計】: 実績登録がある日はそれを採用。ない日は計画を補完。",
            "【代表天気】: 1日1天気を自動同期。分析のブレをシステムで防止。",
            "【陳列管理】: 10:00/12:00/15:00枠を管理。ピークに合わせた品揃えを。"
        ],
        important: "実績を登録した時点で計画値は実績値に置き換わり、二重計上を防ぎます。",
        outcome: "入力負担の軽減、分析データの完全な整合性"
    },
    {
        title: "4×2グリッド：全曜日俯瞰",
        description: "全8曜日を並列比較し、改善点を即座に特定。",
        icon: BarChart3,
        points: [
            "【全画面比較】: 横4列×縦2列。曜日を跨いだ廃棄傾向を一目で比較。",
            "【優先順ソート】: 「対策優先度の高い順」に商品を整列。",
            "【特大フォント】: 商品名・廃棄率を最大26pxで表示。現場視認性極大。",
            "【詳細検証】: カテゴリ詳細で「製造・廃棄率・機会損失」を同時検証。"
        ],
        important: "「特定の曜日だけ廃棄が高い」といった異常パターンを一挙に発見。",
        outcome: "曜日別製造計画の科学的ブラッシュアップ"
    },
    {
        title: "AI改善提案 (Gemini)",
        description: "Gemini 2.5 Flashが24時間体制でデータを分析。",
        icon: Sparkles,
        points: [
            "【オンデマンド】: 「先月」「今月」「週間」を指定し通信コスト最適化。",
            "【具体アクション】: 「雨の日の製造を2個減らす」等の即時指示。",
            "【4つの視点】: 廃棄削減・機会損失・天気・時間帯の多角分析。",
            "【影響の数値化】: コスト削減や売上向上見込みを具体的に提示。"
        ],
        important: "AIは店舗の専属コンサル。定期的に実行し、製造計画を更新してください。",
        outcome: "分析業務の自動化、客観的な改善サイクルの確立"
    },
    {
        title: "運用フロー：4ステップ",
        description: "システムを活用し、店舗運営を次のステージへ。",
        icon: Zap,
        points: [
            "Step 1【計画】: 曜日・天気別の製造数と陳列時間を設定。",
            "Step 2【記録】: 日々の廃棄と実績を入力。天気は自動管理。",
            "Step 3【分析】: 週次で「4×2グリッド」を確認。異常値と損失を特定。",
            "Step 4【改善】: AI提案を参考に計画を修正。このサイクルを回す。"
        ],
        important: "Step 4の「計画修正」の継続こそが、収益構造を劇的に改善させます。",
        outcome: "「感覚」に頼らない、持続可能な利益体質の構築"
    }
]

export default function ManualPage() {
  return (
    <div className="flex flex-col gap-1 py-1 items-center min-h-[90vh] bg-muted/30 overflow-hidden">
        <div className="text-center max-w-2xl px-4 shrink-0">
            <Badge variant="outline" className="px-2 py-0 border-primary text-primary font-bold text-[8px]">BUSINESS GUIDE</Badge>
            <h1 className="text-sm font-black tracking-tight text-slate-900 leading-none mt-0.5">
                商品構成・廃棄管理パートナー <span className="text-primary">Manual</span>
            </h1>
        </div>

      <Carousel className="w-full max-w-4xl px-8 mt-1">
        <CarouselContent>
          {manualSlides.map((slide, index) => (
            <CarouselItem key={index}>
              <div className="p-0.5">
                <Card className="min-h-[380px] border-none shadow-md overflow-hidden bg-background flex flex-col">
                  <CardHeader className="bg-slate-900 text-white p-3 space-y-0 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-primary/20 rounded-md">
                                <slide.icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-primary text-[10px] font-bold uppercase tracking-widest">Chapter {index + 1}</p>
                                <CardTitle className="text-[18px] font-black leading-none">{slide.title}</CardTitle>
                            </div>
                        </div>
                        <Badge className="bg-primary text-primary-foreground text-[12px] font-black h-5 w-5 rounded-full flex items-center justify-center p-0">
                            {index + 1}
                        </Badge>
                    </div>
                    <CardDescription className="text-slate-300 text-[12px] font-medium leading-none mt-1.5">{slide.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 p-4 flex flex-col justify-between space-y-2 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
                        {slide.points.map((point, pIndex) => (
                            <div key={pIndex} className="flex gap-2 group items-start">
                                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                <span className="text-[13px] font-bold leading-tight text-slate-700">{point}</span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-1.5 mt-auto pt-2 border-t">
                        <div className="p-2 rounded-md bg-primary/5 border border-primary/20 relative">
                            <Badge variant="default" className="mb-1 bg-primary text-primary-foreground font-black px-1.5 py-0 text-[10px] leading-none">運用成功の鍵</Badge>
                            <p className="font-black text-slate-800 text-[14px] leading-tight">{slide.important}</p>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 bg-muted/50 p-1.5 rounded-md">
                            <ArrowRight className="h-3.5 w-3.5 text-primary" />
                            <span>期待される成果:</span>
                            <span className="text-slate-900 text-[13px]">{slide.outcome}</span>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="h-8 w-8 border -left-4" />
        <CarouselNext className="h-8 w-8 border -right-4" />
      </Carousel>

      <div className="flex flex-col items-center gap-1 mt-2 shrink-0 pb-4">
        <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase opacity-60">
            v2.8 Professional | Presentation Ready
        </p>
        <div className="flex gap-1.5">
            {[0,1,2,3,4].map(i => (
                <div key={i} className="h-1 w-4 rounded-full bg-slate-200" />
            ))}
        </div>
      </div>
    </div>
  );
}
