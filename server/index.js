import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { scanCode } from './scanner.js';
import { reviewCodeWithAI, detectLanguage } from './aiReviewer.js';
import { AuditLog } from './models/AuditLog.js';
import { Snippet } from './models/Snippet.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('🍃 Connected to MongoDB Atlas successfully!'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cors());

app.get('/', (req, res) => {
  res.send('AI Code Review Assistant Server is up and running!');
});

// =========================================================
// 1. Scan & AI Review Route (with Auto-Save to MongoDB)
// =========================================================
app.post('/api/scan', async (req, res) => {
  try {
    const { code, fileName } = req.body;

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

    // 4. Run strict Gemini AI review first with multi-language awareness
    const detectedLanguage = detectLanguage(fileName, code);
    let aiIssues = [];
    try {
      aiIssues = await reviewCodeWithAI(code, fileName);
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
      finalIssues = scanCode(code, fileName);
    }

    const stats = {
      total: finalIssues.length,
      engine: aiIssues.length > 0 ? 'Gemini AI' : 'Static Regex Fallback',
      language: detectedLanguage
    };

    // 5. Send audit response immediately to the frontend
    res.json({
      issues: finalIssues,
      stats
    });

    // 6. Asynchronously save audit record in MongoDB Atlas in the background
    AuditLog.create({
      fileName: fileName || 'untitled',
      code,
      issues: finalIssues,
      stats
    }).then((savedRecord) => {
      console.log('💾 Audit log saved to MongoDB Atlas! Record ID:', savedRecord._id);
    }).catch((dbErr) => {
      console.error('Warning: Failed to save audit log to MongoDB:', dbErr.message);
    });
  } catch (err) {
    console.error('Server error during scan:', err);
    res.status(500).json({
      error: 'Audit Failed',
      message: 'An unexpected internal error occurred while analyzing the code.'
    });
  }
});

// =========================================================
// 2. Audit History Routes
// =========================================================
// Get recent audit history (latest 20)
app.get('/api/history', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('-code')
      .maxTimeMS(3000);
    res.json(logs);
  } catch (err) {
    console.error('Error fetching history:', err.message);
    res.json([]);
  }
});

// Get single audit log details by ID
app.get('/api/history/:id', async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }
    res.json(log);
  } catch (err) {
    console.error('Error fetching audit log:', err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// Delete an audit record
app.delete('/api/history/:id', async (req, res) => {
  try {
    await AuditLog.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete audit log' });
  }
});

// =========================================================
// 3. Saved Snippets Routes (Bookmarking)
// =========================================================
// List all saved snippets
app.get('/api/snippets', async (req, res) => {
  try {
    const snippets = await Snippet.find().sort({ createdAt: -1 });
    res.json(snippets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch snippets' });
  }
});

// Save a new snippet
app.post('/api/snippets', async (req, res) => {
  try {
    const { title, code, language, tags } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Snippet code cannot be empty' });
    }

    const newSnippet = await Snippet.create({
      title: title || 'Untitled Snippet',
      code,
      language: language || 'javascript',
      tags: tags || []
    });

    console.log('📌 Snippet bookmarked to MongoDB:', newSnippet._id);
    res.status(201).json(newSnippet);
  } catch (err) {
    console.error('Error saving snippet:', err);
    res.status(500).json({ error: 'Failed to save snippet' });
  }
});

// Delete a saved snippet
app.delete('/api/snippets/:id', async (req, res) => {
  try {
    await Snippet.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete snippet' });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
