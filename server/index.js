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
  const { code } = req.body;

  // 1. Run strict Gemini AI review first
  const aiIssues = await reviewCodeWithAI(code);

  let finalIssues = [];

  if (aiIssues && aiIssues.length > 0) {
    // Primary engine: Use strict AI results (clean & duplicate-free!)
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
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
