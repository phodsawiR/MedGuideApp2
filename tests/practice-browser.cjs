// Dependency-free Chrome CDP test. All auth/cloud traffic is mocked locally.
const fs=require('fs'),path=require('path'),http=require('http'),{spawn}=require('child_process'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../public'), cloud=new Map([
 ['practiceSyncAllowlist/alice@example.com',{active:true}],
 ['practiceSyncAllowlist/bob@example.com',{active:true}]
]);
const authMock=`const listeners=[];const auth={currentUser:JSON.parse(localStorage.getItem('mock.auth')||'null')};
export const getAuth=()=>auth;export class GoogleAuthProvider {setCustomParameters(){}}
export const onAuthStateChanged=(a,fn)=>{listeners.push(fn);setTimeout(()=>fn(auth.currentUser),0);};
export const signInWithPopup=async()=>{if(window.mockCancel){const e=Error('cancel');e.code='auth/popup-closed-by-user';throw e;}const uid=window.mockUID||'alice';auth.currentUser={uid,displayName:uid,email:window.mockEmail||(uid==='owner'?'phodsawi.2547@gmail.com':uid+'@example.com'),emailVerified:true,isAnonymous:false,providerData:[{providerId:'google.com'}]};localStorage.setItem('mock.auth',JSON.stringify(auth.currentUser));listeners.forEach(fn=>fn(auth.currentUser));return {user:auth.currentUser};};
export const signOut=async()=>{auth.currentUser=null;localStorage.removeItem('mock.auth');listeners.forEach(fn=>fn(null));};`;
const firestoreMock=`import {getAuth} from '/mock-auth.js';const denied=()=>{const e=Error('denied');e.code='permission-denied';throw e;};const admin=()=>getAuth().currentUser?.email==='phodsawi.2547@gmail.com';export const getFirestore=()=>({});export const doc=(db,...parts)=>parts.join('/');export const collection=doc;export const serverTimestamp=()=>Date.now();export const getDoc=async ref=>{const data=await (await fetch('/__cloud/'+ref)).json();return {exists:()=>!!data,data:()=>data};};export const getDocs=async ref=>{if(!admin())denied();const rows=await (await fetch('/__list/'+ref)).json();return {docs:rows.map(([id,data])=>({id,data:()=>data}))};};export const setDoc=async(ref,data)=>{if(!admin())denied();await fetch('/__cloud/'+ref,{method:'PUT',body:JSON.stringify(data)});};export const runTransaction=async(db,fn)=>{const user=getAuth().currentUser;if(!user)denied();const membership=await getDoc('practiceSyncAllowlist/'+user.email.toLowerCase());if(!membership.exists()||membership.data().active!==true)denied();let writes=[];const get=async ref=>{if(ref.split('/')[1]!==user.uid)denied();return getDoc(ref);};const result=await fn({get,set:(ref,data)=>writes.push([ref,data])});for(const [ref,data] of writes){const r=await fetch('/__cloud/'+ref,{method:'PUT',body:JSON.stringify(data)});if(!r.ok)throw Error('offline');}return result;};`;
const server=http.createServer((req,res)=>{
 if(req.url.startsWith('/__list/')){const ref=req.url.slice(8);res.end(JSON.stringify([...cloud].filter(([k])=>k.startsWith(ref+'/')).map(([k,v])=>[k.slice(ref.length+1),v])));return;}
 if(req.url.startsWith('/__cloud/')){const key=req.url.slice(9);if(req.method==='PUT'){let s='';req.on('data',b=>s+=b);req.on('end',()=>{cloud.set(key,JSON.parse(s));res.end('{}');});}else res.end(JSON.stringify(cloud.get(key)||null));return;}
 let s,type='text/javascript';
 if(req.url==='/mock-app.js')s='export const initializeApp=()=>({});';
 else if(req.url==='/mock-auth.js')s=authMock;
 else if(req.url==='/mock-firestore.js')s=firestoreMock;
 else {const p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(!p.startsWith(root)||!fs.existsSync(p)){res.writeHead(404);res.end();return;}s=fs.readFileSync(p);type=p.endsWith('.html')?'text/html':p.endsWith('.css')?'text/css':'text/javascript';
  if(p.endsWith('progress-config.js'))s='window.PRACTICE_CLOUD_ENABLED=true;';
  if(p.endsWith('owner-corrections.js'))s='';
  if(p.endsWith('firebase-client.js')||p.endsWith('progress-auth.js'))s=s.toString().replace(/https:\/\/www.gstatic.com\/firebasejs\/12.7.0\/firebase-(app|auth|firestore).js/g,(_,type)=>'/mock-'+type+'.js');
 }
 res.setHeader('Content-Type',type+'; charset=utf-8');res.end(s);
});
let chrome,ws,n=0;const pending=new Map(),errors=[];let port;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function send(method,params={},sessionId){const id=++n;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},10000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id,method,params,sessionId}));});}
async function page(){const {browserContextId}=await send('Target.createBrowserContext');const {targetId}=await send('Target.createTarget',{url:'about:blank',browserContextId});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Runtime.enable',{},sessionId);return sessionId;}
async function ev(session,expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},session);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function wait(session,expression){for(let i=0;i<100;i++){if(await ev(session,expression))return;await delay(50);}throw Error('Timeout '+expression);}
const click=(s,id)=>ev(s,`document.getElementById(${JSON.stringify(id)}).click()`);
const state=s=>ev(s,'JSON.parse(JSON.stringify(window.practiceProgress.get()))');
async function navigate(s,file){await send('Page.navigate',{url:`http://127.0.0.1:${port}/quiz/${file}`},s);await wait(s,"window.practiceProgress && document.getElementById('practiceLogin').onclick");await delay(80);}
async function run(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port;
 const profile=fs.mkdtempSync(path.resolve(__dirname,'../../browser-test-profile-'));
 chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=0','--remote-allow-origins=*','--no-first-run','--no-default-browser-check','--disable-background-networking','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 let endpoint='';chrome.stderr.on('data',b=>{const m=b.toString().match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m)endpoint=m[1];});
 for(let i=0;i<100&&!endpoint;i++)await delay(100);if(!endpoint)throw Error('Chrome CDP did not start');
 ws=new WebSocket(endpoint);await new Promise((r,j)=>{ws.addEventListener('open',r);ws.addEventListener('error',j);});ws.addEventListener('message',e=>{const msg=JSON.parse(e.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);if(p)msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result);}if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails);});
 console.log('Chrome connected; local mocked server '+port);
 for(const file of ['practice.html','practice_ped.html','practice_all.html']){
  const s=await page();await navigate(s,file);await click(s,'btnSaved');assert.match(await ev(s,"document.getElementById('savedList').textContent"),/ยังไม่มี/);
  await click(s,'btnSetup');await click(s,'btnStart');const first=await ev(s,"window.practiceProgress.get().resume.ids[0]");
  await click(s,'btnForget');await click(s,'btnStar');await click(s,'btnSaved');assert.match(await ev(s,"document.getElementById('savedList').textContent"),/ลบลืมบ่อย/);
  await ev(s,"document.getElementById('savedFilter').value='forgotten';document.getElementById('savedFilter').dispatchEvent(new Event('change'))");
  await ev(s,"document.querySelector('#savedList button').click()");assert.equal((await state(s)).resume.ids[0],first);
  assert.equal((await state(s)).totals.seen,0);
  await ev(s,"document.querySelector('#choices button').click()");assert.equal((await state(s)).stats[first].seen,1);
  await click(s,'btnTopics');assert.match(await ev(s,"document.getElementById('topicList').textContent"),/ทำแล้ว 1\//);
  await send('Page.reload',{},s);await wait(s,"window.practiceProgress && document.getElementById('practiceLogin').onclick");await click(s,'btnResume');
  assert.equal((await state(s)).stats[first].seen,1);assert.equal(await ev(s,"document.querySelector('#choices button').disabled"),true);
  await click(s,'btnTopics');assert.match(await ev(s,"document.getElementById('topicList').textContent"),/ทำแล้ว 1\//);
  await ev(s,'window.mockCancel=true');await click(s,'practiceLogin');await delay(50);assert.equal((await state(s)).stats[first].seen,1);await ev(s,'window.mockCancel=false');
  await click(s,'practiceLogin');await wait(s,"document.getElementById('practiceStatus').textContent==='บันทึกแล้ว'");assert.equal((await state(s)).stats[first].seen,1);
  await click(s,'practiceLogin');assert.equal(Object.keys((await state(s)).stats).length,0);
  await ev(s,"window.mockUID='bob'");await click(s,'practiceLogin');await wait(s,"document.getElementById('practiceStatus').textContent==='บันทึกแล้ว'");assert.equal(Object.keys((await state(s)).stats).length,0);
  await click(s,'practiceLogin');await ev(s,"window.mockUID='alice'");await click(s,'practiceLogin');await wait(s,"document.getElementById('practiceStatus').textContent==='บันทึกแล้ว'");assert.equal((await state(s)).stats[first].seen,1);
  const other=await page();await navigate(other,file);await click(other,'practiceLogin');await wait(other,"document.getElementById('practiceStatus').textContent==='บันทึกแล้ว'");assert.equal((await state(other)).stats[first].seen,1);
  assert.equal(await ev(other,"document.getElementById('btnResume').classList.contains('hide')"),false);
  await click(other,'btnSaved');await ev(other,"document.querySelectorAll('#savedList button')[2].click()");await click(other,'practiceSync');await wait(other,"document.getElementById('practiceStatus').textContent==='บันทึกแล้ว'");
  await click(s,'practiceSync');await wait(s,"document.getElementById('practiceStatus').textContent==='บันทึกแล้ว'");assert.equal((await state(s)).stats[first].forgotten,0);
  await click(other,'btnSaved');await ev(other,"document.querySelector('#savedList button').click()");await ev(other,"document.querySelector('#choices button').click()");
  assert.equal((await state(other)).stats[first].seen,2);await click(other,'btnTopics');assert.match(await ev(other,"document.getElementById('topicList').textContent"),/ทำแล้ว 1\//);
  if(file==='practice.html'){
    await send('Network.enable',{},other);await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1},other);
    await click(other,'btnSaved');await ev(other,"document.querySelector('#savedList button').click()");await click(other,'btnForget');await click(other,'practiceSync');
    await wait(other,"document.getElementById('practiceStatus').textContent.includes('ออฟไลน์')");assert.equal((await state(other)).stats[first].forgotten,1);
    await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1},other);await click(other,'practiceSync');await wait(other,"document.getElementById('practiceStatus').textContent==='บันทึกแล้ว'");
  }
  if(file==='practice_ped.html'){await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},s);await click(s,'btnSaved');assert.equal(await ev(s,'document.documentElement.scrollWidth<=390'),true);const image=await send('Page.captureScreenshot',{format:'png'},s);fs.writeFileSync(path.join(__dirname,'mobile-saved.png'),Buffer.from(image.data,'base64'));}
  console.log('PASS '+file+': guest/save/list/open/forget/remove/resume/topic/cancel/accounts/cross-device');
 }
 const adminPage=await page();await navigate(adminPage,'practice.html');await ev(adminPage,"window.mockUID='owner'");await click(adminPage,'practiceLogin');await wait(adminPage,"!document.querySelector('#practiceSyncAdmin').hidden");
 await ev(adminPage,"document.querySelector('#practiceSyncAdmin summary').click()");await wait(adminPage,"document.querySelector('#practiceSyncAdmin input')");
 for(const email of ['bossboss0204@gmail.com','royalrarityruj@gmail.com']){await ev(adminPage,`document.querySelector('#practiceSyncAdmin input').value=${JSON.stringify(email)};document.querySelector('#practiceSyncAdmin form').requestSubmit()`);await wait(adminPage,"!document.querySelector('#practiceSyncAdmin form button').disabled");assert.equal(cloud.get('practiceSyncAllowlist/'+email)?.active,true);}
 const member=await page();await navigate(member,'practice.html');await ev(member,"window.mockUID='boss';window.mockEmail='bossboss0204@gmail.com'");await click(member,'practiceLogin');await wait(member,"document.getElementById('practiceStatus').textContent==='บันทึกแล้ว'");assert.equal(await ev(member,"document.querySelector('#practiceSyncAdmin').hidden"),true);
 const unlisted=await page();await navigate(unlisted,'practice.html');await ev(unlisted,"window.mockUID='unlisted'");await click(unlisted,'practiceLogin');await wait(unlisted,"document.getElementById('practiceStatus').textContent.includes('ยังไม่ได้รับสิทธิ์')");await click(unlisted,'btnStart');await ev(unlisted,"document.querySelector('#choices button').click()");assert.equal((await state(unlisted)).totals.seen,1);assert.equal([...cloud.keys()].some(k=>k.startsWith('practiceProgress/unlisted/')),false);
  await ev(adminPage,"[...document.querySelectorAll('#practiceSyncAdmin div.row')].find(row=>row.textContent.includes('bossboss0204@gmail.com')).querySelector('button').click()");await wait(adminPage,"!document.querySelector('#practiceSyncAdmin form button').disabled");assert.equal(cloud.get('practiceSyncAllowlist/bossboss0204@gmail.com').active,false);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},adminPage);assert.equal(await ev(adminPage,'document.documentElement.scrollWidth<=390'),true);await ev(adminPage,"document.querySelector('#practiceSyncAdmin').scrollIntoView()");const adminImage=await send('Page.captureScreenshot',{format:'png'},adminPage);fs.writeFileSync(path.join(__dirname,'mobile-allowlist-admin.png'),Buffer.from(adminImage.data,'base64'));
 await click(member,'practiceSync');await wait(member,"document.getElementById('practiceStatus').textContent.includes('ยังไม่มีสิทธิ์')");await click(member,'btnStart');assert.equal(await ev(member,"document.querySelectorAll('#choices button').length>0"),true);
 console.log('PASS cloud-only allowlist: owner add two provided emails/remove; listed sync; unlisted/revoked local practice');
 assert.equal(errors.length,0,JSON.stringify(errors));console.log('PASS no browser exceptions; mobile width 390');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(ws){await send('Browser.close').catch(()=>{});ws.close();}if(chrome)chrome.kill();server.close();});
