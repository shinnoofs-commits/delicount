/**
 * @fileOverview S-Count Agent (デリカウント専属AIエージェント)
 * 値引き・廃棄ロス削減、食品ロスゼロに向けた店舗伴走パートナー。
 * 完全非破壊・完全Read-Only接続で動作します。
 */

import { inspectInput } from './security/guardian-gate';
import { DelicountDataService } from './data-service';
import { callGemini, GeminiContent } from './gemini-client';
import { getStoresToolDeclaration, executeGetStores } from './tools/stores-tool';
import { getDiscountAnalysisToolDeclaration, executeGetDiscountAnalysis } from './tools/discount-analysis-tool';
import { getWasteOptimizationToolDeclaration, executeGetWasteOptimization } from './tools/waste-recommendation-tool';

const SYSTEM_PROMPT = `あなたは「S-デリカウント（値引き廃棄管理アプリ）」の専属AIエージェント「S-Count Agent」です。

### 役割と使命:
1. スーパー惣菜部門・専門店における「値引きロス・廃棄ロスの削減」および「利益の最大化」を支援する現場密着型パートナーです。
2. スマレジPOS取引データや廃棄実績を分析し、店長や現場スタッフが直感的に判断・行動できる具体的なアドバイスを提供します。
3. 既存システムおよび外部連携データへの破壊・改ざん操作は絶対に行わず、完全な読み取り専用（Read-Only）で安心・安全に稼働します。

### 回答方針:
- 一般論ではなく、提供された実データ（売上金額、定価販売率、値引き損失額、時間帯、品目名）を根拠にしてダイレクトに回答してください。
- 惣菜業ならではの「守り（減産・小分けパック化によるロス削減）」と「攻め（定価で売り切れる高利益品の増産）」の両面からアドバイスを行ってください。
- 現場がすぐに動けるよう、要点を分かりやすく整理し、簡潔かつ丁寧に伝えてください。
`;

export class SCountAgent {
  private service: DelicountDataService;

  constructor() {
    this.service = new DelicountDataService();
  }

  /**
   * メイン対話関数
   */
  async chat(userMessage: string): Promise<string> {
    // 1. S-Guardian による入力水際検査
    const guardCheck = inspectInput(userMessage);
    if (!guardCheck.allowed) {
      return guardCheck.reason || '【S-Guardian 遮断】不正な操作またはセキュリティリスクを検知しました。';
    }

    // 2. ツール宣言
    const tools = [
      {
        functionDeclarations: [
          getStoresToolDeclaration,
          getDiscountAnalysisToolDeclaration,
          getWasteOptimizationToolDeclaration,
        ],
      },
    ];

    const contents: GeminiContent[] = [
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ];

    // 3. 自律ループ（最大3ターン）
    for (let turn = 0; turn < 3; turn++) {
      const response = await callGemini(contents, tools, SYSTEM_PROMPT);
      const candidate = response.candidates?.[0];
      const modelContent = candidate?.content;

      if (!modelContent || !modelContent.parts || modelContent.parts.length === 0) {
        return '申し訳ございません。分析結果を生成できませんでした。もう一度お試しください。';
      }

      const functionCallPart = modelContent.parts.find(p => p.functionCall);

      if (functionCallPart && functionCallPart.functionCall) {
        const { name, args } = functionCallPart.functionCall;

        // モデルの発話そのものを履歴に追加（thought_signature等を保持）
        contents.push(modelContent);

        // ツール実行（完全Read-Only）
        let toolResult: any;
        if (name === 'getStores') {
          toolResult = await executeGetStores(this.service);
        } else if (name === 'getDiscountAnalysis') {
          toolResult = await executeGetDiscountAnalysis(this.service, args || {});
        } else if (name === 'getWasteOptimization') {
          toolResult = await executeGetWasteOptimization(this.service, args || {});
        } else {
          toolResult = { error: `Unknown tool: ${name}` };
        }

        // ツール結果をユーザー発話としてGeminiに返信
        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name,
                response: toolResult,
              },
            },
          ],
        });
      } else {
        const textPart = modelContent.parts.find(p => p.text);
        if (textPart && textPart.text) {
          return textPart.text;
        }
      }
    }

    return '分析に時間がかかっております。質問の条件を絞ってお尋ねください。';
  }
}
