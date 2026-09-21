export function scanCode(code) {
  const issues = [];
  
  if (!code) {
    return issues;
  }

  // Split code into individual lines
  const lines = code.split('\n');

  // Loop through each line with its index (0-based)
  lines.forEach((lineText, index) => {
    const lineNumber = index + 1; // Human line numbers start at 1

        // Rule 1: Dangerous eval() check
    if (lineText.includes('eval(')) {
      issues.push({
        type: 'Dangerous Function',
        severity: 'Critical',
        line: lineNumber,
        explanation: 'Avoid using eval(). It executes arbitrary code and introduces severe security vulnerabilities.'
      });
    }

    // Rule 2: Hardcoded Secret / API Key check
    const secretPattern = /(api[_-]?key|secret|token|password)\s*[:=]\s*['"`][A-Za-z0-9_\-]{8,}['"`]/i;
    if (secretPattern.test(lineText)) {
      issues.push({
        type: 'Hardcoded Secret',
        severity: 'Critical',
        line: lineNumber,
        explanation: 'Potential hardcoded secret or API key detected. Store sensitive credentials in environment variables.'
      });
    }

    // Rule 3: Empty catch block check
    const sameLineEmptyCatch = /catch\s*(\([^)]*\))?\s*\{\s*\}/;
    const isCatchStart = /catch\s*(\([^)]*\))?\s*\{/.test(lineText);
    const nextLineIsCloseBrace = lines[index + 1] && lines[index + 1].trim() === '}';

    if (sameLineEmptyCatch.test(lineText) || (isCatchStart && nextLineIsCloseBrace)) {
      issues.push({
        type: 'Empty Catch Block',
        severity: 'Warning',
        line: lineNumber,
        explanation: 'Empty catch block detected. Swallowing errors without logging or handling makes debugging difficult.'
      });
    }

    // Rule 4: SQL string concatenation / template literal check
    const hasSqlKeywords = /(SELECT\s+.*FROM|INSERT\s+INTO|UPDATE\s+.*SET|DELETE\s+FROM)/i.test(lineText);
    const hasConcatenation = lineText.includes('+') || /\$\{[^}]+\}/.test(lineText);

    if (hasSqlKeywords && hasConcatenation) {
      issues.push({
        type: 'SQL Injection Risk',
        severity: 'Critical',
        line: lineNumber,
        explanation: 'Potential SQL injection risk. Avoid building SQL queries with string concatenation or template literals; use parameterized queries instead.'
      });
    }


  });

  return issues;
}
