
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
});

export type WasteInsightsInput = z.infer<typeof WasteInsightsInputSchema>;

const WasteInsightsOutputSchema = z.object({
  insights: z.array(z.object({
    type: z.enum(['waste_reduction', 'opportunity_loss', 'weather_pattern']),
    title: z.string().describe('A concise title for the insight'),
    description: z.string().describe('Detailed explanation of the findings'),
    impact: z.string().describe('Estimated financial or operational impact (e.g., "¥5,000 / week")'),
    action: z.string().describe('Recommended action to take'),
  })),
  summary: z.string().describe('A brief overall summary of the store status'),
});

export type WasteInsightsOutput = z.infer<typeof WasteInsightsOutputSchema>;

const wasteInsightsPrompt = ai.definePrompt({
  name: 'wasteInsightsPrompt',
  input: { schema: WasteInsightsInputSchema },
  output: { schema: WasteInsightsOutputSchema },
  prompt: `あなたは小売店の運営コンサルタントです。
提供された廃棄データと天気を分析し、利益を最大化するための具体的な改善提案を行ってください。

特に以下の点に注目してください：
1. 特定の天気（例：雨の日）における過剰製造の傾向
2. 機会損失（売れ残り）を減らすための具体的な製造数の増減率（例：〇〇を20%減らす）

分析対象データ:
{{{summaryData}}}

店舗名: {{{storeName}}}

日本語で、現場の店長がすぐに実行できるようなアドバイスを出力してください。`,
});

const wasteInsightsFlow = ai.defineFlow(
  {
    name: 'wasteInsightsFlow',
    inputSchema: WasteInsightsInputSchema,
    outputSchema: WasteInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await wasteInsightsPrompt(input);
    if (!output) throw new Error('AI failed to generate insights');
    return output;
  }
);

export async function getWasteInsights(input: WasteInsightsInput): Promise<WasteInsightsOutput> {
  return wasteInsightsFlow(input);
}
