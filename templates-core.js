/* Reusable Devtime coding-day blueprints: pure scheduling logic. */
(function(root,factory){
  const api=factory(typeof module!=="undefined"&&module.exports?require("./scheduler.js"):root.DevtimeScheduler);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DevtimeTemplates=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(S){
  "use strict";
  if(!S)throw Error("DevtimeScheduler is required");
  const TYPES=["code","debug","review","learn","plan","break"];
  const BUILTIN=[
    {id:"deep-work",name:"Deep Work Day",category:"BUILD & SHIP",description:"Long, uninterrupted coding blocks with deliberate recovery time.",accent:"#ab8deb",symbol:"✳",blocks:[
      {start:"09:00",duration:80,title:"Build the core feature",type:"code"},
      {start:"10:30",duration:15,title:"Step away from the screen",type:"break"},
      {start:"10:45",duration:75,title:"Ship the next feature",type:"code"},
      {start:"12:15",duration:45,title:"Lunch and recharge",type:"break"},
      {start:"13:00",duration:45,title:"Review and refactor",type:"review"},
      {start:"14:00",duration:45,title:"Test and polish",type:"debug"}]},
    {id:"debug-ship",name:"Debug & Ship",category:"FIX & DEPLOY",description:"A structured day for reproducing, fixing and testing stubborn bugs.",accent:"#da9a75",symbol:"⌘",blocks:[
      {start:"09:00",duration:30,title:"Triage bugs and set priorities",type:"plan"},
      {start:"09:40",duration:50,title:"Investigate the highest-impact bug",type:"debug"},
      {start:"10:40",duration:15,title:"Coffee and reset",type:"break"},
      {start:"11:00",duration:60,title:"Implement and verify a fix",type:"code"},
      {start:"12:10",duration:30,title:"Review changed code",type:"review"},
      {start:"13:00",duration:45,title:"Regression tests and release notes",type:"debug"}]},
    {id:"learn-build",name:"Learn & Build",category:"SKILLS & GROWTH",description:"Learn a concept, practice it, then turn your knowledge into code.",accent:"#72b99e",symbol:"◈",blocks:[
      {start:"09:00",duration:45,title:"Explore a new concept",type:"learn"},
      {start:"09:50",duration:10,title:"Stretch and hydrate",type:"break"},
      {start:"10:05",duration:50,title:"Build a practice feature",type:"code"},
      {start:"11:05",duration:50,title:"Study examples and docs",type:"learn"},
      {start:"12:05",duration:30,title:"Lunch break",type:"break"},
      {start:"13:00",duration:45,title:"Apply what you learned",type:"code"}]},
    {id:"balanced",name:"Balanced Builder",category:"THE EVERYDAY FLOW",description:"Planning, development, debugging and review without overloading your day.",accent:"#849edd",symbol:"✦",blocks:[
      {start:"09:00",duration:40,title:"Plan today's priorities",type:"plan"},
      {start:"09:50",duration:50,title:"Deep coding session",type:"code"},
      {start:"10:50",duration:15,title:"Take a breather",type:"break"},
      {start:"11:15",duration:45,title:"Debug and run tests",type:"debug"},
      {start:"12:15",duration:45,title:"Lunch and a reset",type:"break"},
      {start:"13:15",duration:45,title:"Review pull requests",type:"review"},
      {start:"14:15",duration:60,title:"Finish and document your work",type:"code"}]}
  ];
  function validateTemplate(input){
    if(!input||typeof input.name!=="string"||!input.name.trim()||input.name.length>65)return {ok:false,error:"Name your routine (up to 65 characters)."};
    if(!Array.isArray(input.blocks)||!input.blocks.length||input.blocks.length>24)return {ok:false,error:"A routine needs 1–24 scheduled blocks."};
    const date="2026-10-12",blocks=[];
    for(const block of input.blocks){
      if(!TYPES.includes(block?.type))return {ok:false,error:"Unknown session type."};
      if(typeof block.title!=="string"||!block.title.trim()||block.title.length>90)return {ok:false,error:"A session title is invalid."};
      blocks.push({title:block.title,date,start:block.start,duration:Number(block.duration),type:block.type});
    }
    return S.validate(blocks,[]);
  }
  function timeSpan(template){
    const sorted=template.blocks.slice().sort((a,b)=>S.minutes(a.start)-S.minutes(b.start));
    const first=S.minutes(sorted[0].start),last=Math.max(...sorted.map(b=>S.minutes(b.start)+Number(b.duration)));
    return {start:first,end:last,duration:last-first,focusMinutes:sorted.filter(b=>b.type!=="break").reduce((total,b)=>total+Number(b.duration),0)};
  }
  function targetDates(date,mode="day"){
    if(!S.dateParts(date))throw Error("Choose a valid schedule date.");
    if(mode==="day")return [date];
    if(mode==="weekdays")return S.weekDates(date).slice(0,5);
    throw Error("Unknown apply mode.");
  }
  function prepare(template,settings={},existing=[],newId=()=>String(Math.random())){
    const valid=validateTemplate(template);if(!valid.ok)return valid;
    const {date,mode="day",replace=false,projectId}=settings;
    let dates;try{dates=targetDates(date,mode)}catch(error){return {ok:false,error:error.message}};
    const earliest=timeSpan(template).start,requested=S.minutes(settings.start||S.timeString(earliest));
    if(!Number.isFinite(requested))return {ok:false,error:"Choose a valid starting time."};
    const offset=requested-earliest;
    const exclude=replace?existing.filter(b=>dates.includes(b.date)):[];
    const excludeIds=exclude.map(b=>b.id);
    const additions=[];
    for(const day of dates){
      for(const block of template.blocks){
        const minute=S.minutes(block.start)+offset,adjusted=S.timeString(minute);
        if(!adjusted)return {ok:false,error:"This routine would start outside the day."};
        additions.push({id:newId(),date:day,start:adjusted,duration:Number(block.duration),title:block.title,type:block.type,note:block.note||"",projectId:projectId!==undefined?projectId:(block.projectId||""),done:false,secondsLogged:0,sample:false,templateId:template.id||""});
      }
    }
    const check=S.validate(additions,existing,excludeIds);
    if(!check.ok)return check;
    return {ok:true,additions,excludeIds,dates,replace:!!replace,focusMinutes:timeSpan(template).focusMinutes};
  }
  function snapshotDay(name,date,existing,id,description="Your coding rhythm, ready to repeat."){
    if(!S.dateParts(date))throw Error("Choose a valid schedule date.");
    const blocks=existing.filter(b=>b.date===date).sort((a,b)=>S.minutes(a.start)-S.minutes(b.start));
    const template={id,name:String(name||"").trim(),description:String(description).slice(0,180),category:"MY ROUTINE",accent:"#a48bdc",symbol:"✎",custom:true,blocks:blocks.map(b=>({start:b.start,duration:Number(b.duration),title:b.title,type:b.type,note:b.note||"",projectId:b.projectId||""}))};
    const valid=validateTemplate(template);if(!valid.ok)throw Error(valid.error);
    return template;
  }
  function apply(plan,existing){
    if(!plan?.ok||!Array.isArray(plan.additions))throw Error("Preview your template first.");
    const check=S.validate(plan.additions,existing,plan.excludeIds);
    if(!check.ok)throw Error(check.error);
    if(plan.replace){
      const now=existing.filter(b=>plan.dates.includes(b.date)).map(b=>b.id).sort();
      const previously=plan.excludeIds.slice().sort();
      if(JSON.stringify(now)!==JSON.stringify(previously))throw Error("The schedule changed. Preview again before replacing it.");
    }
    return [...existing.filter(b=>!plan.excludeIds.includes(b.id)),...plan.additions];
  }
  return {BUILTIN,validateTemplate,timeSpan,targetDates,prepare,snapshotDay,apply};
});