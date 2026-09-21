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
    return [];
  }

  const detectedLang = detectLanguage(fileName, code);
  const specificRules = languageGuidelines[detectedLang] || 'Focus on critical security loopholes, command/SQL injection, and memory safety.';

  const prompt = `You are a Principal Application Security Engineer.
Audit this ${detectedLang} code for critical security loopholes, memory unsafety, and "vibe-coded" dirty code.

RULES FOR ${detectedLang}:
- ${specificRules}
- Universal Vibe-Coded Traps: Hardcoded API keys/passwords, silent exception suppression (except: pass, catch(e){}), SQLi/Command Injection, and XSS.
- "originalCode": EXACT verbatim substring from the code to replace (must match whitespace).
- "fixedCode": EXACT corrected production drop-in replacement snippet.
- "line": Accurate 1-based line number.
- "explanation": Max 2 concise sentences explaining the risk.

Code (${fileName || 'snippet'}):
\`\`\`
${code}
\`\`\`

Respond ONLY with a JSON array:
[
  {
    "type": "Issue Name",
    "category": "Security Loophole" | "Memory Hazard" | "Dirty Code" | "AI Hallucination",
    "severity": "Critical" | "Warning",
    "line": 1,
    "explanation": "Brief explanation",
    "originalCode": "exact line from code",
    "fixedCode": "exact corrected replacement"
  }
]`;

  try {
    const t0 = Date.now();
    console.log(`⚡ Auditing ${detectedLang} with Gemini 3.5 Flash Lite...`);
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
    console.log(`✨ Completed audit in ${Date.now() - t0}ms: found ${aiIssues.length} issues in ${detectedLang}`);
    return Array.isArray(aiIssues) ? aiIssues : [];
  } catch (error) {
    console.error('Gemini AI review error:', error.message || error);
    return [];
  }
}
