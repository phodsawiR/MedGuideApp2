const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const OWNER='phodsawi.2547@gmail.com';
function setup({active=false,page}={}){
 const dom=new JSDOM(page?fs.readFileSync(require.resolve('../public/quiz/'+page),'utf8'):'<div class="wrap"><button id="practiceLogin"></button><button id="practiceSync"></button><p id="practiceStatus"></p></div>');
 let adapter,observer,accountCalls=0,membershipReads=0,progressCalls=0,listReads=0,writes=[];
 const core=require('../public/quiz/progress-core.js');
 const context={window:{PRACTICE_CLOUD_ENABLED:true,PracticeProgressCore:core,practiceProgress:{setAdapter:a=>adapter=a,account:()=>accountCalls++,sync:()=>progressCalls++}},document:dom.window.document,auth:{currentUser:null},db:{},GoogleAuthProvider:class{setCustomParameters(){}},signInWithPopup:async()=>{const e=Error();e.code='auth/popup-closed-by-user';throw e;},signOut:async()=>{},onAuthStateChanged:(auth,fn)=>observer=fn,doc:(db,...parts)=>parts.join('/'),collection:(db,...parts)=>parts.join('/'),getDoc:async()=>{membershipReads++;return {exists:()=>true,data:()=>({active})};},getDocs:async()=>{listReads++;return {docs:[]};},setDoc:async(ref,data)=>writes.push({ref,data}),serverTimestamp:()=> 'server-time',runTransaction:async()=>{const e=Error();e.code='permission-denied';throw e;},TextEncoder};
 let source=fs.readFileSync(require.resolve('../public/quiz/progress-auth.js'),'utf8').replace(/^import .*;$/gm,'');vm.runInNewContext(source,context);
 const user=(email='alice@example.com',verified=true)=>({uid:'alice',email,emailVerified:verified,isAnonymous:false,providerData:[{providerId:'google.com'}]});
 const configure=async u=>{context.auth.currentUser=u;await observer(u);};
 return {dom,context,user,configure,adapter:()=>adapter,counts:()=>({accountCalls,membershipReads,progressCalls,listReads}),writes};
}
test('unlisted verified Google user remains local; one membership lookup and no progress call',async()=>{
 const c=setup();await c.configure(c.user());assert.equal(c.adapter(),null);assert.equal(c.counts().membershipReads,1);assert.equal(c.counts().progressCalls,0);
 assert.match(c.dom.window.document.getElementById('practiceStatus').textContent,/ยังไม่ได้รับสิทธิ์/);assert.equal(c.dom.window.document.querySelector('details').hidden,true);
});
test('listed verified Google user enables sync; denied server writes propagate',async()=>{
 const c=setup({active:true});await c.configure(c.user());assert.equal(c.counts().membershipReads,1);assert.equal(c.counts().progressCalls,1);
 await assert.rejects(c.adapter().sync('alice','caseflow_mcq_practice_v1',c.context.window.PracticeProgressCore.empty()),e=>e.code==='permission-denied');
});
test('unverified account never checks membership; cancellation does not switch account',async()=>{
 const c=setup();await c.configure(c.user('alice@example.com',false));assert.equal(c.counts().membershipReads,0);
 await c.configure(null);await c.dom.window.document.getElementById('practiceLogin').onclick();assert.equal(c.counts().accountCalls,2);assert.match(c.dom.window.document.getElementById('practiceStatus').textContent,/ยกเลิก/);
});
test('only existing verified owner sees admin; opening panel lists once, no email auto-seeding',async()=>{
 const c=setup();await c.configure(c.user(OWNER));const panel=c.dom.window.document.querySelector('details');assert.equal(panel.hidden,false);assert.equal(c.writes.length,0);assert.equal(c.counts().listReads,0);
 await panel.ontoggle();assert.equal(c.counts().listReads,0);panel.open=true;await panel.ontoggle();assert.equal(c.counts().listReads,1);
 const input=c.dom.window.document.querySelector('input');input.value='other@example.com';c.dom.window.document.querySelector('form').onsubmit({preventDefault(){}});
 await new Promise(r=>setImmediate(r));assert.equal(c.writes.length,1);assert.equal(c.writes[0].ref,'practiceSyncAllowlist/other@example.com');assert.equal(c.writes[0].data.active,true);
 await c.configure(c.user());assert.equal(panel.hidden,true);
});
test('stale access result cannot enable sync after switching accounts',async()=>{
 const c=setup({active:true});let resolve;c.context.getDoc=()=>new Promise(r=>resolve=r);const checking=c.configure(c.user());await c.configure(null);resolve({exists:()=>true,data:()=>({active:true})});await checking;
 assert.equal(c.adapter(),null);assert.equal(c.counts().progressCalls,0);
});
test('source rules exclude both private collections, forbid self-enrollment and require allowlist for owner progress',()=>{
 const rules=fs.readFileSync(require.resolve('../firestore.rules'),'utf8');
 assert.match(rules,/topCollection != 'practiceProgress' && topCollection != 'practiceSyncAllowlist'/);
 assert.match(rules,/return syncAllowed\(\) && request.auth.uid == uid/);assert.match(rules,/allow list: if syncAdmin\(\)/);
 assert.match(rules,/allow create, update: if syncAdmin\(\)/);assert.match(rules,/\.data.active == true/);
});

for(const page of ['practice.html','practice_ped.html','practice_all.html']){
 test(page+' keeps the public Flashcard link visible before and after auth changes',async()=>{
  const c=setup({page});
  const link=c.dom.window.document.getElementById('osceMemberLink');
  const visible=()=>{
   assert.equal(link.getAttribute('href'),'/osce-med/');
   assert.equal(link.hidden,false);
   assert.notEqual(c.dom.window.getComputedStyle(link).display,'none');
  };
  visible();
  for(const user of [null,{isAnonymous:true},c.user('alice@example.com',false),c.user(),null]){
   await c.configure(user);visible();
   assert.equal(c.adapter(),null);
   assert.equal(c.dom.window.document.getElementById('practiceSync').disabled,true);
   assert.equal(c.dom.window.document.getElementById('practiceSyncAdmin').hidden,true);
  }
  assert.equal(c.counts().membershipReads,1);
  assert.equal(c.counts().progressCalls,0);
 });
}
