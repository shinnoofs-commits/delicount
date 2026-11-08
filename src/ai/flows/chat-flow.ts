'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChatInputSchema = z.object({
  message: z.string().describe('The user\'s chat message'),
  context: z.string().describe('Background context including store, period, category, and analysis summary'),
});

export type ChatInput = z.infer<typeof ChatInputSchema>;

const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  input: { schema: ChatInputSchema },
  output: { format: 'text' },
  prompt: `あなたは中食・惣菜業（スーパーの惣菜部門や弁当・惣菜専門店）に特化したプロのデータアナリスト兼コンサルタントAIです。
現在ユーザーが画面で選択しているデータを元に、簡潔かつ実践的なアドバイスを行ってください。

### 背景コンテキスト（アプリ内のデータ）:
{{{context}}}

### ユーザーからのメッセージ:
{{message}}

### 回答の指針:
- 必ず「背景コンテキスト」として提供されたアプリ内のデータを読み取り、その数値を根拠にして的確に回答してください。推測や一般論は避けてください。
- データの「定価販売数(regSalesAmount)」と「値引販売数(discSalesAmount)」、「定価販売率(regSalesRate)」を厳密に区別して分析してください。
- ユーザーの質問にはまずダイレクトに（直接的に）答えてください。質問で指定された形式（例：カテゴリーごとのトップ10など）がある場合は、必ずそれに従ってください。
- もし提供されたコンテキストデータ（上位150品目など一部のデータのみ）では質問に完全に答えられない場合（例：すべてのカテゴリーで10品ずつ存在しないなど）は、適当なデータで埋め合わせるのではなく、「提供されているデータ範囲内での回答になりますが」と前置きし、今あるデータで最大限答えてください。
- ランキングや順位を求められた場合は、提供されたデータの全ての数値を比較し、必ず正確に並び替えてから上位だけを抽出して回答してください。適当な数値を捏造したり、元の配列順に依存したりしてはいけません。
- ただ数字を答えるだけでなく、「〇〇は定価販売率が高いため、製造を〇個増やす攻めの姿勢が良い」「〇〇は値引率や廃棄が多いため、製造を減らすかパックの入数を変えるべき」といった惣菜業特有の具体的かつ実践的な「増減産アドバイス」や「傾向と対策」を必ず添えてください。
- ユーザーの質問に対して、簡潔に、要点のみをストレートに回答してください。長文は避けてください。
- 現場の店長がすぐに行動できるよう、わかりやすいトーンで回答してください。
- 挨拶などは不要です。結論から簡潔に述べてください。
`,
});

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { text } = await chatPrompt({
      ...input,
    }, {
      model: 'googleai/gemini-2.5-flash',
      config: {
        temperature: 0.2 // Lower temp for more analytical and precise sorting
      }
    });
    if (!text) throw new Error('AI failed to generate chat response');
    return text;
  }
);

export async function askAiChat(input: ChatInput): Promise<{ success: true; text: string } | { success: false; error: string }> {
  try {
    const text = await chatFlow(input);
    return { success: true, text };
  } catch (error: any) {
    console.error("CHAT FLOW ERROR:", error);
    return { success: false, error: error?.message || String(error) };
  }
}
