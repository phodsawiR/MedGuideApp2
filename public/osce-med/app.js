import { auth, db } from '../quiz/firebase-client.js';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js';
import { collection, doc, getDocs, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';

const DAY = 86400000;
const $ = id => document.getElementById(id);
const items = value => Array.isArray(value) ? value : value ? [value] : [];

// A small spacing rule for this deck; it does not implement Anki FSRS.
export function schedule(previous = {}, rating, now = Date.now()) {
  const oldInterval = Number(previous.intervalDays) || 0, isNew = !previous.rating;
  let ease = Number(previous.ease) || 2.5, intervalDays;
  if (rating === 'again') { intervalDays = 10 / 1440; ease = Math.max(1.3, ease - 0.2); }
  else if (rating === 'hard') { intervalDays = isNew ? 1 : Math.max(1, oldInterval * 1.2); ease = Math.max(1.3, ease - 0.15); }
  else if (rating === 'good') intervalDays = isNew ? 1 : Math.max(1, oldInterval * ease);
  else if (rating === 'easy') { intervalDays = isNew ? 4 : Math.max(4, oldInterval * ease * 1.3); ease = Math.min(3.5, ease + 0.15); }
  else throw new Error('Unknown rating');
  intervalDays = Math.min(3650, intervalDays);
  return { ...previous, v: 1, rating, ease, intervalDays, dueAt: now + Math.round(intervalDays * DAY),
    reps: (Number(previous.reps) || 0) + 1, lapses: (Number(previous.lapses) || 0) + (rating === 'again' ? 1 : 0),
    response: String(previous.response || '').slice(0, 12000), clientUpdatedAt: now };
}
export function mergeProgress(cloud, local) {
  const merged = { ...cloud };
  for (const [id, value] of Object.entries(local || {}))
    if (!merged[id] || Number(value.clientUpdatedAt || 0) > Number(merged[id].clientUpdatedAt || 0)) merged[id] = value;
  return merged;
}
export function shuffled(values, random = Math.random) {
  const result = values.slice();
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function eligible(card, progress, mode, now = Date.now()) {
  const value = progress[card.id], reviewed = Boolean(value?.rating);
  if (mode === 'new') return !reviewed;
  if (mode === 'review') return reviewed;
  if (mode === 'all') return true;
  return !reviewed || Number(value.dueAt || 0) <= now;
}

let user = null, generation = 0, cards = [], progress = {}, pending = {}, queue = [], index = 0;
let revealed = false, ready = false, cloudReadable = false, localAvailable = true, syncing = false;
let objectURL = null, transientImageURL = false, imageController = null, imageGeneration = 0, responseTimeout = null, retryTimeout = null;
const imageCache = new Map();
const MAX_CACHED_IMAGES = 8, MAX_CACHED_BYTES = 20 * 1024 * 1024;
let timerInterval = null, remainingMs = 180000, deadline = 0;
const ratedThisRound = new Set(), ratingButtons = Array.from(document.querySelectorAll('[data-rating]'));
const current = () => queue[index];
const announce = text => { $('announcement').textContent = text; };
const localKey = uid => uid ? 'medguide.osce.pending.v1.' + uid : 'medguide.osce.guest.v1';

function readLocal(uid) {
  try { const value = JSON.parse(localStorage.getItem(localKey(uid)) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  catch (_) { localAvailable = false; return {}; }
}
function saveLocal() {
  try { localStorage.setItem(localKey(user?.uid), JSON.stringify(user ? pending : progress)); localAvailable = true; }
  catch (_) { localAvailable = false; }
  syncMessage();
}
function syncMessage(note = '') {
  if (!user) {
    $('sync-status').textContent = localAvailable ? 'โหมดผู้เยี่ยมชม · เก็บความคืบหน้าในเครื่องนี้' : 'เครื่องนี้เก็บความคืบหน้าไม่ได้ อย่าปิดหน้านี้';
    $('storage-note').textContent = 'เข้าสู่บัญชี Google เพื่อใช้ความคืบหน้าของบัญชีข้ามเครื่อง · ข้อมูลผู้เยี่ยมชมแยกจากบัญชี';
    return;
  }
  const count = Object.keys(pending).length;
  let message = note || (syncing ? 'กำลังบันทึกลงบัญชี…' : count ? 'รอบันทึกลงบัญชี ' + count + ' การ์ด' : cloudReadable ? 'ความคืบหน้าบันทึกไว้ในบัญชีแล้ว' : 'ยังอ่านความคืบหน้าจากบัญชีไม่ได้');
  if (count && !navigator.onLine) message = localAvailable ? 'ออฟไลน์ · เก็บ ' + count + ' การ์ดไว้ในเครื่อง รอเชื่อมต่อเพื่อบันทึกลงบัญชี' : 'ออฟไลน์ · ยังบันทึกคำตอบไม่ได้ อย่าปิดหน้านี้';
  if (!localAvailable && count && navigator.onLine && !syncing) message += ' · เครื่องนี้เก็บสำรองไม่ได้';
  $('sync-status').textContent = message;
  $('storage-note').textContent = count ? 'คำตอบกำลังรอบันทึกลงบัญชี' : cloudReadable ? 'คำตอบและวันทวนเก็บไว้ในบัญชีนี้' : 'คำตอบจะเก็บไว้ในเครื่องก่อน แล้วบันทึกลงบัญชีเมื่อเชื่อมต่อได้';
}
function normalized(value = {}) {
  return { v: 1, dueAt: Number(value.dueAt) || 0, intervalDays: Number(value.intervalDays) || 0, ease: Number(value.ease) || 2.5,
    reps: Number(value.reps) || 0, lapses: Number(value.lapses) || 0, rating: value.rating || '',
    response: String(value.response || '').slice(0, 12000), clientUpdatedAt: Number(value.clientUpdatedAt) || 0 };
}
function updateProgress(id, value) { progress[id] = normalized(value); if (user) pending[id] = progress[id]; saveLocal(); updateCounts(); }
async function syncPending() {
  if (syncing || !user || !ready || !navigator.onLine) { syncMessage(); return; }
  const activeUser = user, activeGeneration = generation;
  syncing = true; syncMessage();
  let failed = false;
  try {
    // Never overwrite the cloud with blank browser progress if the first read failed.
    if (!cloudReadable) {
      const snapshot = await getDocs(collection(db, 'osceProgress', activeUser.uid, 'cards'));
      if (activeGeneration !== generation) return;
      const remote = {}; snapshot.forEach(row => { remote[row.id] = normalized(row.data()); });
      progress = mergeProgress(remote, pending); cloudReadable = true;
      for (const id of Object.keys(pending)) if (progress[id] !== pending[id]) delete pending[id];
      saveLocal(); updateCounts();
      if (current() && document.activeElement !== $('response')) $('response').value = progress[current().id]?.response || '';
    }
    for (const [id, value] of Object.entries(pending)) {
      if (activeGeneration !== generation) return;
      await setDoc(doc(db, 'osceProgress', activeUser.uid, 'cards', id), { ...normalized(value), updatedAt: serverTimestamp() });
      if (activeGeneration !== generation) return;
      if (pending[id] === value) delete pending[id];
      saveLocal();
    }
  } catch (_) {
    failed = true;
    if (activeGeneration === generation) { clearTimeout(retryTimeout); retryTimeout = setTimeout(syncPending, 30000); }
  } finally {
    if (activeGeneration === generation) {
      syncing = false;
      syncMessage(failed ? (localAvailable ? 'ยังบันทึกลงบัญชีไม่ได้ · เก็บในเครื่องไว้ก่อน และจะลองใหม่เมื่อเชื่อมต่อ' : 'ยังบันทึกคำตอบไม่ได้ อย่าปิดหน้านี้ แล้วลองเชื่อมต่ออีกครั้ง') : '');
      // Include edits made while an earlier write was in flight.
      if (!failed && Object.keys(pending).length) void syncPending();
    }
  }
}
function flushResponse() {
  clearTimeout(responseTimeout); responseTimeout = null;
  const card = current(); if (!ready || !card) return;
  const response = $('response').value.slice(0, 12000);
  if (response === String(progress[card.id]?.response || '')) return;
  updateProgress(card.id, { ...normalized(progress[card.id]), response, clientUpdatedAt: Math.max(Date.now(), (progress[card.id]?.clientUpdatedAt || 0) + 1) }); void syncPending();
}
function clearImage() {
  imageGeneration++; imageController?.abort(); imageController = null;
  if ($('image-dialog').open) $('image-dialog').close();
  $('station-image').removeAttribute('src'); $('zoom-image').removeAttribute('src');
  if (transientImageURL && objectURL) URL.revokeObjectURL(objectURL);
  objectURL = null; transientImageURL = false;
  $('station-image').hidden = true; $('image-open').disabled = true;
}
function clearImageCache() {
  for (const value of imageCache.values()) URL.revokeObjectURL(value.url);
  imageCache.clear();
}
function cacheImage(key, blob) {
  if (blob.size > MAX_CACHED_BYTES) { transientImageURL = true; return URL.createObjectURL(blob); }
  const value = { url: URL.createObjectURL(blob), bytes: blob.size };
  imageCache.set(key, value);
  let bytes = Array.from(imageCache.values()).reduce((sum, entry) => sum + entry.bytes, 0);
  while (imageCache.size > MAX_CACHED_IMAGES || (bytes > MAX_CACHED_BYTES && imageCache.size > 1)) {
    const oldest = imageCache.keys().next().value, removed = imageCache.get(oldest);
    imageCache.delete(oldest); URL.revokeObjectURL(removed.url); bytes -= removed.bytes;
  }
  return value.url;
}
async function contentFetch(url, activeUser, signal) {
  const token = activeUser ? await activeUser.getIdToken() : null;
  return fetch(url, { headers: token ? { Authorization: 'Bearer ' + token } : {}, cache: 'no-store', signal });
}
async function loadImage(card) {
  clearImage();
  const hasImage = Boolean(card.imageKey);
  document.querySelector('.image-panel').hidden = !hasImage;
  document.querySelector('.station-layout').classList.toggle('text-only', !hasImage);
  $('image-error').hidden = true; $('image-loading').hidden = !hasImage;
  if (!hasImage) return;
  if (imageCache.has(card.imageKey)) {
    const cached = imageCache.get(card.imageKey); imageCache.delete(card.imageKey); imageCache.set(card.imageKey, cached);
    objectURL = cached.url; $('station-image').src = objectURL; $('station-image').hidden = false;
    $('image-open').disabled = false; $('image-loading').hidden = true; return;
  }
  const activeUser = user, activeGeneration = generation, request = imageGeneration;
  imageController = new AbortController();
  try {
    const response = await contentFetch('/api/osce?image=' + encodeURIComponent(card.imageKey), activeUser, imageController.signal);
    if (activeGeneration !== generation || request !== imageGeneration) return;
    if (response.status === 401 || response.status === 403) { denyAccess('บัญชีนี้ยังเปิดชุด OSCE ไม่ได้ กรุณาเลือกบัญชี Google ที่ได้รับสิทธิ์'); return; }
    if (!response.ok) throw new Error('Image request failed');
    const blob = await response.blob();
    if (activeGeneration !== generation || request !== imageGeneration) return;
    objectURL = cacheImage(card.imageKey, blob); $('station-image').src = objectURL;
    $('station-image').hidden = false; $('image-open').disabled = false; $('image-loading').hidden = true;
  } catch (error) {
    if (error.name === 'AbortError' || activeGeneration !== generation || request !== imageGeneration) return;
    $('image-loading').hidden = true; $('image-error').textContent = 'เปิดรูปไม่ได้ ลองเลือกสถานีนี้ใหม่เมื่อเชื่อมต่ออินเทอร์เน็ต'; $('image-error').hidden = false;
  }
}
function clearStudy() {
  ready = false; pauseTimer(); clearTimeout(responseTimeout); clearTimeout(retryTimeout); clearImage(); clearImageCache();
  cards = []; progress = {}; pending = {}; queue = []; index = 0; revealed = false; cloudReadable = false; syncing = false; ratedThisRound.clear();
  $('study').hidden = true; $('station').hidden = true; $('answer').hidden = true;
  $('answer-content').replaceChildren(); $('source-content').replaceChildren(); $('prompt').textContent = ''; $('tasks').replaceChildren(); $('response').value = '';
  $('auth-panel').hidden = false; $('retry').hidden = true;
  for (const id of ['chapter', 'category']) $(id).replaceChildren(new Option(id === 'chapter' ? 'ทุกบท' : 'ทุกหมวด', 'all'));
  $('search').value = ''; $('mode').value = 'due';
  $('deck-description').textContent = 'เปิดซ้อมได้ทุกคน · เข้าสู่บัญชีเพื่อบันทึกความคืบหน้าข้ามเครื่อง';
}
function denyAccess(message) {
  generation++; clearStudy(); $('auth-title').textContent = 'เข้าสู่บัญชี Google เพื่อเริ่มซ้อม'; $('auth-message').textContent = message;
  $('login').hidden = false; $('login').textContent = 'เปลี่ยนบัญชี Google';
}
async function loadAccount(activeUser) {
  const activeGeneration = ++generation; clearStudy();
  $('account').hidden = !activeUser; $('logout').hidden = !activeUser; $('account').textContent = activeUser?.email || '';

  $('login').hidden = true; $('auth-title').textContent = 'กำลังเปิดชุด OSCE'; $('auth-message').textContent = 'กำลังอ่านการ์ดและความคืบหน้าจากบัญชี…';
  try {
    const response = await contentFetch('/api/osce', activeUser);
    if (activeGeneration !== generation) return;
    if (response.status === 401 || response.status === 403) { denyAccess('บัญชีนี้ยังเปิดชุด OSCE ไม่ได้ กรุณาเลือกบัญชี Google ที่ได้รับสิทธิ์'); return; }
    if (!response.ok) throw new Error('Deck request failed');
    const data = await response.json(); if (activeGeneration !== generation) return;
    if (!Array.isArray(data.cards)) throw new Error('Invalid deck');
    cards = data.cards; pending = activeUser ? readLocal(activeUser.uid) : {};
    progress = activeUser ? {} : readLocal(null);
    const ids = new Set(cards.map(card => card.id));
    if (!activeUser) progress = Object.fromEntries(Object.entries(progress).filter(([id]) => ids.has(id)).map(([id, value]) => [id, normalized(value)]));
    pending = Object.fromEntries(Object.entries(pending).filter(([id]) => ids.has(id)).map(([id, value]) => [id, normalized(value)]));
    if (activeUser) try {
      const snapshot = await getDocs(collection(db, 'osceProgress', activeUser.uid, 'cards'));
      if (activeGeneration !== generation) return;
      const remote = {}; snapshot.forEach(row => { if (ids.has(row.id)) remote[row.id] = normalized(row.data()); });
      progress = mergeProgress(remote, pending); cloudReadable = true;
      for (const id of Object.keys(pending)) if (progress[id] !== pending[id]) delete pending[id];
    } catch (_) { if (activeGeneration !== generation) return; progress = { ...pending }; cloudReadable = false; }
    ready = true; saveLocal(); $('auth-panel').hidden = Boolean(activeUser); $('study').hidden = false;
    if (!activeUser) {
      $('auth-title').textContent = 'บันทึกความคืบหน้าข้ามเครื่อง';
      $('auth-message').textContent = 'ซ้อมได้ทันทีโดยไม่ต้องล็อกอิน หรือเข้าสู่บัญชี Google เพื่อใช้ความคืบหน้าส่วนตัวของบัญชี';
      $('login').hidden = false; $('login').textContent = 'เข้าสู่ระบบด้วย Google';
    }
    $('deck-description').textContent = cards.length + ' การ์ด · เลือกบท ซ้อมก่อนเปิดเฉลย แล้วประเมินเพื่อจัดวันทวน';
    for (const [id, key] of [['chapter', 'chapter'], ['category', 'category']]) {
      const values = Array.from(new Set(cards.map(card => card[key]).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th'));
      for (const value of values) $(id).appendChild(new Option(value, value));
    }
    rebuildQueue(); void syncPending();
  } catch (_) {
    if (activeGeneration !== generation) return;
    clearStudy(); $('auth-title').textContent = 'ยังเปิดชุด OSCE ไม่ได้'; $('auth-message').textContent = 'ตรวจการเชื่อมต่ออินเทอร์เน็ต แล้วลองโหลดอีกครั้ง'; $('retry').hidden = false;
  }
}
async function login() {
  $('login').disabled = true;
  const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
  try { await signInWithPopup(auth, provider); }
  catch (error) {
    if (error.code === 'auth/popup-blocked') await signInWithRedirect(auth, provider);
    else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') $('auth-message').textContent = 'เข้าสู่บัญชีไม่สำเร็จ กรุณาลองอีกครั้ง';
  } finally { $('login').disabled = false; }
}
function selectedCards() {
  const query = $('search').value.trim().toLowerCase();
  return cards.filter(card => ($('chapter').value === 'all' || card.chapter === $('chapter').value) &&
    ($('category').value === 'all' || card.category === $('category').value) &&
    (!query || [card.id, card.chapter, card.category, card.prompt, ...items(card.tasks), card.source?.file].join(' ').toLowerCase().includes(query)));
}
function updateCounts() {
  const selected = selectedCards(), now = Date.now(), reviewed = selected.filter(card => progress[card.id]?.rating);
  $('due-count').textContent = reviewed.filter(card => Number(progress[card.id].dueAt || 0) <= now).length;
  $('new-count').textContent = selected.length - reviewed.length; $('review-count').textContent = reviewed.length;
}
function rebuildQueue() {
  flushResponse(); ratedThisRound.clear(); queue = selectedCards().filter(card => eligible(card, progress, $('mode').value)); index = 0; renderStation(); updateCounts();
}
function safeLink(value) { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch (_) { return null; } }
function addLink(parent, label, url) { const href = safeLink(url); if (!href) return; const link = document.createElement('a'); link.textContent = label; link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; parent.appendChild(link); }
function paragraph(parent, text) { if (text) { const p = document.createElement('p'); p.textContent = text; parent.appendChild(p); } }
function answerSection(title, values, className = '') {
  const list = items(values).filter(Boolean); if (!list.length) return;
  const section = document.createElement('section'); section.className = 'answer-section ' + className;
  const heading = document.createElement('h4'); heading.textContent = title; const ul = document.createElement('ul');
  for (const text of list) { const li = document.createElement('li'); li.textContent = String(text); ul.appendChild(li); }
  section.append(heading, ul); $('answer-content').appendChild(section);
}
function renderAnswer() {
  const card = current(); if (!card) return; const answer = card.answer || {}; $('answer-content').replaceChildren(); $('source-content').replaceChildren();
  answerSection('Findings · สิ่งที่ต้องสังเกตหรือทำ', answer.findings); answerSection('Diagnosis · สรุป', answer.diagnosis);
  answerSection('คำถามต่อของสถานี', answer.additional, 'full-width'); answerSection('สิ่งที่ต้องรู้เกี่ยวกับสถานีนี้', card.limitations, 'full-width limitations');
  if (!$('answer-content').children.length) paragraph($('answer-content'), 'สถานีนี้ยังไม่มีแนวตอบ');
  const source = card.source || {}, parent = $('source-content');
  paragraph(parent, [source.file, source.page ? 'หน้า ' + source.page : null].filter(Boolean).join(' · '));
  for (const key of ['kind', 'imageCredit', 'imageLicense']) paragraph(parent, source[key]);
  for (const value of items(card.alsoSources)) paragraph(parent, [value.file, value.page ? 'หน้า ' + value.page : '', value.kind].filter(Boolean).join(' · '));
  addLink(parent, 'เปิดต้นฉบับ', source.url);
  for (const reference of items(card.references)) { const p = document.createElement('p'); addLink(p, reference.title || 'แหล่งอ้างอิง', reference.url); parent.appendChild(p); }
}
function intervalLabel(days) { if (days < 1 / 24) return Math.round(days * 1440) + ' นาที'; if (days < 1) return Math.round(days * 24) + ' ชั่วโมง'; return Math.round(days) + ' วัน'; }
function updateRatings() {
  const card = current();
  for (const button of ratingButtons) { button.disabled = !card || !revealed || ratedThisRound.has(card.id); button.querySelector('small').textContent = card ? intervalLabel(schedule(progress[card.id], button.dataset.rating).intervalDays) : ''; }
  $('rating-status').textContent = card && ratedThisRound.has(card.id) ? 'ประเมินสถานีนี้แล้ว · ถัดไปเพื่อซ้อมต่อ' : '';
}
function setRevealed(next) {
  if (!current()) return; revealed = next; $('answer').hidden = !next; $('reveal').textContent = next ? 'ซ่อนคำตอบ' : 'เปิดคำตอบ'; $('reveal').setAttribute('aria-expanded', String(next));
  if (next) { pauseTimer(); renderAnswer(); } else { $('answer-content').replaceChildren(); $('source-content').replaceChildren(); }
  updateRatings(); announce(next ? 'เปิดคำตอบแล้ว เลือก Again Hard Good หรือ Easy เพื่อนัดทวน' : 'ซ่อนคำตอบแล้ว');
}
function renderStation() {
  resetTimer(); clearImage(); revealed = false; $('answer').hidden = true; $('answer-content').replaceChildren(); $('source-content').replaceChildren();
  $('reveal').textContent = 'เปิดคำตอบ'; $('reveal').setAttribute('aria-expanded', 'false'); document.querySelector('.source-details').open = false;
  const card = current(); $('station').hidden = !card; $('empty').hidden = Boolean(card); $('timer-start').disabled = !card; $('timer-reset').disabled = !card;
  if (!card) {
    const selected = selectedCards(), nextDue = selected.map(c => progress[c.id]?.dueAt).filter(n => n > Date.now()).sort((a, b) => a - b)[0];
    $('empty-title').textContent = selected.length ? 'จบรอบนี้แล้ว' : 'ยังไม่มีสถานีที่ตรงกับตัวเลือกนี้';
    $('empty-message').textContent = selected.length ? (nextDue ? 'ครั้งต่อไป: ' + new Date(nextDue).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) + ' · หรือเลือกซ้อมทุกการ์ดได้เลย' : 'เลือกซ้อมทุกการ์ด หรือเปลี่ยนบทเพื่อเริ่มรอบใหม่') : 'ลองเปลี่ยนบท หมวด หรือคำค้น';
    updateRatings(); announce($('empty-title').textContent); return;
  }
  $('station-title').textContent = 'สถานี ' + String(cards.indexOf(card) + 1).padStart(3, '0'); $('dialog-title').textContent = $('station-title').textContent;
  $('station-category').textContent = [card.chapter, card.category].filter(Boolean).join(' · '); $('progress').textContent = index + 1 + ' / ' + queue.length; $('rated-progress').textContent = 'ประเมินรอบนี้ ' + ratedThisRound.size + ' การ์ด';
  $('prompt').textContent = card.prompt || 'ดูรูปแล้วตอบคำถามของสถานี'; $('tasks').replaceChildren();
  for (const text of items(card.tasks)) { const li = document.createElement('li'); li.textContent = String(text); $('tasks').appendChild(li); }
  $('response').value = progress[card.id]?.response || ''; $('station-image').alt = 'รูปประกอบ' + $('station-title').textContent;
  $('previous').disabled = index === 0; $('next').disabled = false; updateRatings(); void loadImage(card); announce($('station-title').textContent + ' พร้อมให้ตอบ');
}
function navigate(delta) { const next = index + delta; if (next < 0 || next > queue.length) return; flushResponse(); index = next; renderStation(); }
function rate(rating) {
  const card = current(); if (!card || !revealed || ratedThisRound.has(card.id)) return;
  flushResponse(); updateProgress(card.id, schedule(progress[card.id], rating, Math.max(Date.now(), (progress[card.id]?.clientUpdatedAt || 0) + 1))); ratedThisRound.add(card.id); void syncPending(); navigate(1);
}
function drawTimer() {
  const seconds = Math.ceil(Math.max(0, remainingMs) / 1000); $('timer').textContent = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  $('timer').classList.toggle('timer-expired', seconds === 0); $('timer').classList.toggle('timer-running', timerInterval !== null); $('timer-start').textContent = timerInterval !== null ? 'พัก' : 'เริ่ม';
}
function pauseTimer() { if (timerInterval !== null) { remainingMs = Math.max(0, deadline - Date.now()); clearInterval(timerInterval); timerInterval = null; } drawTimer(); }
function resetTimer() { pauseTimer(); remainingMs = Number($('duration').value) * 1000; drawTimer(); }
function toggleTimer() {
  if (!current()) return; if (timerInterval !== null) { pauseTimer(); return; } if (remainingMs <= 0) remainingMs = Number($('duration').value) * 1000;
  deadline = Date.now() + remainingMs; timerInterval = setInterval(() => { remainingMs = Math.max(0, deadline - Date.now()); if (!remainingMs) { clearInterval(timerInterval); timerInterval = null; announce('หมดเวลาซ้อม ลองสรุปคำตอบแล้วเปิดเฉลย'); } drawTimer(); }, 200); drawTimer();
}

$('login').addEventListener('click', login); $('retry').addEventListener('click', () => loadAccount(user));
$('logout').addEventListener('click', async () => { flushResponse(); await signOut(auth); });
for (const id of ['chapter', 'category', 'mode']) $(id).addEventListener('change', rebuildQueue);
$('search').addEventListener('input', rebuildQueue);
$('shuffle').addEventListener('click', () => { flushResponse(); queue = queue.slice(0, index).concat(shuffled(queue.slice(index))); renderStation(); announce('สลับลำดับการ์ดที่เหลือแล้ว'); });
$('response').addEventListener('input', () => { clearTimeout(responseTimeout); responseTimeout = setTimeout(flushResponse, 650); });
$('reveal').addEventListener('click', () => setRevealed(!revealed)); $('previous').addEventListener('click', () => navigate(-1)); $('next').addEventListener('click', () => navigate(1));
for (const button of ratingButtons) button.addEventListener('click', () => rate(button.dataset.rating));
$('refresh-queue').addEventListener('click', () => { $('mode').value = 'due'; rebuildQueue(); }); $('review-all').addEventListener('click', () => { $('mode').value = 'all'; rebuildQueue(); });
$('timer-start').addEventListener('click', toggleTimer); $('timer-reset').addEventListener('click', resetTimer); $('duration').addEventListener('change', resetTimer);
$('image-open').addEventListener('click', () => { if (!objectURL || $('station-image').hidden) return; $('zoom-image').src = objectURL; $('image-dialog').showModal(); });
$('image-close').addEventListener('click', () => $('image-dialog').close());
$('station-image').addEventListener('error', () => { $('station-image').hidden = true; $('image-open').disabled = true; $('image-loading').hidden = true; $('image-error').textContent = 'เปิดรูปนี้ไม่ได้ ลองเลือกสถานีนี้ใหม่'; $('image-error').hidden = false; });
$('image-dialog').addEventListener('click', event => { if (event.target === $('image-dialog')) { const r = $('image-dialog').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('image-dialog').close(); } });
document.addEventListener('keydown', event => {
  if (!ready || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented || $('image-dialog').open) return;
  if (revealed && ['1', '2', '3', '4'].includes(event.key) && !event.target?.closest('input,textarea,select') && !event.target?.isContentEditable) {
    event.preventDefault(); rate(['again', 'hard', 'good', 'easy'][Number(event.key) - 1]); return;
  }
  if (event.target?.closest('input,textarea,select,button,a,summary') || event.target?.isContentEditable) return;
  if (event.code === 'Space') { event.preventDefault(); setRevealed(!revealed); }
  else if (event.key === 'ArrowLeft') { event.preventDefault(); navigate(-1); }
  else if (event.key === 'ArrowRight') { event.preventDefault(); navigate(1); }
});
window.addEventListener('online', () => { syncMessage(); void syncPending(); }); window.addEventListener('offline', () => syncMessage());
window.addEventListener('pagehide', flushResponse); document.addEventListener('visibilitychange', () => { if (document.hidden) flushResponse(); });
onAuthStateChanged(auth, nextUser => {
  const account = nextUser?.emailVerified && nextUser.providerData?.some(provider => provider.providerId === 'google.com') ? nextUser : null;
  if (user?.uid !== account?.uid) flushResponse();
  user = account; void loadAccount(account);
});
getRedirectResult(auth).catch(() => { $('auth-message').textContent = 'เข้าสู่บัญชีไม่สำเร็จ กรุณาลองอีกครั้ง'; });


