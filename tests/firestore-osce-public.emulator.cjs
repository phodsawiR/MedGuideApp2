// Local emulator only: never reads or modifies the production project.
const fs = require('node:fs'), path = require('node:path');
const { test, before, after } = require('node:test');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, getDocs, collection, serverTimestamp } = require(require.resolve('firebase/firestore', { paths: [path.dirname(require.resolve('@firebase/rules-unit-testing'))] }));
let env;
const claims = email => ({ email, email_verified: true, firebase: { sign_in_provider: 'google.com' } });
const progress = () => ({ v: 1, updatedAt: serverTimestamp(), clientUpdatedAt: 1, dueAt: 0, intervalDays: 0, ease: 2.5, reps: 0, lapses: 0, rating: '', response: 'Synthetic answer' });
before(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '').split(':');
  if (!['127.0.0.1', 'localhost'].includes(host)) throw Error('Set a localhost FIRESTORE_EMULATOR_HOST; production is prohibited');
  env = await initializeTestEnvironment({ projectId: 'demo-medguide-osce', firestore: { host, port: Number(port), rules: fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8') } });
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    for (const [ref, value] of Object.entries({
      'osceContent/collection': { cardsJson: '[]', collectionJson: '{}', imageKeys: ['included.png'] },
      'osceContent/other': { private: true },
      'osceImages/included.png': { parts: 1 }, 'osceImages/included.png/parts/000': { data: 'test' },
      'osceImages/unlisted.png': { parts: 1 }, 'osceImages/unlisted.png/parts/000': { data: 'test' },
      'osceProgress/alice/cards/test': progress(),
    })) await setDoc(doc(db, ref), value);
  });
});
after(async () => { if (env) await env.cleanup(); });
test('guest gets only exact deck and manifest image metadata/parts, with no listing', async () => {
  const db = env.unauthenticatedContext().firestore();
  for (const ref of ['osceContent/collection', 'osceImages/included.png', 'osceImages/included.png/parts/000']) await assertSucceeds(getDoc(doc(db, ref)));
  for (const ref of ['osceContent/other', 'osceImages/unlisted.png', 'osceImages/unlisted.png/parts/000', 'osceProgress/alice/cards/test']) await assertFails(getDoc(doc(db, ref)));
  for (const ref of ['osceContent', 'osceImages', 'osceImages/included.png/parts', 'osceProgress/alice/cards']) await assertFails(getDocs(collection(db, ref)));
});
test('guest cannot write content, manifest, images, or progress', async () => {
  const db = env.unauthenticatedContext().firestore();
  for (const ref of ['osceContent/collection', 'osceImages/included.png', 'osceImages/included.png/parts/000', 'osceProgress/alice/cards/test']) await assertFails(setDoc(doc(db, ref), { unauthorized: true }));
});
test('verified member keeps private reads and owner-only valid progress writes', async () => {
  const alice = env.authenticatedContext('alice', claims('alice@example.com')).firestore();
  const bob = env.authenticatedContext('bob', claims('bob@example.com')).firestore();
  await assertSucceeds(getDoc(doc(alice, 'osceContent/other')));
  await assertSucceeds(getDoc(doc(alice, 'osceProgress/alice/cards/test')));
  await assertSucceeds(setDoc(doc(alice, 'osceProgress/alice/cards/test'), progress()));
  await assertFails(getDoc(doc(bob, 'osceProgress/alice/cards/test')));
  await assertFails(setDoc(doc(bob, 'osceProgress/alice/cards/test'), progress()));
  await assertFails(setDoc(doc(alice, 'osceContent/collection'), { imageKeys: ['unauthorized.png'] }));
});
