const {test}=require('node:test'), assert=require('node:assert/strict'), vm=require('node:vm'),fs=require('node:fs');
const core=require('../public/quiz/progress-core.js');
const blank=()=>({v:1,stats:{},settings:{},totals:{seen:0,correct:0},fixes:{}});
const answer=(s,id='Q1')=>{s=structuredClone(s);s.stats[id]={...(s.stats[id]||{}),seen:(s.stats[id]?.seen||0)+1,correct:0,wrong:(s.stats[id]?.wrong||0)+1};return s;};
test('independent devices add answers; duplicate/reordered merges do not double count',()=>{
 const a=core.capture(core.empty(),blank(),answer(blank()),'a',1),b=core.capture(core.empty(),blank(),answer(blank()),'b',2);
 assert.equal(core.materialize(core.merge(a,b)).stats.Q1.seen,2);
 assert.deepEqual(core.merge(core.merge(a,b),a),core.merge(a,b));
 assert.deepEqual(core.materialize(core.merge(a,b)),core.materialize(core.merge(b,a)));
 assert.equal(core.materialize(a).stats.Q1.forgotten,0);
});
test('a fresh guest does not overwrite a remote resumable round',()=>{
 const initial=blank(), fresh=core.capture(core.empty(),{...blank(),resume:null},initial,'b',100);
 const remote=core.capture(core.empty(),blank(),{...blank(),resume:{ids:['Q1'],index:0}},'a',1);
 assert.deepEqual(core.materialize(core.merge(remote,fresh)).resume,{ids:['Q1'],index:0});
});
test('deliberate marker removal survives older data; reset does not resurrect counts',()=>{
 let a=core.capture(core.empty(),blank(),answer(blank()),'a',1),before=core.materialize(a),next=structuredClone(before);next.stats.Q1.forgotten=1;
 a=core.capture(a,before,next,'a',2);before=core.materialize(a);next=structuredClone(before);next.stats.Q1.forgotten=0;
 const off=core.capture(a,before,next,'b',3);assert.equal(core.materialize(core.merge(a,off)).stats.Q1.forgotten,0);
 let reset=core.capture(off,core.materialize(off),blank(),'a',4);assert.equal(core.materialize(core.merge(reset,a)).totals.seen,0);
 const newAnswer=answer(core.materialize(reset));reset=core.capture(reset,core.materialize(reset),newAnswer,'a',5);
 assert.equal(core.materialize(reset).totals.seen,1);
});
function controller(memory=new Map(),initial=blank(),bank='bank') {
 const events={};let state,status;
 const context={PracticeProgressCore:core,crypto:{randomUUID:()=> 'device'},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},setTimeout:()=>1,clearTimeout:()=>{},addEventListener:(k,v)=>events[k]=v};context.window=context;
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/quiz/practice-progress.js'),'utf8'),context);
 const p=context.createPracticeProgress(bank,initial,(s)=>state=s,s=>status=s);
 return {p,memory,state:()=>state,status:()=>status};
}
test('guest merges once into first account; logout and second account remain isolated, reload safe',()=>{
 const c=controller(new Map(),answer(blank()));c.p.account({uid:'a'});assert.equal(c.p.get().stats.Q1.seen,1);
 c.p.account(null);assert.equal(Object.keys(c.p.get().stats).length,0);
 c.p.account({uid:'b'});assert.equal(Object.keys(c.p.get().stats).length,0);
 c.p.account({uid:'a'});c.p.account({uid:'a'});assert.equal(c.p.get().stats.Q1.seen,1);
 const reload=controller(c.memory,answer(blank()));assert.equal(Object.keys(reload.p.get().stats).length,0);
 reload.p.account({uid:'b'});assert.equal(Object.keys(reload.p.get().stats).length,0);
 reload.p.account({uid:'a'});assert.equal(reload.p.get().stats.Q1.seen,1);
});
test('guest ownership covers all banks on a shared device',()=>{
 const c=controller(new Map(),answer(blank()),'med');c.p.account({uid:'a'});
 const ped=controller(c.memory,answer(blank()),'ped');ped.p.account({uid:'b'});assert.equal(Object.keys(ped.p.get().stats).length,0);
 ped.p.account({uid:'a'});assert.equal(ped.p.get().stats.Q1.seen,1);
});
test('quota failure is explicit and preserves local account progress',async()=>{
 const c=controller();c.p.account({uid:'a'});c.p.save(answer(c.p.get()));
 c.p.setAdapter({sync:async()=>{const e=Error('quota');e.code='resource-exhausted';throw e;}});await c.p.sync();
 assert.match(c.status(),/โควตาวันนี้เต็ม/);assert.equal(c.p.get().stats.Q1.seen,1);
});
test('interrupted old-account sync cannot replace new account; failures keep local changes',async()=>{
 const c=controller();let finish;c.p.setAdapter({sync:()=>new Promise(r=>finish=r)});c.p.account({uid:'a'});
 c.p.save(answer(c.p.get()));c.p.account({uid:'b'});finish(core.empty());await new Promise(r=>setImmediate(r));
 assert.equal(Object.keys(c.p.get().stats).length,0);
 c.p.setAdapter({sync:async()=>{throw Error('offline');}});
 // Complete the second in-flight account request before retrying.
 finish(core.empty());await new Promise(r=>setImmediate(r));c.p.save(answer(c.p.get()));await c.p.sync();
 assert.equal(c.p.get().stats.Q1.seen,1);assert.match(c.status(),/ออฟไลน์/);
});
