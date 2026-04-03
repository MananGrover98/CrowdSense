import { OFFICES } from './offices.js';

const WINDOW_MS = 20 * 60 * 1000;
const HISTORY_DAYS = 14;
/** @param {string} crowd */
function crowdToScore(crowd) {
  const m = { quiet: 0, moderate: 1, busy: 2, very_busy: 3 };
  return m[crowd] ?? 1;
}

/** @param {number} avg */
function scoreToCrowdLabel(avg) {
  if (avg <= 0.5) return 'quiet';
  if (avg <= 1.25) return 'moderate';
  if (avg <= 2.25) return 'busy';
  return 'very_busy';
}

/** @param {string} key */
function displayCrowd(key) {
  const labels = {
    quiet: 'Quiet',
    moderate: 'Moderate',
    busy: 'Busy',
    very_busy: 'Very crowded',
  };
  return labels[key] ?? 'Unknown';
}

/**
 * @param {import('./store.js').Report[]} reports
 * @param {{ officeId?: string; college?: string; reason?: string }} filters
 */
export function buildDashboard(reports, filters = {}) {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let filtered = reports.filter((r) => r.createdAt >= windowStart);
  if (filters.officeId) filtered = filtered.filter((r) => r.officeId === filters.officeId);
  if (filters.college && filters.college.trim()) {
    const q = filters.college.trim().toLowerCase();
    filtered = filtered.filter((r) => r.college?.toLowerCase().includes(q));
  }
  if (filters.reason) filtered = filtered.filter((r) => r.reason === filters.reason);

  const summaries = OFFICES.map((office) => {
    const officeReports = reports.filter(
      (r) => r.officeId === office.id && r.createdAt >= windowStart
    );
    if (!officeReports.length) {
      return {
        officeId: office.id,
        name: office.name,
        shortLabel: office.shortLabel,
        status: 'no_data',
        crowdKey: null,
        crowdLabel: 'No recent reports',
        avgWaitMinutes: null,
        reportCount: 0,
        windowMinutes: 20,
      };
    }
    const crowdScores = officeReports.map((r) => crowdToScore(r.crowdLevel));
    const avgCrowd = crowdScores.reduce((a, b) => a + b, 0) / crowdScores.length;
    const crowdKey = scoreToCrowdLabel(avgCrowd);
    const waits = officeReports.map((r) => r.waitMinutes).filter((w) => Number.isFinite(w) && w >= 0);
    const avgWait =
      waits.length > 0 ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : null;

    return {
      officeId: office.id,
      name: office.name,
      shortLabel: office.shortLabel,
      status: 'live',
      crowdKey,
      crowdLabel: displayCrowd(crowdKey),
      avgWaitMinutes: avgWait,
      reportCount: officeReports.length,
      windowMinutes: 20,
    };
  });

  const feed = [...filtered]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 40)
    .map((r) => ({
      id: r.id,
      officeId: r.officeId,
      shortLabel: OFFICES.find((o) => o.id === r.officeId)?.shortLabel ?? r.officeId,
      major: r.major,
      comment: r.comment,
      crowdLevel: r.crowdLevel,
      waitMinutes: r.waitMinutes,
      reason: r.reason,
      createdAt: r.createdAt,
    }));

  const alerts = computeAlerts(reports, now);
  const predictions = computePredictions(reports, now);
  const relativeSpeed = computeRelativeSpeed(summaries);

  return { summaries, feed, alerts, predictions, relativeSpeed, windowMinutes: 20 };
}

/**
 * @param {import('./store.js').Report[]} reports
 * @param {number} now
 */
function computeAlerts(reports, now) {
  /** @type {{ severity: 'info'|'warn'; text: string; officeId?: string }[]} */
  const alerts = [];
  const windowStart = now - WINDOW_MS;

  const byReason = new Map();
  for (const r of reports) {
    if (r.createdAt < windowStart) continue;
    const k = r.reason ?? 'other';
    byReason.set(k, (byReason.get(k) ?? 0) + 1);
  }
  const hotReason = [...byReason.entries()].sort((a, b) => b[1] - a[1])[0];
  if (hotReason && hotReason[1] >= 4) {
    const labels = {
      registration_hold: 'registration / hold removal',
      degree_planning: 'degree planning',
      general_question: 'general questions',
      transfer_credit: 'transfer credit',
      schedule: 'scheduling / permits',
      other: 'mixed reasons',
    };
    alerts.push({
      severity: 'warn',
      text: `Heavy traffic right now tied to ${labels[hotReason[0]] ?? 'several topics'}.`,
    });
  }

  for (const office of OFFICES) {
    const recent = reports.filter((r) => r.officeId === office.id && r.createdAt >= windowStart);
    if (recent.length < 5) continue;
    const veryBusy = recent.filter((r) => r.crowdLevel === 'very_busy').length;
    const avgWait =
      recent.map((r) => r.waitMinutes).reduce((a, b) => a + b, 0) / recent.length;
    if (veryBusy >= 3 || avgWait >= 40) {
      alerts.push({
        severity: 'warn',
        text: `${office.shortLabel}: very crowded — avg wait about ${Math.round(avgWait)} min (${recent.length} reports).`,
        officeId: office.id,
      });
    }
  }

  const afternoon = suggestAfternoon(reports, now);
  if (afternoon) {
    alerts.push({ severity: 'info', text: afternoon });
  }

  return alerts.slice(0, 6);
}

