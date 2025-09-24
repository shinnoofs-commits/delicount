'use server';
/**
 * @fileOverview Generates an optimal stock level threshold for a product based on historical sales data and trends.
 *
 * - generateStockLevelThreshold - A function that calculates the stock level threshold.
 * - GenerateStockLevelThresholdInput - The input type for the generateStockLevelThreshold function.
 * - GenerateStockLevelThresholdOutput - The return type for the generateStockLevelThreshold function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStockLevelThresholdInputSchema = z.object({
  productId: z.string().describe('The ID of the product to analyze.'),
  historicalSalesData: z.string().describe('Historical sales data for the product in JSON format.'),
  currentStockLevel: z.number().describe('The current stock level of the product.'),
});
export type GenerateStockLevelThresholdInput = z.infer<typeof GenerateStockLevelThresholdInputSchema>;

const GenerateStockLevelThresholdOutputSchema = z.object({
  optimalThreshold: z.number().describe('The calculated optimal stock level threshold for the product.'),
  reasoning: z.string().describe('The reasoning behind the calculated threshold.'),
});
export type GenerateStockLevelThresholdOutput = z.infer<typeof GenerateStockLevelThresholdOutputSchema>;

export async function generateStockLevelThreshold(input: GenerateStockLevelThresholdInput): Promise<GenerateStockLevelThresholdOutput> {
  return generateStockLevelThresholdFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStockLevelThresholdPrompt',
  input: {schema: GenerateStockLevelThresholdInputSchema},
  output: {schema: GenerateStockLevelThresholdOutputSchema},
  prompt: `You are an expert inventory management consultant. Analyze the historical sales data and current stock level for the given product to determine the optimal stock level threshold. Provide a threshold that minimizes stockouts and reduces holding costs.

Product ID: {{{productId}}}
Historical Sales Data: {{{historicalSalesData}}}
Current Stock Level: {{{currentStockLevel}}}

Consider sales trends, lead times, and potential demand fluctuations. Explain your reasoning.
`,
});

const generateStockLevelThresholdFlow = ai.defineFlow(
  {
    name: 'generateStockLevelThresholdFlow',
    inputSchema: GenerateStockLevelThresholdInputSchema,
    outputSchema: GenerateStockLevelThresholdOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
