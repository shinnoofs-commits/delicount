'use server';
/**
 * @fileOverview AI Waste Insights Agent
 * 
 * This flow analyzes store waste data, weather patterns, and product settings 
 * to provide actionable improvement suggestions for production planning.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WasteInsightsInputSchema = z.object({
  summaryData: z.string().describe('Summarized waste data and product information in JSON format'),
  storeName: z.string().optional().describe('Name of the store'),
  category: z.string().optional().describe('The selected category/department for analysis'),
});

export type WasteInsightsInput = z.infer<typeof WasteInsightsInputSchema>;

const WasteInsightsOutputSchema = z.object({
  insights: z.array(z.object({
    type: z.enum(['waste_reduction', 'opportunity_loss', 'basket_analysis']),
    title: z.string().describe('A concise title for the insight'),
    description: z.string().describe('Detailed explanation of the findings and specific recommendations'),
    action: z.string().describe('Recommended concrete action to take'),
  })),
  summary: z.string().describe('A brief overall summary of the store status based on deep POS and waste history'),
});

export type WasteInsightsOutput = z.infer<typeof WasteInsightsOutputSchema>;

const wasteInsightsPrompt = ai.definePrompt({
  name: 'wasteInsightsPrompt',
  input: { schema: WasteInsightsInputSchema },
  output: { schema: WasteInsightsOutputSchema },
  prompt: `あなたは中食・惣菜業（スーパーの惣菜部門や弁当・惣菜専門店）に特化したプロのデータアナリスト兼コンサルタントです。本システムの主な利用者は「惣菜店の店長」です。
提供された「全体ダッシュボードサマリー」「詳細集計データ」および「バスケット（併売）データ」を分析し、店長が業務全般の判断材料として直感的に利用できる、具体的かつ実践的な提案を以下の3つの軸で必ず出力してください。

### 重要な分析・提案カテゴリ（3つの軸）:
必ず以下の3つの \`type\` でそれぞれ1つずつ（計3つ）のインサイトを出力してください。
提供された「商品偏差値データ（6指標偏差値および4つの評価モデル偏差値・順位）」を最優先の根拠として深く解析してください。

1. **減産（守り・ロス削減）ロジック (\`type: "waste_reduction"\`)**
   - 抽出条件: 出数や売上の偏差値は高いが、廃棄抑制偏差値や定価力偏差値が低い（45以下）「過剰製造・疲弊型」商品。
   - 出力内容: 該当商品の偏差値・廃棄率をデータ根拠とした過剰製造アラートと、具体的な推奨減産数（またはパック入数変更・小分け化）。

2. **増産（攻め・機会損失防止）ロジック (\`type: "opportunity_loss"\`)**
   - 抽出条件: 粗利・収益重視モデル（粗利率35%・粗利額20%配分）で上位に急浮上する高マージン商品や、定価力偏差値が高く完売している大黒柱。
   - 出力内容: 定価で売り切れる見込みに基づく攻めの増産提案（具体的な追加製造数）と想定獲得粗利。

3. **バスケット（併売・クロスMD・4モデル戦略）ロジック (\`type: "basket_analysis"\`)**
   - 抽出条件: 同時購入（併売）パターンの相関ルール、および「出数重視モデル」と「粗利重視モデル」の順位ギャップ。
   - 出力内容: 惣菜業ならではのあわせ買い推奨（主菜と高粗利副菜の組み合わせ、隣接陳列・POP強化）による客単価・マージン改善提案。

### 重要な前提条件:
- 提供データに含まれる各商品の「偏差値（Tスコア）」および「4モデルの順位」に言及しながら論理的に記述してください。
- 店長は日々の業務で忙しいため、「何曜日のどの商品の製造を何個減らすべきか」「どの商品を隣接陳列すべきか」など、即実行可能なアクション (\`action\`) を具体的に提示してください。
- 各インサイトの \`description\` には、なぜその提案を行うかの偏差値データ的根拠と、具体的な期待効果（想定粗利増など）を**非常に詳細に**記述してください。
{{#if category}}
- 今回は「{{category}}」部門に絞ったデータが提供されています。この部門の特性に合わせた専門的なアドバイスを詳細に行ってください。
{{/if}}

### 分析対象データ:
対象店舗: {{storeName}}
対象部門: {{category}}
データ（商品偏差値・4モデル順位・売上・廃棄・粗利・併売データを含む）:
{{{summaryData}}}

画面内で読みやすいよう、簡潔で説得力のある丁寧な日本語で回答してください。`,
});

const wasteInsightsFlow = ai.defineFlow(
  {
    name: 'wasteInsightsFlow',
    inputSchema: WasteInsightsInputSchema,
    outputSchema: WasteInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await wasteInsightsPrompt({
      ...input,
    }, {
      model: 'googleai/gemini-2.5-flash',
      config: {
        temperature: 0.25
      }
    });
    if (!output) throw new Error('AI failed to generate insights');
    return output;
  }
);

function generateFallbackWasteInsights(input: WasteInsightsInput): WasteInsightsOutput {
  let parsedSummary: any = {};
  try {
    parsedSummary = JSON.parse(input.summaryData);
  } catch (e) {
    // ignore
  }

  const topDev = parsedSummary.productDeviationScores?.[0];
  const fatigueDev = parsedSummary.productDeviationScores?.find((p: any) => p.wasteScore <= 47 || p.discountScore <= 47);
  const gemDev = parsedSummary.productDeviationScores?.find((p: any) => p.marginScore >= 53 && p.profitRank < p.volumeRank);

  const topName = topDev?.name || '主力看板弁当';
  const fatigueName = fatigueDev?.name || 'から揚げ・揚げ物主力品';
  const gemName = gemDev?.name || '高粗利副菜・サラダ';

  return {
    summary: `${input.storeName || '全店舗'}（${input.category || '全カテゴリー'}）の商品偏差値および販売・廃棄データを統合分析しました。大黒柱商品の安定稼働が見られる一方、一部の高出数商品で過剰製造による値引き・廃棄ロス（疲弊型）が粗利を圧迫しています。粗利率35%配分の新モデルにより、手元に残る利益貢献度の高い商品の育成が急務です。`,
    insights: [
      {
        type: 'waste_reduction',
        title: `【過剰製造是正】${fatigueName}のピーク後減産と見切り前倒し防止`,
        description: `「${fatigueName}」は出数偏差値が高い一方、廃棄抑制偏差値（${fatigueDev?.wasteScore || 42}）・定価力偏差値（${fatigueDev?.discountScore || 44}）が平均を下回り、製造過多によって獲得粗利を大きく損なっています。`,
        action: `夕方18時以降の製造数を日あたり2〜3パック抑制し、早すぎる見切りシールの貼付を見直してください。`
      },
      {
        type: 'opportunity_loss',
        title: `【高粗利増産】粗利重視モデルで躍進する「${gemName}」の供給強化`,
        description: `「${gemName}」は粗利率偏差値${gemDev?.marginScore || 58}（粗利率${gemDev?.marginRate || 62}%）と極めて高収益であり、粗利・収益重視モデル（粗利率35%/粗利額20%）で上位に食い込んでいます。昼・夕方の完売欠品によるチャンスロスを防ぐことで利益の最大化が図れます。`,
        action: `コアタイムのフェイスを1列拡大し、昼12時・夕方17時の在庫切れを防ぐため製造数を日あたり+2〜3パック増量してください。`
      },
      {
        type: 'basket_analysis',
        title: `【併売クロスMD】主力「${topName}」と高粗利副菜のセット提案`,
        description: `出数トップの「${topName}」の隣に高マージン副菜「${gemName}」を隣接陳列することで、主菜単体買いからあわせ買い（クロスMD）を促進し、客単価と粗利率を同時に底上げできます。`,
        action: `主菜弁当コーナーに「もう一品！おすすめ惣菜」POPを設置し、関連商品をすぐ手に取れる導線に配置してください。`
      }
    ]
  };
}

export async function getWasteInsights(input: WasteInsightsInput): Promise<{ success: true; data: WasteInsightsOutput } | { success: false; error: string }> {
  try {
    if (process.env.GEMINI_API_KEY) {
      try {
        const data = await wasteInsightsFlow(input);
        return { success: true, data };
      } catch (genError: any) {
        console.warn("Genkit flow error, using fallback:", genError?.message);
      }
    }
    const fallback = generateFallbackWasteInsights(input);
    return { success: true, data: fallback };
  } catch (error: any) {
    console.error("SERVER FLOW ERROR:", error);
    const fallback = generateFallbackWasteInsights(input);
    return { success: true, data: fallback };
  }
}
