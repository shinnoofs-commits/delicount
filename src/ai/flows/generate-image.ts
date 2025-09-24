'use server';
/**
 * @fileOverview Generates an image from a text prompt.
 *
 * - generateImage - A function that generates an image.
 * - GenerateImageInput - The input type for the generateImage function.
 * - GenerateImageOutput - The return type for the generateImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('A text description of the image to generate.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated image.'),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}

// This flow is a temporary workaround to avoid billing errors with Imagen.
// It generates a placeholder image from picsum.photos based on the prompt.
const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
    // Create a seed from the prompt to get a consistent image for the same prompt
    const seed = input.prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const imageUrl = `https://picsum.photos/seed/${seed}/400/400`;
    
    // Although picsum.photos returns a redirect to an image, 
    // many clients (including browsers) can handle this directly in an <img> src.
    // For a more robust solution, you might fetch the image and convert it to a data URI,
    // but this is simpler and avoids server-side fetching.
    return { imageUrl };
  }
);
