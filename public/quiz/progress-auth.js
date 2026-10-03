import {auth,db} from './firebase-client.js';
import {GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js';
import {doc,getDoc,getDocs,collection,setDoc,serverTimestamp,runTransaction} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';
const button=document.getElementById('practiceLogin'), sync=document.getElementById('practiceSync'), status=document.getElementById('practiceStatus');
const progress=window.practiceProgress;
let authGeneration=0;
const OWNER='phodsawi.2547@gmail.com';
const isGoogle=user=>!!user&&!user.isAnonymous&&user.emailVerified&&typeof user.email==='string'&&user.providerData.some(p=>p.providerId==='google.com');
const isAdmin=user=>isGoogle(user)&&user.email.toLowerCase()===OWNER;
const cloudAdapter={async sync(uid,bank,data){
    if(new TextEncoder().encode(JSON.stringify(data)).length>900000){const e=Error('progress too large');e.code='progress/size-limit';throw e;}
    const ref=doc(db,'practiceProgress',uid,'banks',bank);
    return runTransaction(db,async tx=>{
      const snap=await tx.get(ref);const merged=window.PracticeProgressCore.merge(snap.exists()?snap.data():undefined,data);
      if(new TextEncoder().encode(JSON.stringify(merged)).length>900000){const e=Error('progress too large');e.code='progress/size-limit';throw e;}
      tx.set(ref,merged);return merged;
    });
  }};
const admin=document.createElement('details');admin.id='practiceSyncAdmin';admin.hidden=true;admin.className='card';
const summary=document.createElement('summary');summary.textContent='จัดการเมลที่ซิงก์ได้';admin.append(summary);
const explanation=document.createElement('p');explanation.className='sub';explanation.textContent='รายชื่อนี้จำกัดเฉพาะการบันทึกข้ามเครื่อง ทุกคนยังฝึกและบันทึกในเครื่องได้';admin.append(explanation);
const form=document.createElement('form'),emailInput=document.createElement('input'),add=document.createElement('button'),adminMessage=document.createElement('p'),list=document.createElement('div');
emailInput.type='email';emailInput.required=true;emailInput.placeholder='example@gmail.com';emailInput.setAttribute('aria-label','เมลที่อนุญาตให้ซิงก์');emailInput.style.cssText='max-width:100%;padding:8px';add.textContent='เพิ่มเมล';form.className='row';form.append(emailInput,add);adminMessage.setAttribute('role','status');admin.append(form,adminMessage,list);document.querySelector('.wrap').append(admin);
let listGeneration=0;
async function loadList(){
  if(!isAdmin(auth.currentUser))return;const token=++listGeneration;list.replaceChildren();adminMessage.textContent='กำลังโหลดรายชื่อ…';
  try{const snap=await getDocs(collection(db,'practiceSyncAllowlist'));if(token!==listGeneration||!isAdmin(auth.currentUser))return;
    snap.docs.filter(d=>d.data().active===true).forEach(d=>{const row=document.createElement('div'),remove=document.createElement('button');row.className='row';const name=document.createElement('span');name.textContent=d.id;remove.textContent='ถอนสิทธิ์ซิงก์';remove.onclick=()=>changeEmail(d.id,false);row.append(name,remove);list.append(row);});
    adminMessage.textContent=list.children.length?'':'ยังไม่มีเมลที่อนุญาต';
  }catch(e){if(token===listGeneration)adminMessage.textContent='โหลดรายชื่อไม่ได้ ('+(e.code||'เครือข่ายขัดข้อง')+')';}
}
async function changeEmail(email,active){
  const user=auth.currentUser;if(!isAdmin(user))return;
  email=email.trim().toLowerCase();if(email.length>254||!/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email)){adminMessage.textContent='กรุณาใส่เมลให้ถูกต้อง';return;}
  add.disabled=true;adminMessage.textContent='กำลังบันทึก…';
  try{await setDoc(doc(db,'practiceSyncAllowlist',email),{active,updatedAt:serverTimestamp(),updatedBy:user.uid});
    if(auth.currentUser?.uid!==user.uid)return;emailInput.value='';await loadList();
    if(email===user.email.toLowerCase())await configureAccount(user);
  }catch(e){if(auth.currentUser?.uid===user.uid)adminMessage.textContent='บันทึกไม่ได้ ('+(e.code||'เครือข่ายขัดข้อง')+')';}finally{add.disabled=false;}
}
form.onsubmit=e=>{e.preventDefault();changeEmail(emailInput.value,true);};admin.ontoggle=()=>{if(admin.open)loadList();};
async function configureAccount(user){
  const token=++authGeneration,google=isGoogle(user);
  const osceLink=document.getElementById('osceMemberLink');
  if(osceLink)osceLink.classList.toggle('hide',!google);
  progress.setAdapter(null);sync.disabled=true;listGeneration++;list.replaceChildren();emailInput.value='';adminMessage.textContent='';admin.hidden=!isAdmin(user);if(admin.hidden)admin.open=false;
  if(isAdmin(user)&&window.location?.hash==='#practiceSyncAdmin'){admin.open=true;admin.scrollIntoView({block:'start'});}
  button.textContent=google?'ออกจากระบบ ('+(user.displayName||'Google')+')':'เข้าสู่ระบบด้วย Google';
  progress.account(google?user:null);
  if(!google)return;
  if(!window.PRACTICE_CLOUD_ENABLED){status.textContent='เก็บในเครื่องของบัญชีนี้ — ยังไม่ได้เปิดบันทึกข้ามเครื่อง';return;}
  status.textContent='กำลังตรวจสิทธิ์ซิงก์…';
  try{const access=await getDoc(doc(db,'practiceSyncAllowlist',user.email.toLowerCase()));if(token!==authGeneration)return;
    if(!access.exists()||access.data().active!==true){status.textContent='เมลนี้ยังไม่ได้รับสิทธิ์ซิงก์ · ฝึกและบันทึกในเครื่องได้';return;}
    progress.setAdapter(cloudAdapter);sync.disabled=false;progress.sync();
  }catch(e){if(token===authGeneration)status.textContent=e.code==='resource-exhausted'?'โควตาวันนี้เต็ม · ฝึกและบันทึกในเครื่องได้':'ตรวจสิทธิ์ซิงก์ไม่ได้ · ฝึกและบันทึกในเครื่องได้';}
}
onAuthStateChanged(auth,configureAccount);
button.onclick=async()=>{
  button.disabled=true;
  try{
    if(auth.currentUser&&!auth.currentUser.isAnonymous)await signOut(auth);
    else {const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await signInWithPopup(auth,provider);}
  }catch(e){status.textContent=['auth/popup-closed-by-user','auth/cancelled-popup-request'].includes(e.code)?'ยกเลิกการเข้าสู่ระบบ ฝึกต่อได้เลย':'เข้าสู่ระบบไม่ได้ ฝึกต่อได้ตามปกติ ('+(e.code||'เครือข่ายขัดข้อง')+')';}
  finally{button.disabled=false;}
};
sync.onclick=()=>progress.sync();
