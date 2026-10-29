import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const store = getStore('wallet-support-submissions');
const json = (statusCode, data) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  },
  body: JSON.stringify(data)
});
const clean = (v, max = 180) => typeof v === 'string' ? v.trim().slice(0, max) : '';
function authorized(event) {
  const expected = process.env.ADMIN_TOKEN || '';
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const supplied = header.replace(/^Bearer\s+/i, '');
  if (expected.length < 24 || supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
function getPath(event) {
  try {
    const p = new URL(event.rawUrl || 'https://netlify.local' + (event.path || '/')).pathname;
    return p;
  } catch { return event.path || '/'; }
}
function getBody(event) {
  try { return JSON.parse(event.body || '{}'); } catch { return null; }
}

export default async (event) => {
  const method = (event.httpMethod || event.requestContext?.http?.method || 'GET').toUpperCase();
  const path = getPath(event);
  if (method === 'OPTIONS') return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS' }, body: '' };
  if (path === '/api/health' && method === 'GET') return json(200, { ok: true });

  if (path === '/api/requests' && method === 'POST') {
    const body = getBody(event);
    if (!body) return json(400, { error: 'Please submit a valid request.' });
    const walletName = clean(body.walletName, 80);
    const publicAddress = clean(body.publicAddress, 160);
    const email = clean(body.email, 254).toLowerCase();
    if (walletName.length < 2) return json(400, { error: 'Please enter a valid wallet name.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Please enter a valid email address.' });
    if (publicAddress && !/^[a-zA-Z0-9:_\-.]{10,160}$/.test(publicAddress)) return json(400, { error: 'Please check the public wallet address.' });
    try {
      const item = { id: crypto.randomUUID(), walletName, publicAddress: publicAddress || null, email, status: 'new', createdAt: new Date().toISOString() };
      await store.setJSON(item.id, item);
      return json(201, { ok: true, id: item.id });
    } catch (error) {
      console.error('Submission save failed:', error?.message || error);
      return json(500, { error: 'We could not save your request right now. Please try again later.' });
    }
  }

  if (path === '/api/admin/submissions' && method === 'GET') {
    if (!authorized(event)) return json(401, { error: 'Unauthorized. Check your admin token.' });
    try {
      const listed = await store.list();
      const submissions = await Promise.all((listed.blobs || []).map(async b => await store.get(b.key, { type: 'json' })));
      submissions.sort((a, b) => String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')));
      return json(200, { submissions: submissions.filter(Boolean) });
    } catch (error) {
      console.error('Could not read submissions:', error?.message || error);
      return json(500, { error: 'Could not read support requests.' });
    }
  }

  const match = path.match(/^\/api\/admin\/submissions\/([^/]+)$/);
  if (match && method === 'PATCH') {
    if (!authorized(event)) return json(401, { error: 'Unauthorized. Check your admin token.' });
    const body = getBody(event);
    const status = clean(body?.status, 20);
    if (!['new', 'in-progress', 'resolved'].includes(status)) return json(400, { error: 'Invalid status.' });
    const id = decodeURIComponent(match[1]);
    try {
      const item = await store.get(id, { type: 'json' });
      if (!item) return json(404, { error: 'Request not found.' });
      item.status = status;
      await store.setJSON(id, item);
      return json(200, { ok: true, submission: item });
    } catch (error) {
      console.error('Could not update submission:', error?.message || error);
      return json(500, { error: 'Could not update this request.' });
    }
  }
  return json(404, { error: 'Not found.' });
};
