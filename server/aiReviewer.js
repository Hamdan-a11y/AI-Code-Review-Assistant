import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

export async function reviewCodeWithAI(code) {
  dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.log('Gemini skipped: No valid API key found in .env');
    return [];
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
Inspect this JavaScript/TypeScript code for critical security vulnerabilities, fatal logic bugs, and unhandled errors.

RULES:
- No duplicate issues for the same line.
- Accurate 1-based line numbers.
- Max 1-2 sentence concise explanations.

Code:
\`\`\`javascript
${code}
\`\`\`

Respond ONLY with a valid JSON array of objects:
[
  {
    "type": "Issue Name",
    "severity": "Critical" | "Warning" | "Info",
    "line": 1,
    "explanation": "Brief description and fix."
  }
]
`;

  try {
    console.log('⚡ Sending code to Gemini 3.5 Flash Lite for high-speed audit...');
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 600,
      }
    });

    const text = response.text;
    const aiIssues = JSON.parse(text);
    console.log(`✨ Gemini AI review completed: found ${aiIssues.length} unique issues`);
    return Array.isArray(aiIssues) ? aiIssues : [];
  } catch (error) {
    console.error('Gemini AI review error:', error.message || error);
    return [];
  }
}
