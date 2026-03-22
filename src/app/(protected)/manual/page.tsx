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
        title: "廃棄入力（現場スタッフ向け）",
        description: "日々の廃棄商品を素早く正確に登録するための画面です。天気の自動取得機能も備えています。",
        points: [
            "画面左側からカテゴリーを選び、商品カードをタップしてリストに追加します。",
            "「天気選択」は廃棄タイミング（10:00/22:00）に合わせて予測値が自動セットされます。",
            "右側の「廃棄リスト」で数量を調整し、「廃棄を記録」ボタンで完了します。",
            "リアルタイムで「廃棄合計額（売価）」が表示されるため、ロスの重みをその場で実感できます。"
        ],
        important: "正確な「天気」と「数量」を記録することが、AI分析の精度向上に直結します。"
    },
    {
        title: "廃棄クロス分析（8曜日一列比較）",
        description: "曜日・天気・カテゴリーを掛け合わせた高度な分析画面です。視認性を極限まで高め、機会損失の最小化を支援します。",
        points: [
            "【8曜日横一列比較】: 全曜日（月〜日・祝）を一画面に一列で並べて表示。曜日ごとの廃棄率の「波」を直感的に比較できます。",
            "【超特大数値】: 主要な数値は特大サイズで表示。タブレットを置いた状態でも、離れた場所から一目でロス状況を確認可能です。",
            "【機会損失のドリルダウン】: カテゴリー行をタップすると、商品別の廃棄数と「売価ベースの損失額（機会損失）」を巨大フォントで表示します。",
            "【カプセル型UI】: 曜日や天気は属性別カラー（土：青、日祝：赤、天気：オレンジ）のピル型デザインを採用。一瞬で条件を判別できます。"
        ],
        important: "特定の曜日や天気で常に廃棄率が高い商品は、製造計画（予定数）の調整が必要です。"
    },
    {
        title: "ダッシュボード（損害の可視化）",
        description: "廃棄ロス（原価）と機会損失（売価）の推移をグラフで可視化します。",
        points: [
            "「廃棄ロス」は実際の損害額（原価）を、「機会損失」は廃棄がなければ得られたはずの売上（売価）を示します。",
            "日別グラフの「棒」をタップすると、その日の廃棄エントリーが詳細に表示されます。",
            "詳細画面では、各商品の廃棄数だけでなく、その商品による売価損失額（機会損失）も個別に確認可能です。",
            "期間フィルターを活用し、週末や祝日の異常値がないかを定期的にチェックしましょう。"
        ],
        important: "「機会損失」の多さは、発注・製造過多だけでなく、売場への出し方や値引きのタイミングを見直すべきサインです。"
    },
    {
        title: "製造計画と追加登録",
        description: "分析結果に基づいた「基本の製造数」を設定し、日々の実績を記録する機能です。",
        points: [
            "【製造計画】: 商品ごとに「晴れの日」と「雨の日」それぞれの曜日別予定数を設定します。",
            "【追加製造登録】: 当日の予定数以外に、売れ行きを見て追加で製造した分のみを記録します。",
            "クロス分析で判明した「特定の曜日の弱点」を、この製造計画の数値に即座に反映させましょう。",
            "「予定数を適用」することで、現場での入力ミスを減らし、正確な実績集計が可能になります。"
        ],
        important: "「曜日×天気」に応じた最適な製造数を設定し、追加登録を活用することで、欠品とロスの同時解決が実現します。"
    }
]

export default function ManualPage() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center h-full">
        <div className="text-center max-w-2xl px-4">
            <h1 className="text-3xl font-black mb-2">商品構成・廃棄管理パートナー 操作説明</h1>
            <p className="text-muted-foreground text-sm">
                現場の「見やすさ」と「機会損失の発見」を追求した管理システムです。<br/>
                左右の矢印で、各機能の重要ポイントを確認してください。
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
                        <Badge variant="default" className="mb-2 bg-accent text-accent-foreground font-black">重要成功ポイント</Badge>
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
        ※本システムはタブレット端末での閲覧を推奨しています
      </div>
    </div>
  );
}
