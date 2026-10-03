// Prepared enforcement suite. Requires an already-running LOCAL Firestore emulator.
// No production project or credentials are used. Not run in the current environment.
const fs=require('fs'),path=require('path'),{test,after,before}=require('node:test');
if(!process.env.FIRESTORE_EMULATOR_HOST){throw Error('NOT RUN: set FIRESTORE_EMULATOR_HOST for a running local emulator; never use production.');}
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc,getDocs,collection,serverTimestamp}=require('firebase/firestore');
const projectId='demo-medguide-allowlist',OWNER='phodsawi.2547@gmail.com';let env;
const claims=(email,provider='google.com',verified=true)=>({email,email_verified:verified,firebase:{sign_in_provider:provider}});
const progress={v:1,entries:{},reset:null,settings:null,resume:null};
const bank='caseflow_mcq_practice_v1';
const ref=db=>doc(db,'practiceProgress','alice','banks',bank);
before(async()=>{
 const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');
 if(!['127.0.0.1','localhost'].includes(host))throw Error('Only localhost emulator is permitted');
 env=await initializeTestEnvironment({projectId,firestore:{host,port:Number(port),rules:fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8')}});
 await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();await setDoc(doc(db,'practiceSyncAllowlist','alice@example.com'),{active:true,updatedAt:serverTimestamp(),updatedBy:'owner'});await setDoc(ref(db),progress);});
});
after(async()=>{if(env)await env.cleanup();});
test('anonymous/unlisted/unverified/non-Google cannot read/write progress',async()=>{
 const contexts=[env.unauthenticatedContext(),env.authenticatedContext('alice',claims('notlisted@example.com')),env.authenticatedContext('alice',claims('alice@example.com','google.com',false)),env.authenticatedContext('alice',claims('alice@example.com','password'))];
 for(const c of contexts){await assertFails(getDoc(ref(c.firestore())));await assertFails(setDoc(ref(c.firestore()),progress));}
});
test('listed verified Google UID may read/write own progress; another UID cannot',async()=>{
 const own=env.authenticatedContext('alice',claims('alice@example.com')).firestore(),other=env.authenticatedContext('bob',claims('alice@example.com')).firestore();
 await assertSucceeds(getDoc(ref(own)));await assertSucceeds(setDoc(ref(own),progress));await assertFails(getDoc(ref(other)));await assertFails(setDoc(ref(other),progress));
});
test('only existing owner may list/add/remove membership; ordinary user can read own membership only',async()=>{
 const owner=env.authenticatedContext('owner',claims(OWNER)).firestore(),alice=env.authenticatedContext('alice',claims('alice@example.com')).firestore();
 await assertSucceeds(getDocs(collection(owner,'practiceSyncAllowlist')));await assertFails(getDocs(collection(alice,'practiceSyncAllowlist')));
 await assertSucceeds(getDoc(doc(alice,'practiceSyncAllowlist','alice@example.com')));await assertFails(getDoc(doc(alice,'practiceSyncAllowlist',OWNER)));
 const membership={active:true,updatedAt:serverTimestamp(),updatedBy:'owner'};
 await assertSucceeds(setDoc(doc(owner,'practiceSyncAllowlist','new@example.com'),membership));await assertFails(setDoc(doc(alice,'practiceSyncAllowlist','alice@example.com'),{...membership,updatedBy:'alice'}));
 await assertSucceeds(setDoc(doc(owner,'practiceSyncAllowlist','alice@example.com'),{active:false,updatedAt:serverTimestamp(),updatedBy:'owner'}));await assertFails(getDoc(ref(alice)));await assertFails(setDoc(ref(alice),progress));
});
