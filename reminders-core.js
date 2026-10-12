/* Devtime reminders: pure functions, no browser APIs or background promises. */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DevtimeReminderRules=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const DEFAULTS=Object.freeze({
    upcoming:true,leadMinutes:10,atStart:true,includeBreaks:true,
    sessionComplete:true,sound:true,desktop:true,
    quiet:false,quietFrom:"21:00",quietUntil:"07:00"
  });
  const LEADS=[1,5,10,15,30,60];
  function hhmm(value){return typeof value==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);}
  function normalize(raw){
    const data=raw&&typeof raw==="object"?raw:{};
    const result={};
    for(const key of ["upcoming","atStart","includeBreaks","sessionComplete","sound","desktop","quiet"])result[key]=typeof data[key]==="boolean"?data[key]:DEFAULTS[key];
    result.leadMinutes=LEADS.includes(Number(data.leadMinutes))?Number(data.leadMinutes):DEFAULTS.leadMinutes;
    result.quietFrom=hhmm(data.quietFrom)?data.quietFrom:DEFAULTS.quietFrom;
    result.quietUntil=hhmm(data.quietUntil)?data.quietUntil:DEFAULTS.quietUntil;
    return result;
  }
  function minuteOf(time){const [h,m]=time.split(":").map(Number);return h*60+m;}
  function quietNow(date,preferences){
    const prefs=normalize(preferences);
    if(!prefs.quiet)return false;
    const start=minuteOf(prefs.quietFrom),end=minuteOf(prefs.quietUntil);
    const current=date.getHours()*60+date.getMinutes();
    if(start===end)return false;
    return start<end?current>=start&&current<end:current>=start||current<end;
  }
  function scheduledAt(block){
    if(!block||typeof block.date!=="string"||!hhmm(block.start)||!/^\d{4}-\d{2}-\d{2}$/.test(block.date))return null;
    const [year,month,day]=block.date.split("-").map(Number),[h,m]=block.start.split(":").map(Number);
    const date=new Date(year,month-1,day,h,m);
    // Avoid silently shifting nonexistent dates / DST-skipped times.
    if(date.getFullYear()!==year||date.getMonth()+1!==month||date.getDate()!==day||date.getHours()!==h||date.getMinutes()!==m)return null;
    return date;
  }
  function key(block,kind,lead){
    return String(block.id)+"|"+String(block.date)+"|"+String(block.start)+"|"+kind+(kind==="upcoming"?"|"+lead:"");
  }
  function upcomingEvents(blocks,now,preferences,history={}){
    const prefs=normalize(preferences),when=now instanceof Date?now:new Date(now);
    if(!Number.isFinite(when.getTime())||quietNow(when,prefs))return [];
    if(!Array.isArray(blocks))return [];
    const result=[];
    for(const block of blocks){
      if(!block||block.done||!block.id||(!prefs.includeBreaks&&block.type==="break"))continue;
      const at=scheduledAt(block);if(!at)continue;
      const seconds=(at.getTime()-when.getTime())/1000;
      const lead=prefs.leadMinutes*60;
      if(prefs.upcoming&&seconds>0&&seconds<=lead){
        const k=key(block,"upcoming",prefs.leadMinutes);
        if(!history[k])result.push({key:k,kind:"upcoming",block,at,secondsUntil:seconds});
      }
      if(prefs.atStart&&seconds<=0&&seconds>=-60){
        const k=key(block,"start",prefs.leadMinutes);
        if(!history[k])result.push({key:k,kind:"start",block,at,secondsUntil:seconds});
      }
    }
    return result.sort((a,b)=>a.at.getTime()-b.at.getTime()||(a.kind==="upcoming"?-1:1));
  }
  function nextEvents(blocks,now,preferences,limit=4){
    const prefs=normalize(preferences),when=now instanceof Date?now:new Date(now);
    if(!Number.isFinite(when.getTime())||!Array.isArray(blocks))return [];
    return blocks.filter(b=>b&&!b.done&&(prefs.includeBreaks||b.type!=="break"))
      .map(block=>({block,at:scheduledAt(block)}))
      .filter(item=>item.at&&item.at>=when)
      .sort((a,b)=>a.at.getTime()-b.at.getTime())
      .slice(0,Math.max(0,Math.min(12,limit)));
  }
  function pruneHistory(history,now=Date.now()){
    const source=history&&typeof history==="object"?history:{};
    const result={};
    for(const [k,v] of Object.entries(source)){
      if(typeof v==="number"&&v>=now-14*86400000&&v<=now+86400000)result[k]=v;
    }
    return result;
  }
  return {DEFAULTS,LEADS,normalize,quietNow,scheduledAt,key,upcomingEvents,nextEvents,pruneHistory};
});