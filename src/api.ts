export type CrowdLevel = 'quiet' | 'moderate' | 'busy' | 'very_busy';

export type Office = { id: string; name: string; shortLabel: string };
export type VisitReason = { id: string; label: string };

export type OfficeSummary = {
  officeId: string;
  name: string;
  shortLabel: string;
  status: 'no_data' | 'live';
  crowdKey: string | null;
  crowdLabel: string;
  avgWaitMinutes: number | null;
  reportCount: number;
  windowMinutes: number;
};

export type FeedItem = {
  id: string;
  officeId: string;
  shortLabel: string;
  major: string;
  comment: string;
  crowdLevel: CrowdLevel;
  waitMinutes: number;
  reason: string;
  createdAt: number;
};

export type Dashboard = {
  summaries: OfficeSummary[];
  feed: FeedItem[];
  alerts: { severity: 'info' | 'warn'; text: string; officeId?: string }[];
  predictions: {
    busiestHours: { label: string; avgWaitMinutes: number; sampleSize: number }[];
    calmestHours: { label: string; avgWaitMinutes: number; sampleSize: number }[];
    historyDays: number;
  };
  relativeSpeed: {
    fastest: { officeId: string; shortLabel: string; avgWaitMinutes: number | null }[];
    slowest: { officeId: string; shortLabel: string; avgWaitMinutes: number | null }[];
  };
  windowMinutes: number;
};

const base = '';

export async function fetchMeta(): Promise<{
  offices: Office[];
  visitReasons: VisitReason[];
  storage?: 'file' | 'supabase';
}> {
  const r = await fetch(`${base}/api/offices`);
  if (!r.ok) throw new Error('Failed to load offices');
  return r.json();
}

export async function fetchDashboard(params: {
  officeId?: string;
  college?: string;
  reason?: string;
}): Promise<Dashboard> {
  const q = new URLSearchParams();
  if (params.officeId) q.set('officeId', params.officeId);
  if (params.college?.trim()) q.set('college', params.college.trim());
  if (params.reason) q.set('reason', params.reason);
  const r = await fetch(`${base}/api/dashboard?${q}`);
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to load dashboard');
  }
  return r.json();
}

export async function submitReport(body: {
  officeId: string;
  college: string;
  major: string;
  crowdLevel: CrowdLevel;
  waitMinutes: number;
  comment: string;
  reason: string;
}): Promise<void> {
  const r = await fetch(`${base}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    const msg = (err as { error?: string }).error ?? 'Submit failed';
    if (r.status === 429) throw new Error(msg);
    throw new Error(msg);
  }
}
