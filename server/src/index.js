import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { analyzeNotice, askAboutNotice, compareNotices } from './gemini.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const allowedExtensions = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.txt', '.md', '.csv', '.docx', '.xlsx', '.xls', '.pptx']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (!allowedExtensions.has(extension)) return callback(new Error('Unsupported format. Use PDF, JPG, PNG, WEBP, TXT, MD, CSV, DOCX, XLSX, XLS or PPTX.'));
    callback(null, true);
  },
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, limit: 25, standardHeaders: 'draft-8', legacyHeaders: false }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, configured: Boolean(process.env.GEMINI_API_KEY), model: process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it' });
});

app.post('/api/analyze', upload.single('notice'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a document before analysing it.' });
    const language = req.body.language === 'Hindi' ? 'Hindi' : 'English';
    const result = await analyzeNotice(req.file, language);
    res.json({ ...result, fileName: req.file.originalname });
  } catch (error) { next(error); }
});

app.post('/api/compare', upload.fields([{ name: 'noticeA', maxCount: 1 }, { name: 'noticeB', maxCount: 1 }]), async (req, res, next) => {
  try {
    const fileA = req.files?.noticeA?.[0];
    const fileB = req.files?.noticeB?.[0];
    if (!fileA || !fileB) return res.status(400).json({ error: 'Upload both documents before comparing.' });
    let profile = {};
    if (req.body.profile) {
      try { profile = JSON.parse(req.body.profile); } catch { return res.status(400).json({ error: 'Comparison preferences could not be read. Please try again.' }); }
    }
    const language = req.body.language === 'Hindi' ? 'Hindi' : 'English';
    const result = await compareNotices(fileA, fileB, profile, language);
    res.json(result);
  } catch (error) { next(error); }
});

app.post('/api/chat', upload.single('notice'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Please attach the document again and retry your question.' });
    const question = typeof req.body.question === 'string' ? req.body.question.trim() : '';
    if (!question) return res.status(400).json({ error: 'Enter a question about the document.' });
    if (question.length > 1000) return res.status(400).json({ error: 'Keep your question under 1,000 characters.' });
    let history = [];
    if (req.body.history) {
      try { history = JSON.parse(req.body.history); } catch { return res.status(400).json({ error: 'Chat history could not be read. Start a new question.' }); }
      if (!Array.isArray(history)) history = [];
    }
    const language = req.body.language === 'Hindi' ? 'Hindi' : 'English';
    res.json(await askAboutNotice(req.file, question, history, language));
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error('[NoticeLens API]', error?.message || error);
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'That file is larger than 12 MB. Please choose a smaller document.' : 'The upload could not be completed.';
    return res.status(400).json({ error: message });
  }
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 ? error.status : 500;
  const message = status === 500
    ? 'Something went wrong while processing this document. Check the server terminal for details and retry.'
    : error.message;
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`NoticeLens API running at http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) console.warn('GEMINI_API_KEY is missing. Add it to server/.env to enable Gemma.');
});
