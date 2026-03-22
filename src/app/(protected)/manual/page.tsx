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
            "【代表天気】: その日の最初の入力時に天気が確定し、同一日の全データに同期されます。分析のブレを防ぎます。",
            "リアルタイムで「廃棄合計額（売価ベース）」が表示され、ロスの重みを即座に確認できます。",
            "記録したデータは即座にダッシュボードとクロス分析へ反映されます。"
        ],
        important: "正確な数量と「その日の代表天気」を記録することが、分析精度の向上に直結します。"
    },
    {
        title: "廃棄クロス分析（4×2グリッド俯瞰）",
        description: "全曜日を一画面で比較し、機会損失の原因を特定するための高度な分析画面です。",
        points: [
            "【全画面一覧比較】: 全曜日（月〜日・祝）を横4列×縦2列のグリッドで一画面に表示。曜日を跨いだ傾向を一目で比較できます。",
            "【視認性200%】: 現場での判断を早めるため、商品名や製造・廃棄数（製：/ 廃：）を特大フォント（16px）に統一しました。",
            "【詳細サマリー】: 曜日をタップすると天気別の廃棄率を、カテゴリーをタップすると「製造数」「廃棄率」「機会損失額」をセットで確認できます。",
            "【廃棄率順ソート】: 各カードは「廃棄率の高い順」に自動並び替え。対策が必要な商品が最上部に表示されます。"
        ],
        important: "「製造数」に対しての「廃棄率」が特定の条件で常に高い場合、その条件での「製造計画」を即座に下方修正してください。"
    },
    {
        title: "製造計画の最適化（陳列時間帯の管理）",
        description: "分析結果に基づき、曜日×天気×時間帯別に製造数を設定します。",
        points: [
            "【陳列時間帯の一括設定】: 製造計画の「編集」画面で、各商品の予定数と「10:00」「12:00」「15:00」の陳列時間を同時に設定・保存できます。",
            "【曜日別予定数】: 商品ごとに「晴れ」と「雨」の予定数を設定します。クロス分析で判明した弱点をここで修正します。",
            "【一覧表示】: 予定数だけでなく「いつ陳列するか」も一画面で確認でき、時間帯別の品揃え戦略に役立てることができます。",
            "【追加登録】: 基本の予定数以外に、売れ行きを見て追加で製造した実績のみを記録します。"
        ],
        important: "廃棄が多い時間帯の陳列数を減らし、売れる時間帯に集中させることが「機会損失の最小化」に繋がります。"
    },
    {
        title: "ダッシュボード（損害の見える化）",
        description: "廃棄による実損害（原価）と、失った売上（売価）の推移を可視化します。",
        points: [
            "「廃棄ロス」は原価ベースの損害額、「機会損失」は廃棄がなければ得られたはずの売上ベースの額です。",
            "グラフの棒をタップすると、その日の登録単位ごとの詳細と、各商品の「機会損失額」を即座に確認できます。",
            "代表天候と廃棄率の相関を見つけ、雨の日や雪の日の製造数調整に役立ててください。"
        ],
        important: "「機会損失」の増大は、店舗の利益を最も圧迫する要因です。数値が跳ね上がっている日を重点的に分析してください。"
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
