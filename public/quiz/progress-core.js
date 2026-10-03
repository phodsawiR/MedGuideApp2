(function (root) {
  'use strict';
  const clone = x => JSON.parse(JSON.stringify(x));
  const newer = (a, b) => !a ? b : !b ? a : (a.at > b.at || (a.at === b.at && a.device > b.device)) ? a : b;
  const empty = () => ({v:1, entries:{}, reset:null, settings:null, resume:null});
  function merge(a = empty(), b = empty()) {
    const out = empty(); out.reset = newer(a.reset,b.reset);
    out.settings = newer(a.settings,b.settings); out.resume = newer(a.resume,b.resume);
    for (const id of new Set([...Object.keys(a.entries),...Object.keys(b.entries)])) {
      const x=a.entries[id] || {}, y=b.entries[id] || {}, e={counts:{}, fields:{}};
      for (const device of new Set([...Object.keys(x.counts||{}),...Object.keys(y.counts||{})])) {
        e.counts[device]=newer(x.counts?.[device],y.counts?.[device]);
      }
      for (const field of new Set([...Object.keys(x.fields||{}),...Object.keys(y.fields||{})])) e.fields[field]=newer(x.fields?.[field],y.fields?.[field]);
      out.entries[id]=e;
    }
    return clone(out);
  }
  function materialize(data) {
    const out={v:1, stats:{},settings:data.settings?.value||{},fixes:{},totals:{seen:0,correct:0},resume:data.resume?.value||null};
    const valid = reg => reg && (!data.reset || newer(reg,data.reset)===reg);
    for (const [id,e] of Object.entries(data.entries)) {
      const s={seen:0,correct:0,wrong:0,star:0,auto:0,forgotten:0,last:0,lastOk:null};
      for(const r of Object.values(e.counts)) if(valid(r)) for(const f of ['seen','correct','wrong']) s[f]+=r.value[f]||0;
      for(const [f,r] of Object.entries(e.fields)) if(valid(r)) s[f]=r.value;
      out.stats[id]=s; out.totals.seen+=s.seen;out.totals.correct+=s.correct;
    }
    return out;
  }
  function capture(data, before, after, device, at) {
    const out=clone(data), reg=value=>({value,at,device});
    for(const [id,s] of Object.entries(after.stats)) {
      const prev=before.stats[id]||{}, e=out.entries[id]||(out.entries[id]={counts:{},fields:{}});
      const previous=e.counts[device];
      const counts={...(previous && (!out.reset || newer(previous,out.reset)===previous)?previous.value:{seen:0,correct:0,wrong:0})};let changed=false;
      for(const f of ['seen','correct','wrong']) {const delta=(s[f]||0)-(prev[f]||0);counts[f]+=delta;changed=changed||!!delta;}
      if(changed)e.counts[device]=reg(counts);
      for(const f of ['star','auto','forgotten','last','lastOk']) if(s[f]!==prev[f] && s[f]!==undefined)e.fields[f]=reg(s[f]);
    }
    if(JSON.stringify(before.settings)!==JSON.stringify(after.settings))out.settings=reg(after.settings);
    if(JSON.stringify(before.resume||null)!==JSON.stringify(after.resume||null))out.resume=reg(after.resume||null);
    if(Object.keys(before.stats).length && !Object.keys(after.stats).length)out.reset=reg(true);
    return out;
  }
  function latest(data) {
    let at=Math.max(data.reset?.at||0,data.settings?.at||0,data.resume?.at||0);
    for(const e of Object.values(data.entries))for(const r of [...Object.values(e.counts),...Object.values(e.fields)])at=Math.max(at,r.at||0);
    return at;
  }
  const api={empty,merge,materialize,capture,latest};
  if(typeof module!=='undefined')module.exports=api;else root.PracticeProgressCore=api;
})(typeof window==='undefined'?globalThis:window);
