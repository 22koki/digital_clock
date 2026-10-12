"use strict";
(() => {
  const R=window.DevtimeReminderRules,$=id=>document.getElementById(id);
  if(!R)return;
  const fields={
    upcoming:"reminder-upcoming",leadMinutes:"reminder-lead",atStart:"reminder-at-start",
    includeBreaks:"reminder-breaks",sessionComplete:"reminder-finished",
    sound:"reminder-sound",desktop:"reminder-desktop",quiet:"reminder-quiet",
    quietFrom:"reminder-quiet-from",quietUntil:"reminder-quiet-until"
  };
  state.reminderSettings=R.normalize(state.reminderSettings);
  state.reminderHistory=R.pruneHistory(state.reminderHistory);
  const prefs=()=>state.reminderSettings;
  function refreshInputs(){
    for(const [key,id] of Object.entries(fields)){
      const input=$(id);input[input.type==="checkbox"?"checked":"value"]=prefs()[key];
    }
    $("reminder-quiet-range").hidden=!prefs().quiet;
    $("reminder-lead").disabled=!prefs().upcoming;
    const status=$("reminder-permission-status"),button=$("reminder-request");
    const permission=("Notification"in window)?Notification.permission:"unsupported";
    status.classList.toggle("granted",permission==="granted");
    status.classList.toggle("denied",permission==="denied"||permission==="unsupported");
    status.lastElementChild.textContent=permission==="granted"?"Browser alerts enabled":permission==="denied"?"Notifications blocked in browser settings":permission==="unsupported"?"Browser notifications unsupported":"In-app alerts are ready; desktop permission is optional";
    button.hidden=permission==="granted"||permission==="denied"||permission==="unsupported";
    button.disabled=permission!=="default";
  }
  function saveSettings(){
    for(const [key,id] of Object.entries(fields)){
      const input=$(id);prefs()[key]=input.type==="checkbox"?input.checked:input.value;
    }
    state.reminderSettings=R.normalize(prefs());
    save();refreshInputs();showUpcoming();
  }
  for(const id of Object.values(fields))$(id).addEventListener("change",saveSettings);
  function showUpcoming(){
    const upcoming=R.nextEvents(state.blocks,new Date(),prefs(),4),list=$("reminder-next-list");
    list.replaceChildren();
    $("reminder-next-count").textContent=upcoming.length+" upcoming";
    if(!upcoming.length){
      const e=document.createElement("div");e.className="reminder-next-empty";e.textContent="Nothing scheduled next. Your next coding block will appear here.";list.append(e);
      return;
    }
    for(const {block,at} of upcoming){
      const e=document.createElement("div");e.className="reminder-next-item";
      const time=document.createElement("span");time.className="reminder-next-date";
      time.textContent=at.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
      const detail=document.createElement("div"),heading=document.createElement("strong"),info=document.createElement("small");
      heading.textContent=block.title;info.textContent=at.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})+" · "+block.duration+" min";
      detail.append(heading,info);e.append(time,detail);list.append(e);
    }
  }
  function playChime(){
    if(!prefs().sound||R.quietNow(new Date(),prefs()))return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      const ctx=new Audio(),osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type="sine";osc.frequency.setValueAtTime(659,ctx.currentTime);
      osc.frequency.setValueAtTime(880,ctx.currentTime+.14);
      gain.gain.setValueAtTime(.0001,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.1,ctx.currentTime+.03);
      gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.35);
      osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.36);
      osc.onended=()=>ctx.close();
    }catch(error){console.warn("Chime unavailable",error)}
  }
  function alertUser(title,body,{test=false,session=false}={}){
    if(!test&&R.quietNow(new Date(),prefs()))return;
    if(session&&!prefs().sessionComplete)return;
    notify(title+" · "+body);
    playChime();
    if(prefs().desktop&&("Notification"in window)&&Notification.permission==="granted"){
      try{new Notification("Devtime ✳ "+title,{body,tag:("devtime-"+title+"-"+body).slice(0,120)})}catch(error){console.warn("Notification unavailable",error)}
    }
  }
  function checkUpcoming(){
    const now=new Date(),events=R.upcomingEvents(state.blocks,now,prefs(),state.reminderHistory);
    for(const event of events){
      const {block,kind,key}=event;
      state.reminderHistory[key]=Date.now();
      const category=block.type==="break"?"Break":"Coding";
      alertUser(kind==="start"?"It's time to begin":category+" block coming up",
        kind==="start"?block.title+" is scheduled now.":block.title+" starts in "+prefs().leadMinutes+" minutes.");
    }
    if(events.length)save();
  }
  let lastNext=0;
  function pulse(){
    const now=Date.now();
    if(now-lastNext<5000)return;
    lastNext=now;checkUpcoming();
    if(now%60000<6000)showUpcoming();
  }
  $("reminder-request").addEventListener("click",async()=>{
    if(!("Notification"in window))return notify("Desktop notifications are not supported here.",true);
    try{
      const p=await Notification.requestPermission();
      refreshInputs();notify(p==="granted"?"Desktop alerts enabled.":"In-app alerts remain available.",p!=="granted");
    }catch(error){notify("Could not request desktop notification permission.",true)}
  });
  $("reminder-preview").addEventListener("click",()=>{
    alertUser("Your test reminder","Nice! You're all set for your next coding session.",{test:true});
  });
  $("notification-button").addEventListener("click",event=>{
    event.preventDefault();event.stopImmediatePropagation();
    $("reminders").scrollIntoView({behavior:"smooth"});
  },true);
  window.DevtimeReminderUI={
    onComplete(block){if(prefs().sessionComplete)alertUser("Session complete",block?.title||"Your focus session is finished.",{session:true})},
    shouldNotifyCompletion(){return prefs().sessionComplete&&!R.quietNow(new Date(),prefs())},
    settings:prefs,refresh:showUpcoming
  };
  refreshInputs();showUpcoming();checkUpcoming();
  setInterval(pulse,5000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){pulse();showUpcoming();}});
})();
