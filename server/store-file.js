import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { normalizeStoredReport } from './report-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data', 'reports.json');

async function ensureFile() {
  await fs.promises.mkdir(path.dirname(DATA), { recursive: true });
  try {
    await fs.promises.access(DATA);
  } catch {
    await fs.promises.writeFile(DATA, '[]', 'utf8');
  }
}

/** @returns {Promise<import('./store.js').Report[]>} */
export async function readReports() {
  await ensureFile();
  let raw;
  try {
    raw = await fs.promises.readFile(DATA, 'utf8');
  } catch {
    return [];
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error('[store-file] reports.json is not valid JSON; serving from empty list until fixed');
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.map(normalizeStoredReport).filter(Boolean);
}

/** @param {import('./store.js').Report[]} reports */
export async function writeReports(reports) {
  await ensureFile();
  const tmp = `${DATA}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(reports, null, 0), 'utf8');
  await fs.promises.rename(tmp, DATA);
}

/** @param {Omit<import('./store.js').Report, 'id'|'createdAt'> & { id?: string; createdAt?: number }} input */
export async function addReport(input) {
  const reports = await readReports();
  const report = {
    id: input.id ?? nanoid(12),
    officeId: input.officeId,
    college: String(input.college ?? '').slice(0, 120),
    major: String(input.major ?? '').slice(0, 120),
    crowdLevel: input.crowdLevel,
    waitMinutes: Math.min(240, Math.max(0, Math.round(Number(input.waitMinutes) || 0))),
    comment: String(input.comment ?? '').slice(0, 500),
    reason: input.reason,
    createdAt: input.createdAt ?? Date.now(),
  };
  reports.push(report);
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const trimmed = reports.filter((r) => r.createdAt >= cutoff);
  await writeReports(trimmed);
  return report;
}
