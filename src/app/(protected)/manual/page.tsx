
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


export default function ManualPage() {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>操作説明</CardTitle>
          <CardDescription>SwiftPOSの基本的な使い方をご説明します。</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>POS（廃棄登録）</AccordionTrigger>
              <AccordionContent>
                <div className="prose prose-sm max-w-none">
                  <p>この画面では、廃棄する商品を登録します。</p>
                  <ol>
                    <li>カテゴリを選択するか、「すべて」のまま商品を表示します。</li>
                    <li>廃棄する商品をクリックすると、右側の「廃棄商品リスト」に追加されます。</li>
                    <li>リスト内の商品の「+」「-」ボタンで数量を調整できます。</li>
                    <li>すべての商品を追加したら、リスト下部の「廃棄を記録」ボタンを押して登録を完了します。合計廃棄額（原価）が表示されます。</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>ダッシュボード（管理者のみ）</AccordionTrigger>
              <AccordionContent>
                <div className="prose prose-sm max-w-none">
                  <p>指定した期間の売上や廃棄に関する分析データを閲覧できます。</p>
                  <ul>
                    <li><strong>日付範囲の選択:</strong> 左上のカレンダーで分析したい期間を選択します。「今日」「過去7日間」「今月」のプリセットも利用できます。</li>
                    <li><strong>廃棄ロス・機会損失:</strong> 選択期間中の廃棄額（原価）と、もしそれが売れていた場合の金額（機会損失）の合計が表示されます。</li>
                    <li><strong>廃棄分析:</strong> 商品ごとの詳細な廃棄数、廃棄額、機会損失を確認できます。</li>
                    <li><strong>カテゴリ別売上TOP5:</strong> カテゴリごとに、売上金額の大きい商品トップ5が円グラフで表示されます。</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>ABC分析（管理者のみ）</AccordionTrigger>
              <AccordionContent>
                <div className="prose prose-sm max-w-none">
                  <p>廃棄額の大きさに応じて商品をA、B、Cの3ランクに分け、管理の優先順位を明確にするための分析です。</p>
                  <ul>
                    <li><strong>ランクA:</strong> 廃棄額が最も大きい重要管理品目です。廃棄の原因を重点的に調査する必要があります。</li>
                    <li><strong>ランクB:</strong> 中程度の管理品目です。</li>
                    <li><strong>ランクC:</strong> 廃棄額が小さい品目です。</li>
                  </ul>
                  <p>各商品の廃棄額と、それが全体の廃棄額に占める累積比率を確認できます。</p>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>商品管理（管理者のみ）</AccordionTrigger>
              <AccordionContent>
                <div className="prose prose-sm max-w-none">
                  <p>POSシステムで扱う商品の登録、編集、削除を行います。</p>
                  <ul>
                    <li><strong>商品追加:</strong> 「商品を追加」ボタンから新しい商品を登録します。</li>
                    <li><strong>CSVインポート:</strong> 「CSVで商品をインポート」ボタンから、CSVファイルを使って一度に多くの商品を登録できます。</li>
                    <li><strong>編集・削除:</strong> 各商品の右側にあるメニュー（︙）から、情報の編集や商品の削除ができます。</li>
                    <li><strong>一括削除:</strong> 表のチェックボックスで複数の商品を選択し、「選択した〇件を削除」ボタンでまとめて削除できます。</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
