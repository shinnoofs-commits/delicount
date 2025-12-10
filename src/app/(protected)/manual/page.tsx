
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
        title: "POS（廃棄登録）",
        description: "この画面では、日々の廃棄商品を登録します。正確な廃棄数を記録することが、食品ロス削減の第一歩です。",
        points: [
            "カテゴリを選択するか、「すべて」のまま商品を表示します。",
            "廃棄する商品をクリックすると、右側の「廃棄商品リスト」に追加されます。",
            "リスト内の商品の「+」「-」ボタンで数量を調整できます。",
            "すべての商品を追加したら、「廃棄を記録」ボタンを押して登録を完了します。"
        ],
        important: "リスト下部に表示される「廃棄合計額（原価）」を確認する習慣をつけましょう。"
    },
    {
        title: "ダッシュボード（管理者のみ）",
        description: "指定した期間の売上や廃棄に関するデータを可視化し、店舗の状況を直感的に把握できます。",
        points: [
            "左上のカレンダーで分析したい期間を自由に設定できます。「今日」「過去7日間」「今月」のプリセットも便利です。",
            "「廃棄ロス」と「機会損失」のカードで、廃棄による金銭的影響を素早く確認できます。",
            "「廃棄分析」テーブルで、どの商品の廃棄が多いかを詳細に確認できます。",
            "カテゴリごとの売上トップ5が円グラフで表示され、売れ筋商品を把握できます。"
        ],
        important: "「機会損失」は、廃棄がなければ得られたはずの売上です。この金額を意識することが改善に繋がります。"
    },
    {
        title: "ABC分析（管理者のみ）",
        description: "廃棄額の大きさに応じて商品をランク付けし、管理すべき優先順位を明確にするための分析手法です。",
        points: [
            "【ランクA】: 廃棄額が特に大きい最重要管理品目。発注数や陳列方法の見直しが急務です。",
            "【ランクB】: Aランクに次いで廃棄額が大きい品目。改善の余地があります。",
            "【ランクC】: 廃棄額が小さい品目。現状の管理を維持します。",
        ],
        important: "まずは「ランクA」の商品に集中して対策を講じることが、最も効率的に廃棄ロスを削減する鍵です。"
    },
    {
        title: "商品管理（管理者のみ）",
        description: "POSシステムで扱うすべての商品の情報を一元管理します。",
        points: [
            "「商品を追加」ボタンから、新しい商品を一つずつ登録できます。",
            "「CSVで商品をインポート」ボタンから、CSVファイルを使って一度に多くの商品を登録・更新できます。",
            "各商品の右側にあるメニュー（︙）から、情報の編集や商品の削除が可能です。",
            "表のチェックボックスで複数商品を選択し、「選択した〇件を削除」ボタンで一括削除もできます。",
        ],
        important: "商品の「原価」と「価格」を正確に入力することが、各種分析の精度を高める上で非常に重要です。"
    }
]


export default function ManualPage() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center">
        <div className="text-center">
            <h1 className="text-3xl font-bold">廃棄分析ツール 操作説明</h1>
            <p className="text-muted-foreground">左右の矢印をクリックしてスライドを切り替えてください。</p>
        </div>
      <Carousel className="w-full max-w-4xl">
        <CarouselContent>
          {manualSlides.map((slide, index) => (
            <CarouselItem key={index}>
              <div className="p-1">
                <Card className="min-h-[450px]">
                  <CardHeader>
                    <CardTitle className="text-2xl">{index + 1}. {slide.title}</CardTitle>
                    <CardDescription>{slide.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3 pl-5 list-disc text-sm">
                        {slide.points.map((point, pIndex) => (
                            <li key={pIndex}>{point}</li>
                        ))}
                    </ul>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <Badge variant="default" className="mb-2 bg-accent text-accent-foreground">重要ポイント</Badge>
                        <p className="font-semibold text-primary-foreground/90">{slide.important}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="ml-12" />
        <CarouselNext className="mr-12" />
      </Carousel>
    </div>
  );
}
