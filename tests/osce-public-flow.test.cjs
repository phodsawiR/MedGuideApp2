const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '../public/osce-med/index.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '../public/osce-med/app.js'), 'utf8')
  .replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
const cards = [{ id: 'card-a', chapter: 'Test', category: 'Station', prompt: 'Synthetic question', tasks: ['Explain'], answer: { diagnosis: ['Synthetic answer'] }, imageKey: 'test.png' }];
const account = uid => ({ uid, email: uid + '@example.com', emailVerified: true, providerData: [{ providerId: 'google.com' }], getIdToken: async () => 'test-token-' + uid });
async function settle() { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); }
function harness({ remote = {}, local = {}, failWrites = false } = {}) {
  const dom = new JSDOM(html, { url: 'https://example.test/osce-med/', runScripts: 'outside-only' });
  const w = dom.window, reads = [], writes = [], fetches = [];
  for (const [key, value] of Object.entries(local)) w.localStorage.setItem(key, JSON.stringify(value));
  w.auth = {}; w.db = {}; w.GoogleAuthProvider = class { setCustomParameters() {} };
  w.signInWithPopup = async () => { throw { code: 'auth/popup-closed-by-user' }; };
  w.signInWithRedirect = async () => {}; w.getRedirectResult = async () => null;
  w.onAuthStateChanged = (_, callback) => { w.authChange = callback; };
  w.signOut = async () => w.authChange(null);
  w.collection = w.doc = (_, ...parts) => parts.join('/');
  w.getDocs = async ref => { reads.push(ref); const rows = remote[ref.split('/')[1]] || {}; return { forEach: fn => Object.entries(rows).forEach(([id, value]) => fn({ id, data: () => value })) }; };
  w.setDoc = async (ref, value) => { if (failWrites) throw Error('offline'); writes.push({ ref, value }); };
  w.serverTimestamp = () => 'server-time';
  w.URL.createObjectURL = () => 'blob:synthetic'; w.URL.revokeObjectURL = () => {};
  w.fetch = async (url, options) => { fetches.push({ url, options }); return { ok: true, status: 200, json: async () => ({ cards }), blob: async () => ({ size: 4 }) }; };
  w.eval(script + '\nwindow.exercise = { flushResponse, rate, setRevealed, syncPending };');
  return { dom, w, reads, writes, fetches, get: id => w.document.getElementById(id), async login(user) { w.authChange(user); await settle(); }, close() { dom.window.close(); } };
}
test('guest can study images, rate, save and reload without any private progress read/write', async () => {
  const h = harness();
  try {
    await h.login(null);
    assert.equal(h.get('study').hidden, false);
    assert.equal(h.get('login').hidden, false);
    assert.match(h.get('prompt').textContent, /Synthetic/);
    assert.ok(h.fetches.some(f => f.url.includes('?image=')));
    assert.ok(h.fetches.every(f => Object.keys(f.options.headers).length === 0));
    h.get('response').value = 'Guest response'; h.w.exercise.flushResponse();
    h.w.exercise.setRevealed(true); h.w.exercise.rate('good'); await settle();
    assert.equal(h.reads.length, 0); assert.equal(h.writes.length, 0);
    const saved = JSON.parse(h.w.localStorage.getItem('medguide.osce.guest.v1'));
    assert.equal(saved['card-a'].response, 'Guest response'); assert.equal(saved['card-a'].rating, 'good');
    const restored = harness({ local: { 'medguide.osce.guest.v1': saved } });
    try { await restored.login(null); assert.equal(restored.get('review-count').textContent, '1'); } finally { restored.close(); }
  } finally { h.close(); }
});
test('login loads owner progress; edits sync to owner; logout restores guest without copying private answers', async () => {
  const guest = { 'card-a': { response: 'Guest response', clientUpdatedAt: 1 } };
  const h = harness({ local: { 'medguide.osce.guest.v1': guest }, remote: { alice: { 'card-a': { response: 'Private Alice', clientUpdatedAt: 2 } } } });
  try {
    await h.login(null); assert.equal(h.get('response').value, 'Guest response');
    await h.login(account('alice')); assert.equal(h.get('response').value, 'Private Alice');
    assert.deepEqual(h.reads, ['osceProgress/alice/cards']);
    h.get('response').value = 'Edited Alice'; h.w.exercise.flushResponse(); await settle();
    assert.equal(h.writes.length, 1); assert.equal(h.writes[0].ref, 'osceProgress/alice/cards/card-a');
    assert.equal(h.writes[0].value.response, 'Edited Alice');
    await h.login(account('bob')); assert.equal(h.get('response').value, '');
    await h.login(null); assert.equal(h.get('response').value, 'Guest response');
    assert.equal(JSON.parse(h.w.localStorage.getItem('medguide.osce.guest.v1'))['card-a'].response, 'Guest response');
    assert.equal(h.writes.length, 1);
  } finally { h.close(); }
});
test('failed account writes stay in that UID pending queue, never guest storage', async () => {
  const h = harness({ failWrites: true });
  try {
    await h.login(account('alice'));
    h.get('response').value = 'Offline answer'; h.w.exercise.flushResponse(); await settle();
    assert.equal(JSON.parse(h.w.localStorage.getItem('medguide.osce.pending.v1.alice'))['card-a'].response, 'Offline answer');
    await h.login(null); assert.equal(h.get('response').value, '');
    assert.equal(h.w.localStorage.getItem('medguide.osce.guest.v1'), '{}');
  } finally { h.close(); }
});
test('cancelled login leaves guest study usable', async () => {
  const h = harness();
  try { await h.login(null); h.get('login').click(); await settle(); assert.equal(h.get('study').hidden, false); assert.equal(h.get('login').disabled, false); assert.equal(h.writes.length, 0); }
  finally { h.close(); }
});
