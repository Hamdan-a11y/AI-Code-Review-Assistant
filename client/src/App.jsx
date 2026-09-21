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
    setIssues([]);
    setHasScanned(false);
    setErrorMessage('');
  };

  const handleClear = () => {
    setCode('');
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

  // Metrics
  const lineCount = code ? code.split('\n').length : 1;
  const criticalCount = issues.filter(i => i.severity?.toLowerCase() === 'critical').length;
  const warningCount = issues.filter(i => i.severity?.toLowerCase() === 'warning').length;

  const filteredIssues = issues.filter(issue => {
    if (activeFilter === 'CRITICAL') return issue.severity?.toLowerCase() === 'critical';
    if (activeFilter === 'WARNING') return issue.severity?.toLowerCase() === 'warning';
    return true;
  });

  return (
    <div className="workbench">
      {/* Top Application Bar (Minimal & Functional) */}
      <header className="workbench-header">
        <div className="header-left">
          <span className="app-title">vibecheck</span>
        </div>
      </header>

      {/* Main Split Workbench (Editor Left, Diagnostics Right) */}
      <main className="workbench-grid">
        {/* LEFT: Code Input & Editor */}
        <section className="pane pane-editor">
          <div className="pane-header">
            <div className="file-info">
              <span className="file-icon">ts</span>
              <span className="file-name">input.tsx</span>
              <span className="file-metrics">{lineCount} lines</span>
            </div>

            <div className="pane-actions">
              <button 
                type="button" 
                className="subtle-btn" 
                onClick={handleLoadSample}
                title="Load sample"
              >
                Sample
              </button>
              <button 
                type="button" 
                className="subtle-btn" 
                onClick={handleClear}
                disabled={!code && issues.length === 0}
                title="Clear"
              >
                Clear
              </button>
              <button 
                type="button" 
                className="subtle-btn" 
                onClick={handleCopy}
                disabled={!code}
                title="Copy"
              >
                {copied ? 'Copied' : 'Copy'}
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
              placeholder="// Paste TypeScript or JavaScript here..."
              spellCheck="false"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={handleScroll}
            />
          </div>

          <div className="pane-footer">
            <div />

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

            {/* Idle State: No code scanned yet */}
            {!hasScanned && !isLoading && (
              <div className="empty-state">
                <div className="empty-title">No issues to display</div>
                <div className="empty-body">Press <kbd>⌘↵</kbd> to run audit.</div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="scanning-state">
                <div className="fast-spinner large" />
                <div className="scanning-title">Auditing code...</div>
              </div>
            )}

            {/* Clean State */}
            {hasScanned && !isLoading && issues.length === 0 && (
              <div className="clean-state">
                <div className="clean-title">No issues identified</div>
                <div className="clean-body">Passed all security and logic checks.</div>
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
