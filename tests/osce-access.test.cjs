const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createHandler, createGoogleKeyGetter, createFirestoreSource } = require('../api/osce.js');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const alternate = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const clock = 1791010000;
const defaultClaims = {
  aud: 'medguide-34566', iss: 'https://securetoken.google.com/medguide-34566',
  sub: 'premruj-user-id', exp: clock + 3600, iat: clock - 30, auth_time: clock - 100,
  email: 'royalrarityruj@gmail.com', email_verified: true,
  firebase: { sign_in_provider: 'google.com' },
};
function token(changes = {}, headerChanges = {}, signingKey = privateKey) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode({ alg: 'RS256', typ: 'JWT', kid: 'test-key', ...headerChanges })}.${encode({ ...defaultClaims, ...changes })}`;
  return `${body}.${crypto.sign('RSA-SHA256', Buffer.from(body), signingKey).toString('base64url')}`;
}
const keyGetter = async (kid) => {
  if (kid !== 'test-key') throw new Error('Unknown key');
  return publicKey;
};
const privateCards = [{ id: 'test', imageKey: 'OSCE_MED_test.png', answer: 'private answer' }];
const privateImage = Buffer.from([137, 80, 78, 71]);
const calls = [];
const docs = {
  'osceContent/collection': { cardsJson: { stringValue: JSON.stringify(privateCards) }, collectionJson: { stringValue: '{"total":1}' } },
  'osceImages/OSCE_MED_test.png': { contentType: { stringValue: 'image/png' }, parts: { integerValue: '2' } },
  'osceImages/OSCE_MED_test.png/parts/000': { data: { stringValue: privateImage.toString('base64').slice(0, 4) } },
  'osceImages/OSCE_MED_test.png/parts/001': { data: { stringValue: privateImage.toString('base64').slice(4) } },
  'osceImages/secret.jpg': { contentType: { stringValue: 'image/jpeg' }, parts: { integerValue: '1' } },
};
const firestoreFetch = async (url, options) => {
  assert.ok(url.startsWith('https://firestore.googleapis.com/v1/projects/medguide-34566/databases/(default)/documents/'));
  assert.equal(options.cache, 'no-store');
  const docPath = url.split('/documents/')[1];
  calls.push({ docPath, authorization: options.headers.Authorization });
  return { ok: !!docs[docPath], status: docs[docPath] ? 200 : 404, json: async () => ({ fields: docs[docPath] }) };
};
const source = createFirestoreSource(firestoreFetch);
const fixture = createHandler({ source, getPublicKey: keyGetter, now: () => clock });

async function request({ jwt, url = '/api/osce', method = 'GET', handler } = {}) {
  const response = { headers: {}, statusCode: 0, body: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(body) { this.body = body; },
  };
  await (handler || fixture)({ method, url, headers: jwt === undefined ? {} : { authorization: `Bearer ${jwt}` } }, response);
  return response;
}

test('only verified Google Premruj receives cards and collection', async () => {
  const response = await request({ jwt: token() });
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).cards[0].answer, 'private answer');
  assert.equal(JSON.parse(response.body).collection.total, 1);
  assert.equal(response.headers['cache-control'], 'private, no-store, max-age=0');
  assert.equal(response.headers['cdn-cache-control'], 'no-store');
  assert.equal(response.headers['vercel-cdn-cache-control'], 'no-store');
  assert.equal(response.headers.vary, 'Authorization');
  assert.equal(response.headers['access-control-allow-origin'], undefined);
  assert.equal((await request({ jwt: token({ email: 'RoyalRarityRuj@gmail.com' }) })).statusCode, 200);
});

test('guest and query-token access cannot read cards or images', async () => {
  const before = calls.length;
  for (const url of ['/api/osce', '/api/osce?image=OSCE_MED_test.png', `/api/osce?token=${token()}`]) {
    const response = await request({ url });
    assert.equal(response.statusCode, 401);
    assert.doesNotMatch(response.body, /private answer|premruj-user-id|eyJ/);
  }
  assert.equal(calls.length, before, 'guest must not trigger any Firestore content reads');
});

test('other verified Google accounts, including owner, cannot read content or check access', async () => {
  const before = calls.length;
  for (const email of ['phodsawi.2547@gmail.com', 'phodsawi.2547@docchula.com', 'someone@gmail.com', 'royalrarityruj@gmail.com.evil.test']) {
    for (const url of ['/api/osce', '/api/osce?image=OSCE_MED_test.png', '/api/osce?access=1']) {
      const response = await request({ jwt: token({ email }), url });
      assert.equal(response.statusCode, 403);
      assert.doesNotMatch(response.body, /private answer/);
    }
  }
  assert.equal(calls.length, before, 'non-Premruj requests cannot read Firestore, even with a warm cache');
});

test('access check authenticates without any private content reads', async () => {
  const before = calls.length;
  const allowed = await request({ jwt: token(), url: '/api/osce?access=1' });
  assert.equal(allowed.statusCode, 200);
  assert.deepEqual(JSON.parse(allowed.body), { allowed: true });
  assert.equal((await request({ url: '/api/osce?access=1' })).statusCode, 401);
  assert.equal((await request({ jwt: token({ email_verified: false }), url: '/api/osce?access=1' })).statusCode, 403);
  assert.equal((await request({ jwt: token(), url: '/api/osce?access=0' })).statusCode, 400);
  assert.equal((await request({ jwt: token(), url: '/api/osce?access=1&image=OSCE_MED_test.png' })).statusCode, 400);
  assert.equal(calls.length, before);
});

test('unverified email or any non-Google sign-in is denied', async () => {
  for (const changes of [
    { email_verified: false }, { email_verified: 'true' }, { email: null }, { email: ' ' },
    { firebase: { sign_in_provider: 'password' } },
    { firebase: { sign_in_provider: 'anonymous' } }, { firebase: {} },
  ]) assert.equal((await request({ jwt: token(changes) })).statusCode, 403);
});

test('wrong audience, issuer, expiry, issued time, auth time or subject is denied', async () => {
  for (const changes of [
    { aud: 'other-project' }, { iss: 'https://securetoken.google.com/other-project' },
    { exp: clock }, { exp: clock - 1 }, { exp: '1791013600' },
    { iat: clock + 1 }, { iat: -1 }, { auth_time: clock + 1 }, { auth_time: null },
    { auth_time: clock - 1 }, { sub: '' }, { sub: '   ' }, { sub: 'a'.repeat(129) },
  ]) assert.equal((await request({ jwt: token(changes) })).statusCode, 401);
});

test('bad signature, unsupported algorithm, unknown key and malformed JWT are denied', async () => {
  for (const jwt of [
    token({}, {}, alternate.privateKey), token({}, { alg: 'HS256' }),
    token({}, { alg: 'none' }), token({}, { kid: 'unknown' }),
    token({}, { crit: ['unrecognized'] }), token().slice(0, -9), 'not.a.token',
    `${token()}.extra`, token() + '=', 'a'.repeat(17000),
  ]) assert.equal((await request({ jwt })).statusCode, 401);
});

test('authorized images are binary, and traversal/unlisted names are rejected', async () => {
  const jwt = token();
  const before = calls.length;
  const handler = createHandler({ source, getPublicKey: keyGetter, now: () => clock });
  const image = await request({ jwt, handler, url: '/api/osce?image=OSCE_MED_test.png' });
  assert.equal(image.statusCode, 200);
  assert.equal(image.headers['content-type'], 'image/png');
  assert.equal(image.headers['x-content-type-options'], 'nosniff');
  assert.deepEqual(image.body, privateImage);
  assert.ok(calls.slice(before).every((call) => call.authorization === `Bearer ${jwt}`));
  assert.deepEqual(calls.slice(before).map((call) => call.docPath), [
    'osceContent/collection', 'osceImages/OSCE_MED_test.png',
    'osceImages/OSCE_MED_test.png/parts/000', 'osceImages/OSCE_MED_test.png/parts/001',
  ]);
  for (const imageKey of ['../cards.json', '..%2Fcards.json', 'secret.jpg', 'missing.png', 'OSCE_MED_test.png/anything', '..\\cards.json', '']) {
    assert.equal((await request({ jwt: token(), url: `/api/osce?image=${imageKey}` })).statusCode, 404);
  }
  assert.equal((await request({ jwt: token(), url: '/api/osce?image=OSCE_MED_test.png&image=secret.jpg' })).statusCode, 400);
  assert.equal((await request({ jwt: token(), url: '/api/osce?token=ignored' })).statusCode, 400);
});

test('HEAD/POST/OPTIONS do not deliver content', async () => {
  for (const method of ['HEAD', 'POST', 'OPTIONS']) {
    const response = await request({ jwt: token(), method });
    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.allow, 'GET');
    assert.doesNotMatch(response.body, /private answer/);
  }
});

test('Google public keys cache until expiry; fetch failure closes access', async () => {
  let timeMs = clock * 1000;
  let fetches = 0;
  let fail = false;
  const getPublicKey = createGoogleKeyGetter(async (url) => {
    assert.equal(url, 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    fetches++;
    if (fail) throw new Error('offline');
    return { ok: true, headers: { get: () => 'public, max-age=10' },
      json: async () => ({ 'test-key': publicKey.export({ type: 'spki', format: 'pem' }) }),
    };
  }, () => timeMs);
  const handler = createHandler({ source, getPublicKey, now: () => clock });
  assert.equal((await request({ jwt: token(), handler })).statusCode, 200);
  assert.equal((await request({ jwt: token(), handler })).statusCode, 200);
  assert.equal(fetches, 1);
  assert.equal((await request({ jwt: token({}, { kid: 'unknown' }), handler })).statusCode, 401);
  assert.equal(fetches, 1);
  timeMs += 11000;
  fail = true;
  const denied = await request({ jwt: token(), handler });
  assert.equal(denied.statusCode, 503);
  assert.doesNotMatch(denied.body, /private answer|eyJ|offline/);
  assert.equal(fetches, 2);
});

test('Firestore permissions and upstream failures cannot leak private content', async () => {
  for (const upstreamStatus of [401, 403, 500]) {
    const rejectedSource = createFirestoreSource(async () => ({ ok: false, status: upstreamStatus }));
    const handler = createHandler({ source: rejectedSource, getPublicKey: keyGetter, now: () => clock });
    const response = await request({ jwt: token(), handler });
    assert.equal(response.statusCode, upstreamStatus === 500 ? 503 : upstreamStatus);
    assert.doesNotMatch(response.body, /private answer|eyJ/);
  }
});

test('malformed image chunks and content types fail closed', async () => {
  for (const overrides of [
    { 'osceImages/OSCE_MED_test.png': { contentType: { stringValue: 'text/html' }, parts: { integerValue: '2' } } },
    { 'osceImages/OSCE_MED_test.png': { contentType: { stringValue: 'image/png' }, parts: { integerValue: '999' } } },
    { 'osceImages/OSCE_MED_test.png/parts/001': { data: { stringValue: 'not-base64!' } } },
  ]) {
    const changedSource = createFirestoreSource(async (url) => {
      const docPath = url.split('/documents/')[1];
      return { ok: true, json: async () => ({ fields: overrides[docPath] || docs[docPath] }) };
    });
    const handler = createHandler({ source: changedSource, getPublicKey: keyGetter, now: () => clock });
    assert.equal((await request({ jwt: token(), handler, url: '/api/osce?image=OSCE_MED_test.png' })).statusCode, 500);
  }
});

test('warm caches reduce content reads but every request still authenticates; TTL reloads', async () => {
  let time = clock;
  let collectionReads = 0;
  let imageReads = 0;
  let keyChecks = 0;
  const cachedSource = {
    async readCollection() { collectionReads++; return { cards: privateCards, collection: { total: 1 } }; },
    async readImage() { imageReads++; return { bytes: privateImage, contentType: 'image/png' }; },
  };
  const handler = createHandler({ source: cachedSource, now: () => time,
    getPublicKey: async (kid) => { keyChecks++; return keyGetter(kid); },
  });
  const imageRequest = { jwt: token(), handler, url: '/api/osce?image=OSCE_MED_test.png' };
  assert.equal((await request(imageRequest)).statusCode, 200);
  assert.equal((await request(imageRequest)).statusCode, 200);
  assert.equal(collectionReads, 1);
  assert.equal(imageReads, 1);
  assert.equal(keyChecks, 2);
  assert.equal((await request({ handler, url: imageRequest.url })).statusCode, 401);
  assert.equal((await request({ ...imageRequest, jwt: token({ email_verified: false }) })).statusCode, 403);
  assert.equal((await request({ ...imageRequest, jwt: token({ email: 'another@gmail.com' }) })).statusCode, 403);
  assert.equal((await request({ ...imageRequest, jwt: token({ email: 'phodsawi.2547@gmail.com' }), url: '/api/osce?access=1' })).statusCode, 403);
  assert.equal(collectionReads, 1);
  assert.equal(imageReads, 1);
  time += 301;
  assert.equal((await request(imageRequest)).statusCode, 200);
  assert.equal(collectionReads, 2);
  assert.equal(imageReads, 1);
  time += 300;
  assert.equal((await request(imageRequest)).statusCode, 200);
  assert.equal(collectionReads, 3);
  assert.equal(imageReads, 2);
});
