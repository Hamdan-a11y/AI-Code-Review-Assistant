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

  // Production-grade Theme State (Defaults to Obsidian Dark Mode with persistence)
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('reviewforge_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    return 'dark'; // Default to elite obsidian dark mode
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('reviewforge_theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // File and folder upload state
  const [fileName, setFileName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Audit History state (MongoDB Atlas)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Multi-Language & Sample Presets state
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [isSampleMenuOpen, setIsSampleMenuOpen] = useState(false);
  const sampleMenuRef = useRef(null);

  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  // Close sample menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sampleMenuRef.current && !sampleMenuRef.current.contains(e.target)) {
        setIsSampleMenuOpen(false);
      }
    };
    if (isSampleMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSampleMenuOpen]);

  // Curated Multi-Language Vibe-Coded Presets
  const samplePresets = [
    {
      id: 'python',
      label: 'Python (FastAPI)',
      sub: 'Command injection & pickle deserialization',
      fileName: 'service.py',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M11.9 2c-5.1 0-4.8 2.2-4.8 2.2l.01 2.3h4.9v.7H5.2S2 6.8 2 12c0 5.1 2.8 5 2.8 5h1.7v-2.4s-.1-2.8 2.8-2.8h4.8s2.7.05 2.7-2.6V4.7S17.1 2 11.9 2zM9.3 3.6a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z" fill="#387eb8"/>
          <path d="M12.1 22c5.1 0 4.8-2.2 4.8-2.2l-.01-2.3h-4.9v-.7h6.8s3.2.4 3.2-4.8c0-5.1-2.8-5-2.8-5h-1.7v2.4s.1 2.8-2.8 2.8H9.9s-2.7-.05-2.7 2.6v4.5s-.3 2.7 4.9 2.7zm2.6-1.6a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8z" fill="#f59e0b"/>
        </svg>
      ),
      code: `import os
import pickle
from fastapi import FastAPI

app = FastAPI()

# Vibe-coded API key hardcoded in source
API_SECRET_KEY = "mock_secret_key_vibe_check_99482"

@app.post("/session/deserialize")
async def load_session(payload: bytes):
    # Critical: Insecure pickle deserialization allows RCE
    data = pickle.loads(payload)
    return data

@app.get("/system/backup")
def run_backup(folder_name: str):
    # Critical: Command injection via shell string formatting
    os.system("tar -czf backup.tar.gz " + folder_name)
    return {"status": "ok"}

def fetch_telemetry():
    try:
        pass
    except:
        # Dirty code: Silent error swallowing
        pass
`
    },
    {
      id: 'c_cpp',
      label: 'C / C++ (Memory)',
      sub: 'Buffer overflow & unsafe memory copying',
      fileName: 'packet_parser.c',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 7.2v9.6L12 22l9-5.2V7.2L12 2z" fill="#00599c"/>
          <path d="M10.5 15.5a3.5 3.5 0 1 1 0-7" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M14 12h3M15.5 10.5v3M18.5 12h3M20 10.5v3" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
      code: `#include <stdio.h>
#include <string.h>
#include <stdlib.h>

void parse_packet(const char *user_payload) {
    char stack_buf[64];
    
    // Critical: Unbounded stack buffer overflow (CWE-120)
    strcpy(stack_buf, user_payload);
    
    printf("Payload processed: %s\\n", stack_buf);
}

int main() {
    char untrusted_input[512];
    // Dangerous legacy input reading
    gets(untrusted_input);
    parse_packet(untrusted_input);
    return 0;
}
`
    },
    {
      id: 'csharp',
      label: 'C# (.NET)',
      sub: 'BinaryFormatter RCE & raw SQL query',
      fileName: 'PaymentWorker.cs',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 7.2v9.6L12 22l9-5.2V7.2L12 2z" fill="#68217a"/>
          <path d="M10.2 15.5a3.5 3.5 0 1 1 0-7" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M15 10v4M17.5 10v4M14 11.2h4.5M14 12.8h4.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
      code: `using System;
using System.IO;
using System.Runtime.Serialization.Formatters.Binary;
using Microsoft.Data.SqlClient;

public class PaymentWorker {
    // Critical: Insecure BinaryFormatter deserialization allows RCE
    public object RestoreSession(byte[] blob) {
        BinaryFormatter formatter = new BinaryFormatter();
        using (MemoryStream ms = new MemoryStream(blob)) {
            return formatter.Deserialize(ms);
        }
    }

    // Critical: SQL injection string concatenation
    public void DeleteAccount(string userId, SqlConnection conn) {
        string query = "DELETE FROM Users WHERE Id = '" + userId + "'";
        SqlCommand cmd = new SqlCommand(query, conn);
        cmd.ExecuteNonQuery();
    }
}
`
    },
    {
      id: 'java',
      label: 'Java (Spring)',
      sub: 'SQL injection & silent exception suppression',
      fileName: 'OrderController.java',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 10h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-6z" fill="#ea580c"/>
          <path d="M16 11h2a2.5 2.5 0 0 1 0 5h-2" stroke="#ea580c" strokeWidth="2" strokeLinecap="round"/>
          <path d="M3 21h14" stroke="#c2410c" strokeWidth="2" strokeLinecap="round"/>
          <path d="M7 4c1 1.5-.5 2.5 .8 4M11 3c1 1.5-.5 2.5 .8 4M15 4c1 1.5-.5 2.5 .8 4" stroke="#0284c7" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      code: `import java.sql.Connection;
import java.sql.Statement;

public class OrderController {
    // Critical: SQL Injection via unparameterized Statement
    public void queryOrder(String orderId, Connection conn) throws Exception {
        String query = "SELECT * FROM orders WHERE id = '" + orderId + "'";
        Statement stmt = conn.createStatement();
        stmt.executeQuery(query);
    }

    // Dirty code: Silent exception suppression obscures runtime bugs
    public void syncOrderCache() {
        try {
            Thread.sleep(100);
        } catch (Exception e) {
            // Silently suppressed
        }
    }
}
`
    },
    {
      id: 'react_ts',
      label: 'React / TypeScript',
      sub: 'Vibe-coded XSS & exposed API key',
      fileName: 'VibeWidget.tsx',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="2.8" fill="#0284c7"/>
          <ellipse cx="12" cy="12" rx="10.5" ry="4.5" stroke="#0284c7" strokeWidth="2"/>
          <ellipse cx="12" cy="12" rx="10.5" ry="4.5" stroke="#0284c7" strokeWidth="2" transform="rotate(60 12 12)"/>
          <ellipse cx="12" cy="12" rx="10.5" ry="4.5" stroke="#0284c7" strokeWidth="2" transform="rotate(120 12 12)"/>
        </svg>
      ),code: `import React from 'react';

export default function VibeWidget({ rawArticleHtml }: { rawArticleHtml: string }) {
  // Critical Vibe-Coded Anti-Pattern: Private secret exposed in client code
  const STRIPE_SECRET = "mock_secret_key_vibe_check_99482";

  return (
    <article className="card">
      <h2>Article Preview</h2>
      {/* Critical: DOM Cross-Site Scripting (XSS) */}
      <div dangerouslySetInnerHTML={{ __html: rawArticleHtml }} />
    </article>
  );
}
`
    }
  ];

  const handleSelectSample = (preset) => {
    setCode(preset.code);
    setFileName(preset.fileName);
    setDetectedLanguage(preset.label.replace(/^.*? /, ''));
    setUploadedFiles([]);
    setIssues([]);
    setHasScanned(false);
    setErrorMessage('');
    setIsSampleMenuOpen(false);
  };

  const handleClear = () => {
    setCode('');
    setFileName('');
    setDetectedLanguage('');
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
        body: JSON.stringify({ code, fileName: fileName || 'untitled' }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || errData?.error || `Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      setIssues(data.issues || []);
      if (data.stats?.language) {
        setDetectedLanguage(data.stats.language);
      }
      setHasScanned(true);
      fetchHistory(); // Refresh audit history from MongoDB

    } catch (error) {
      console.error('Scan error:', error);
      setErrorMessage(error.message || 'Connection failed. Ensure your backend server is active on port 5000.');
      setHasScanned(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch recent audits from MongoDB Atlas
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('http://localhost:5000/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Restore past audit log into editor
  const handleLoadHistoryItem = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/history/${id}`);
      if (res.ok) {
        const log = await res.json();
        setCode(log.code || '');
        setFileName(log.fileName || 'restored.ts');
        setIssues(log.issues || []);
        if (log.stats?.language) {
          setDetectedLanguage(log.stats.language);
        }
        setHasScanned(true);
        setErrorMessage('');
        setIsHistoryOpen(false);
      }
    } catch (err) {
      console.error('Error loading history item:', err);
    }
  };

  // Delete an audit record from MongoDB Atlas
  const handleDeleteHistoryItem = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`http://localhost:5000/api/history/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setHistoryLogs((prev) => prev.filter((item) => item._id !== id));
      }
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const toggleHistory = () => {
    if (!isHistoryOpen) {
      fetchHistory();
    }
    setIsHistoryOpen(!isHistoryOpen);
  };

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  // Helper to cleanly apply or delete code replacements
  const applyReplacement = (sourceCode, originalCode, fixedCode, line) => {
    let updated = (sourceCode || '').replace(/\r\n/g, '\n');
    const normOrig = (originalCode || '').replace(/\r\n/g, '\n');
    const normFixed = (fixedCode ?? '').replace(/\r\n/g, '\n');

    const isDeletion = !normFixed.trim();

    if (isDeletion) {
      // If deleting code, cleanly strip the line including newlines to prevent blank orphan lines
      if (normOrig && updated.includes(normOrig + '\n')) {
        return updated.replace(normOrig + '\n', '');
      }
      if (normOrig && updated.includes('\n' + normOrig)) {
        return updated.replace('\n' + normOrig, '');
      }
      if (normOrig && updated.includes(normOrig)) {
        return updated.replace(normOrig, '');
      }
      if (normOrig && updated.includes(normOrig.trim() + '\n')) {
        return updated.replace(normOrig.trim() + '\n', '');
      }
      if (normOrig && updated.includes(normOrig.trim())) {
        return updated.replace(normOrig.trim(), '');
      }
      if (line && line > 0) {
        const lines = updated.split('\n');
        const idx = line - 1;
        if (idx >= 0 && idx < lines.length) {
          lines.splice(idx, 1);
          return lines.join('\n');
        }
      }
      return updated;
    }

    // Standard replacement
    if (normOrig && updated.includes(normOrig)) {
      return updated.replace(normOrig, normFixed);
    }
    if (normOrig && updated.includes(normOrig.trim())) {
      return updated.replace(normOrig.trim(), normFixed.trim());
    }
    if (line && line > 0) {
      const lines = updated.split('\n');
      const idx = line - 1;
      if (idx >= 0 && idx < lines.length) {
        lines[idx] = normFixed;
        return lines.join('\n');
      }
    }
    return updated;
  };

  // 1-Click AI Auto-Fix handler
  const handleApplyFix = (targetIssue) => {
    if (!targetIssue || typeof targetIssue.fixedCode !== 'string') return;

    const updatedCode = applyReplacement(
      code,
      targetIssue.originalCode,
      targetIssue.fixedCode,
      targetIssue.line
    );

    setCode(updatedCode);

    // Mark issue as applied
    setIssues((prev) =>
      prev.map((iss) => (iss === targetIssue ? { ...iss, applied: true } : iss))
    );
  };

  // 1-Click Apply All Fixes handler
  const handleApplyAllFixes = () => {
    const unapplied = issues.filter((iss) => !iss.applied && typeof iss.fixedCode === 'string');
    if (unapplied.length === 0) return;

    let updatedCode = code;
    // Sort in reverse order of line number so later line shifts do not invalidate earlier lines
    const sorted = [...unapplied].sort((a, b) => (b.line || 0) - (a.line || 0));

    for (const targetIssue of sorted) {
      updatedCode = applyReplacement(
        updatedCode,
        targetIssue.originalCode,
        targetIssue.fixedCode,
        targetIssue.line
      );
    }

    setCode(updatedCode);
    setIssues((prev) => prev.map((iss) => ({ ...iss, applied: true })));
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
  const unappliedFixesCount = issues.filter(i => !i.applied && typeof i.fixedCode === 'string').length;

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
          <span className="app-title">ReviewForge</span>
        </div>

        <div className="header-right">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          <button
            type="button"
            className="history-toggle-btn"
            onClick={toggleHistory}
            title="View past audits from MongoDB Atlas"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>History</span>
            {historyLogs.length > 0 && (
              <span className="history-badge">{historyLogs.length}</span>
            )}
          </button>
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
                  <span className="file-name file-name-muted">untitled</span>
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
                  setDetectedLanguage('');
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>Upload Folder</span>
              </button>

              {/* Multi-Language Sample Code Menu */}
              <div className="sample-menu-container" ref={sampleMenuRef}>
                <button 
                  type="button" 
                  className={`toolbar-btn ${isSampleMenuOpen ? 'active' : ''}`}
                  onClick={() => setIsSampleMenuOpen(!isSampleMenuOpen)}
                  title="Load sample code in Python, C/C++, C#, Java, React"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <span>Sample Presets</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isSampleMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isSampleMenuOpen && (
                  <div className="sample-popover">
                    <div className="sample-popover-header">
                      <span>VULNERABLE SAMPLE PRESETS</span>
                    </div>
                    {samplePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className="sample-item-btn"
                        onClick={() => handleSelectSample(preset)}
                      >
                        <div className="sample-item-header">
                          <span className="sample-item-icon">{preset.icon}</span>
                          <span className="sample-item-title">{preset.label}</span>
                        </div>
                        <div className="sample-item-desc">{preset.sub}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="footer-actions-right">
              <button
                type="button"
                className="action-btn"
                disabled={!code.trim() || isLoading}
                onClick={handleScan}
                title="Audit code (Ctrl + Enter)"
              >
                {isLoading ? (
                  <>
                    <span className="fast-spinner" />
                    <span>Auditing...</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                    <span>Audit Code</span>
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

            {hasScanned && unappliedFixesCount > 0 && (
              <button
                type="button"
                className="fix-all-btn"
                onClick={handleApplyAllFixes}
                title="Apply all suggested fixes automatically in one click"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                </svg>
                <span>Fix All ({unappliedFixesCount})</span>
              </button>
            )}
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
                <div className="empty-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="empty-headline">No issues to display</div>
                <div className="empty-body">
                  Audit your code with <kbd>Ctrl+Enter</kbd> or load a file to begin inspection.
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="scanning-state">
                <div className="fast-spinner large" />
                <div className="scanning-title">Auditing code...</div>
              </div>
            )}

            {/* Clean State (Only shown when audit was truly performed, has no error, and found 0 issues) */}
            {hasScanned && !isLoading && !errorMessage && issues.length === 0 && (
              <div className="clean-state">
                <div className="clean-icon-box">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div className="clean-title">All Checks Passed</div>
                <div className="clean-body">Zero vulnerabilities, security loopholes, or dirty code detected. Code is production-ready.</div>
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
                          {issue.category && (
                            <span className="tag-category">
                              {issue.category}
                            </span>
                          )}
                          {issue.applied && (
                            <span className="tag-badge tag-fixed">
                              FIXED
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="issue-headline">{issue.type}</div>
                      <div className="issue-details">{issue.explanation}</div>

                      {typeof issue.fixedCode === 'string' && (
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
                              <code>
                                {issue.fixedCode.trim() ? issue.fixedCode : '// (Remove line safely)'}
                              </code>
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
                <div className="empty-headline">No {activeFilter.toLowerCase()} issues</div>
                <div className="empty-body">No issues match the selected severity filter.</div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Drawer Backdrop */}
      <div 
        className={`drawer-backdrop ${isHistoryOpen ? 'open' : ''}`}
        onClick={() => setIsHistoryOpen(false)} 
      />

      {/* Slide-over Audit History Drawer */}
      <aside className={`history-drawer ${isHistoryOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Audit History</span>
            <span className="history-badge">{historyLogs.length}</span>
          </div>
          <button 
            type="button" 
            className="drawer-close-btn"
            onClick={() => setIsHistoryOpen(false)}
            title="Close drawer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="drawer-body">
          {isLoadingHistory ? (
            <div className="history-empty-view">
              <span className="fast-spinner" />
              <div className="history-empty-subtitle">Loading history from MongoDB...</div>
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="history-empty-view">
              <div className="empty-illustration small">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="history-empty-title">No Previous Audits</div>
              <div className="history-empty-subtitle">Every review snapshot, vulnerability report, and auto-fix is securely archived to your database.</div>
            </div>
          ) : (
            historyLogs.map((log) => {
              const logExt = (log.fileName?.split('.').pop() || 'ts').slice(0, 4);
              const issueCount = log.issues?.length || 0;
              const dateObj = log.createdAt ? new Date(log.createdAt) : new Date();
              const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

              return (
                <div 
                  key={log._id} 
                  className="history-card"
                  onClick={() => handleLoadHistoryItem(log._id)}
                  title="Click to restore this review"
                >
                  <div className="history-card-header">
                    <div className="history-card-file">
                      <span className="file-icon">{logExt}</span>
                      <span className="file-name" style={{ fontSize: '13px' }}>{log.fileName || 'untitled'}</span>
                    </div>
                    <button
                      type="button"
                      className="history-delete-btn"
                      onClick={(e) => handleDeleteHistoryItem(log._id, e)}
                      title="Delete record from database"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>

                  <div className="history-card-footer">
                    <span>{dateStr} at {timeStr}</span>
                    {issueCount === 0 ? (
                      <span className="history-badge-clean">0 issues</span>
                    ) : (
                      <span className="history-badge-issues">{issueCount} {issueCount === 1 ? 'issue' : 'issues'}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}

export default App;
