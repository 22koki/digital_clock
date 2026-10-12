/* Pure weekly report calculations for Devtime. No external services required. */
(function(root,factory){
  const api=factory(typeof module!=="undefined"&&module.exports?require("./scheduler.js"):root.DevtimeScheduler);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DevtimeReports=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(S){
  "use strict";
  if(!S)throw Error("DevtimeScheduler must load before report-core.js");
  const sec=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;
  const clean=v=>String(v??"").replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").trim();
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function dayOf(v){
    if(!v)return null;
    if(typeof v==="string"&&S.dateParts(v))return v;
    const parsed=new Date(v);
    return Number.isNaN(parsed.getTime())?null:S.dateString(parsed);
  }
  function period(date){
    if(!S.dateParts(date))throw Error("Invalid report date");
    const dates=S.weekDates(date);
    return {start:dates[0],end:dates[6],dates};
  }
  function aggregate(data={},date){
    const week=period(date),days=week.dates;
    const blocks=Array.isArray(data.blocks)?data.blocks:[];
    const journal=Array.isArray(data.journal)?data.journal:[];
    const projects=Array.isArray(data.projects)?data.projects:[];
    const cases=Array.isArray(data.debugCases)?data.debugCases:[];
    const active=blocks.filter(b=>b&&days.includes(b.date));
    const group=days.map(day=>({date:day,plannedMinutes:0,focusedSeconds:0,completed:0,scheduled:0,breakMinutes:0}));
    const dayIndex=new Map(group.map(d=>[d.date,d]));
    const projectIndex=new Map(projects.filter(p=>p&&typeof p.id==="string").map(p=>[p.id,p]));
    const projectMap=new Map(),completed=[];
    for(const b of active){
      const d=dayIndex.get(b.date);
      if(b.type==="break"){d.breakMinutes+=sec(b.duration);continue;}
      const planned=sec(b.duration),focused=sec(b.secondsLogged);
      d.plannedMinutes+=planned;d.focusedSeconds+=focused;d.scheduled+=1;
      if(b.done)d.completed+=1;
      const project=projectIndex.get(b.projectId),id=project?.id||"unassigned",name=project?.name||"Personal coding";
      if(!projectMap.has(id))projectMap.set(id,{id,name,color:/^#[0-9a-f]{6}$/i.test(project?.color||"")?project.color:"#a789e3",plannedMinutes:0,focusedSeconds:0,completed:0,scheduled:0});
      const p=projectMap.get(id);p.plannedMinutes+=planned;p.focusedSeconds+=focused;p.scheduled++;
      if(b.done){p.completed++;completed.push({id:b.id,date:b.date,start:b.start||"",title:clean(b.title),type:b.type,project:name,focusedSeconds:focused});}
    }
    const journalEntries=journal.filter(j=>{
      if(!j)return false;
      const linked=blocks.find(b=>b.id===j.blockId);
      const jday=dayOf(j.date)||linked?.date||dayOf(j.updatedAt);
      return days.includes(jday);
    }).map(j=>{
      const linked=blocks.find(b=>b.id===j.blockId);
      const project=projectIndex.get(j.projectId||linked?.projectId);
      return {...j,date:dayOf(j.date)||linked?.date||dayOf(j.updatedAt),projectName:project?.name||"Personal coding"};
    }).sort((a,b)=>b.date.localeCompare(a.date)||String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
    // A recorded resolution date is required; older cases are not falsely attributed.
    const solved=cases.filter(c=>c?.status==="resolved"&&days.includes(dayOf(c.resolvedAt)));
    const investigations=cases.filter(c=>c&&days.includes(dayOf(c.createdAt)));
    const focused=group.reduce((a,d)=>a+d.focusedSeconds,0);
    const planned=group.reduce((a,d)=>a+d.plannedMinutes,0);
    const scheduled=group.reduce((a,d)=>a+d.scheduled,0);
    const complete=group.reduce((a,d)=>a+d.completed,0);
    const best=group.reduce((a,b)=>a.focusedSeconds>=b.focusedSeconds?a:b,group[0]);
    return {
      start:week.start,end:week.end,days:group,
      focusSeconds:focused,plannedMinutes:planned,scheduled,completed:complete,
      completionPercent:scheduled?Math.round(100*complete/scheduled):0,
      activeDays:group.filter(d=>d.focusedSeconds>0).length,
      breakMinutes:group.reduce((a,d)=>a+d.breakMinutes,0),
      projects:[...projectMap.values()].sort((a,b)=>b.focusedSeconds-a.focusedSeconds||a.name.localeCompare(b.name)),
      completedTasks:completed.sort((a,b)=>b.date.localeCompare(a.date)||b.start.localeCompare(a.start)),
      journal:journalEntries,entriesWritten:journalEntries.length,
      solved,investigationsOpened:investigations.length,
      bestDay:best?.focusedSeconds>0?best.date:null,
      notes:"Based on recorded Devtime timer activity, not time estimates or GitHub commits."
    };
  }
  function minutesLabel(v){let n=Math.round(sec(v));return Math.floor(n/60)+"h "+String(n%60).padStart(2,"0")+"m";}
  function focusLabel(seconds){return minutesLabel(sec(seconds)/60);}
  function weekLabel(r,locale="en-US"){
    return S.dateParts(r.start).toLocaleDateString(locale,{month:"short",day:"numeric"})+" – "+
      S.dateParts(r.end).toLocaleDateString(locale,{month:"short",day:"numeric",year:"numeric"});
  }
  function toMarkdown(r){
    const lines=["# Devtime — Weekly Developer Report","**"+weekLabel(r)+"**","","## At a glance",
      "- Focus tracked: "+focusLabel(r.focusSeconds),
      "- Focus planned: "+minutesLabel(r.plannedMinutes),
      "- Completed: "+r.completed+" of "+r.scheduled+" ("+r.completionPercent+"%)",
      "- Active days: "+r.activeDays+" / 7",
      "- Bugs resolved: "+r.solved.length,
      "- Journal entries: "+r.entriesWritten,"","## Project activity"];
    if(!r.projects.length)lines.push("- No project activity recorded.");
    for(const p of r.projects)lines.push("- "+clean(p.name)+": "+focusLabel(p.focusedSeconds)+" focused; "+p.completed+"/"+p.scheduled+" tasks finished.");
    lines.push("","## Completed work");
    if(!r.completedTasks.length)lines.push("- No completed tasks recorded.");
    for(const t of r.completedTasks.slice(0,40))lines.push("- "+t.date+" — "+clean(t.title)+" ("+clean(t.project)+")");
    if(r.completedTasks.length>40)lines.push("- Plus "+(r.completedTasks.length-40)+" additional tasks.");
    lines.push("","## Bugs solved");
    if(!r.solved.length)lines.push("- No resolved investigations with a recorded fix date this week.");
    for(const c of r.solved.slice(0,20))lines.push("- "+clean(c.title)+": "+clean(c.resolution||"No resolution notes."));
    lines.push("","## Journal highlights");
    const highlights=r.journal.filter(j=>j.done||j.blocked||j.next).slice(0,6);
    if(!highlights.length)lines.push("- No journal highlights recorded.");
    for(const j of highlights){
      lines.push("- **"+clean(j.title||"Coding reflection")+"** ("+j.date+")");
      if(j.done)lines.push("  - Win: "+clean(j.done).slice(0,260));
      if(j.blocked)lines.push("  - Challenge: "+clean(j.blocked).slice(0,220));
      if(j.next)lines.push("  - Next: "+clean(j.next).slice(0,220));
    }
    lines.push("","_"+r.notes+"_");
    return lines.join("\n");
  }
  function toHtml(r){
    const title="Devtime Weekly Report — "+weekLabel(r);
    const max=Math.max(1,...r.days.map(d=>d.focusedSeconds));
    const days=r.days.map(d=>'<div class="day"><b>'+S.dateParts(d.date).toLocaleDateString("en-US",{weekday:"short"})+'</b><div class="bar"><span style="width:'+Math.round(100*d.focusedSeconds/max)+'%"></span></div><b>'+focusLabel(d.focusedSeconds)+'</b></div>').join("");
    const projects=r.projects.length?r.projects.map(p=>'<tr><td>'+esc(p.name)+'</td><td>'+focusLabel(p.focusedSeconds)+'</td><td>'+minutesLabel(p.plannedMinutes)+'</td><td>'+p.completed+'/'+p.scheduled+'</td></tr>').join(""):'<tr><td colspan="4">No project work recorded.</td></tr>';
    const tasks=r.completedTasks.length?r.completedTasks.slice(0,40).map(t=>'<li><b>'+esc(t.title)+'</b><small>'+esc(t.date)+' · '+esc(t.project)+'</small></li>').join(""):'<li>No completed tasks recorded.</li>';
    const bugs=r.solved.length?r.solved.map(c=>'<li><b>'+esc(c.title)+'</b><small>'+esc(c.resolution||"Resolution not documented.")+'</small></li>').join(""):'<li>No bugs resolved with a recorded date.</li>';
    const notes=r.journal.length?r.journal.slice(0,9).map(j=>'<div class="note"><small>'+esc(j.date)+' · '+esc(j.projectName)+'</small><h3>'+esc(j.title||"Coding reflection")+'</h3>'+(j.done?'<p><b>Win:</b> '+esc(j.done)+'</p>':"")+(j.blocked?'<p><b>Challenge:</b> '+esc(j.blocked)+'</p>':"")+(j.next?'<p><b>Next:</b> '+esc(j.next)+'</p>':"")+'</div>').join(""):'<p>No journal entries from this week.</p>';
    const css="*{box-sizing:border-box}body{background:#f4f0f8;color:#30253f;font:14px system-ui,sans-serif;margin:0}.page{max-width:980px;margin:25px auto;background:white;border-radius:18px;overflow:hidden;box-shadow:0 14px 60px #221a3420}.top{background:#2b223f;color:white;padding:44px}.top small{letter-spacing:2px;color:#c5b4dc}.top h1{font-size:42px;line-height:1.1;margin:18px 0}.top em{color:#cfb4ff;font-style:normal}.body{padding:36px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}.metric{background:#f7f2fd;border:1px solid #eadcf8;border-radius:13px;padding:17px}.metric small{font-size:10px;color:#78618b}.metric b{font-size:24px;display:block;margin-top:8px}h2{font-size:22px;margin:35px 0 14px}.day{display:grid;grid-template-columns:50px 1fr 72px;gap:12px;align-items:center;margin:11px 0}.bar{height:12px;border-radius:10px;background:#eee9f2;overflow:hidden}.bar span{display:block;height:100%;background:#ae8bea}table{width:100%;border-collapse:collapse;text-align:left}td,th{padding:12px;border-bottom:1px solid #eee9f3}li{padding:8px 0}li small{display:block;margin-top:4px;color:#9688a3}.note{border:1px solid #e9ddf0;background:#faf7fc;padding:15px;border-radius:12px;margin:11px 0}.note small{color:#8d78a8}.note h3{margin:9px 0}.note p{white-space:pre-wrap;overflow-wrap:anywhere}.note b{color:#8862b8}.foot{padding:25px 36px;font-size:11px;color:#8b8193}.toolbar{text-align:center;padding:15px}.toolbar button{border:0;background:#2d2341;color:white;border-radius:10px;padding:12px 20px;cursor:pointer}@media(max-width:600px){.page{margin:0;border-radius:0}.top{padding:27px}.top h1{font-size:33px}.body{padding:18px}.metrics{grid-template-columns:repeat(2,1fr)}}@media print{@page{size:A4;margin:12mm}body{background:white}.page{margin:0;box-shadow:none}.toolbar{display:none}.top,.metric,.bar span,.note{print-color-adjust:exact;-webkit-print-color-adjust:exact}li,.note,tr{break-inside:avoid}}";
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+esc(title)+'</title><style>'+css+'</style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div><div class="page"><header class="top"><b>✳ devtime.</b><p><small>THE DEVELOPER WEEKLY / '+esc(weekLabel(r))+'</small></p><h1>A week of<br><em>meaningful progress.</em></h1><p>Recorded work, reflected on.</p></header><main class="body"><div class="metrics"><div class="metric"><small>FOCUS LOGGED</small><b>'+focusLabel(r.focusSeconds)+'</b></div><div class="metric"><small>TASKS FINISHED</small><b>'+r.completed+'/'+r.scheduled+'</b></div><div class="metric"><small>ACTIVE DAYS</small><b>'+r.activeDays+'/7</b></div><div class="metric"><small>BUGS RESOLVED</small><b>'+r.solved.length+'</b></div></div><h2>Where your time went</h2>'+days+'<h2>Projects in motion</h2><table><thead><tr><th>Project</th><th>Tracked</th><th>Planned</th><th>Completed</th></tr></thead><tbody>'+projects+'</tbody></table><h2>Completed work</h2><ul>'+tasks+'</ul><h2>Debugging wins</h2><ul>'+bugs+'</ul><h2>Journal highlights</h2>'+notes+'</main><footer class="foot">'+esc(r.notes)+' · Generated locally with Devtime.</footer></div></body></html>';
  }
  return {aggregate,period,focusLabel,minutesLabel,weekLabel,toMarkdown,toHtml,summaryMarkdown:toMarkdown,durationLabel:focusLabel,plannedLabel:minutesLabel,escapeHtml:esc,dayOf};
});