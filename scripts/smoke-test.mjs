/**
 * Quick API checks. Usage: node scripts/smoke-test.mjs [baseUrl]
 * Default: http://127.0.0.1:3847
 */
const base = (process.argv[2] || 'http://127.0.0.1:3847').replace(/\/$/, '');

async function main() {
  const offices = await fetch(`${base}/api/offices`).then((r) => {
    if (!r.ok) throw new Error(`offices ${r.status}`);
    return r.json();
  });
  if (!offices.offices?.length) throw new Error('no offices');
  if (!offices.visitReasons?.length) throw new Error('no visitReasons');

  const dash = await fetch(`${base}/api/dashboard`).then((r) => {
    if (!r.ok) throw new Error(`dashboard ${r.status}`);
    return r.json();
  });
  if (!Array.isArray(dash.summaries) || dash.summaries.length !== offices.offices.length) {
    throw new Error('summaries length mismatch');
  }
  if (typeof dash.windowMinutes !== 'number') throw new Error('windowMinutes missing');

  const oid = offices.offices[0].id;
  const rid = offices.visitReasons[0].id;
  const post = await fetch(`${base}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      officeId: oid,
      crowdLevel: 'moderate',
      waitMinutes: 10,
      reason: rid,
      college: 'TEST',
      major: '',
      comment: 'smoke test',
    }),
  });
  if (!post.ok) {
    const t = await post.text();
    throw new Error(`post ${post.status}: ${t}`);
  }

  const bad = await fetch(`${base}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officeId: 'nope', crowdLevel: 'moderate', waitMinutes: 5, reason: rid }),
  });
  if (bad.status !== 400) throw new Error(`expected 400 bad office, got ${bad.status}`);

  console.log('smoke-test OK:', base);
}

main().catch((e) => {
  console.error('smoke-test FAIL:', e.message);
  process.exit(1);
});
