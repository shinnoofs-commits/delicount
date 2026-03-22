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
        title: "廃棄クロス分析（超視認性デザイン）",
        description: "曜日・天気・カテゴリーを掛け合わせた高度な分析画面です。視認性を200%向上させています。",
        points: [
            "【カテゴリー別サマリー】: タップすると、そのカテゴリー内の商品別廃棄数と「機会損失額（売価）」が表示されます。",
            "【カプセル型UI】: 曜日は月曜開始で配置。土曜（青）、日祝（赤）、天気（オレンジ）の枠線で視覚的に判別しやすくしています。",
            "【曜日別廃棄一覧】: 各曜日を切り替えて、その曜日に特化して廃棄が多い商品をリスト形式で確認できます。",
            "【ドリルダウン分析】: 曜日のピルをタップすると、その曜日の天気別の詳細な廃棄実績がポップアップします。",
            "【巨大文字表示】: 主要な数値は特大サイズで表示され、タブレット等の画面越しでも一目で状況がわかります。"
        ],
        important: "各分析項目の「廃棄率」は、その条件（特定の曜日や天気）における総製造数に基づいた正確な比率です。"
    },
    {
        title: "ダッシュボード（日々の推移確認）",
        description: "廃棄ロス（原価）と機会損失（売価）の推移をグラフで可視化します。",
        points: [
            "「廃棄ロス」は実際の損害額（原価）を、「機会損失」は廃棄がなければ得られた売上（売価）を示します。",
            "日別グラフの「棒」をタップすると、その日の廃棄エントリーが詳細に表示されます。",
            "詳細画面では、各商品の廃棄数だけでなく、その商品による売価損失額も確認可能です。",
            "期間フィルター（過去7日間、今月など）を活用し、異常値の早期発見に努めましょう。"
        ],
        important: "「機会損失」の多さは、発注・製造過多だけでなく、売場への出し方の改善が必要なサインです。"
    },
    {
        title: "製造計画と追加登録",
        description: "需要予測に基づいた「基本の製造数」を設定・記録する機能です。",
        points: [
            "【製造計画】: 商品ごとに「晴れの日パターン」と「雨の日パターン」の曜日別予定数を設定します。",
            "【追加製造登録】: 当日の朝決めた予定数以外に、追加で製造した分のみを記録します。",
            "計画画面では「一括」列を使うと、全曜日の数値をワンタップで揃えることができます。",
            "クロス分析で得られた知見を、この「製造計画」の数値に反映させることでロス削減が実現します。"
        ],
        important: "「曜日×天気」に応じた最適な製造数を設定することが、欠品とロスの同時解決への鍵となります。"
    }
]


export default function ManualPage() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center h-full">
        <div className="text-center max-w-2xl px-4">
            <h1 className="text-3xl font-black mb-2">商品構成・廃棄管理パートナー 操作説明</h1>
            <p className="text-muted-foreground text-sm">
                現場の「見やすさ」と「使いやすさ」を追求した次世代型管理システムです。<br/>
                左右の矢印で、各機能のポイントを確認してください。
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