/**
 * Heuristic: compare avg wait in 10–14h vs 14–17h window over last HISTORY_DAYS
 * @param {import('./store.js').Report[]} reports
 * @param {number} now
 */
function suggestAfternoon(reports, now) {
  const dayMs = 24 * 60 * 60 * 1000;
  const start = now - HISTORY_DAYS * dayMs;
  const bucket = (/** @type {number} */ ts) => {
    const d = new Date(ts);
    const h = d.getHours() + d.getMinutes() / 60;
    if (h >= 10 && h < 14) return 'morning';
    if (h >= 14 && h < 17) return 'afternoon';
    return null;
  };

  const morningWaits = [];
  const afternoonWaits = [];
  for (const r of reports) {
    if (r.createdAt < start) continue;
    const b = bucket(r.createdAt);
    if (b === 'morning') morningWaits.push(r.waitMinutes);
    if (b === 'afternoon') afternoonWaits.push(r.waitMinutes);
  }
  const avg = (/** @type {number[]} */ arr) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const am = avg(morningWaits);
  const pm = avg(afternoonWaits);
  if (am != null && pm != null && pm + 5 < am) {
    return 'Best time lately seems after 2:00 PM — afternoon waits have been shorter on average.';
  }
  if (am != null && pm != null && am + 5 < pm) {
    return 'Mornings (before 2 PM) have been a bit lighter recently — consider going earlier.';
  }
  return 'Mid-afternoon (after 2:30 PM) is often calmer on many campuses — check live reports before you go.';
}

/**
 * @param {import('./store.js').Report[]} reports
 * @param {number} now
 */
function computePredictions(reports, now) {
  const dayMs = 24 * 60 * 60 * 1000;
  const start = now - HISTORY_DAYS * dayMs;
  const hourBuckets = Array.from({ length: 24 }, () => ({ count: 0, waitSum: 0 }));

  for (const r of reports) {
    if (r.createdAt < start) continue;
    const h = new Date(r.createdAt).getHours();
    hourBuckets[h].count += 1;
    hourBuckets[h].waitSum += r.waitMinutes;
  }

  const busiest = hourBuckets
    .map((v, hour) => ({
      hour,
      avgWait: v.count ? v.waitSum / v.count : 0,
      count: v.count,
    }))
    .filter((x) => x.count >= 2)
    .sort((a, b) => b.avgWait - a.avgWait)
    .slice(0, 3)
    .map((x) => ({
      label: formatHour(x.hour),
      avgWaitMinutes: Math.round(x.avgWait),
      sampleSize: x.count,
    }));

  const calmest = hourBuckets
    .map((v, hour) => ({
      hour,
      avgWait: v.count ? v.waitSum / v.count : 0,
      count: v.count,
    }))
    .filter((x) => x.count >= 2)
    .sort((a, b) => a.avgWait - b.avgWait)
    .slice(0, 3)
    .map((x) => ({
      label: formatHour(x.hour),
      avgWaitMinutes: Math.round(x.avgWait),
      sampleSize: x.count,
    }));

  return { busiestHours: busiest, calmestHours: calmest, historyDays: HISTORY_DAYS };
}

function formatHour(h) {
  const am = h < 12;
  const hr = h % 12 || 12;
  return `${hr}:00 ${am ? 'AM' : 'PM'}`;
}

/**
 * @param {ReturnType<typeof buildDashboard> extends { summaries: infer S } ? S : never} summaries
 */
function computeRelativeSpeed(summaries) {
  const withData = summaries.filter((s) => s.status === 'live' && s.avgWaitMinutes != null);
  if (withData.length < 2) return { fastest: [], slowest: [] };
  const sorted = [...withData].sort(
    (a, b) => (a.avgWaitMinutes ?? 0) - (b.avgWaitMinutes ?? 0)
  );
  const fastest = sorted.slice(0, 3).map((s) => ({
    officeId: s.officeId,
    shortLabel: s.shortLabel,
    avgWaitMinutes: s.avgWaitMinutes,
  }));
  const slowest = sorted.slice(-3).reverse().map((s) => ({
    officeId: s.officeId,
    shortLabel: s.shortLabel,
    avgWaitMinutes: s.avgWaitMinutes,
  }));
  return { fastest, slowest };
}

export { WINDOW_MS, crowdToScore, displayCrowd };
