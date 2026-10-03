import {auth, db} from '../quiz/firebase-client.js';
import {GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js';
import {doc, writeBatch} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';

const OWNER = 'phodsawi.2547@gmail.com';
const FORMAT = 'medguide-osce-cloud-v1';
const $ = id => document.getElementById(id);
const encoder = new TextEncoder();
let pack = null, checkpointKey = '', ownerUid = '', busy = false, selection = 0;
const waitForPaint = () => new Promise(resolve => setTimeout(resolve, 0));

function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function updateControls() {
  $('login').disabled = busy;
  $('logout').disabled = busy;
  $('pack').disabled = busy;
  $('resume').disabled = busy;
  $('upload').disabled = busy || !pack || !ownerUid;
}
function isOwner(user) {
  return !!user && user.emailVerified === true && user.email?.toLowerCase() === OWNER &&
    user.providerData.some(provider => provider.providerId === 'google.com');
}
async function verifyOwner(uid) {
  const user = auth.currentUser;
  if (!isOwner(user) || user.uid !== uid) throw new Error('บัญชีผู้ดูแลเปลี่ยนไป กรุณาเข้าสู่ระบบใหม่');
  const result = await user.getIdTokenResult();
  if (result.claims.email_verified !== true || result.claims.firebase?.sign_in_provider !== 'google.com') {
    throw new Error('กรุณาเข้าสู่ระบบด้วย Google');
  }
}
function utf8(value) { return encoder.encode(value).byteLength; }
async function digest(value) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
}
function requireValid(condition, message) { if (!condition) throw new Error(message); }

async function validatePack(value, ticket) {
  requireValid(value?.format === FORMAT && Array.isArray(value.images), 'ไฟล์นี้ไม่ใช่ชุดฝึก OSCE สำหรับ MedGuide');
  const fields = value.collection;
  requireValid(fields && typeof fields.cardsJson === 'string' && typeof fields.collectionJson === 'string' && Array.isArray(fields.imageKeys), 'ข้อมูลชุดโจทย์ไม่ครบ');
  requireValid(utf8(JSON.stringify(fields)) + 8192 < 1048576, 'ชุดโจทย์ใหญ่เกินขนาดที่อัปโหลดได้');
  const cards = JSON.parse(fields.cardsJson), collection = JSON.parse(fields.collectionJson);
  requireValid(Array.isArray(cards) && cards.length > 0 && cards.length <= 10000 && collection?.cards === cards.length, 'จำนวนโจทย์ในไฟล์ไม่ตรงกัน');
  requireValid(cards.every(card => typeof card.id === 'string' && card.id.length > 0) && new Set(cards.map(card => card.id)).size === cards.length, 'รหัสการ์ดไม่ครบหรือซ้ำกัน');
  const keys = new Set(fields.imageKeys);
  requireValid(keys.size === fields.imageKeys.length && keys.size === value.images.length && keys.size <= 10000, 'รายการรูปในไฟล์ไม่ตรงกัน');
  requireValid(cards.every(card => !card.imageKey || keys.has(card.imageKey)), 'การ์ดมีรูปที่ไม่อยู่ในไฟล์นี้');
  const seen = new Set();
  for (let i = 0; i < value.images.length; i++) {
    if (ticket !== selection) throw new Error('เลือกไฟล์ใหม่แล้ว');
    const image = value.images[i];
    requireValid(/^[a-f0-9]{64}\.(png|jpg)$/.test(image.key) && keys.has(image.key) && !seen.has(image.key), 'รหัสรูปไม่ถูกต้องหรือซ้ำกัน');
    seen.add(image.key);
    requireValid(image.contentType === (image.key.endsWith('.png') ? 'image/png' : 'image/jpeg') && Array.isArray(image.parts) && image.parts.length > 0 && image.parts.length <= 32, 'รายละเอียดรูปไม่ครบ');
    requireValid(image.parts.every(part => typeof part === 'string' && part.length > 0 && part.length <= 450000), 'ชิ้นส่วนรูปใหญ่เกินขนาดที่อัปโหลดได้');
    const encoded = image.parts.join('');
    requireValid(encoded.length <= Math.ceil(4400000 / 3) * 4 && /^[A-Za-z0-9+/]+={0,2}$/.test(encoded), 'ข้อมูลรูปไม่ถูกต้อง');
    const raw = atob(encoded), bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
    requireValid(bytes.length > 0 && bytes.length <= 4400000 && bytes.length === image.bytes && btoa(raw) === encoded, 'ขนาดรูปไม่ตรงกับข้อมูลในไฟล์');
    requireValid(await digest(bytes) === image.key.slice(0, 64), 'รูปในไฟล์ไม่ตรงกับรหัสรูป');
    const signatureOk = image.contentType === 'image/png'
      ? bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    requireValid(signatureOk, 'รูปในไฟล์มีชนิดไม่ตรงกับรายละเอียด');
    if (i % 10 === 0) { status(`กำลังอ่านไฟล์ · ตรวจรูป ${i + 1}/${value.images.length}`); await waitForPaint(); }
  }
  return {cards, collection};
}

