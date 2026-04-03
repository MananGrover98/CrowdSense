import { nanoid } from 'nanoid';
import { normalizeStoredReport } from './report-utils.js';

function urlBase() {
  const u = process.env.SUPABASE_URL?.replace(/\/$/, '');
  if (!u) throw new Error('SUPABASE_URL missing');
  return u;
}

function secret() {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');
  return k;
}

function headers(json = false) {
  const k = secret();
  return {
    apikey: k,
    Authorization: `Bearer ${k}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

/** @returns {Promise<import('./store.js').Report[]>} */
export async function readReports() {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const q = new URLSearchParams({
    select: '*',
    order: 'created_at.desc',
    'created_at': `gte.${cutoff}`,
  });
  const res = await fetch(`${urlBase()}/rest/v1/reports?${q}`, { headers: headers() });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Supabase read failed: ${res.status} ${t}`);
  }
  /** @type {any[]} */
  const rows = await res.json();
  return rows.map(rowToReport).filter(Boolean).map(normalizeStoredReport).filter(Boolean);
}

/** @param {Omit<import('./store.js').Report, 'id'|'createdAt'> & { id?: string; createdAt?: number }} input */
export async function addReport(input) {
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

  const row = {
    id: report.id,
    office_id: report.officeId,
    college: report.college,
    major: report.major,
    crowd_level: report.crowdLevel,
    wait_minutes: report.waitMinutes,
    comment: report.comment,
    reason: report.reason,
    created_at: report.createdAt,
  };

  const res = await fetch(`${urlBase()}/rest/v1/reports`, {
    method: 'POST',
    headers: { ...headers(true), Prefer: 'return=minimal' },
    body: JSON.stringify([row]),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Supabase write failed: ${res.status} ${t}`);
  }
  return report;
}

/** @param {any} r */
function rowToReport(r) {
  if (!r || typeof r !== 'object') return null;
  const createdAt = Number(r.created_at);
  if (!Number.isFinite(createdAt)) return null;
  return {
    id: String(r.id ?? ''),
    officeId: String(r.office_id ?? ''),
    college: r.college ?? '',
    major: r.major ?? '',
    crowdLevel: r.crowd_level,
    waitMinutes: r.wait_minutes,
    comment: r.comment ?? '',
    reason: r.reason ?? '',
    createdAt,
  };
}
