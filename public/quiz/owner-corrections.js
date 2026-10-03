import {auth,db} from './firebase-client.js';
// Public Firebase config identifies the project; Firestore rules enforce ownership.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import {getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js';
import {getFirestore, collection, doc, getDoc, onSnapshot, runTransaction, serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';

const OWNER = 'phodsawi.2547@gmail.com';

const fixes = new Map();
let owner = false, ready = false;
const notify = () => window.dispatchEvent(new Event('quiz-owner-change'));
const key = q => 'ped_' + encodeURIComponent(q.id);
// Bind overrides to exact source wording and choices, so bank rebuilds cannot silently reuse a correction for another variant.
const fingerprint = async q => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([q.question,Object.entries(q.choices).sort(),q.answer]))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const fingerprints = new Map();
await Promise.all((window.QUIZ_BANK?.questions || []).map(async q => fingerprints.set(q.id,await fingerprint(q))));

const button = document.createElement('button');
button.textContent = 'ผู้ดูแล'; button.className = 'sub';
button.style.cssText = 'display:block;margin:24px auto 70px;border:0;background:none;font-size:12px;color:var(--muted)';
document.body.appendChild(button);
button.onclick = async () => {
  try {
    if (owner) { await signOut(auth); return; }
    const provider = new GoogleAuthProvider(); provider.setCustomParameters({prompt:'select_account'});
    const result = await signInWithPopup(auth,provider);
    if(result.user.email !== OWNER || !result.user.emailVerified) { alert('บัญชีนี้ไม่มีสิทธิ์แก้เฉลย'); }
  } catch(e) { alert('ยังเข้าสู่ระบบไม่ได้: '+(e.code || e.message)); }
};
onAuthStateChanged(auth, user => {
  owner = !!user && user.email === OWNER && user.emailVerified;
  button.textContent = owner ? 'ออกจากโหมดผู้ดูแล' : 'ผู้ดูแล'; notify();
});

window.QuizOwner = {
  canEdit: () => owner && ready,
  correction: q => {const f=fixes.get(key(q)); return f && f.fingerprint===fingerprints.get(q.id) && q.choices[f.answer] ? f : null;},
  async save(q, answer, reason, expectedRevision) {
    if(!owner || !ready) throw Error('ยังไม่ได้รับสิทธิ์แก้เฉลย');
    if(!q.choices[answer]) throw Error('คำตอบไม่อยู่ในตัวเลือก');
    if(!reason.trim() || reason.length>2000) throw Error('กรุณาใส่เหตุผล 1–2000 ตัวอักษร');
    const ref=doc(db,'quizAnswerCorrections',key(q));
    await runTransaction(db, async tx => {
      const snap=await tx.get(ref), prev=snap.exists()?snap.data():null;
      if((prev?.revision || 0)!==expectedRevision) throw Error('ข้อนี้ถูกแก้จากอีกหน้าต่างแล้ว กรุณาปิดแล้วเปิดแก้ใหม่');
      const next={bank:'ped',questionId:q.id,answer,reason:reason.trim(),fingerprint:fingerprints.get(q.id),revision:(prev?.revision||0)+1,updatedAt:serverTimestamp(),updatedBy:auth.currentUser.uid};
      tx.set(ref,next);
      tx.set(doc(db,'quizAnswerCorrections',key(q),'history',String(next.revision)),next);
    });
    const saved=(await getDoc(ref)).data(); fixes.set(key(q),saved); notify();
  },
  revision: q => fixes.get(key(q))?.revision || 0
};
onSnapshot(collection(db,'quizAnswerCorrections'), snap => {
  fixes.clear();snap.forEach(d=>fixes.set(d.id,d.data()));ready=true;notify();
}, () => {ready=false;notify(); if(owner)button.textContent='ผู้ดูแล — ระบบบันทึกยังไม่พร้อม';});
