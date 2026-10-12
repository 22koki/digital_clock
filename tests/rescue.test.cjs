const test=require("node:test");const assert=require("node:assert/strict");
const R=require("../rescue.js");
const day="2026-10-12";
const blocks=()=>[
{id:"a",date:day,start:"09:00",duration:50,title:"Build API",type:"code"},
{id:"b",date:day,start:"10:00",duration:10,title:"Break",type:"break"},
{id:"c",date:day,start:"10:20",duration:40,title:"Test API",type:"debug"},
{id:"d",date:"2026-10-13",start:"10:20",duration:40,title:"Tomorrow",type:"code"}
];
test("extension shifts overlapping successors without moving unaffected blocks",()=>{
const data=blocks(),plan=R.preview(data,"a",15);
assert.equal(plan.ok,true);assert.equal(plan.affected,1);
assert.deepEqual(plan.updates.map(u=>[u.id,u.start,u.duration]),[["a","09:00",65],["b","10:05",10]]);
R.apply(data,plan);assert.equal(data[1].start,"10:05");assert.equal(data[2].start,"10:20");assert.equal(data[3].start,"10:20");
});
test("preserves buffers until a shift is needed",()=>{
const plan=R.preview(blocks(),"a",5);assert.equal(plan.ok,true);assert.equal(plan.affected,0);
});
test("cannot push session beyond midnight",()=>{
const data=[{id:"a",date:day,start:"23:10",duration:40,title:"Late"}];
assert.equal(R.preview(data,"a",15).ok,false);
});
test("rejects stale rescues and preserves schedule",()=>{
const data=blocks(),plan=R.preview(data,"a",15);data[1].start="10:03";
assert.throws(()=>R.apply(data,plan));assert.equal(data[0].duration,50);
});
test("validates extension constraints",()=>{
assert.equal(R.preview(blocks(),"a",0).ok,false);
assert.equal(R.preview(blocks(),"a",181).ok,false);
});
