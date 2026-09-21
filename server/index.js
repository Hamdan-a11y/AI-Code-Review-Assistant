import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanCode } from './scanner.js';
import { reviewCodeWithAI } from './aiReviewer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('AI Code Review Assistant Server is up and running!');
});

// Scan & AI Review Route
app.post('/api/scan', async (req, res) => {
  try {
    const { code } = req.body;

    // 1. Validate existence and type
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        error: 'Empty Submission',
        message: 'The submitted file or editor contains no code to review.'
      });
    }

    // 2. Reject binary / null-byte files
    if (code.includes('\0')) {
      return res.status(400).json({
        error: 'Binary File Detected',
        message: 'The uploaded file contains binary or non-text data and cannot be reviewed as source code.'
      });
    }

    // 3. Reject comment-only or whitespace-only code
    const strippedCode = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').trim();
    if (strippedCode.length < 5) {
      return res.status(400).json({
        error: 'No Executable Code',
        message: 'The file contains only comments or empty whitespace. Please provide actual source code to audit.'
      });
    }

    // 4. Run strict Gemini AI review first
    let aiIssues = [];
    try {
      aiIssues = await reviewCodeWithAI(code);
    } catch (aiErr) {
      console.error('AI Review failure:', aiErr);
      aiIssues = [];
    }

    let finalIssues = [];

    if (aiIssues && aiIssues.length > 0) {
      // Primary engine: Use strict AI results
      finalIssues = aiIssues;
    } else {
      // Offline fallback: Use static regex scanner if AI is unavailable
      finalIssues = scanCode(code);
    }

    res.json({
      issues: finalIssues,
      stats: {
        total: finalIssues.length,
        engine: aiIssues.length > 0 ? 'Gemini AI' : 'Static Regex Fallback'
      }
    });
  } catch (err) {
    console.error('Server error during scan:', err);
    res.status(500).json({
      error: 'Audit Failed',
      message: 'An unexpected internal error occurred while analyzing the code.'
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
