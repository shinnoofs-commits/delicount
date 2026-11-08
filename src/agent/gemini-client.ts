/**
 * @fileOverview Native Gemini Client for S-Count Agent
 * Windows Node.js環境で最も高速・高安定な gemini-flash-lite-latest を呼び出します。
 */

import * as https from 'https';
import * as dotenv from 'dotenv';
dotenv.config();

export interface GeminiContent {
  role: 'user' | 'model' | 'system';
  parts: any[];
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        functionCall?: {
          name: string;
          args: any;
        };
      }>;
    };
  }>;
  error?: any;
}

export async function callGemini(
  contents: GeminiContent[],
  tools?: any[],
  systemInstruction?: string
): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables.');
  }

  const model = 'gemini-flash-lite-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody: any = {
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  if (tools && tools.length > 0) {
    requestBody.tools = tools;
  }

  const postData = JSON.stringify(requestBody);

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 20000,
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(responseData);
              resolve(parsed);
            } catch (err) {
              reject(new Error(`Failed to parse response: ${responseData}`));
            }
          } else {
            reject(new Error(`Gemini API error [${res.statusCode}]: ${responseData}`));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini API request timed out after 20s'));
    });

    req.write(postData);
    req.end();
  });
}
