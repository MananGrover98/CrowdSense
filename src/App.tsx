import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CrowdLevel, Dashboard, Office, VisitReason } from './api';
import { fetchDashboard, fetchMeta, submitReport } from './api';
import { OFFICIAL_UMB_LINKS } from './officialLinks';

const CROWD_OPTIONS: { value: CrowdLevel; label: string }[] = [
  { value: 'quiet', label: 'Quiet' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'busy', label: 'Busy' },
  { value: 'very_busy', label: 'Very crowded' },
];

type Tab = 'live' | 'feed' | 'report';

function crowdPillClass(key: string | null): string {
  if (key === 'quiet') return 'crowd-pill crowd-quiet';
  if (key === 'moderate') return 'crowd-pill crowd-moderate';
  if (key === 'busy') return 'crowd-pill crowd-busy';
  if (key === 'very_busy') return 'crowd-pill crowd-very';
  return 'crowd-pill crowd-none';
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function reasonLabel(reasons: VisitReason[], id: string): string {
  return reasons.find((r) => r.id === id)?.label ?? id;
}

export default function App() {
  const [meta, setMeta] = useState<{ offices: Office[]; visitReasons: VisitReason[]; storage?: string } | null>(
    null
  );
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('live');

  const [filterOffice, setFilterOffice] = useState('');
  const [filterCollege, setFilterCollege] = useState('');
  const [filterReason, setFilterReason] = useState('');

  const [formOffice, setFormOffice] = useState('');
  const [formCollege, setFormCollege] = useState('');
  const [formMajor, setFormMajor] = useState('');
  const [formCrowd, setFormCrowd] = useState<CrowdLevel>('moderate');
  const [formWait, setFormWait] = useState(20);
  const [formReason, setFormReason] = useState('');
  const [formComment, setFormComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await fetchDashboard({
        officeId: filterOffice || undefined,
        college: filterCollege,
        reason: filterReason || undefined,
      });
      setDashboard(d);
      setLastRefreshAt(new Date());
    } catch {
      setError(
        'No connection to the app server. If you’re on the live site, wait a minute — free hosting sometimes “sleeps.” Otherwise run npm run dev locally.'
      );
    } finally {
      setLoading(false);
    }
  }, [filterCollege, filterOffice, filterReason]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await fetchMeta();
        if (!cancelled) {
          setMeta(m);
          if (!formOffice && m.offices[0]) setFormOffice(m.offices[0].id);
          if (!formReason && m.visitReasons[0]) setFormReason(m.visitReasons[0].id);
        }
      } catch {
        if (!cancelled) setError('Could not load the app. Check your internet or try again in a moment.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const summaries = useMemo(() => dashboard?.summaries ?? [], [dashboard]);
  const displayedSummaries = useMemo(() => {
    if (filterOffice) return summaries.filter((s) => s.officeId === filterOffice);
    return summaries;
  }, [summaries, filterOffice]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formOffice || !formReason) return;
    setSubmitting(true);
    setSubmitOk(false);
    setError(null);
    try {
      const waitMinutes = Math.max(0, Math.min(240, Math.round(Number(formWait) || 0)));
      await submitReport({
        officeId: formOffice,
        college: formCollege,
        major: formMajor,
        crowdLevel: formCrowd,
        waitMinutes,
        comment: formComment,
        reason: formReason,
      });
      setSubmitOk(true);
      setFormComment('');
      await load();
      setTab('live');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  const rs = dashboard?.relativeSpeed;

  return (
    <div className="app-shell">
      <header className="brand">
        <h1>Advising Pulse UMB</h1>
        <span className="brand-badge">UMass Boston</span>
      </header>
      <p className="tagline one-line-tagline">Crowd and wait hints from students — not an official UMass Boston wait-time system.</p>

      <div className="trust-strip card card-pad">
        <p className="trust-strip-main">
          <strong>How to read this:</strong> Numbers are <strong>peer estimates</strong> from the last ~{dashboard?.windowMinutes ?? 20}{' '}
          minutes. They can lag real life by several minutes and are <strong>not verified</strong> by the university. This page refreshes about
          every 15 seconds
          {lastRefreshAt && (
            <>
              {' '}
              (last loaded {lastRefreshAt.toLocaleTimeString()})
            </>
          )}
          .
        </p>
        <details className="official-links-details">
          <summary>Official UMass Boston links — hours, drop-ins, and appointments</summary>
          <p className="muted official-links-intro">
            Schedules change every term. We only link out; we do <strong>not</strong> show SSC or office hours here so nothing goes stale.
          </p>
          <ul className="official-link-list">
            {OFFICIAL_UMB_LINKS.map((item) => (
              <li key={item.href}>
                <a href={item.href} target="_blank" rel="noopener noreferrer">
                  {item.label}
                </a>
                <span className="official-link-note"> — {item.note}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>

      <nav className="tab-bar" aria-label="Main">
        <button
          type="button"
          className={tab === 'live' ? 'tab active' : 'tab'}
          onClick={() => setTab('live')}
          aria-current={tab === 'live' ? 'page' : undefined}
        >
          Live status
        </button>
        <button
          type="button"
          className={tab === 'feed' ? 'tab active' : 'tab'}
          onClick={() => setTab('feed')}
          aria-current={tab === 'feed' ? 'page' : undefined}
        >
          What people said
        </button>
        <button
          type="button"
          className={tab === 'report' ? 'tab active' : 'tab'}
          onClick={() => setTab('report')}
          aria-current={tab === 'report' ? 'page' : undefined}
        >
          Report my wait
        </button>
      </nav>

      {import.meta.env.DEV && meta?.storage && (
        <p className="storage-hint muted">
          Dev — data: {meta.storage === 'supabase' ? 'Supabase' : 'local file'}
        </p>
      )}

      {error && <div className="error-banner">{error}</div>}

      {tab === 'live' && (
        <div className="panel">
          <section className="card card-pad">
            <div className="filters compact-filters">
              <label>
                Office
                <select value={filterOffice} onChange={(e) => setFilterOffice(e.target.value)}>
                  <option value="">All offices</option>
                  {(meta?.offices ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.shortLabel}
                    </option>
                  ))}
                </select>
              </label>
              <details className="filter-details">
                <summary>Filter by college text or visit reason</summary>
                <label>
                  College keyword
                  <input
                    placeholder="e.g. CSM, Management"
                    value={filterCollege}
                    onChange={(e) => setFilterCollege(e.target.value)}
                  />
                </label>
                <label>
                  Reason for visit
                  <select value={filterReason} onChange={(e) => setFilterReason(e.target.value)}>
                    <option value="">Any</option>
                    {(meta?.visitReasons ?? []).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
              </details>
              <button type="button" className="btn-ghost btn-small" onClick={load} disabled={loading}>
                Refresh
              </button>
            </div>

            {dashboard && dashboard.alerts.length > 0 && (
              <div className="alerts">
                {dashboard.alerts.map((a, i) => (
                  <div key={i} className={a.severity === 'warn' ? 'alert alert-warn' : 'alert alert-info'}>
                    {a.text}
                  </div>
                ))}
              </div>
            )}

            <h2 className="panel-title">Student-reported crowd &amp; wait (last ~{dashboard?.windowMinutes ?? 20} min)</h2>
            <ul className="summary-list">
              {displayedSummaries.map((s) => (
                <li key={s.officeId}>
                  <button
                    type="button"
                    className={`summary-item${filterOffice === s.officeId ? ' selected' : ''}`}
                    onClick={() => {
                      setFilterOffice(s.officeId);
                      setFormOffice(s.officeId);
                      setTab('report');
                    }}
                  >
                    <div className="summary-item-head">
                      <strong>{s.shortLabel}</strong>
                      <span className={crowdPillClass(s.crowdKey)}>{s.crowdLabel}</span>
                    </div>
                    <div className="summary-meta">
                      {s.status === 'live' && s.avgWaitMinutes != null && (
                        <>
                          ~{s.avgWaitMinutes} min avg · {s.reportCount} report{s.reportCount === 1 ? '' : 's'}
                        </>
                      )}
                      {s.status === 'no_data' && <>No reports yet — tap to add yours.</>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {rs && (rs.fastest.length > 0 || rs.slowest.length > 0) && (
              <div className="speed-pair">
                <div className="speed-box soft-inner">
                  <h3>Faster lately</h3>
                  <ol>
                    {rs.fastest.map((x) => (
                      <li key={x.officeId}>
                        {x.shortLabel} (~{x.avgWaitMinutes} min)
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="speed-box soft-inner">
                  <h3>Longer waits lately</h3>
                  <ol>
                    {rs.slowest.map((x) => (
                      <li key={x.officeId}>
                        {x.shortLabel} (~{x.avgWaitMinutes} min)
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            <details className="tips-details">
              <summary>
                Busiest / calmer clock hours (past {dashboard?.predictions?.historyDays ?? 14} days of reports here only)
              </summary>
              <p className="muted tips-disclaimer">
                This uses historical student submissions in Advising Pulse — not SSC drop-in hours or any official schedule. Sparse data
                can look random; use the official links above for real appointment and drop-in times.
              </p>
              <div className="predict-grid">
                <div className="predict-block">
                  <h3>Busiest hours</h3>
                  <ul>
                    {(dashboard?.predictions?.busiestHours?.length ? dashboard.predictions.busiestHours : []).map(
                      (h) => (
                        <li key={h.label}>
                          {h.label}: ~{h.avgWaitMinutes} min ({h.sampleSize} reports)
                        </li>
                      )
                    )}
                    {!dashboard?.predictions?.busiestHours?.length && (
                      <li className="muted">Needs more student reports.</li>
                    )}
                  </ul>
                </div>
                <div className="predict-block">
                  <h3>Calmer hours</h3>
                  <ul>
                    {(dashboard?.predictions?.calmestHours?.length ? dashboard.predictions.calmestHours : []).map(
                      (h) => (
                        <li key={h.label}>
                          {h.label}: ~{h.avgWaitMinutes} min ({h.sampleSize} reports)
                        </li>
                      )
                    )}
                    {!dashboard?.predictions?.calmestHours?.length && (
                      <li className="muted">Needs more student reports.</li>
                    )}
                  </ul>
                </div>
              </div>
            </details>
          </section>
        </div>
      )}

      {tab === 'feed' && (
        <div className="panel">
          <section className="card card-pad">
            <h2 className="panel-title">Recent comments</h2>
            <p className="muted tight-top">Same filters as Live status apply (office, college, reason).</p>
            <ul className="feed feed-tall">
              {(dashboard?.feed ?? []).map((f) => (
                <li key={f.id} className="feed-item">
                  <div className="feed-item-top">
                    <span>{f.shortLabel}</span>
                    {f.major && <span>{f.major}</span>}
                    <span>{formatTime(f.createdAt)}</span>
                    <span>
                      {f.waitMinutes} min · {String(f.crowdLevel ?? '').replace(/_/g, ' ')}
                    </span>
                    <span>{reasonLabel(meta?.visitReasons ?? [], f.reason)}</span>
                  </div>
                  {f.comment && <p className="feed-comment">{f.comment}</p>}
                </li>
              ))}
              {!dashboard?.feed.length && (
                <li className="muted">Nothing in the last {dashboard?.windowMinutes ?? 20} minutes for this filter.</li>
              )}
            </ul>
          </section>
        </div>
      )}

      {tab === 'report' && (
        <div className="panel">
          <section className="card card-pad">
            <h2 className="panel-title">Share what you see</h2>
            <p className="muted tight-top">Quick and anonymous. No staff names or personal details.</p>
            <form className="form-stack" onSubmit={onSubmit}>
              <label>
                Advising office
                <select value={formOffice} onChange={(e) => setFormOffice(e.target.value)} required>
                  {(meta?.offices ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.shortLabel}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Reason for visit
                <select value={formReason} onChange={(e) => setFormReason(e.target.value)} required>
                  {(meta?.visitReasons ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="field-label-text">How crowded is it?</span>
                <div className="crowd-radios">
                  {CROWD_OPTIONS.map((o) => (
                    <label key={o.value} className="radio-tile">
                      <input
                        type="radio"
                        name="crowd"
                        value={o.value}
                        checked={formCrowd === o.value}
                        onChange={() => setFormCrowd(o.value)}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
              <label>
                Estimated wait (minutes)
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={formWait}
                  onChange={(e) => setFormWait(Number(e.target.value))}
                />
              </label>
              <label>
                College (optional)
                <input value={formCollege} onChange={(e) => setFormCollege(e.target.value)} placeholder="e.g. CSM" />
              </label>
              <label>
                Major (optional)
                <input value={formMajor} onChange={(e) => setFormMajor(e.target.value)} placeholder="e.g. Biology" />
              </label>
              <label>
                Short comment (optional)
                <textarea
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  placeholder="Line long but moving fast…"
                />
              </label>
              {submitOk && <p className="muted ok-line">Posted — thanks.</p>}
              <button type="submit" className="btn-primary" disabled={submitting || !meta}>
                {submitting ? 'Sending…' : 'Submit'}
              </button>
            </form>
          </section>
        </div>
      )}

      <p className="footer-note">
        Advising Pulse UMB is independent and not run by UMass Boston. Crowd and wait figures are student-submitted estimates, not
        official. For accurate hours, policies, and services, rely on umb.edu and campus offices.
      </p>
    </div>
  );
}
