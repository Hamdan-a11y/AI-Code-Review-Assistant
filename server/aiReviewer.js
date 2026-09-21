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
- "originalCode": The EXACT string/line from the input code containing the flaw. Must be an exact match so it can be found and replaced.
- "fixedCode": The EXACT corrected, production-ready replacement code snippet.
- IMPORTANT: If the input is NOT actual programming code (e.g. arbitrary English text, notes, empty-looking content, or prose), do NOT return an empty list. Return a single Critical issue: {"type": "Invalid Source Code", "severity": "Critical", "line": 1, "explanation": "The content does not contain valid source code. Please upload or write code.", "originalCode": "", "fixedCode": ""}

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
    "explanation": "Brief explanation of the vulnerability or flaw.",
    "originalCode": "exact flawed line from the code",
    "fixedCode": "exact corrected replacement line"
  }
]
`;

  try {
    console.log('⚡ Sending code to Gemini 3.5 Flash Lite for high-speed audit with Auto-Fix...');
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 1200,
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
