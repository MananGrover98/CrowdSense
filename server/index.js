import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OFFICES, VISIT_REASONS } from './offices.js';
import { buildDashboard } from './aggregate.js';
import { readReports, addReport, storageMode } from './store.js';
import { rateLimitReports } from './rate-limit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const PORT = Number(process.env.PORT) || 3847;
const distDir = path.join(__dirname, '../dist');
const serveSpa = fs.existsSync(path.join(distDir, 'index.html'));

const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors(
    corsOrigin
      ? {
          origin: corsOrigin.split(',').map((o) => o.trim()),
          methods: ['GET', 'POST', 'OPTIONS'],
          maxAge: 86400,
        }
      : {}
  )
);
app.use(express.json({ limit: '32kb' }));

const OFFICE_IDS = new Set(OFFICES.map((o) => o.id));
const CROWD = new Set(['quiet', 'moderate', 'busy', 'very_busy']);
const REASON_IDS = new Set(VISIT_REASONS.map((r) => r.id));
const MAX_FILTER_LEN = 120;

app.get('/api/offices', (_req, res) => {
  res.json({ offices: OFFICES, visitReasons: VISIT_REASONS, storage: storageMode() });
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const reports = await readReports();
    const officeId = typeof req.query.officeId === 'string' ? req.query.officeId : undefined;
    const college = typeof req.query.college === 'string' ? req.query.college : undefined;
    const reason = typeof req.query.reason === 'string' ? req.query.reason : undefined;
    if (officeId && !OFFICE_IDS.has(officeId)) {
      res.status(400).json({ error: 'Invalid officeId' });
      return;
    }
    if (reason && !REASON_IDS.has(reason)) {
      res.status(400).json({ error: 'Invalid reason' });
      return;
    }
    if (college && college.length > MAX_FILTER_LEN) {
      res.status(400).json({ error: 'College filter is too long' });
      return;
    }
    const dashboard = buildDashboard(reports, { officeId, college, reason });
    res.json(dashboard);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

app.post('/api/reports', rateLimitReports(), badBodyOr(async (req, res) => {
  const { officeId, college, major, crowdLevel, waitMinutes, comment, reason } = req.body ?? {};
  if (!officeId || !OFFICE_IDS.has(officeId)) {
    res.status(400).json({ error: 'officeId is required and must be valid' });
    return;
  }
  if (!crowdLevel || !CROWD.has(crowdLevel)) {
    res.status(400).json({ error: 'crowdLevel must be quiet, moderate, busy, or very_busy' });
    return;
  }
  if (!reason || !REASON_IDS.has(reason)) {
    res.status(400).json({ error: 'reason is required and must be valid' });
    return;
  }
  const w = Number(waitMinutes);
  if (!Number.isFinite(w) || w < 0 || w > 240) {
    res.status(400).json({ error: 'waitMinutes must be a number from 0 to 240' });
    return;
  }
  const report = await addReport({
    officeId,
    college: college ?? '',
    major: major ?? '',
    crowdLevel,
    waitMinutes: w,
    comment: comment ?? '',
    reason,
  });
  res.status(201).json({ report });
}));

function badBodyOr(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: 'Could not save report. Try again later.' });
    }
  };
}

if (serveSpa) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api)/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Advising Pulse ${serveSpa ? '(site + API)' : 'API only'} http://127.0.0.1:${PORT}`);
  console.log(`Data: ${storageMode()}${corsOrigin ? ` | CORS: ${corsOrigin}` : ' | CORS: open (set CORS_ORIGIN in production)'}`);
});
