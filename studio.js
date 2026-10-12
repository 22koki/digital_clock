"use strict";
/* Devtime Studio enhancement layer. Shares the local state and timer with app.js. */
(() => {
  const S=window.DevtimeScheduler;
  if(!S)throw Error("scheduler.js must load before studio.js");
  const node=id=>document.getElementById(id),elem=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el};
  const uid=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"dt-"+Date.now()+"-"+Math.random().toString(36).slice(2);
  const escapeText=str=>String(str??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const getProject=id=>state.projects.find(p=>p.id===id);
  const projectName=id=>getProject(id)?.name||"Personal coding";
  const minutesLabel=n=>Math.floor(n/60)+"h "+Math.round(n%60)+"m";
  const blocksFor=date=>state.blocks.filter(b=>b.date===date).sort((a,b)=>a.start.localeCompare(b.start));
  const validHex=value=>/^#[0-9a-f]{6}$/i.test(value)?value:"#9e82d7";
  state.projects=Array.isArray(state.projects)?state.projects.filter(p=>p&&typeof p.id==="string"&&typeof p.name==="string"):[];
  state.journal=Array.isArray(state.journal)?state.journal.filter(j=>j&&typeof j.blockId==="string"):[];
  state.selectedProject=state.selectedProject||"all";
  state.week=state.week&&S.dateParts(state.week)?state.week:state.selected;
  state.blocks.forEach(b=>{if(!("projectId"in b))b.projectId="";});
  save();

  function updateProjectsSelect(){
    const select=node("block-project"),old=select.value;
    select.replaceChildren(new Option("No project",""));
    state.projects.forEach(p=>select.add(new Option(p.name,p.id)));
    select.value=old||"";
  }
  function openProjectDialog(project=null){
    currentProject=project?.id||null;
    node("project-dialog-title").textContent=project?"Edit project":"New project";
    node("project-name").value=project?.name||"";
    node("project-description").value=project?.description||"";
    node("project-color").value=validHex(project?.color);
    node("project-goal").value=project?.goal||5;
    node("project-repo").value=project?.repo||"";
    node("project-error").hidden=true;
    node("project-dialog").showModal();
    node("project-name").focus();
  }
  let currentProject=null,currentJournalBlock=null,ambience=null,ambienceOn=false;
  const originalOpenDialog=openDialog;
  openDialog=function(block=null){
    originalOpenDialog(block);
    updateProjectsSelect();
    node("block-project").value=block?.projectId&&getProject(block.projectId)?block.projectId:"";
    node("block-repeat").value="none";node("block-repeat-count").value=4;
    node("repeat-count-wrap").hidden=true;
    node("block-repeat").disabled=!!block;node("block-repeat-count").disabled=!!block;
  };
  node("block-repeat").addEventListener("change",()=>node("repeat-count-wrap").hidden=node("block-repeat").value==="none");
  /* Handle the extended form before the legacy one runs, so repeats are atomic. */
  node("block-form").addEventListener("submit",event=>{
    event.preventDefault();event.stopImmediatePropagation();
    const title=node("block-title").value.trim(),start=node("block-start").value,
      date=node("block-date").value,type=node("block-type").value,
      duration=Number(node("block-duration").value),note=node("block-note").value.trim(),
      projectId=node("block-project").value,repeat=node("block-repeat").value,
      count=repeat==="none"?1:Number(node("block-repeat-count").value),error=node("form-error");
    const fail=message=>{error.textContent=message;error.hidden=false};
    if(!types[type]||(!getProject(projectId)&&projectId))return fail("Select an existing project.");
    const template={title,start,date,type,duration,note,projectId};
    try {
      if(editing){
        const existing=state.blocks.find(b=>b.id===editing);
        if(!existing)return fail("Could not locate that block.");
        const newBlock={...existing,...template,sample:false};
        const check=S.validate(newBlock,state.blocks,[existing.id]);if(!check.ok)return fail(check.error);
        if(state.activeId===existing.id&&state.timer?.running)pauseTimer();
        const changed=existing.duration!==duration;Object.assign(existing,newBlock);
        if(changed&&state.activeId===existing.id){state.timer={remaining:duration*60,total:duration*60,running:false,startedAt:null,endsAt:null};}
      } else {
        const repeated=S.createRepeated(template,repeat,count,uid);
        const check=S.validate(repeated,state.blocks);if(!check.ok)return fail(check.error);
        state.blocks.push(...repeated);
      }
    } catch(err){return fail(err.message)}
    node("block-dialog").close();save();setDay(date);renderStudio();notify(editing?"Block updated":count>1?count+" recurring sessions created":"Time block added");
  },true);
  const originalRender=render;
  render=function(){originalRender();renderStudio()};
  const originalAssign=assignTimer;
  assignTimer=function(block){originalAssign(block);renderStudio();};
  function renderStudio(){updateProjectsSelect();renderWeek();renderProjects();renderInsights();updateFocus()};
  function weekRange(){const days=S.weekDates(state.week);return days}
  function renderWeek(){
    const dates=weekRange(),first=S.dateParts(dates[0]),last=S.dateParts(dates[6]);
    const fmt={month:"short",day:"numeric"};
    node("week-label").textContent=first.toLocaleDateString(undefined,fmt)+" – "+last.toLocaleDateString(undefined,{...fmt,year:"numeric"});
    const count=state.blocks.filter(b=>dates.includes(b.date)).length;
    node("week-total").textContent=count+" block"+(count===1?"":"s");
    const grid=node("week-grid");grid.replaceChildren();
    dates.forEach(date=>{
      const day=elem("div","week-day"+(date===today()?" is-today":""));day.dataset.date=date;
      const head=elem("div","week-day-head");const stamp=elem("div");stamp.append(elem("strong","",S.dateParts(date).toLocaleDateString(undefined,{weekday:"short"})),elem("span","", " "+S.dateParts(date).getDate()));
      const go=elem("button","week-date-select","+");go.type="button";go.title="Add block on "+date;
      go.addEventListener("click",()=>{setDay(date);openDialog();node("block-date").value=date});
      head.append(stamp,go);day.append(head);
      const dayBlocks=blocksFor(date).filter(b=>state.selectedProject==="all"||b.projectId===state.selectedProject);
      if(!dayBlocks.length)day.append(elem("div","week-empty","Drop a session here ✳"));
      dayBlocks.forEach(b=>{
        const btn=elem("div","week-block"+(b.type==="break"?" break":"")+(b.done?" completed":""));
        btn.draggable=true;btn.dataset.id=b.id;btn.tabIndex=0;btn.setAttribute("role","button");btn.setAttribute("aria-label",b.title+", "+b.start+", "+b.duration+" minutes. Select session.");
        btn.append(elem("span","week-time",b.start+" · "+b.duration+" min"),elem("strong","",b.title),elem("small","",projectName(b.projectId)));
        btn.addEventListener("click",ev=>{if(ev.target.closest("button"))return;assignTimer(b)});
        btn.addEventListener("keydown",ev=>{if(ev.target===btn&&(ev.key==="Enter"||ev.key===" ")){ev.preventDefault();assignTimer(b)}});
        btn.addEventListener("dragstart",ev=>{ev.dataTransfer.setData("text/plain",b.id);ev.dataTransfer.effectAllowed="move"});
        const actions=elem("div","week-block-actions");
        for(const [label,shift] of [["←",-1],["→",1]]){
          const move=elem("button","",label);move.type="button";move.title="Move one day "+(shift<0?"earlier":"later");
          move.addEventListener("click",()=>moveBlock(b.id,S.addDays(b.date,shift)));actions.append(move);
        }
        const edit=elem("button","","Edit");edit.type="button";edit.addEventListener("click",()=>openDialog(b));actions.append(edit);btn.append(actions);day.append(btn);
      });
      day.addEventListener("dragover",ev=>{ev.preventDefault();day.classList.add("drag-hover")});
      day.addEventListener("dragleave",ev=>{if(!day.contains(ev.relatedTarget))day.classList.remove("drag-hover")});
      day.addEventListener("drop",ev=>{ev.preventDefault();day.classList.remove("drag-hover");const id=ev.dataTransfer.getData("text/plain");if(id)moveBlock(id,date)});
      grid.append(day);
    });
  }
  function moveBlock(id,date){
    const block=state.blocks.find(b=>b.id===id);if(!block)return;
    if(block.date===date)return;
    const result=S.move(block,date,block.start,state.blocks);
    if(!result.ok)return notify(result.error,true);
    if(state.activeId===id&&state.timer?.running)pauseTimer();
    Object.assign(block,result.block);save();render();notify("Moved to "+date);
  }
  node("week-prev").addEventListener("click",()=>{state.week=S.addDays(state.week,-7);save();renderWeek()});
  node("week-next").addEventListener("click",()=>{state.week=S.addDays(state.week,7);save();renderWeek()});
  node("week-now").addEventListener("click",()=>{state.week=today();save();renderWeek()});
  node("week-add").addEventListener("click",()=>openDialog());
  node("project-add").addEventListener("click",()=>openProjectDialog());
  node("project-form").addEventListener("submit",ev=>{
    ev.preventDefault();
    const name=node("project-name").value.trim(),description=node("project-description").value.trim(),
      color=validHex(node("project-color").value),goal=Number(node("project-goal").value),
      repo=node("project-repo").value.trim(),error=node("project-error");
    const fail=m=>{error.hidden=false;error.textContent=m};
    if(!name)return fail("Project name is required.");
    if(!Number.isFinite(goal)||goal<1||goal>80)return fail("Choose a weekly goal from 1 to 80 hours.");
    if(repo&&!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(repo))return fail("Use a GitHub repository URL: https://github.com/owner/repo");
    const data={name,description,color,goal,repo};
    if(currentProject){const project=getProject(currentProject);if(project)Object.assign(project,data)}
    else state.projects.push({id:uid(),...data});
    node("project-dialog").close();save();renderStudio();notify(currentProject?"Project updated":"Project created");
  });
  function renderProjects(){
    const filter=node("project-filter");filter.replaceChildren();
    const choices=[{id:"all",name:"All projects"},...state.projects];
    if(state.selectedProject!=="all"&&!getProject(state.selectedProject))state.selectedProject="all";
    choices.forEach(p=>{const b=elem("button","filter-chip"+(state.selectedProject===p.id?" selected":""),p.name);b.type="button";b.addEventListener("click",()=>{state.selectedProject=p.id;save();renderStudio()});filter.append(b)});
    const grid=node("project-grid");grid.replaceChildren();
    const projects=state.selectedProject==="all"?state.projects:state.projects.filter(p=>p.id===state.selectedProject);
    if(!projects.length){const d=elem("div","project-empty");d.append(elem("strong","","Give your ideas a home."),elem("p","","Create a project, then link coding sessions to it."));grid.append(d);return}
    projects.forEach(p=>{
      const stats=S.projectStats(p.id,state.blocks),goalSeconds=p.goal*3600,weeklySeconds=state.blocks.filter(b=>b.projectId===p.id&&weekRange().includes(b.date)).reduce((sum,b)=>sum+Number(b.secondsLogged||0),0),percentage=Math.min(100,Math.round(weeklySeconds/goalSeconds*100));
      const card=elem("article","project-card");card.style.setProperty("--project-color",validHex(p.color));
      const head=elem("div","project-card-top");head.append(elem("span","project-marker",p.name.slice(0,2).toUpperCase()),elem("span","micro-label",percentage+"% of weekly goal"));
      card.append(head,elem("h3","",p.name),elem("p","",p.description||"Where ideas become working code."));
      const s=elem("div","project-stats");for(const [label,value] of [["FOCUS LOGGED",minutesLabel(stats.loggedSeconds/60)],["BLOCKS FINISHED",stats.completed+" / "+stats.blocks]]){const item=elem("div");item.append(elem("strong","",value),elem("span","",label));s.append(item)}card.append(s);
      const bar=elem("div","project-progress");const fill=elem("span");fill.style.width=percentage+"%";bar.append(fill);card.append(bar);
      const actions=elem("div","project-card-actions");
      const button=(text,click)=>{const b=elem("button","",text);b.type="button";b.addEventListener("click",click);actions.append(b)};
      button("+ Session",()=>{openDialog();node("block-project").value=p.id});
      button("Edit",()=>openProjectDialog(p));
      if(p.repo)button("GitHub issues",()=>loadIssues(p));
      button("Delete",()=>{if(!confirm('Delete project "'+p.name+'"? Scheduled blocks will be kept without a project.'))return;state.projects=state.projects.filter(x=>x.id!==p.id);state.blocks.forEach(b=>{if(b.projectId===p.id)b.projectId=""});state.selectedProject="all";save();render();notify("Project removed; scheduled sessions kept.")});
      card.append(actions);grid.append(card);
    });
  }
  function renderInsights(){
    const days=weekRange(),data=days.map(date=>({date,seconds:blocksFor(date).reduce((sum,b)=>sum+(Number(b.secondsLogged)||0),0)})),max=Math.max(60,...data.map(d=>d.seconds));
    const chart=node("insight-chart");chart.replaceChildren();
    data.forEach(d=>{
      const bar=elem("div","chart-day"),track=elem("div","chart-track"),fill=elem("div","chart-fill");
      fill.style.height=Math.max(2,d.seconds/max*100)+"%";fill.title=Math.round(d.seconds/60)+" minutes";track.append(fill);
      bar.append(elem("strong","",Math.round(d.seconds/60)+"m"),track,elem("span","",S.dateParts(d.date).toLocaleDateString(undefined,{weekday:"short"})));chart.append(bar);
    });
    const total=data.reduce((a,b)=>a+b.seconds,0),activeDays=data.filter(d=>d.seconds>0).length;
    node("insight-hours").textContent=minutesLabel(total/60);node("insight-days").textContent=activeDays+" / 7";
    node("insight-badge").textContent=total>=20*3600?"Focus legend":total>=10*3600?"Deep work pro":total>=3600?"Getting into flow":total>0?"Momentum builder":"First steps";
  }
  async function loadIssues(project){
    node("issues-dialog").showModal();node("issues-title").textContent=project.name+" issues";
    const target=node("issue-results");target.replaceChildren(elem("p","journal-context","Checking public open issues…"));
    const match=project.repo?.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/);if(!match)return;
    const url="https://api.github.com/repos/"+encodeURIComponent(match[1])+"/"+encodeURIComponent(match[2])+"/issues?state=open&per_page=30";
    try {
      const response=await fetch(url,{headers:{"Accept":"application/vnd.github+json"}});
      if(!response.ok)throw Error("GitHub returned "+response.status+". Public repositories only; rate limits may apply.");
      const data=await response.json();if(!Array.isArray(data))throw Error("Unexpected GitHub response");
      const issues=data.filter(i=>!i.pull_request);target.replaceChildren();
      if(!issues.length){target.append(elem("p","journal-context","No open issues found."));return}
      node("issues-explanation").textContent="Choose an issue to create a planned work block. Public repositories only; no login or private-token storage.";
      issues.forEach(issue=>{
        const row=elem("div","issue-row"),detail=elem("div");
        detail.append(elem("strong","",issue.title),elem("small","","#"+issue.number+" · "+(issue.labels||[]).map(l=>l.name).join(", ")));
        const add=elem("button","","+ Plan");add.type="button";
        add.addEventListener("click",()=>{node("issues-dialog").close();openDialog();node("block-title").value=String(issue.title).slice(0,90);node("block-note").value=("GitHub issue #"+issue.number+" · "+issue.html_url).slice(0,250);node("block-project").value=project.id});
        row.append(detail,add);target.append(row);
      });
    }catch(err){target.replaceChildren(elem("p","form-error",err.message+" You can still add a block manually."))}
  }
  function journalFor(blockId){return state.journal.find(entry=>entry.blockId===blockId)}
  function openJournal(block=active()){
    if(!block){notify("Choose a block from your schedule to write a journal entry.",true);return}
    currentJournalBlock=block.id;
    const entry=journalFor(block.id);
    node("journal-context").textContent=block.title+" · "+block.date+" · "+projectName(block.projectId);
    node("journal-done").value=entry?.done||"";
    node("journal-blocked").value=entry?.blocked||"";
    node("journal-next").value=entry?.next||"";
    node("journal-dialog").showModal();
  }
  node("journal-open").addEventListener("click",()=>openJournal());
  node("journal-form").addEventListener("submit",ev=>{
    ev.preventDefault();
    if(!currentJournalBlock)return;
    const entry={blockId:currentJournalBlock,done:node("journal-done").value.trim(),blocked:node("journal-blocked").value.trim(),next:node("journal-next").value.trim(),updatedAt:new Date().toISOString()};
    const index=state.journal.findIndex(j=>j.blockId===currentJournalBlock);
    if(index<0)state.journal.push(entry);else state.journal[index]=entry;
    node("journal-dialog").close();save();notify("Coding journal saved");
  });
  function standupText(){
    const day=state.selected,done=blocksFor(day).filter(b=>b.done);
    const completed=done.map(b=>"- "+b.title+(journalFor(b.id)?.done?" — "+journalFor(b.id).done:""));
    const blocked=done.flatMap(b=>journalFor(b.id)?.blocked?["- "+journalFor(b.id).blocked]:[]);
    const next=done.flatMap(b=>journalFor(b.id)?.next?["- "+journalFor(b.id).next]:[]);
    const upcoming=blocksFor(day).filter(b=>!b.done).map(b=>"- "+b.title);
    return ["Devtime standup · "+day,"","Completed:",...(completed.length?completed:["- No completed sessions recorded."]),"","Blockers:",...(blocked.length?blocked:["- None recorded."]),"","Next:",...(next.length?next:upcoming.length?upcoming:["- Plan the next step."])].join("\n");
  }
  node("standup-copy").addEventListener("click",async()=>{
    const text=standupText();
    try{await navigator.clipboard.writeText(text);notify("Standup copied to clipboard")}
    catch{const blob=new Blob([text],{type:"text/plain"});downloadBlob(blob,"devtime-standup-"+state.selected+".txt");notify("Standup downloaded")}
  });
  function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=elem("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  node("backup-export").addEventListener("click",()=>{
    const copy={format:"devtime-backup-v2",exportedAt:new Date().toISOString(),state:{blocks:state.blocks,projects:state.projects,journal:state.journal}};
    downloadBlob(new Blob([JSON.stringify(copy,null,2)],{type:"application/json"}),"devtime-backup-"+today()+".json");notify("Backup saved");
  });
  node("backup-import").addEventListener("click",()=>node("backup-file").click());
  node("backup-file").addEventListener("change",async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      if(file.size>3e6)throw Error("Backup is too large (3 MB maximum).");
      const data=JSON.parse(await file.text());
      if(data.format!=="devtime-backup-v2"||!Array.isArray(data.state?.blocks)||!Array.isArray(data.state?.projects)||!Array.isArray(data.state?.journal))throw Error("Not a valid Devtime backup.");
      if(data.state.blocks.length>4000||data.state.projects.length>200||data.state.journal.length>5000)throw Error("Backup exceeds size limits.");
      if(!data.state.blocks.every(b=>b&&typeof b.id==="string"&&typeof b.title==="string"&&S.validate(b,[],[]).ok))throw Error("Backup contains invalid schedule blocks.");
      if(!data.state.projects.every(p=>p&&typeof p.id==="string"&&typeof p.name==="string"))throw Error("Invalid project data.");
      if(!data.state.journal.every(j=>j&&typeof j.blockId==="string"))throw Error("Invalid journal data.");
      if(!confirm("Replace your current saved schedule, projects and journal with this backup? Export a backup first if needed."))return;
      if(state.timer?.running)pauseTimer();
      state.blocks=data.state.blocks;state.projects=data.state.projects;state.journal=data.state.journal;
      state.activeId=null;state.timer=null;state.selectedProject="all";save();render();notify("Backup imported");
    }catch(err){notify(err.message,true)}
    finally{event.target.value=""}
  });

  const focusOriginal=renderTimer;
  renderTimer=function(){focusOriginal();updateFocus()};
  function updateFocus(){
    const block=active(),t=state.timer;
    node("focus-open").disabled=!block;
    if(!block){node("immersive-task").textContent="Choose a session";node("immersive-project").textContent="Your coding workspace";node("immerse-digits").textContent="00:00";return}
    const rem=timerRemaining();
    node("immersive-task").textContent=block.title;
    node("immersive-project").textContent=projectName(block.projectId);
    node("immerse-digits").textContent=clockText(rem);
    node("immerse-status").textContent=t?.running?"In the zone":rem<=0?"Session finished":"Ready when you are";
    node("immerse-ring").style.strokeDashoffset=String(835.66*(1-(t?.total?rem/t.total:1)));
    node("immerse-toggle").textContent=t?.running?"Pause session":rem<=0?"Reset session":"Start focusing";
  }
  node("focus-open").addEventListener("click",()=>{if(!active())return;updateFocus();node("immersive-dialog").showModal()});
  node("immerse-toggle").addEventListener("click",()=>{if(timerRemaining()<=0)node("timer-reset").click();else node("timer-start").click();updateFocus()});
  node("immerse-complete").addEventListener("click",()=>{node("timer-finish").click();node("immersive-dialog").close();openJournal()});
  node("immerse-extend").addEventListener("click",()=>{
    const block=active();if(!block)return;
    if(block.duration+15>480)return notify("A session can be at most 480 minutes.",true);
    const updated=S.resize(block,block.duration+15,state.blocks);if(!updated.ok)return notify("Cannot extend: "+updated.error+" Shift upcoming blocks in your weekly planner first.",true);
    const wasRunning=state.timer?.running;if(wasRunning)pauseTimer();
    block.duration+=15;state.timer.remaining+=900;state.timer.total+=900;
    if(wasRunning){state.timer.running=true;state.timer.startedAt=Date.now();state.timer.endsAt=Date.now()+state.timer.remaining*1000}
    save();render();notify("Added 15 minutes to this session");
  });
  function ambientToggle(){
    if(ambienceOn){ambienceOn=false;if(ambience){ambience.osc.stop();ambience.ctx.close();ambience=null}node("ambience-toggle").textContent="◖ ♪ ◗  Turn on gentle rain";return}
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)throw Error("Sound unsupported");
      const ctx=new AudioCtx(),length=ctx.sampleRate*2,buffer=ctx.createBuffer(1,length,ctx.sampleRate),out=buffer.getChannelData(0);let last=0;
      for(let i=0;i<length;i++){last=(last+(.02*Math.random()-.01))*.996;out[i]=last}
      const osc=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();osc.buffer=buffer;osc.loop=true;filter.type="lowpass";filter.frequency.value=1100;gain.gain.value=.09;osc.connect(filter);filter.connect(gain);gain.connect(ctx.destination);osc.start();ambience={ctx,osc};ambienceOn=true;node("ambience-toggle").textContent="◖ ♪ ◗  Turn off gentle rain";
    }catch{notify("Ambient sound is unavailable in this browser.",true)}
  }
  node("ambience-toggle").addEventListener("click",ambientToggle);
  document.querySelectorAll("[data-close-dialog]").forEach(btn=>btn.addEventListener("click",()=>{const dialog=node(btn.dataset.closeDialog);dialog.close();if(dialog.id==="immersive-dialog"&&ambienceOn)ambientToggle()}));
  document.addEventListener("keydown",ev=>{
    if(ev.code!=="Space"||!node("immersive-dialog").open||ev.target.closest("button,input,textarea,select"))return;
    ev.preventDefault();node("immerse-toggle").click();
  });
  document.querySelectorAll("dialog").forEach(dialog=>dialog.addEventListener("close",()=>{if(dialog.id==="immersive-dialog"&&ambienceOn)ambientToggle()}));
  /* Only install as a service worker on http(s), not when opened as file://. */
  if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
  renderStudio();
})();