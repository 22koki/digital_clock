"use strict";
(()=> {
const $=id=>document.getElementById(id), K=window.DevtimeLogbook, S=window.DevtimeScheduler;
const uid=()=>crypto?.randomUUID?.()||"entry-"+Date.now()+"-"+Math.random().toString(36).slice(2);
const el=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n};
const selectOption=(value,label)=>new Option(label,value);
const refProject=id=>state.projects.find(p=>p.id===id)?.name||"Personal coding";
state.journal=Array.isArray(state.journal)?state.journal:[];
state.debugCases=Array.isArray(state.debugCases)?state.debugCases:[];
let editId=null,caseId=null,filter="all";
const close=id=>$(id).close();
function pickOptions(id,options,placeholder){const target=$(id);target.replaceChildren(new Option(placeholder,""));options.forEach(x=>target.add(new Option(x.label,x.id)))}
function entries(){return state.journal.map(j=>({...j,projectName:refProject(j.projectId||state.blocks.find(b=>b.id===j.blockId)?.projectId)}))}
function openEntry(entry=null,blockId=null){
editId=entry?.id||null;
$("journal-title").textContent=entry?"Edit your entry":"A new chapter.";
$("journal-context").textContent=entry?"Add details to a moment worth remembering.":"Keep a record of what you built, learned and overcame.";
pickOptions("journal-project",state.projects.map(p=>({id:p.id,label:p.name})),"Personal coding");
pickOptions("journal-link",state.blocks.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,120).map(b=>({id:b.id,label:b.date+" · "+b.title})),"Personal reflection");
const linked=state.blocks.find(b=>b.id===(entry?.blockId||blockId));
$("journal-entry-title").value=entry?.title||linked?.title||"";
$("journal-entry-date").value=entry?.date||linked?.date||state.selected;
$("journal-link").value=entry?.blockId||blockId||"";
$("journal-project").value=entry?.projectId||linked?.projectId||"";
$("journal-mood").value=entry?.mood||"focused";
$("journal-done").value=entry?.done||"";$("journal-blocked").value=entry?.blocked||"";$("journal-next").value=entry?.next||"";
$("journal-error").hidden=true;
$("journal-dialog").showModal();$("journal-entry-title").focus();
}
function renderEntries(){
const filtered=K.filterEntries(entries(),$("journal-search").value,$("journal-filter").value);
$("journal-result-count").textContent=filtered.length+" note"+(filtered.length===1?"":"s");
const target=$("journal-feed");target.replaceChildren();
if(!filtered.length){const empty=el("div","logbook-empty");empty.append(el("span","asterisk","✳"),el("strong","",state.journal.length?"Nothing matches your search":"Your story starts here."),el("p","",state.journal.length?"Try a different search or filter.":"A good developer keeps notes. Record today's breakthrough, blocker or lesson."));const button=el("button","button button-accent","Write your first note");button.type="button";button.addEventListener("click",()=>openEntry());empty.append(button);target.append(empty);return}
const moods={focused:"✦ In the zone",proud:"✳ Feeling proud",learning:"◈ Learning",stuck:"◇ Working through it"};
for(const entry of filtered){const card=el("article","entry-card"),meta=el("div","entry-meta");meta.append(el("span","",entry.date||"UNDATED"),el("span","entry-mood",moods[entry.mood]||moods.focused),el("span","",entry.projectName));card.append(meta,el("h4","",entry.title||"Coding reflection"));
const intro=(entry.done||entry.blocked||entry.next||"Nothing noted yet.");card.append(el("p","",intro.length>240?intro.slice(0,237)+"…":intro));const badges=el("div","entry-sections");
if(entry.done)badges.append(el("span","entry-flag","✓ Wins recorded"));
if(entry.blocked)badges.append(el("span","entry-flag blocked","◇ Challenges noted"));
if(entry.next)badges.append(el("span","entry-flag","↗ Next steps"));
card.append(badges);
const foot=el("div","entry-footer");foot.append(el("span","",entry.updatedAt?"Updated "+new Date(entry.updatedAt).toLocaleDateString():"Your coding notes"));const b=el("button","","Read & edit →");b.type="button";b.addEventListener("click",()=>openEntry(entry));foot.append(b);card.append(foot);target.append(card)}
}
function renderCases(){
const target=$("debug-case-list");target.replaceChildren();
const matching=state.debugCases.filter(c=>filter==="all"||c.status===filter).slice().sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
if(!matching.length){const blank=el("div","debug-case-empty");blank.append(el("strong","",state.debugCases.length?"No matching investigations.":"Nothing to debug. Yet."),el("p","",state.debugCases.length?"Try another status filter.":"When something breaks, log your hypotheses and experiments here."));target.append(blank);return}
for(const c of matching){const card=el("article","debug-case");card.append(el("span","case-status "+c.status,c.status==="resolved"?"✓ Resolved":c.status==="paused"?"On hold":"◉ Investigating"),el("h4","",c.title),el("p","",c.symptom.slice(0,180)),el("div","debug-case-meta",refProject(c.projectId)+" · "+(c.attempts?.length||0)+" experiments"));const btn=el("button","","Open investigation ↗");btn.type="button";btn.addEventListener("click",()=>openCase(c.id));card.append(btn);target.append(card)}
}
function renderStats(){
$("logbook-count").textContent=state.journal.length;
$("debug-resolved-count").textContent=K.caseStats(state.debugCases).resolved;
$("logbook-activity-count").textContent=state.blocks.filter(b=>b.done||(Number(b.secondsLogged)||0)>0).length;
renderEntries();renderCases();
}
function openCase(id){
caseId=id;const c=state.debugCases.find(x=>x.id===id);if(!c)return;
$("debug-detail-title").textContent=c.title;$("debug-detail-context").textContent=refProject(c.projectId)+" · "+new Date(c.createdAt).toLocaleDateString();
$("debug-detail-status").textContent=c.status==="resolved"?"✓ Resolved":c.status==="paused"?"On hold":"Investigating";
$("debug-detail-status").className="case-status "+c.status;
$("debug-detail-symptom").textContent=c.symptom;
$("debug-detail-repro").textContent=c.repro||"No steps recorded.";
$("debug-detail-hypothesis").textContent=c.hypothesis||"No hypothesis yet.";
$("debug-toggle-status").textContent=c.status==="paused"?"Resume investigation":"Mark on hold";
$("debug-resolution").value=c.resolution||"";
$("debug-resolve").textContent=c.status==="resolved"?"Update resolution ✓":"Mark as resolved ✓";
$("debug-attempt-total").textContent=(c.attempts||[]).length+" attempts";
$("debug-attempt-list").replaceChildren();
if(!(c.attempts||[]).length)$("debug-attempt-list").append(el("p","journal-context","Your experiment log is clear. Note your first hypothesis test below."));
for(const a of c.attempts||[]){const row=el("article","attempt-row");row.append(el("small","",new Date(a.createdAt).toLocaleString()+" · "+({failed:"Still broken",partial:"Partially helped",worked:"That worked!"}[a.outcome]||"Experiment")),el("strong","",a.action));if(a.observation)row.append(el("p","",a.observation));$("debug-attempt-list").append(row)}
$("debug-attempt-action").value="";$("debug-attempt-observation").value="";
$("debug-detail-dialog").showModal();
}
function openCreateCase(){
pickOptions("debug-project",state.projects.map(p=>({id:p.id,label:p.name})),"Personal coding");
$("debug-title").value="";$("debug-symptom").value="";$("debug-repro").value="";$("debug-hypothesis").value="";$("debug-create-error").hidden=true;
const b=state.blocks.find(x=>x.id===state.activeId);
if(b){$("debug-project").value=b.projectId||"";if(b.type==="debug")$("debug-title").value=b.title}
$("debug-create-dialog").showModal();
}
function investigationTimer(c){
if(!c)return;
const date=today(),duration=15,startMinutes=Math.max(0,Math.min(1425,new Date().getHours()*60+new Date().getMinutes()));
let cursor=startMinutes,chosen=null;
while(cursor<=1425){const possible={id:uid(),title:"Debug Rescue: "+c.title,date,start:S.timeString(cursor),duration,type:"debug",projectId:c.projectId||"",note:"Investigation #"+c.id,done:false,secondsLogged:0};if(S.validate(possible,state.blocks).ok){chosen=possible;break}cursor+=5}
if(!chosen){notify("Your schedule has no available 15-minute slot today. Adjust an existing block first.",true);return}
state.blocks.push(chosen);c.linkedBlockId=chosen.id;c.updatedAt=new Date().toISOString();save();
$("debug-detail-dialog").close();
assignTimer(chosen);
nodeFocus();
notify("15-minute debugging session is ready to start.");
}
function nodeFocus(){if($("focus-open")&&!$("focus-open").disabled)$("focus-open").click()}
$("logbook-new").addEventListener("click",()=>openEntry());$("journal-prompt-start").addEventListener("click",()=>openEntry());
for(const id of ["debug-new","debug-new-secondary","immerse-debug"])$(id).addEventListener("click",()=>{if($("immersive-dialog").open)$("immersive-dialog").close();openCreateCase()});
$("journal-open").addEventListener("click",event=>{event.preventDefault();event.stopImmediatePropagation();openEntry(null,state.activeId)},true);
$("immerse-complete").addEventListener("click",event=>{event.preventDefault();event.stopImmediatePropagation();const blockId=state.activeId;$("timer-finish").click();$("immersive-dialog").close();openEntry(null,blockId)},true);
$("journal-form").addEventListener("submit",event=>{
event.preventDefault();event.stopImmediatePropagation();
try{const data={title:$("journal-entry-title").value,date:$("journal-entry-date").value,blockId:$("journal-link").value,projectId:$("journal-project").value,mood:$("journal-mood").value,done:$("journal-done").value,blocked:$("journal-blocked").value,next:$("journal-next").value};if(!S.dateParts(data.date))throw Error("Please choose a valid date.");
const old=state.journal.find(j=>j.id===editId);
const entry=K.makeEntry(data,editId||uid());if(old)Object.assign(old,entry);else state.journal.push(entry);
save();close("journal-dialog");renderStats();notify("Saved to your coding journal ✳");
}catch(error){$("journal-error").textContent=error.message;$("journal-error").hidden=false}
},true);
$("journal-search").addEventListener("input",renderEntries);$("journal-filter").addEventListener("change",renderEntries);
$("debug-create-form").addEventListener("submit",event=>{
event.preventDefault();
try{const c=K.makeCase({title:$("debug-title").value,projectId:$("debug-project").value,symptom:$("debug-symptom").value,repro:$("debug-repro").value,hypothesis:$("debug-hypothesis").value},uid());
state.debugCases.push(c);save();close("debug-create-dialog");renderStats();openCase(c.id);notify("Investigation created")}
catch(error){$("debug-create-error").textContent=error.message;$("debug-create-error").hidden=false}
});
$("debug-attempt-form").addEventListener("submit",event=>{
event.preventDefault();const c=state.debugCases.find(x=>x.id===caseId);if(!c)return;
try{const next=K.addAttempt(c,{action:$("debug-attempt-action").value,outcome:$("debug-attempt-outcome").value,observation:$("debug-attempt-observation").value},uid());Object.assign(c,next);save();renderStats();close("debug-detail-dialog");openCase(c.id);notify("Experiment added")}
catch(error){$("debug-attempt-error").textContent=error.message;$("debug-attempt-error").hidden=false}
});
$("debug-resolution-form").addEventListener("submit",event=>{
event.preventDefault();const c=state.debugCases.find(x=>x.id===caseId);if(!c)return;
const resolution=$("debug-resolution").value.trim();if(!resolution){$("debug-resolution-error").textContent="Describe the fix first.";$("debug-resolution-error").hidden=false;return}
c.resolution=resolution;c.status="resolved";c.updatedAt=new Date().toISOString();c.resolvedAt=c.resolvedAt||c.updatedAt;save();renderStats();window.DevtimeReportUI?.render();close("debug-detail-dialog");notify("Bug resolved — nicely done!");});
$("debug-toggle-status").addEventListener("click",()=>{const c=state.debugCases.find(x=>x.id===caseId);if(!c)return;c.status=c.status==="paused"?"investigating":"paused";c.updatedAt=new Date().toISOString();save();renderStats();close("debug-detail-dialog");openCase(c.id)});
$("debug-delete-case").addEventListener("click",()=>{const c=state.debugCases.find(x=>x.id===caseId);if(!c||!confirm("Delete this investigation and its experiments?"))return;state.debugCases=state.debugCases.filter(x=>x.id!==caseId);save();close("debug-detail-dialog");renderStats();notify("Investigation deleted")});
$("debug-start-timer").addEventListener("click",()=>investigationTimer(state.debugCases.find(x=>x.id===caseId)));
document.querySelectorAll("[data-debug-filter]").forEach(b=>b.addEventListener("click",()=>{filter=b.dataset.debugFilter;document.querySelectorAll("[data-debug-filter]").forEach(x=>x.classList.toggle("selected",x===b));renderCases()}));
document.querySelectorAll("[data-logbook-close]").forEach(b=>b.addEventListener("click",()=>close(b.dataset.logbookClose)));
window.DevtimeLogbookUI={render:renderStats,openEntry,openCase};
renderStats();
})();
