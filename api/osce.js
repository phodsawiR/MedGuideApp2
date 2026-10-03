// Private OSCE delivery. Content is in protected Firestore, never in public Git/assets.
// Verification follows https://firebase.google.com/docs/auth/admin/verify-id-tokens
const crypto = require('node:crypto');

const PROJECT = 'medguide-34566';
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const IMAGE_NAME = /^[A-Za-z0-9_-]+\.(?:png|jpe?g)$/i;
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const MAX_IMAGE_BYTES = 4400000;

class AccessError extends Error {
  constructor(status) { super('OSCE request denied'); this.status = status; }
}

function parsePart(encoded) {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) throw new AccessError(401);
  const decoded = Buffer.from(encoded, 'base64url');
  if (decoded.toString('base64url') !== encoded) throw new AccessError(401);
  const value = JSON.parse(decoded.toString('utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AccessError(401);
  return value;
}

function createGoogleKeyGetter(fetchImpl = fetch, now = Date.now) {
  let cached = null;
  let expires = 0;
  let inFlight = null;
  async function refresh() {
    try {
      const response = await fetchImpl(CERTS_URL, {
        signal: AbortSignal.timeout(8000), redirect: 'error',
      });
      if (!response.ok) throw new Error('Key service unavailable');
      const certs = await response.json();
      if (!certs || typeof certs !== 'object' || Array.isArray(certs)) throw new Error('Invalid keys');
      const keys = new Map();
      for (const [kid, cert] of Object.entries(certs)) {
        if (typeof cert !== 'string') throw new Error('Invalid certificate');
        const key = crypto.createPublicKey(cert);
        if (key.asymmetricKeyType !== 'rsa') throw new Error('Invalid key type');
        keys.set(kid, key);
      }
      if (!keys.size) throw new Error('Empty keys');
      const ttl = /(?:^|,)\s*max-age=(\d+)/i.exec(response.headers.get('cache-control') || '');
      cached = keys;
      expires = now() + Math.min(ttl ? Number(ttl[1]) : 300, 86400) * 1000;
      return keys;
    } catch {
      // Never reuse expired keys if Google's service fails.
      throw new AccessError(503);
    }
  }
  return async (kid) => {
    if (!cached || now() >= expires) {
      if (!inFlight) inFlight = refresh().finally(() => { inFlight = null; });
      await inFlight;
    }
    const key = cached.get(kid);
    if (!key) throw new AccessError(401);
    return key;
  };
}

async function verifyToken(token, getPublicKey, nowSeconds) {
  try {
    if (typeof token !== 'string' || token.length > 16384) throw new AccessError(401);
    const parts = token.split('.');
    if (parts.length !== 3) throw new AccessError(401);
    const [encodedHeader, encodedClaims, encodedSignature] = parts;
    const header = parsePart(encodedHeader);
    const claims = parsePart(encodedClaims);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid ||
        header.kid.length > 256 || header.crit !== undefined ||
        (header.typ !== undefined && header.typ !== 'JWT')) throw new AccessError(401);
    if (!/^[A-Za-z0-9_-]+$/.test(encodedSignature)) throw new AccessError(401);
    const signature = Buffer.from(encodedSignature, 'base64url');
    if (signature.toString('base64url') !== encodedSignature) throw new AccessError(401);
    const key = await getPublicKey(header.kid);
    if (!crypto.verify('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedClaims}`), key, signature)) {
      throw new AccessError(401);
    }
    if (claims.aud !== PROJECT || claims.iss !== `https://securetoken.google.com/${PROJECT}` ||
        typeof claims.sub !== 'string' || !claims.sub.trim() || claims.sub.length > 128 ||
        !Number.isInteger(claims.exp) || claims.exp <= nowSeconds ||
        !Number.isInteger(claims.iat) || claims.iat < 0 || claims.iat > nowSeconds ||
        !Number.isInteger(claims.auth_time) || claims.auth_time < 0 || claims.auth_time > nowSeconds ||
        claims.auth_time > claims.iat || claims.exp <= claims.iat) throw new AccessError(401);
    if (claims.email_verified !== true || typeof claims.email !== 'string' ||
        !claims.email.trim() ||
        claims.firebase?.sign_in_provider !== 'google.com') throw new AccessError(403);
    return claims;
  } catch (error) {
    if (error instanceof AccessError) throw error;
    throw new AccessError(401);
  }
}

function createFirestoreSource(fetchImpl = fetch) {
  async function readDocument(documentPath, token) {
    let response;
    try {
      response = await fetchImpl(`${FIRESTORE_URL}/${documentPath}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000), redirect: 'error', cache: 'no-store',
      });
    } catch { throw new AccessError(503); }
    if (!response.ok) {
      const status = [401, 403, 404].includes(response.status) ? response.status : 503;
      throw new AccessError(status);
    }
    const document = await response.json();
    if (!document || typeof document.fields !== 'object') throw new Error('Invalid private content');
    return document.fields;
  }
  return {
    async readCollection(token) {
      const fields = await readDocument('osceContent/collection', token);
      if (typeof fields.cardsJson?.stringValue !== 'string' || typeof fields.collectionJson?.stringValue !== 'string') {
        throw new Error('Invalid private collection');
      }
      return { cards: JSON.parse(fields.cardsJson.stringValue), collection: JSON.parse(fields.collectionJson.stringValue) };
    },
    async readImage(token, imageKey) {
      if (!IMAGE_NAME.test(imageKey)) throw new AccessError(404);
      const prefix = `osceImages/${imageKey}`;
      const fields = await readDocument(prefix, token);
      const countValue = fields.parts?.integerValue;
      const contentType = fields.contentType?.stringValue;
      const expectedType = /\.png$/i.test(imageKey) ? 'image/png' : 'image/jpeg';
      if (typeof countValue !== 'string' || !/^[1-9]\d?$/.test(countValue) ||
          Number(countValue) > 32 || contentType !== expectedType) throw new Error('Invalid private image');
      const chunks = Array(Number(countValue));
      let next = 0;
      // Bound concurrency when reconstructing protected base64 chunks.
      await Promise.all(Array.from({ length: Math.min(4, chunks.length) }, async () => {
        while (next < chunks.length) {
          const index = next++;
          const chunk = await readDocument(`${prefix}/parts/${String(index).padStart(3, '0')}`, token);
          const data = chunk.data?.stringValue;
          if (typeof data !== 'string' || data.length > 450000) throw new Error('Invalid private image part');
          chunks[index] = data;
        }
      }));
      const encoded = chunks.join('');
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) {
        throw new Error('Invalid private image data');
      }
      const bytes = Buffer.from(encoded, 'base64');
      if (bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== encoded) throw new Error('Invalid private image encoding');
      return { bytes, contentType };
    },
  };
}

// Explicit dependencies support synthetic-key unit tests; requests cannot override them.
function createHandler({
  source = createFirestoreSource(),
  getPublicKey = createGoogleKeyGetter(),
  now = () => Math.floor(Date.now() / 1000),
} = {}) {
  // Cache only successfully loaded content. Every request verifies its own
  // ID token and verified Google membership before accessing this cache.
  let collectionCache;
  let collectionPending;
  const imageCache = new Map();
  const imagePending = new Map();
  let imageBytes = 0;
  const imageBudget = 20 * 1024 * 1024;

  async function loadCollection(token) {
    if (collectionCache && collectionCache.expires > now()) return collectionCache.content;
    if (!collectionPending) {
      collectionPending = source.readCollection(token).then((content) => {
        if (!Array.isArray(content.cards)) throw new Error('Invalid private collection');
        collectionCache = { content, expires: now() + 300 };
        return content;
      }).finally(() => { collectionPending = null; });
    }
    return collectionPending;
  }

  function removeImage(key) {
    const entry = imageCache.get(key);
    if (entry) { imageBytes -= entry.bytes.length; imageCache.delete(key); }
  }
  async function loadImage(token, image) {
    for (const [key, entry] of imageCache) if (entry.expires <= now()) removeImage(key);
    const cached = imageCache.get(image);
    if (cached) {
      imageCache.delete(image);
      imageCache.set(image, cached);
      return cached;
    }
    if (!imagePending.has(image)) {
      const pending = source.readImage(token, image).then((entry) => {
        if (!Buffer.isBuffer(entry.bytes) || entry.bytes.length > MAX_IMAGE_BYTES) throw new Error('Invalid private image');
        while (imageBytes + entry.bytes.length > imageBudget && imageCache.size) {
          removeImage(imageCache.keys().next().value);
        }
        const stored = { ...entry, expires: now() + 600 };
        imageCache.set(image, stored);
        imageBytes += entry.bytes.length;
        return stored;
      }).finally(() => { imagePending.delete(image); });
      imagePending.set(image, pending);
    }
    return imagePending.get(image);
  }

  return async function handler(req, res) {
    // Browser and CDN caches must not retain account-private content.
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    res.setHeader('Vary', 'Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const json = (status, body) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return json(405, { error: 'Method not allowed' });
    }
    try {
      const authorization = req.headers?.authorization;
      const match = typeof authorization === 'string' && /^Bearer ([A-Za-z0-9_.-]+)$/.exec(authorization);
      if (!match) throw new AccessError(401);
      await verifyToken(match[1], getPublicKey, now());
      const url = new URL(req.url, 'https://osce.invalid');
      if ([...url.searchParams.keys()].some((name) => name !== 'image' && name !== 'access') ||
          url.searchParams.getAll('image').length > 1 || url.searchParams.getAll('access').length > 1) {
        throw new AccessError(400);
      }
      if (url.searchParams.has('access')) {
        if (url.searchParams.get('access') !== '1' || url.searchParams.has('image')) throw new AccessError(400);
        return json(200, { allowed: true });
      }
      // On a cache miss Firestore also checks the verified request's ID token.
      const content = await loadCollection(match[1]);
      if (!url.searchParams.has('image')) return json(200, { cards: content.cards, collection: content.collection });
      const image = url.searchParams.get('image');
      if (!IMAGE_NAME.test(image || '') || !content.cards.some((card) => card.imageKey === image)) throw new AccessError(404);
      const { bytes, contentType } = await loadImage(match[1], image);
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', String(bytes.length));
      res.end(bytes);
    } catch (error) {
      const status = error instanceof AccessError ? error.status : 500;
      return json(status, { error: status === 503 ? 'Service temporarily unavailable' : status === 500 ? 'Content unavailable' : 'Access denied' });
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.verifyToken = verifyToken;
module.exports.createGoogleKeyGetter = createGoogleKeyGetter;
module.exports.createFirestoreSource = createFirestoreSource;
