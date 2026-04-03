const CROWD = new Set(['quiet', 'moderate', 'busy', 'very_busy']);

/**
 * Drop corrupt rows and coerce marginal ones so the API never crashes on bad JSON.
 * @param {unknown} r
 * @returns {import('./store.js').Report | null}
 */
export function normalizeStoredReport(r) {
  if (!r || typeof r !== 'object') return null;
  const o = /** @type {Record<string, unknown>} */ (r);
  const id = typeof o.id === 'string' && o.id ? o.id : null;
  const officeId = typeof o.officeId === 'string' && o.officeId ? o.officeId : null;
  if (!id || !officeId) return null;
  let createdAt = Number(o.createdAt);
  if (!Number.isFinite(createdAt)) return null;
  let crowdLevel = o.crowdLevel;
  if (typeof crowdLevel !== 'string' || !CROWD.has(crowdLevel)) crowdLevel = 'moderate';
  const reason = typeof o.reason === 'string' && o.reason ? o.reason : 'other';
  const college = typeof o.college === 'string' ? o.college : '';
  const major = typeof o.major === 'string' ? o.major : '';
  let waitMinutes = Number(o.waitMinutes);
  if (!Number.isFinite(waitMinutes)) waitMinutes = 0;
  waitMinutes = Math.min(240, Math.max(0, Math.round(waitMinutes)));
  const comment = typeof o.comment === 'string' ? o.comment : '';
  return {
    id,
    officeId,
    college: college.slice(0, 120),
    major: major.slice(0, 120),
    crowdLevel: /** @type {'quiet'|'moderate'|'busy'|'very_busy'} */ (crowdLevel),
    waitMinutes,
    comment: comment.slice(0, 500),
    reason,
    createdAt,
  };
}
