export function scanCode(code, fileName = '') {
  const issues = [];
  
  if (!code) {
    return issues;
  }

  const lines = code.split('\n');

  lines.forEach((lineText, index) => {
    const lineNumber = index + 1;

    // =========================================================
    // 1. Universal: Hardcoded API Secrets, Tokens & Private Keys
    // =========================================================
    const secretPattern = /(api[_-]?key|secret|token|password|auth|jwt|private[_-]?key)\s*[:=]\s*['"`][A-Za-z0-9_\-]{8,}['"`]/i;
    const cloudKeyPattern = /(sk_live_[0-9a-zA-Z]{24,}|AKIA[0-9A-Z]{16}|ghp_[0-9a-zA-Z]{36}|AIza[0-9A-Za-z-_]{35})/;
    if (cloudKeyPattern.test(lineText) || secretPattern.test(lineText)) {
      issues.push({
        type: 'Hardcoded Secret / Token',
        category: 'Security Loophole',
        severity: 'Critical',
        line: lineNumber,
        explanation: 'Hardcoded credentials or API keys detected. Secrets must be loaded from environment variables.',
        originalCode: lineText,
        fixedCode: lineText.replace(/['"`][A-Za-z0-9_\-]{8,}['"`]/, 'process.env.API_SECRET_KEY')
      });
    }

    // =========================================================
    // 2. C / C++: Dangerous Memory & Buffer Functions (CWE-120)
    // =========================================================
    if (/\b(strcpy|strcat|gets|sprintf)\s*\(/.test(lineText)) {
      const match = lineText.match(/\b(strcpy|strcat|gets|sprintf)\b/)?.[0] || 'strcpy';
      issues.push({
        type: 'Buffer Overflow Risk (CWE-120)',
        category: 'Memory Hazard',
        severity: 'Critical',
        line: lineNumber,
        explanation: `Using unsafe '${match}()' causes dangerous buffer overflows. Use bounded alternatives like strncpy, snprintf, or std::string.`,
        originalCode: lineText,
        fixedCode: lineText.replace(/strcpy\(([^,]+),\s*([^)]+)\)/, 'strncpy($1, $2, sizeof($1) - 1); $1[sizeof($1) - 1] = \'\\0\'')
      });
    }

    // =========================================================
    // 3. Python: Insecure Deserialization & Command Injection
    // =========================================================
    if (/\bpickle\.(loads?|load)\s*\(/.test(lineText)) {
      issues.push({
        type: 'Insecure Deserialization (CWE-502)',
        category: 'Security Loophole',
        severity: 'Critical',
        line: lineNumber,
        explanation: 'pickle is vulnerable to arbitrary code execution when unpacking untrusted data. Use json or protobuf instead.',
        originalCode: lineText,
        fixedCode: lineText.replace(/pickle\.(loads?)\(([^)]+)\)/, 'json.loads($2)')
      });
    }

    if (/\bos\.system\s*\(/.test(lineText) || (/\bsubprocess\.(call|Popen|run)\s*\(/.test(lineText) && /shell\s*=\s*True/i.test(lineText))) {
      issues.push({
        type: 'Command Injection (CWE-78)',
        category: 'Security Loophole',
        severity: 'Critical',
        line: lineNumber,
        explanation: 'Executing system commands with string concatenation allows attacker shell injection. Use subprocess without shell=True.',
        originalCode: lineText,
        fixedCode: lineText.replace(/os\.system\(([^)]+)\)/, 'subprocess.run([$1], check=True)')
      });
    }

    if (/except\s*:\s*pass\b|except\s+Exception\s*:\s*pass\b/.test(lineText)) {
      issues.push({
        type: 'Silent Error Suppression',
        category: 'Dirty Code',
        severity: 'Warning',
        line: lineNumber,
        explanation: 'Silently swallowing all exceptions with "except: pass" obscures fatal crashes and debugging.',
        originalCode: lineText,
        fixedCode: 'except Exception as err:\n        logging.error(f"Operation failed: {err}")'
      });
    }

    // =========================================================
    // 4. Java / C#: Command Execution & Unsafe Deserialization
    // =========================================================
    if (/Runtime\.getRuntime\(\)\.exec\(|ProcessBuilder\s*\(/.test(lineText)) {
      issues.push({
        type: 'Command Injection Risk',
        category: 'Security Loophole',
        severity: 'Critical',
        line: lineNumber,
        explanation: 'Direct runtime command execution allows attackers to spawn arbitrary sub-processes.',
        originalCode: lineText,
        fixedCode: '// Sanitize parameters or use safe API wrappers instead of direct process execution'
      });
    }

    if (/BinaryFormatter\b.*\.Deserialize\(/.test(lineText)) {
      issues.push({
        type: 'Insecure .NET Deserialization',
        category: 'Security Loophole',
        severity: 'Critical',
        line: lineNumber,
        explanation: 'BinaryFormatter is inherently dangerous and can lead to remote code execution. Use System.Text.Json.',
        originalCode: lineText,
        fixedCode: lineText.replace(/BinaryFormatter.*Deserialize\(([^)]+)\)/, 'JsonSerializer.Deserialize<T>($1)')
      });
    }

    // =========================================================
    // 5. JavaScript / TypeScript & Modern Frameworks
    // =========================================================
    if (/\beval\s*\(/.test(lineText) || /new\s+Function\s*\(/.test(lineText)) {
      issues.push({
        type: 'Remote Code Execution Risk',
        category: 'Security Loophole',
        severity: 'Critical',
        line: lineNumber,
        explanation: 'Using eval() or new Function() allows arbitrary JavaScript execution and severe XSS.',
        originalCode: lineText,
        fixedCode: lineText.replace(/eval\(([^)]+)\)/, 'JSON.parse($1) /* Replaced eval with safe parser */')
      });
    }

    if (/dangerouslySetInnerHTML\s*=/.test(lineText) || /\.innerHTML\s*=/.test(lineText)) {
      issues.push({
        type: 'Cross-Site Scripting (XSS)',
        category: 'Security Loophole',
        severity: 'Critical',
        line: lineNumber,
        explanation: 'Injecting raw HTML without sanitization directly leads to stored or reflected XSS vulnerabilities.',
        originalCode: lineText,
        fixedCode: lineText.replace(/dangerouslySetInnerHTML=\{\s*\{\s*__html:\s*([^}]+)\s*\}\s*\}/, 'children={DOMPurify.sanitize($1)}')
      });
    }

    // Rule: Empty catch block in JS/TS/Java/C#
    const sameLineEmptyCatch = /catch\s*(\([^)]*\))?\s*\{\s*\}/;
    const isCatchStart = /catch\s*(\([^)]*\))?\s*\{/.test(lineText);
    const nextLineIsCloseBrace = lines[index + 1] && lines[index + 1].trim() === '}';

    if (sameLineEmptyCatch.test(lineText)) {
      issues.push({
        type: 'Empty Catch Block (Dirty Code)',
        category: 'Dirty Code',
        severity: 'Warning',
        line: lineNumber,
        explanation: 'Empty catch block detected. Swallowing exceptions without logging obscures crashes.',
        originalCode: lineText,
        fixedCode: lineText.replace(/catch\s*(\([^)]*\))?\s*\{\s*\}/, 'catch (err) { console.error("Unhandled error:", err); }')
      });
    } else if (isCatchStart && nextLineIsCloseBrace) {
      issues.push({
        type: 'Empty Catch Block (Dirty Code)',
        category: 'Dirty Code',
        severity: 'Warning',
        line: lineNumber,
        explanation: 'Empty catch block detected. Swallowing exceptions without logging obscures crashes.',
        originalCode: `${lineText}\n${lines[index + 1]}`,
        fixedCode: `  } catch (err) {\n    console.error("Operation failed:", err);\n  }`
      });
    }

    // Rule: Raw SQL query concatenation
    const hasSqlKeywords = /(SELECT\s+.*FROM|INSERT\s+INTO|UPDATE\s+.*SET|DELETE\s+FROM)/i.test(lineText);
    const hasConcatenation = lineText.includes('+') || /\$\{[^}]+\}/.test(lineText);

    if (hasSqlKeywords && hasConcatenation) {
      issues.push({
        type: 'SQL Injection Risk (CWE-89)',
        category: 'Security Loophole',
        severity: 'Critical',
        line: lineNumber,
        explanation: 'SQL query built with direct string concatenation. Use parameterized queries or bound ORM parameters.',
        originalCode: lineText,
        fixedCode: '  // Use parameterized query with placeholder variables ($1, $2, ?)\n  const query = "SELECT * FROM records WHERE id = $1";'
      });
    }
  });

  return issues;
}
