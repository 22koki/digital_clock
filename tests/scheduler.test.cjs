const assert=require("node:assert/strict");
const test=require("node:test");
const s=require("../scheduler.js");
test("weekly planner starts Monday, even on Sunday",()=>{
  assert.deepEqual(s.weekDates("2026-10-11"),["2026-10-05","2026-10-06","2026-10-07","2026-10-08","2026-10-09","2026-10-10","2026-10-11"]);
});
test("weekly calendar handles month and year boundaries",()=>{
  assert.equal(s.startOfWeek("2027-01-01"),"2026-12-28");
  assert.equal(s.addDays("2026-12-31",1),"2027-01-01");
});
test("invalid dates do not silently roll over",()=>{
  assert.equal(s.dateParts("2026-02-30"),null);
  assert.equal(s.dateParts("not-a-date"),null);
});
test("overlapping blocks are rejected, adjacent blocks allowed",()=>{
  const first={id:"a",date:"2026-10-12",start:"09:00",duration:50,title:"Code"};
  assert.equal(s.validate({...first,id:"b",start:"09:30"},[first]).ok,false);
  assert.equal(s.validate({...first,id:"b",start:"09:50"},[first]).ok,true);
});
test("cross-midnight sessions rejected",()=>{
  assert.equal(s.validate({date:"2026-10-12",start:"23:30",duration:50,title:"Test"},[]).ok,false);
});
test("weekdays recurrence skips weekends",()=>{
  assert.deepEqual(s.recurrenceDates("2026-10-09","weekdays",4),["2026-10-09","2026-10-12","2026-10-13","2026-10-14"]);
});
test("weekly recurrence preserves weekday",()=>{
  assert.deepEqual(s.recurrenceDates("2026-10-12","weekly",3),["2026-10-12","2026-10-19","2026-10-26"]);
});
test("move rejects destination conflicts",()=>{
  const a={id:"1",date:"2026-10-12",start:"09:00",duration:50,title:"Feature"};
  const b={id:"2",date:"2026-10-13",start:"09:00",duration:50,title:"Test"};
  assert.equal(s.move(a,"2026-10-13","09:00",[a,b]).ok,false);
  assert.equal(s.move(a,"2026-10-14","09:00",[a,b]).ok,true);
});
test("resize prevents crossing next block",()=>{
  const a={id:"1",date:"2026-10-12",start:"09:00",duration:50,title:"Feature"};
  const b={id:"2",date:"2026-10-12",start:"10:00",duration:30,title:"Test"};
  assert.equal(s.resize(a,65,[a,b]).ok,false);
  assert.equal(s.resize(a,55,[a,b]).ok,true);
});
test("recurring block creation generates unique IDs",()=>{
  let n=0;const created=s.createRepeated({date:"2026-10-12",start:"09:00",duration:25,title:"Learn"},"weekdays",3,()=>String(++n));
  assert.equal(new Set(created.map(b=>b.id)).size,3);
  assert.equal(created[2].date,"2026-10-14");
  assert.equal(s.validate(created,[]).ok,true);
});
test("project statistics sum tracked time and completed work",()=>{
  const a={projectId:"p",done:true,duration:30,type:"code",secondsLogged:1200};
  const b={projectId:"p",done:false,duration:15,type:"break",secondsLogged:0};
  const c={projectId:"q",done:true,duration:40,type:"code",secondsLogged:60};
  assert.deepEqual(s.projectStats("p",[a,b,c]),{blocks:2,completed:1,plannedMinutes:30,loggedSeconds:1200});
});