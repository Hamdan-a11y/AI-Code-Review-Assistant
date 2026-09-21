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
  const [fileName, setFileName] = useState('input.tsx');
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
    setFileName('input.tsx');
    setUploadedFiles([]);
    setIssues([]);
    setHasScanned(false);
    setErrorMessage('');
  };

  const handleClear = () => {
    setCode('');
    setUploadedFiles([]);
    setIssues([]);
    setHasScanned(false);
    setErrorMessage('');
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Single file upload handler
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCode(event.target.result || '');
      setFileName(file.name);
      setUploadedFiles([]);
      setIssues([]);
      setHasScanned(false);
      setErrorMessage('');
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
      '.html', '.css', '.sql', '.md', '.txt', '.env'
    ];

    const validFiles = rawFiles.filter((f) => {
      const path = f.webkitRelativePath || f.name;
      if (
        path.includes('node_modules/') ||
        path.includes('.git/') ||
        path.includes('dist/') ||
        path.includes('build/')
      ) {
        return false;
      }
      return codeExtensions.some((ext) => path.toLowerCase().endsWith(ext));
    });

    if (validFiles.length === 0) {
      alert('No supported code files found in the selected folder.');
      e.target.value = '';
      return;
    }

    const readFile = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            name: file.webkitRelativePath || file.name,
            content: event.target.result || '',
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      });
    };

    const loaded = (await Promise.all(validFiles.map(readFile))).filter(Boolean);
    if (loaded.length > 0) {
      setUploadedFiles(loaded);
      setFileName(loaded[0].name);
      setCode(loaded[0].content);
      setIssues([]);
      setHasScanned(false);
      setErrorMessage('');
    }
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
    if (!code.trim() || isLoading) return;
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
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      setIssues(data.issues || []);
      setHasScanned(true);

    } catch (error) {
      console.error('Scan error:', error);
      setErrorMessage('Connection failed. Ensure your backend server is active on port 5000.');
      setHasScanned(false);
    } finally {
      setIsLoading(false);
    }
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
  const lineCount = code ? code.split('\n').length : 1;
  const criticalCount = issues.filter(i => i.severity?.toLowerCase() === 'critical').length;
  const warningCount = issues.filter(i => i.severity?.toLowerCase() === 'warning').length;
  const fileExt = (fileName.split('.').pop() || 'ts').slice(0, 4);

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
                <span className="file-name">{fileName}</span>
              )}
              <span className="file-metrics">{lineCount} lines</span>
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
              onChange={(e) => setCode(e.target.value)}
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
            {/* Connection Error */}
            {errorMessage && (
              <div className="error-banner">
                <div className="banner-title">Connection Error</div>
                <div className="banner-msg">{errorMessage}</div>
              </div>
            )}

            {/* Idle State */}
            {!hasScanned && !isLoading && (
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

            {/* Clean State */}
            {hasScanned && !isLoading && issues.length === 0 && (
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
                    <div key={idx} className={`issue-row ${isCrit ? 'issue-critical' : 'issue-warning'}`}>
                      <div className="issue-meta-row">
                        <div className="issue-tags">
                          <span className={`tag-badge ${isCrit ? 'tag-critical' : 'tag-warning'}`}>
                            {severity}
                          </span>
                          <span className="tag-line">Line {issue.line || 1}</span>
                        </div>
                      </div>

                      <div className="issue-headline">{issue.type}</div>
                      <div className="issue-details">{issue.explanation}</div>
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
