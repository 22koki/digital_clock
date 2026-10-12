/* Pure scheduling helper for the "Smart Schedule Rescue" feature. */
(function(root,factory){
  const api=factory(typeof module!=="undefined"&&module.exports?require("./scheduler.js"):root.DevtimeScheduler);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DevtimeRescue=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(S){
  "use strict";
  if(!S)throw new Error("Scheduling engine is required");
  function preview(blocks,activeId,extraMinutes){
    const amount=Number(extraMinutes);
    if(!Number.isInteger(amount)||amount<1||amount>180)return {ok:false,error:"Choose a 1–180 minute extension."};
    if(!Array.isArray(blocks))return {ok:false,error:"Invalid schedule."};
    const target=blocks.find(b=>b.id===activeId);
    if(!target)return {ok:false,error:"Choose a coding session first."};
    if(Number(target.duration)+amount>480)return {ok:false,error:"This session would exceed the 8-hour limit."};
    const day=blocks.filter(b=>b.date===target.date).slice().sort((a,b)=>S.minutes(a.start)-S.minutes(b.start));
    const sanity=S.validate(day,[]);
    if(!sanity.ok)return {ok:false,error:"Resolve existing schedule conflicts first: "+sanity.error};
    const at=day.findIndex(b=>b.id===activeId);
    if(at<0)return {ok:false,error:"Session is not on the selected day."};
    const changed=[];
    const extended={...target,duration:Number(target.duration)+amount,sample:false};
    let nextFree=S.minutes(extended.start)+extended.duration;
    if(nextFree>1440)return {ok:false,error:"The session would end after midnight."};
    changed.push({id:target.id,date:target.date,start:target.start,duration:extended.duration,originalStart:target.start,originalDuration:Number(target.duration),title:target.title,type:target.type});
    for(let i=at+1;i<day.length;i++){
      const block=day[i],original=S.minutes(block.start);
      const newStart=Math.max(original,nextFree);
      if(newStart+Number(block.duration)>1440)return {ok:false,error:"Not enough time remains today to move \""+block.title+"\" without shortening it."};
      if(newStart!==original){
        changed.push({id:block.id,date:block.date,start:S.timeString(newStart),duration:Number(block.duration),originalStart:block.start,originalDuration:Number(block.duration),title:block.title,type:block.type});
      }
      nextFree=newStart+Number(block.duration);
    }
    const affectedIds=changed.map(item=>item.id);
    const proposed=changed.map(entry=>({id:entry.id,date:entry.date,start:entry.start,duration:entry.duration,title:entry.title}));
    const others=blocks.filter(b=>!affectedIds.includes(b.id));
    const check=S.validate(proposed,others);
    if(!check.ok)return check;
    return {ok:true,updates:changed,extraMinutes:amount,affected:changed.length-1,day:target.date};
  }
  function apply(blocks,plan){
    if(!plan?.ok||!Array.isArray(plan.updates))throw Error("A valid rescue preview is required.");
    const ids=plan.updates.map(u=>u.id);
    if(new Set(ids).size!==ids.length||ids.length===0)throw Error("Invalid rescue changes.");
    for(const u of plan.updates){
      const current=blocks.find(b=>b.id===u.id);
      if(!current||current.date!==u.date||current.start!==u.originalStart||Number(current.duration)!==u.originalDuration)throw Error("Schedule changed. Preview the rescue again.");
    }
    const proposal=plan.updates.map(u=>({id:u.id,date:u.date,start:u.start,duration:u.duration,title:u.title}));
    const check=S.validate(proposal,blocks,ids);
    if(!check.ok)throw Error(check.error);
    for(const update of plan.updates){
      const block=blocks.find(b=>b.id===update.id);
      block.start=update.start;block.duration=update.duration;block.sample=false;
    }
    return blocks;
  }
  return {preview,apply};
});