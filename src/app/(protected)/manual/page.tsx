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

const manualSlides = [
    {
        title: "廃棄入力（現場向けUI）",
        description: "日々の廃棄商品を素早く記録するための画面です。直感的なタップ操作でミスを防ぎます。",
        points: [
            "左側のカテゴリー選択から、商品をタップしてリストに追加します。",
            "天気は「廃棄タイミングの予測」が自動セットされますが、手動調整も可能です。",
            "リアルタイムで「廃棄合計額（売価ベース）」が表示され、ロスの重みを即座に確認できます。",
            "記録したデータは即座にダッシュボードとクロス分析へ反映されます。"
        ],
        important: "正確な数量と「その時の天気」を記録することが、将来の予測精度を高めます。"
    },
    {
        title: "廃棄クロス分析（超視認性・4×2グリッド）",
        description: "全曜日を一画面で比較し、機会損失の原因を特定するための高度な分析画面です。",
        points: [
            "【4×2グリッド俯瞰】: 全曜日（月〜日・祝）を一画面に収めた新レイアウト。全曜日の傾向を一目で比較できます。",
            "【廃棄率ソート】: 各カード内は「廃棄率の高い順」に自動並び替え。対策が必要な商品が最上部に表示されます。",
            "【200%視認性】: 文字サイズを極大化。離れた場所からでも、危険な数値（赤字）を一瞬で判別できます。",
            "【ドリルダウン】: カテゴリー行をタップすると、商品別の廃棄数と「機会損失（売価合計）」を詳細表示します。"
        ],
        important: "特定の曜日だけ常に廃棄率が高い場合、その曜日の製造計画（予定数）の設定が過剰である証拠です。"
    },
    {
        title: "ダッシュボード（損害の見える化）",
        description: "廃棄による実損害（原価）と、失った売上（売価）の推移を可視化します。",
        points: [
            "「廃棄ロス」は原価ベースの損害額、「機会損失」は廃棄がなければ得られたはずの売上ベースの額です。",
            "グラフの棒をタップすると、その日の廃棄内容と商品ごとの「機会損失額」を詳細に確認できます。",
            "天候と廃棄率の相関を見つけ、雨の日や雪の日の製造数調整に役立ててください。"
        ],
        important: "「機会損失」の増大は、店舗の利益を最も圧迫する要因です。数値が跳ね上がっている日を重点的に分析してください。"
    },
    {
        title: "製造計画の最適化",
        description: "分析結果に基づき、「基本の製造数」を曜日×天気別に設定します。",
        points: [
            "【製造計画】: 商品ごとに「晴れ」と「雨」の予定数を設定します。クロス分析で判明した弱点をここで修正します。",
            "【追加登録】: 基本の予定数以外に、売れ行きを見て追加で製造した実績のみを記録します。",
            "「予定数を適用」ボタンにより、現場での実績入力を簡略化しつつ、正確なデータを収集できます。"
        ],
        important: "「曜日×天気」に応じた予定数を細かく設定することが、廃棄ゼロと欠品ゼロを両立させる唯一の道です。"
    }
]

export default function ManualPage() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center h-full">
        <div className="text-center max-w-2xl px-4">
            <h1 className="text-3xl font-black mb-2">商品構成・廃棄管理パートナー 操作説明</h1>
            <p className="text-muted-foreground text-sm">
                現場の「視認性」と「機会損失の早期発見」を追求した管理システムです。
            </p>
        </div>
      <Carousel className="w-full max-w-4xl px-8">
        <CarouselContent>
          {manualSlides.map((slide, index) => (
            <CarouselItem key={index}>
              <div className="p-1">
                <Card className="min-h-[500px] border-2 shadow-lg">
                  <CardHeader className="bg-primary/10 border-b">
                    <div className="flex items-center gap-3">
                        <Badge className="h-8 w-8 rounded-full flex items-center justify-center text-lg font-black">{index + 1}</Badge>
                        <CardTitle className="text-2xl font-black">{slide.title}</CardTitle>
                    </div>
                    <CardDescription className="text-foreground/80 font-medium mt-2">{slide.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <ul className="space-y-4">
                        {slide.points.map((point, pIndex) => (
                            <li key={pIndex} className="flex gap-3 text-sm font-bold leading-relaxed">
                                <span className="text-primary mt-1 shrink-0">●</span>
                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="p-4 rounded-2xl bg-accent/5 border-2 border-accent/20">
                        <Badge variant="default" className="mb-2 bg-accent text-accent-foreground font-black">運用成功の鍵</Badge>
                        <p className="font-black text-blue-900 leading-relaxed">{slide.important}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
      <div className="text-center text-[10px] text-muted-foreground mt-4 opacity-60">
        ※本システムは高視認性UIのため、タブレット端末での閲覧を推奨しています
      </div>
    </div>
  );
}