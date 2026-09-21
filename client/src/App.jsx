import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [code, setCode] = useState('');
  const [issues, setIssues] = useState([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [copied, setCopied] = useState(false);

  // File and folder upload state
  const [fileName, setFileName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  const sampleSnippet = `// Production checkout handler snippet
const stripeSecretKey = "sk_live_9847291048572019482";

async function processPayment(cart, user) {
  // Execute dynamically calculated payment discount
  const discountCalculation = eval(cart.discountFormula);

  try {
    const charge = await stripe.charges.create({
      amount: cart.total - discountCalculation,
      currency: "usd",
      customer: user.stripeId
    });
  } catch (err) {
    // Silent catch
  }

  // Raw query risk
  const logQuery = "INSERT INTO audit_logs (userId, total) VALUES ('" + user.id + "', " + cart.total + ")";
  await db.query(logQuery);
}
`;

  const handleLoadSample = () => {
    setCode(sampleSnippet);
    setFileName('sample.ts');
    setUploadedFiles([]);
    setIssues([]);
    setHasScanned(false);
    setErrorMessage('');
  };

  const handleClear = () => {
    setCode('');
    setFileName('');
    setUploadedFiles([]);
    setIssues([]);
    setHasScanned(false);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Single file upload handler with robust validation
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Check for empty file
    if (file.size === 0) {
      setErrorMessage(`The file "${file.name}" is completely empty (0 bytes). Please select a file with code.`);
      setFileName('');
      setCode('');
      setUploadedFiles([]);
      setIssues([]);
      setHasScanned(false);
      e.target.value = '';
      return;
    }

    // 2. Validate supported code extensions
    const supportedExts = [
      '.js', '.jsx', '.ts', '.tsx', '.json', '.py', '.java', 
      '.c', '.cpp', '.cs', '.go', '.rs', '.php', '.rb', 
      '.html', '.css', '.sql', '.vue', '.svelte', '.sh', 
      '.yaml', '.yml', '.md', '.txt', '.env'
    ];
    const isSupported = supportedExts.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!isSupported) {
      setErrorMessage(`"${file.name}" has an unsupported format. Please upload a source code file (.js, .ts, .py, etc.).`);
      setFileName('');
      setCode('');
      setUploadedFiles([]);
      setIssues([]);
      setHasScanned(false);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result || '';

      // 3. Reject binary/compiled files
      if (content.includes('\0')) {
        setErrorMessage(`"${file.name}" appears to be a compiled or binary file and cannot be audited as text code.`);
        setFileName('');
        setCode('');
        setUploadedFiles([]);
        setIssues([]);
        setHasScanned(false);
        return;
      }

      // 4. Reject whitespace-only files
      if (!content.trim()) {
        setErrorMessage(`The file "${file.name}" contains only empty whitespace with no code.`);
        setFileName('');
        setCode('');
        setUploadedFiles([]);
        setIssues([]);
        setHasScanned(false);
        return;
      }

      setCode(content);
      setFileName(file.name);
      setUploadedFiles([]);
      setIssues([]);
      setHasScanned(false);
      setErrorMessage('');
    };

    reader.onerror = () => {
      setErrorMessage(`Failed to read file "${file.name}".`);
      setFileName('');
      setHasScanned(false);
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  // Folder upload handler (filters for code files & ignores node_modules, git, etc.)
  const handleFolderUpload = async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.json', '.py', '.java', 
      '.c', '.cpp', '.cs', '.go', '.rs', '.php', '.rb', 
      '.html', '.css', '.sql', '.vue', '.svelte', '.sh', 
      '.yaml', '.yml', '.md', '.txt', '.env'
    ];

    const validFiles = rawFiles.filter((f) => {
      const path = f.webkitRelativePath || f.name;
      if (
        path.includes('node_modules/') ||
        path.includes('.git/') ||
        path.includes('dist/') ||
        path.includes('build/') ||
        path.includes('.next/') ||
        f.size === 0
      ) {
        return false;
      }
      return codeExtensions.some((ext) => path.toLowerCase().endsWith(ext));
    });

    if (validFiles.length === 0) {
      setErrorMessage('No valid, non-empty source code files found in the selected folder.');
      setHasScanned(false);
      setIssues([]);
      e.target.value = '';
      return;
    }

    const readFile = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target.result || '';
          if (content.includes('\0') || !content.trim()) {
            resolve(null);
            return;
          }
          resolve({
            name: file.webkitRelativePath || file.name,
            content,
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      });
    };

    const loaded = (await Promise.all(validFiles.map(readFile))).filter(Boolean);
    if (loaded.length === 0) {
      setErrorMessage('All code files in the selected folder are empty or non-text binaries.');
      setHasScanned(false);
      setIssues([]);
      e.target.value = '';
      return;
    }

    setUploadedFiles(loaded);
    setFileName(loaded[0].name);
    setCode(loaded[0].content);
    setIssues([]);
    setHasScanned(false);
    setErrorMessage('');
    e.target.value = '';
  };

  // Switch between files loaded from folder
  const handleSelectFile = (selectedName) => {
    const found = uploadedFiles.find((f) => f.name === selectedName);
    if (found) {
      setFileName(found.name);
      setCode(found.content);
      setIssues([]);
      setHasScanned(false);
      setErrorMessage('');
    }
  };

  const handleScan = async () => {
    if (isLoading) return;

    // 1. Check if empty
    if (!code || !code.trim()) {
      setErrorMessage('The editor is empty. Please enter or upload code to audit.');
      setHasScanned(false);
      setIssues([]);
      return;
    }

    // 2. Check if only comments or trivial whitespace
    const stripped = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').trim();
    if (stripped.length < 5) {
      setErrorMessage('No executable code detected. The editor contains only comments or empty whitespace.');
      setHasScanned(false);
      setIssues([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || errData?.error || `Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      setIssues(data.issues || []);
      setHasScanned(true);

    } catch (error) {
      console.error('Scan error:', error);
      setErrorMessage(error.message || 'Connection failed. Ensure your backend server is active on port 5000.');
      setHasScanned(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click AI Auto-Fix handler
  const handleApplyFix = (targetIssue) => {
    if (!targetIssue || !targetIssue.fixedCode) return;

    let updatedCode = code;
    const { originalCode, fixedCode, line } = targetIssue;

    // 1. Exact substring replacement
    if (originalCode && updatedCode.includes(originalCode)) {
      updatedCode = updatedCode.replace(originalCode, fixedCode);
    } else if (originalCode && updatedCode.includes(originalCode.trim())) {
      // 2. Trimmed substring replacement
      updatedCode = updatedCode.replace(originalCode.trim(), fixedCode.trim());
    } else if (line && line > 0) {
      // 3. Line-based replacement fallback
      const lines = updatedCode.split('\n');
      const lineIndex = line - 1;
      if (lineIndex < lines.length) {
        lines[lineIndex] = fixedCode;
        updatedCode = lines.join('\n');
      }
    }

    setCode(updatedCode);

    // Mark issue as applied
    setIssues((prev) =>
      prev.map((iss) => (iss === targetIssue ? { ...iss, applied: true } : iss))
    );
  };

  // Keyboard shortcut: Cmd/Ctrl + Enter to trigger review
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleScan();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, isLoading]);

  // Sync line numbers scroll with textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Metrics & File Info
  const lineCount = code.trim() ? code.split('\n').length : 0;
  const criticalCount = issues.filter(i => i.severity?.toLowerCase() === 'critical').length;
  const warningCount = issues.filter(i => i.severity?.toLowerCase() === 'warning').length;

  const getFileExtension = () => {
    if (fileName && fileName.includes('.')) {
      return fileName.split('.').pop().toLowerCase().slice(0, 4);
    }
    if (code.includes('import ') || code.includes('export ') || code.includes('const ') || code.includes('function ')) {
      return code.includes(': ') || code.includes('interface ') ? 'ts' : 'js';
    }
    if (code.includes('def ') || code.includes('print(')) return 'py';
    return 'code';
  };
  const fileExt = getFileExtension();

  const filteredIssues = issues.filter(issue => {
    if (activeFilter === 'CRITICAL') return issue.severity?.toLowerCase() === 'critical';
    if (activeFilter === 'WARNING') return issue.severity?.toLowerCase() === 'warning';
    return true;
  });

  return (
    <div className="workbench">
      {/* Hidden file & folder inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        accept=".js,.jsx,.ts,.tsx,.json,.py,.java,.c,.cpp,.cs,.go,.rs,.php,.rb,.html,.css,.sql,.txt,.md"
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderUpload}
        style={{ display: 'none' }}
        webkitdirectory=""
        directory=""
        multiple
      />

      {/* Top Application Bar */}
      <header className="workbench-header">
        <div className="header-left">
          <span className="app-title">vibecheck</span>
        </div>
      </header>

      {/* Main Split Workbench */}
      <main className="workbench-grid">
        {/* LEFT: Code Input & Editor */}
        <section className="pane pane-editor">
          <div className="pane-header">
            <div className="file-info">
              {code.trim() || fileName ? (
                <>
                  <span className="file-icon">{fileExt}</span>
                  {uploadedFiles.length > 1 ? (
                    <select
                      className="file-select"
                      value={fileName}
                      onChange={(e) => handleSelectFile(e.target.value)}
                      title="Select file from uploaded folder"
                    >
                      {uploadedFiles.map((f, i) => (
                        <option key={i} value={f.name}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="file-name">{fileName || 'untitled'}</span>
                  )}
                  <span className="file-metrics">{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
                </>
              ) : (
                <>
                  <span className="file-name" style={{ color: 'var(--text-tertiary)' }}>No file loaded</span>
                  <span className="file-metrics">0 lines</span>
                </>
              )}
            </div>

            <div className="pane-actions">
              <button 
                type="button" 
                className="toolbar-btn" 
                onClick={handleClear}
                disabled={!code && issues.length === 0}
                title="Clear code editor"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
                <span>Clear</span>
              </button>

              <button 
                type="button" 
                className="toolbar-btn" 
                onClick={handleCopy}
                disabled={!code}
                title="Copy code to clipboard"
              >
                {copied ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span style={{ color: '#059669' }}>Copied</span>
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="editor-container">
            {/* Gutter with line numbers */}
            <div className="gutter" ref={lineNumbersRef}>
              {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
                <div key={i} className="gutter-line-number">{i + 1}</div>
              ))}
            </div>

            {/* Input textarea */}
            <textarea
              ref={textareaRef}
              className="code-field"
              placeholder="// Paste code or upload a file / folder to review..."
              spellCheck="false"
              value={code}
              onChange={(e) => {
                const val = e.target.value;
                setCode(val);
                if (!val.trim()) {
                  setFileName('');
                  setUploadedFiles([]);
                  setIssues([]);
                  setHasScanned(false);
                  setErrorMessage('');
                } else if (!fileName) {
                  setFileName('untitled');
                }
              }}
              onScroll={handleScroll}
            />
          </div>

          <div className="pane-footer">
            <div className="footer-actions-left">
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Upload a single code file"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Upload File</span>
              </button>

              <button
                type="button"
                className="toolbar-btn"
                onClick={() => folderInputRef.current?.click()}
                title="Upload an entire folder / codebase"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>Upload Folder</span>
              </button>

              <button 
                type="button" 
                className="toolbar-btn" 
                onClick={handleLoadSample}
                title="Load sample vulnerable code"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <span>Sample Code</span>
              </button>
            </div>

            <div className="footer-actions-right">
              <button
                type="button"
                className="action-btn"
                disabled={!code.trim() || isLoading}
                onClick={handleScan}
              >
                {isLoading ? (
                  <>
                    <span className="fast-spinner" />
                    <span>Auditing...</span>
                  </>
                ) : (
                  <>
                    <span>Audit Code</span>
                    <span className="btn-shortcut">⌘↵</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT: Diagnostics & Review Panel */}
        <section className="pane pane-results">
          <div className="pane-header">
            <div className="results-tabs">
              <button 
                type="button" 
                className={`tab-btn ${activeFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setActiveFilter('ALL')}
              >
                All <span className="tab-count">{issues.length}</span>
              </button>
              <button 
                type="button" 
                className={`tab-btn ${activeFilter === 'CRITICAL' ? 'active' : ''}`}
                onClick={() => setActiveFilter('CRITICAL')}
              >
                Critical <span className="tab-count count-critical">{criticalCount}</span>
              </button>
              <button 
                type="button" 
                className={`tab-btn ${activeFilter === 'WARNING' ? 'active' : ''}`}
                onClick={() => setActiveFilter('WARNING')}
              >
                Warnings <span className="tab-count count-warning">{warningCount}</span>
              </button>
            </div>
          </div>

          <div className="results-scroll-area">
            {/* Error Banner */}
            {errorMessage && (
              <div className="error-banner">
                <div className="banner-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span className="banner-title">Cannot Audit File</span>
                </div>
                <div className="banner-msg">{errorMessage}</div>
              </div>
            )}

            {/* Idle State */}
            {!hasScanned && !isLoading && !errorMessage && (
              <div className="empty-state">
                <div className="empty-title">No issues to display</div>
                <div className="empty-body">Press <kbd>⌘↵</kbd> or click <strong>Audit Code</strong>.</div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="scanning-state">
                <div className="fast-spinner large" />
                <div className="scanning-title">Auditing code with AI...</div>
              </div>
            )}

            {/* Clean State (Only shown when audit was truly performed, has no error, and found 0 issues) */}
            {hasScanned && !isLoading && !errorMessage && issues.length === 0 && (
              <div className="clean-state">
                <div className="clean-title">No issues identified</div>
                <div className="clean-body">Passed all security, syntax, and logic checks.</div>
              </div>
            )}

            {/* Scanned Issues List */}
            {hasScanned && !isLoading && filteredIssues.length > 0 && (
              <div className="issues-list">
                {filteredIssues.map((issue, idx) => {
                  const severity = (issue.severity || 'Warning').toUpperCase();
                  const isCrit = severity === 'CRITICAL';
                  return (
                    <div 
                      key={idx} 
                      className={`issue-row ${isCrit ? 'issue-critical' : 'issue-warning'} ${issue.applied ? 'issue-fixed' : ''}`}
                    >
                      <div className="issue-meta-row">
                        <div className="issue-tags">
                          <span className={`tag-badge ${isCrit ? 'tag-critical' : 'tag-warning'}`}>
                            {severity}
                          </span>
                          <span className="tag-line">Line {issue.line || 1}</span>
                          {issue.applied && (
                            <span className="tag-badge" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                              FIXED
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="issue-headline">{issue.type}</div>
                      <div className="issue-details">{issue.explanation}</div>

                      {issue.fixedCode && (
                        <div className="diff-card">
                          <div className="diff-header">
                            <span className="diff-badge">Suggested Auto-Fix</span>
                            <button
                              type="button"
                              className={`apply-fix-btn ${issue.applied ? 'applied' : ''}`}
                              disabled={issue.applied}
                              onClick={() => handleApplyFix(issue)}
                              title="Apply corrected code directly into the editor"
                            >
                              {issue.applied ? (
                                <>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  <span>Fixed</span>
                                </>
                              ) : (
                                <>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                  </svg>
                                  <span>Apply Fix</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="diff-code-box">
                            {issue.originalCode && (
                              <div className="diff-line diff-remove">
                                <span className="diff-gutter">—</span>
                                <code>{issue.originalCode}</code>
                              </div>
                            )}
                            <div className="diff-line diff-add">
                              <span className="diff-gutter">+</span>
                              <code>{issue.fixedCode}</code>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Filter Empty State */}
            {hasScanned && !isLoading && issues.length > 0 && filteredIssues.length === 0 && (
              <div className="empty-state">
                <div className="empty-title">No {activeFilter.toLowerCase()} issues</div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
