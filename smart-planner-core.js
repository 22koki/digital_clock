/* Offline-first, rule-based smart workday planner. No AI API, hidden mutations, or network calls. */
(function(root,factory){
  const api=factory(typeof module!=="undefined"&&module.exports?require("./scheduler.js"):root.DevtimeScheduler);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DevtimeSmartPlanner=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(S){
  "use strict";
  const TYPES=["code","debug","review","learn","plan","break"];
  function parseTasks(raw){
    return String(raw||"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map((line,index)=>{
      const [title,duration,type]=line.split("|").map(s=>s.trim());
      return {id:"draft-"+index,title,duration:duration?Number(duration):50,type:type||"code"};
    });
  }
  function stamp(day){return S.dateParts(day);}
  function workDays(date,count,skipWeekends){
    if(!stamp(date)||!Number.isInteger(count)||count<1||count>10)return null;
    const dates=[];let current=date;
    for(let tries=0;dates.length<count&&tries<25;tries++){
      if(!skipWeekends||![0,6].includes(stamp(current).getDay()))dates.push(current);
      current=S.addDays(current,1);
    }
    return dates.length===count?dates:null;
  }
  function propose(options={},existing=[],newId=()=>String(Math.random())){
    const tasks=Array.isArray(options.tasks)?options.tasks:parseTasks(options.tasks);
    if(!tasks.length)return {ok:false,error:"Add at least one task to plan."};
    if(tasks.length>40)return {ok:false,error:"Use 40 tasks or fewer per plan."};
    for(const task of tasks){
      if(typeof task.title!=="string"||!task.title.trim()||task.title.length>90)return {ok:false,error:"A task is missing its name (maximum 90 characters)."};
      if(!Number.isInteger(task.duration)||task.duration<5||task.duration>240)return {ok:false,error:'"'+task.title+'" must be between 5 and 240 minutes.'};
      if(!TYPES.includes(task.type)||task.type==="break")return {ok:false,error:'"'+task.title+'" needs a valid work category.'};
    }
    const days=workDays(options.date,Number(options.days||1),options.skipWeekends!==false);
    if(!days)return {ok:false,error:"Choose a valid starting date and number of workdays (1–10)."};
    const start=S.minutes(options.start||"09:00"),end=S.minutes(options.end||"17:00");
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>1440||end-start<60)return {ok:false,error:"Choose a working window of at least one hour."};
    const breakEvery=Number(options.breakEvery??90),breakMinutes=Number(options.breakMinutes??10);
    if(!Number.isInteger(breakEvery)||breakEvery<30||breakEvery>240||!Number.isInteger(breakMinutes)||breakMinutes<0||breakMinutes>45)return {ok:false,error:"Break timing is invalid."};
    if(!Array.isArray(existing))return {ok:false,error:"Invalid existing schedule."};
    const snapshot=existing.filter(b=>days.includes(b.date)).map(b=>({id:b.id,date:b.date,start:b.start,duration:b.duration})).sort((a,b)=>a.id.localeCompare(b.id));
    const additions=[],unplaced=[];
    const occupations=existing.filter(b=>days.includes(b.date)).map(b=>({...b}));
    let dayCursor=0,focusSinceBreak=0;
    for(const task of tasks){
      let found=null;
      for(let di=dayCursor;di<days.length&&!found;di++){
        const date=days[di];
        const busy=occupations.filter(b=>b.date===date).sort((a,b)=>S.minutes(a.start)-S.minutes(b.start));
        let cursor=start;
        let accumulated=di===dayCursor?focusSinceBreak:0;
        for(const b of busy){
          const first=S.minutes(b.start),last=first+Number(b.duration);
          if(last<=start||first>=end)continue;
          if(last>cursor&&first<=cursor){cursor=last;if(b.type==="break")accumulated=0;continue;}
          const slotEnd=Math.min(first,end);
          const candidate=fit(date,task,cursor,slotEnd,accumulated,breakEvery,breakMinutes,newId);
          if(candidate){found=candidate;break;}
          cursor=Math.max(cursor,last);
          if(b.type==="break")accumulated=0;
        }
        if(!found)found=fit(date,task,cursor,end,accumulated,breakEvery,breakMinutes,newId);
        if(found){dayCursor=di;focusSinceBreak=found.accumulated;break;}
      }
      if(!found){unplaced.push({title:task.title,duration:task.duration,reason:"No uninterrupted slot in your selected workdays."});continue;}
      for(const block of found.blocks){occupations.push(block);additions.push(block);}
    }
    const check=S.validate(additions,existing);
    if(!check.ok)return check;
    return {
      ok:true,dates:days,additions,unplaced,
      plannedWorkMinutes:additions.filter(b=>b.type!=="break").reduce((n,b)=>n+b.duration,0),
      original:snapshot,
      explanation:unplaced.length?"Some tasks could not fit. No existing blocks were changed.":"All tasks fit without changing existing blocks."
    };
    function fit(date,task,earliest,latest,accumulated,limit,pause,createId){
      if(latest-earliest<task.duration)return null;
      const result=[];
      let at=earliest;
      let newAccumulated=accumulated;
      if(pause&&newAccumulated+task.duration>limit&&newAccumulated>0){
        if(latest-at<task.duration+pause)return null;
        result.push({id:createId(),date,start:S.timeString(at),duration:pause,title:"Reset & recharge",type:"break",note:"Suggested recovery break",projectId:"",done:false,secondsLogged:0,sample:false});
        at+=pause;newAccumulated=0;
      }
      if(latest-at<task.duration)return null;
      result.push({id:createId(),date,start:S.timeString(at),duration:task.duration,title:task.title,type:task.type,note:"Smart-planned session",projectId:options.projectId||"",done:false,secondsLogged:0,sample:false});
      return {blocks:result,accumulated:newAccumulated+task.duration};
    }
  }
  function apply(plan,existing){
    if(!plan?.ok||!Array.isArray(plan.additions))throw Error("Generate a valid preview first.");
    const current=existing.filter(b=>plan.dates.includes(b.date)).map(b=>({id:b.id,date:b.date,start:b.start,duration:b.duration})).sort((a,b)=>a.id.localeCompare(b.id));
    if(JSON.stringify(current)!==JSON.stringify(plan.original))throw Error("Your schedule changed. Generate a new preview.");
    const check=S.validate(plan.additions,existing);
    if(!check.ok)throw Error(check.error);
    return [...existing,...plan.additions];
  }
  return {parseTasks,workDays,propose,apply};
});