$('login').addEventListener('click', async () => {
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch { status('เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง', true); }
});
$('logout').addEventListener('click', () => signOut(auth).catch(() => status('ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง', true)));
onAuthStateChanged(auth, user => {
  ownerUid = isOwner(user) ? user.uid : '';
  $('account').textContent = user?.email || 'ยังไม่ได้เข้าสู่ระบบ';
  $('logout').hidden = !user;
  $('login').hidden = !!ownerUid;
  $('panel').hidden = !ownerUid;
  if (!ownerUid) {
    pack = null; checkpointKey = ''; selection++;
    $('pack').value = ''; $('summary').textContent = 'ยังไม่ได้เลือกไฟล์';
    status(user ? 'บัญชีนี้เปิดหน้าจัดการชุดฝึกไม่ได้' : 'กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแล');
  } else if (!busy) status('เลือกไฟล์ชุดฝึกเพื่ออัปโหลด');
  updateControls();
});

$('pack').addEventListener('change', async event => {
  const file = event.target.files[0], ticket = ++selection;
  pack = null; checkpointKey = ''; $('progress').value = 0; updateControls();
  if (!file) return;
  try {
    requireValid(file.size <= 80000000, 'ไฟล์ใหญ่เกิน 80 MB');
    const value = JSON.parse(await file.text());
    const {cards} = await validatePack(value, ticket);
    if (ticket !== selection) return;
    checkpointKey = `osce-import-v2-${await digest(JSON.stringify(value.collection))}`;
    pack = value;
    $('summary').textContent = `${file.name} · ${cards.length} การ์ด · ${value.images.length} รูป`;
    status('อ่านไฟล์ครบแล้ว พร้อมอัปโหลด');
  } catch (error) { if (ticket === selection) status(error.message || 'อ่านไฟล์ไม่สำเร็จ', true); }
  updateControls();
});

$('upload').addEventListener('click', async () => {
  if (busy || !pack || !ownerUid) return;
  busy = true; updateControls();
  const uid = ownerUid, currentPack = pack, key = `${checkpointKey}-${uid}`;
  let total = 0, completed = 0;
  try {
    await verifyOwner(uid);
    const writes = [];
    for (const image of currentPack.images) {
      image.parts.forEach((data, index) => writes.push({path: `osceImages/${image.key}/parts/${String(index).padStart(3, '0')}`, data: {data}}));
      writes.push({path: `osceImages/${image.key}`, data: {contentType: image.contentType, parts: image.parts.length}});
    }
    total = writes.length + 1;
    // Bound both document count and bytes: base64 chunks can reach 450 KiB each.
    // Firestore's request limit is 10 MiB; 4 MiB leaves room for wire overhead.
    const groups = [];
    let group = [], groupBytes = 0;
    for (const write of writes) {
      const bytes = utf8(JSON.stringify(write.data)) + utf8(write.path) + 500;
      requireValid(bytes < 4 * 1024 * 1024, 'ข้อมูลหนึ่งรายการใหญ่เกินขนาดที่อัปโหลดได้');
      if (group.length && (group.length >= 100 || groupBytes + bytes > 4 * 1024 * 1024)) {
        groups.push(group); group = []; groupBytes = 0;
      }
      group.push(write); groupBytes += bytes;
    }
    if (group.length) groups.push(group);
    const batches = groups.length;
    let firstBatch = 0;
    if ($('resume').checked) {
      try { const saved = Number(localStorage.getItem(key)); if (Number.isInteger(saved) && saved >= 0 && saved <= batches) firstBatch = saved; } catch { /* Upload still works without a local checkpoint. */ }
    }
    completed = groups.slice(0, firstBatch).reduce((count, entries) => count + entries.length, 0);
    $('progress').max = total; $('progress').value = completed;
    for (let i = firstBatch; i < batches; i++) {
      await verifyOwner(uid);
      status(`กำลังอัปโหลดรูป · ${completed}/${total} รายการ`);
      const batch = writeBatch(db);
      const group = groups[i];
      group.forEach(write => batch.set(doc(db, write.path), write.data));
      await batch.commit();
      completed += group.length; $('progress').value = completed;
      try { localStorage.setItem(key, String(i + 1)); } catch { /* Next attempt starts from the beginning. */ }
    }
    await verifyOwner(uid);
    status('รูปครบแล้ว กำลังเปลี่ยนชุดโจทย์…');
    const finalBatch = writeBatch(db);
    finalBatch.set(doc(db, 'osceContent/collection'), currentPack.collection);
    await finalBatch.commit();
    $('progress').value = total;
    try { localStorage.removeItem(key); } catch { /* Replacing the same deterministic documents is safe. */ }
    status(`อัปโหลดครบแล้ว · ${currentPack.images.length} รูป พร้อมใช้ในชุดฝึก OSCE`);
  } catch (error) {
    const permission = error.code === 'permission-denied' || error.code === 'firestore/permission-denied';
    status(permission
      ? `อัปโหลดหยุดที่ ${completed}/${total} รายการ · บัญชีนี้ยังเขียนข้อมูลชุดฝึกไม่ได้ ให้ผู้ดูแลตรวจสิทธิ์ Firestore แล้วเลือกไฟล์เดิมเพื่อทำต่อ`
      : `อัปโหลดหยุดที่ ${completed}/${total} รายการ · ${error.message || 'เชื่อมต่อไม่สำเร็จ'}\nเลือกไฟล์เดิมเพื่อทำต่อได้`, true);
  } finally { busy = false; updateControls(); }
});
