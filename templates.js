"use strict";
(()=> {
const T=window.DevtimeTemplates,$=id=>document.getElementById(id);
if(!T)return;
state.templates=Array.isArray(state.templates)?state.templates.filter(t=>t&&t.custom&&T.validateTemplate(t).ok):[];
let selected=null,plan=null;
const uid=()=>crypto.randomUUID();
const make=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x};
function paint(){const target=$("template-gallery");target.replaceChildren();for(const t of [...T.BUILTIN,...state.templates]){
 const card=make("article","template-card");card.style.setProperty("--template-color",t.accent||"#aa8ddd");
 const top=make("div","template-top");top.append(make("span","template-symbol",t.symbol||"✳"),make("span","template-kicker",t.category));card.append(top);
 const body=make("div","template-body"),span=T.timeSpan(t);
 body.append(make("h3","",t.name),make("p","",t.description),make("div","template-stats",t.blocks.length+" sessions · "+Math.round(span.focusMinutes/60*10)/10+" focus hours"));
 const bar=make("div","template-track");t.blocks.forEach(b=>{const x=make("span",b.type==="break"?"is-break":"");x.style.flex=String(b.duration);bar.append(x)});body.append(bar);
 const row=make("div","template-bottom"),use=make("button","","Use this routine ↗");use.onclick=()=>open(t);row.append(use);
 if(t.custom){const del=make("button","template-delete","Delete");del.onclick=()=>{if(!confirm("Delete this template?"))return;state.templates=state.templates.filter(x=>x.id!==t.id);save();paint()};row.append(del)}
 body.append(row);card.append(body);target.append(card);
}}
function open(t){selected=t;$("template-dialog-title").textContent=t.name;$("template-description").textContent=t.description;$("template-date").value=state.selected;$("template-start").value=window.DevtimeScheduler.timeString(T.timeSpan(t).start);$("template-mode").value="day";$("template-replace").checked=false;
 const projects=$("template-project");projects.replaceChildren(new Option("Keep original project links","keep"),new Option("No project",""));state.projects.forEach(p=>projects.add(new Option(p.name,p.id)));projects.value="keep";
 preview();$("template-dialog").showModal();}
function preview(){if(!selected)return;const settings={date:$("template-date").value,start:$("template-start").value,mode:$("template-mode").value,replace:$("template-replace").checked};if($("template-project").value!=="keep")settings.projectId=$("template-project").value;
 let i=0;plan=T.prepare(selected,settings,state.blocks,()=> "preview-"+(++i));
 $("template-apply").disabled=!plan.ok;$("template-error").hidden=!!plan.ok;$("template-error").textContent=plan.error||"";
 const list=$("template-preview");list.replaceChildren();$("template-preview-summary").textContent=plan.ok?plan.additions.length+" blocks, "+plan.dates.length+" day(s)":"Conflict";
 if(!plan.ok)return;
 for(const b of plan.additions.slice(0,30)){const row=make("div","template-preview-row");row.append(make("span","template-preview-time",b.start),make("span","template-preview-type "+(b.type==="break"?"break":"")));const label=make("div","template-preview-copy");label.append(make("strong","",b.title),make("small","",b.date+" · "+b.duration+" min"));row.append(label);list.append(row)}
 if(plan.additions.length>30)list.append(make("p","template-preview-message","And "+(plan.additions.length-30)+" more blocks…"));
}
["template-date","template-start","template-mode","template-project","template-replace"].forEach(id=>$(id).addEventListener("change",preview));
$("template-apply").onclick=()=>{preview();if(!plan?.ok)return;
 if(plan.replace&&plan.excludeIds.length&&!confirm("Replace "+plan.excludeIds.length+" scheduled blocks?"))return;
 if(plan.excludeIds.includes(state.activeId)&&state.timer?.running)pauseTimer();
 try{const final={...plan,additions:plan.additions.map(b=>({...b,id:uid()}))};state.blocks=T.apply(final,state.blocks);if(plan.excludeIds.includes(state.activeId)){state.activeId=null;state.timer=null}save();$("template-dialog").close();setDay(plan.dates[0]);notify("Added "+final.additions.length+" scheduled sessions")}catch(e){notify(e.message,true)}};
$("template-save").onclick=()=>{const items=state.blocks.filter(b=>b.date===state.selected);if(!items.length)return notify("Add some blocks to your selected day first.",true);$("template-name").value="";$("template-notes").value="";$("template-save-context").textContent=items.length+" blocks from "+state.selected;$("template-save-error").hidden=true;$("template-save-dialog").showModal()};
$("template-save-confirm").onclick=()=>{try{if(state.templates.length>=30)throw Error("Maximum 30 custom routines.");const x=T.snapshotDay($("template-name").value,state.selected,state.blocks,uid(),$("template-notes").value||"Your own coding routine.");state.templates.push(x);save();paint();$("template-save-dialog").close();notify("Routine saved")}catch(e){$("template-save-error").hidden=false;$("template-save-error").textContent=e.message}};
["template-dialog-close","template-cancel"].forEach(id=>$(id).onclick=()=>$("template-dialog").close());
["template-save-close","template-save-cancel"].forEach(id=>$(id).onclick=()=>$("template-save-dialog").close());
window.DevtimeTemplateUI={paint};paint();
})();