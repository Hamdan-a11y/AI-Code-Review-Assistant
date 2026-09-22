import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

// Language detection utility
export function detectLanguage(fileName = '', code = '') {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  
  const extMap = {
    c: 'C',
    h: 'C/C++ Header',
    cpp: 'C++',
    cc: 'C++',
    cxx: 'C++',
    hpp: 'C++',
    cs: 'C#',
    py: 'Python',
    pyw: 'Python',
    java: 'Java',
    go: 'Go',
    rs: 'Rust',
    php: 'PHP',
    rb: 'Ruby',
    js: 'JavaScript',
    jsx: 'React/JavaScript',
    ts: 'TypeScript',
    tsx: 'React/TypeScript',
    sql: 'SQL',
    sh: 'Bash/Shell',
    vue: 'Vue.js',
    svelte: 'Svelte',
    html: 'HTML',
  };

  if (extMap[ext]) {
    return extMap[ext];
  }

  // Heuristics based on code content
  if (/#include\s*<.*>/.test(code)) {
    return code.includes('std::') || code.includes('cout') || code.includes('class ') ? 'C++' : 'C';
  }
  if (/using\s+System(\..*)?;|namespace\s+\w+/.test(code)) return 'C#';
  if (/public\s+class\s+\w+|import\s+java\./.test(code)) return 'Java';
  if (/def\s+\w+\s*\(.*?\):|import\s+\w+|from\s+\w+\s+import/.test(code)) return 'Python';
  if (/fn\s+main\s*\(|let\s+mut\s+/.test(code)) return 'Rust';
  if (/func\s+(\(\w+\s+\*?\w+\)\s+)?\w+\s*\(|package\s+\w+/.test(code)) return 'Go';
  if (/import\s+React|export\s+default\s+function|interface\s+\w+|:\s*(string|number|boolean)/.test(code)) return 'TypeScript';
  
  return 'JavaScript/Universal Code';
}

// Cached client to reuse persistent HTTP/TLS connection
let cachedAi = null;
function getAi() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') return null;
  if (!cachedAi) {
    cachedAi = new GoogleGenAI({ apiKey });
  }
  return cachedAi;
}

const languageGuidelines = {
  'C': 'Focus on buffer overflows (strcpy, sprintf, gets), memory leaks, uninitialized pointers, missing bounds checks.',
  'C/C++ Header': 'Focus on buffer overflows, header guards, memory safety, unsafe macros.',
  'C++': 'Focus on buffer overflows (strcpy, sprintf, gets), use-after-free, memory leaks, raw pointer misuse, missing bounds checks.',
  'C#': 'Focus on insecure deserialization (BinaryFormatter), raw SQL injection, XXE, unhandled async task exceptions.',
  'Python': 'Focus on insecure deserialization (pickle), command injection (os.system, subprocess shell=True), SQLi, silent except: pass.',
  'Java': 'Focus on Remote Code Execution (Runtime.exec), SQLi (unparameterized Statement), XXE injection, silent exception swallowing.',
  'JavaScript': 'Focus on prototype pollution, DOM XSS (dangerouslySetInnerHTML, innerHTML), exposed API keys, eval(), unhandled promises.',
  'TypeScript': 'Focus on prototype pollution, XSS, unsafe any types obscuring crashes, exposed secrets, eval().',
  'React/JavaScript': 'Focus on DOM XSS (dangerouslySetInnerHTML), exposed frontend API keys, unhandled promise crashes.',
  'React/TypeScript': 'Focus on DOM XSS (dangerouslySetInnerHTML), exposed frontend API keys, unsafe any types, memory leaks.',
  'Go': 'Focus on goroutine leaks, unhandled errors, command injection, path traversal.',
  'Rust': 'Focus on unsafe blocks, memory safety violations, integer overflows.'
};

export async function reviewCodeWithAI(code, fileName = '') {
  const ai = getAi();
  if (!ai) {
    console.log('Gemini skipped: No valid API key found in .env');
    return null; // Return null so index.js knows AI is unavailable and can use fallback
  }

  const detectedLang = detectLanguage(fileName, code);
  const specificRules = languageGuidelines[detectedLang] || 'Focus on critical security loopholes, command/SQL injection, memory safety, and error handling.';

  const prompt = `You are a World-Class Principal Code Review & Security Analysis Engine.
You must perform an EXHAUSTIVE, COMPLETE audit of the provided ${detectedLang} code and catch EVERY vulnerability, security loophole, memory hazard, and vibe-coded defect in a single pass.

EXHAUSTIVE AUDIT RULES:
1. REPORT ALL ISSUES IN PASS 1: Do not stop after finding one or two issues. Scan the entire file from line 1 to the end and report ALL distinct bugs, loopholes, and anti-patterns:
   - Hardcoded secrets, API keys, passwords, private tokens:
     * In backend code: Must be replaced with safe environment variable access (e.g. process.env.API_KEY || "") with NO hardcoded credentials in the fallback string.
     * In frontend client code (React, Vue, JSX, TSX, client JS): Private secrets (e.g. STRIPE_SECRET, AWS keys, database credentials) must never exist in the client bundle. Replace with an explanatory comment (e.g. "// Private secret removed: handle sensitive operations on a secure backend API") or clean deletion ("").
   - Injections: SQL injection (unparameterized query/string concatenation), Command injection (os.system, exec, ProcessBuilder), Path traversal.
   - XSS & Client Leaks: Unsanitized HTML injection (dangerouslySetInnerHTML, innerHTML) - replace with safe element rendering like <div>{content}</div> or sanitized output.
   - Insecure Deserialization: pickle.loads, BinaryFormatter.Deserialize, unsafe yaml/eval.
   - Memory Hazards: Buffer overflows (strcpy, gets, sprintf without bounds), memory leaks, use-after-free, missing bounds checks.
   - Dirty & Vibe Code: Silent exception swallowing (except: pass, catch(e){}), unhandled promise rejections, null dereferences, unreachable code, dead variables.
   - Dependent Usages: If a variable or parameter is modified or removed, ensure any dependent usages in other lines are also fixed so no ReferenceError or crash is introduced.

2. PERFECT DROP-IN FIX ("fixedCode"):
   - "originalCode": Must be the EXACT verbatim substring from the code to replace (including exact indentation and whitespace).
   - "fixedCode": Must be the COMPLETE, clean, production-ready corrected replacement string (or "" if safely deleting).
   - NON-BREAKING: The replacement must resolve the issue cleanly without breaking surrounding lines or leaving orphan references.
   - ZERO RE-FLAG GUARANTEE: The corrected code must be 100% clean and secure. When this code is re-audited after applying the fix, it MUST pass cleanly with 0 issues.

Code (${fileName || 'snippet'}):
\`\`\`
${code}
\`\`\`

If the code has NO issues, vulnerabilities, or bad patterns, return an empty array: []

Otherwise, respond ONLY with a JSON array:
[
  {
    "type": "Precise Issue Title (e.g. Hardcoded Secret, SQL Injection, Buffer Overflow, DOM XSS)",
    "category": "Security Loophole" | "Memory Hazard" | "Dirty Code" | "AI Hallucination",
    "severity": "Critical" | "Warning",
    "line": 1,
    "explanation": "Clear explanation of the exact vulnerability and how the fix resolves it.",
    "originalCode": "exact line(s) from code to replace",
    "fixedCode": "exact production-ready replacement"
  }
]`;

  const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.6-flash'];
  for (const model of candidateModels) {
    try {
      const t0 = Date.now();
      console.log(`⚡ Auditing ${detectedLang} with ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 2048,
        }
      });

      const text = response.text;
      const aiIssues = JSON.parse(text);
      console.log(`✨ Completed audit with ${model} in ${Date.now() - t0}ms: found ${aiIssues.length} issues in ${detectedLang}`);
      return {
        issues: Array.isArray(aiIssues) ? aiIssues : [],
        modelUsed: model === 'gemini-3.6-flash' ? 'Gemini 3.6 Flash' : 'Gemini 3.5 Flash Lite'
      };
    } catch (error) {
      console.warn(`Model ${model} unavailable (${error.message || error}). Trying fallback model...`);
    }
  }

  return null;
}
