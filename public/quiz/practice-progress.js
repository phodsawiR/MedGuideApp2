(function () {
  'use strict';
  const core=window.PracticeProgressCore;
  window.createPracticeProgress=function(key, initial, replace, status) {
    let storageOK=true;
    const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))||f;}catch{return f;}};
    const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{storageOK=false;status('พื้นที่ในเครื่องไม่พอ กรุณาส่งออกข้อมูล');return false;}};
    const device=read('medguide.practice.device',null)||crypto.randomUUID();write('medguide.practice.device',device);
    const blank=()=>({v:1,stats:{},settings:{},fixes:{},totals:{seen:0,correct:0},resume:null});
    let uid=null, generation=0, timer, adapter=null, pending=false, busy=false, clock=Date.now();
    const ownerKey='medguide.practice.guestOwner';
    const owner=()=>read(ownerKey,null)||read(key+'.guestOwner',null);
    const guestEnvelope=read(key+'.guest',null)||core.capture(core.empty(),blank(),initial,device,++clock);
    if(!read(key+'.guest',null))write(key+'.guest',guestEnvelope);
    let envelope=owner()?read(key+'.guestSession',core.empty()):guestEnvelope;
    const guestFixes=initial.fixes||{};
    let current=core.materialize(envelope);current.fixes=owner()?{}:guestFixes;
    const localKey=()=>key+(uid?'.user.'+uid:owner()?'.guestSession':'.guest');
    const publish=(changed=false)=>replace(JSON.parse(JSON.stringify(current)),changed);
    async function sync() {
      if(!uid||!adapter||busy)return;
      const user=uid, token=generation, sent=envelope;busy=true;let success=false;
      status('กำลังบันทึก…');
      try {
        const merged=await adapter.sync(user,key,sent);
        if(token!==generation)return;
        envelope=core.merge(envelope,merged);write(localKey(),envelope);
        const fixes=current.fixes;current=core.materialize(envelope);current.fixes=fixes;publish();
        pending=JSON.stringify(envelope)!==JSON.stringify(merged);
        success=true;
        status(pending?'รอบันทึกเพิ่มเติม':'บันทึกแล้ว');
      }catch(e){if(token===generation)status(e.code==='permission-denied'?'บัญชีนี้ยังไม่มีสิทธิ์ซิงก์ เก็บในเครื่องแล้ว':e.code==='resource-exhausted'?'โควตาวันนี้เต็ม เก็บในเครื่องแล้ว ลองซิงก์ภายหลัง':e.code==='progress/size-limit'?'ข้อมูลมากเกินขนาดที่ซิงก์ได้ เก็บในเครื่องแล้ว กรุณาส่งออกข้อมูล':'ออฟไลน์ / บันทึกในเครื่องแล้ว กดซิงก์เพื่อลองใหม่');}
      finally{busy=false;if(token!==generation && uid)sync();else if(success&&pending)timer=setTimeout(sync,1500);}
    }
    function save(next) {
      envelope=core.capture(envelope,current,next,device,clock=Math.max(clock+1,Date.now(),core.latest(envelope)+1));current=JSON.parse(JSON.stringify(next));
      write(localKey(),envelope);
      if(!uid)write(key,next); // legacy guest export remains compatible
      pending=true;clearTimeout(timer);if(uid)timer=setTimeout(sync,10000);
    }
    function account(user) {
      clearTimeout(timer);generation++;uid=user&&!user.isAnonymous?user.uid:null;pending=false;
      if(uid){
        envelope=read(localKey(),core.empty());
        const guestOwner=owner();
        if(!guestOwner){
          // Claim before merging: a crash cannot give guest history to another account.
          if(write(ownerKey,uid))envelope=core.merge(envelope,read(key+'.guest',core.empty()));
        }else if(guestOwner===uid)envelope=core.merge(envelope,read(key+'.guest',core.empty()));
      }else envelope=owner()?read(key+'.guestSession',core.empty()):read(key+'.guest',core.empty());
      current=core.materialize(envelope);if(!uid)current.fixes=guestFixes;write(localKey(),envelope);publish(true);
      status(uid?'บันทึกในเครื่องของบัญชีนี้': 'ฝึกได้เลยโดยไม่ต้องเข้าสู่ระบบ');
      if(uid)sync();
    }
    if(!owner())write(key+'.guest',envelope);
    window.addEventListener('online',sync);
    return {save,account,sync,setAdapter(value){adapter=value;},get:()=>JSON.parse(JSON.stringify(current)),isStorageAvailable:()=>storageOK};
  };
})();
