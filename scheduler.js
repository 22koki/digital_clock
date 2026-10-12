/* Devtime's framework-free scheduling engine. Pure functions for testability. */
(function(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.DevtimeScheduler = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
  "use strict";
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
  function dateParts(date) {
    if (typeof date !== "string" || !DATE_RE.test(date)) return null;
    const [year, month, day] = date.split("-").map(Number);
    const value = new Date(year, month - 1, day, 12);
    if (value.getFullYear() !== year || value.getMonth()+1 !== month || value.getDate() !== day) return null;
    return value;
  }
  function dateString(date) {
    return [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
  }
  function addDays(date, days) {
    const d = dateParts(date);
    if (!d || !Number.isInteger(days)) throw new Error("Invalid date");
    d.setDate(d.getDate()+days); return dateString(d);
  }
  function minutes(time) {
    if (typeof time !== "string" || !TIME_RE.test(time)) return NaN;
    const [h,m] = time.split(":").map(Number); return h*60+m;
  }
  function timeString(minute) {
    if (!Number.isInteger(minute) || minute < 0 || minute >= 1440) return null;
    return String(Math.floor(minute/60)).padStart(2,"0")+":"+String(minute%60).padStart(2,"0");
  }
  function startOfWeek(date) {
    const d = dateParts(date);
    if (!d) throw new Error("Invalid date");
    d.setDate(d.getDate()-(d.getDay()+6)%7); return dateString(d);
  }
  function weekDates(date) {
    const monday=startOfWeek(date); return Array.from({length:7},(_,i)=>addDays(monday,i));
  }
  function overlaps(a,b) {
    if (a.date!==b.date) return false;
    const am=minutes(a.start), bm=minutes(b.start);
    return Number.isFinite(am)&&Number.isFinite(bm)&&am<bm+Number(b.duration)&&bm<am+Number(a.duration);
  }
  function validate(candidates,existing=[],excludedIds=[]) {
    const all=Array.isArray(candidates)?candidates:[candidates];
    const other=existing.filter(b=>!excludedIds.includes(b.id));
    for(const c of all) {
      if(!dateParts(c.date)) return {ok:false,error:"Choose a valid date."};
      if(!Number.isFinite(minutes(c.start))) return {ok:false,error:"Choose a valid starting time."};
      const duration=Number(c.duration);
      if(!Number.isInteger(duration)||duration<1||duration>480) return {ok:false,error:"Duration must be between 1 and 480 minutes."};
      if(minutes(c.start)+duration>1440) return {ok:false,error:"A block cannot extend beyond midnight."};
      if(!String(c.title||"").trim()) return {ok:false,error:"Give this block a title."};
      const conflict=other.find(b=>overlaps(c,b));
      if(conflict) return {ok:false,error:'Conflicts with "'+conflict.title+'" on '+c.date+" at "+conflict.start+"."};
      other.push(c);
    }
    return {ok:true};
  }
  function recurrenceDates(date,rule="none",count=1) {
    if(!dateParts(date)) throw new Error("Invalid recurrence date.");
    if(!Number.isInteger(count)||count<1||count>12) throw new Error("Repeats must be between 1 and 12.");
    if(!["none","daily","weekdays","weekly"].includes(rule)) throw new Error("Invalid repeat rule.");
    if(rule==="none") return [date];
    if(rule==="weekdays"&&[0,6].includes(dateParts(date).getDay())) throw new Error("Choose a weekday for weekday repeats.");
    const result=[date];let next=date;
    while(result.length<count){
      next=addDays(next,rule==="weekly"?7:1);
      if(rule==="weekdays"&&[0,6].includes(dateParts(next).getDay()))continue;
      result.push(next);
    }
    return result;
  }
  function createRepeated(template,rule,count,makeId){
    const dates=recurrenceDates(template.date,rule,count),seriesId=dates.length>1?makeId():null;
    return dates.map((date,index)=>({...template,id:makeId(),date,done:false,secondsLogged:0,sample:false,seriesId,seriesRule:seriesId?rule:"none",occurrence:index+1}));
  }
  function move(block,date,start,others) {
    const candidate={...block,date,start,sample:false};
    const check=validate(candidate,others,[block.id]);
    return check.ok?{ok:true,block:candidate}:check;
  }
  function resize(block,duration,others) {
    const candidate={...block,duration,sample:false};
    const check=validate(candidate,others,[block.id]);
    return check.ok?{ok:true,block:candidate}:check;
  }
  function projectStats(projectId,blocks) {
    const related=blocks.filter(b=>b.projectId===projectId);
    return {blocks:related.length,completed:related.filter(b=>b.done).length,
      plannedMinutes:related.filter(b=>b.type!=="break").reduce((t,b)=>t+Number(b.duration||0),0),
      loggedSeconds:related.reduce((t,b)=>t+Number(b.secondsLogged||0),0)};
  }
  return {dateParts,dateString,addDays,minutes,timeString,startOfWeek,weekDates,overlaps,validate,recurrenceDates,createRepeated,move,resize,projectStats};
});