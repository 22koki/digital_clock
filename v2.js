"use strict";(()=>{const P=window.DevtimeSmartPlanner,C=window.DevtimeCloudCore,$=id=>document.getElementById(id),config=window.DEVTIME_CLOUD_CONFIG||{};let draft=null,client=null,user=null,rev=null;
const uid=()=>crypto.randomUUID(),err=s=>{$("v2-cloud-error").textContent=s;$("v2-cloud-error").hidden=!s;};
$("v2-date").value=state.selected;
$("v2-preview").onclick=()=>{let i=0;draft=P.propose({tasks:P.parseTasks($("v2-tasks").value),date:$("v2-date").value,days:Number($("v2-days").value),start:$("v2-start").value,end:$("v2-end").value,breakEvery:Number($("v2-break-every").value),breakMinutes:Number($("v2-break-length").value)},state.blocks,()=>String(++i));const root=$("v2-result");root.replaceChildren();const intro=document.createElement("p");intro.textContent=draft.ok?draft.explanation:draft.error;root.append(intro);if(draft.ok){for(const b of draft.additions.slice(0,35)){const row=document.createElement("div");row.className="v2-result-item";const time=document.createElement("span"),title=document.createElement("strong");time.textContent=b.date+" "+b.start+" · "+b.duration+"m";title.textContent=b.title;row.append(time,title);root.append(row)}if(draft.unplaced.length){const warning=document.createElement("p");warning.textContent="Couldn't fit: "+draft.unplaced.map(x=>x.title).join(", ");root.append(warning)}}$("v2-apply").disabled=!draft.ok;};
$("v2-apply").onclick=()=>{if(!draft?.ok)return;try{const plan={...draft,additions:draft.additions.map(b=>({...b,id:uid()}))};state.blocks=P.apply(plan,state.blocks);save();setDay(draft.dates[0]);draft=null;$("v2-apply").disabled=true;notify("Smart schedule added")}catch(e){notify(e.message,true)}};
const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url||"")&&/^(sb_publishable_|eyJ)/.test(config.publishableKey||"");
function show(){const logged=!!user;$("account-status").textContent=logged?"Account connected":configured?"Sync available":"Local only";$("v2-auth-form").hidden=logged||!configured;$("v2-cloud-controls").hidden=!logged;$("v2-cloud-email").textContent=user?.email||"";$("v2-sync-status").textContent=rev?"Cloud revision "+rev:"Not synchronized";}
$("account-open").onclick=()=>{$("v2-account-dialog").showModal();err("");};$("v2-account-close").onclick=()=>$("v2-account-dialog").close();
$("v2-cloud-message").textContent=configured?"Cloud is optional. Your local work stays on this device until you choose to upload or download.":"Cloud accounts need a dedicated Supabase project. Devtime remains fully functional in local-only mode.";
async function fetchCloud(){const {data,error}=await client.from("devtime_workspaces").select("revision,snapshot").eq("user_id",user.id).maybeSingle();if(error)throw error;rev=data?.revision||null;show();return data;}
function backup(){const content=JSON.stringify({format:"devtime-backup-v2",exportedAt:new Date().toISOString(),state:{blocks:state.blocks,projects:state.projects,journal:state.journal,debugCases:state.debugCases,templates:state.templates}},null,2),url=URL.createObjectURL(new Blob([content],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="devtime-pre-sync.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
$("v2-upload").onclick=async()=>{if(!user)return;try{const old=await fetchCloud(),snapshot=C.snapshot(state);if(!confirm(old?"Replace your existing cloud snapshot with this browser's workspace?":"Upload a private copy of your local workspace?"))return;let response;if(old){response=await client.from("devtime_workspaces").update({snapshot,revision:old.revision+1,updated_at:new Date().toISOString()}).eq("user_id",user.id).eq("revision",old.revision).select("revision").maybeSingle();if(!response.error&&!response.data)throw Error("The cloud version changed. No data was overwritten.")}else response=await client.from("devtime_workspaces").insert({user_id:user.id,snapshot,revision:1}).select("revision").single();if(response.error)throw response.error;rev=response.data.revision;show();notify("Cloud backup saved")}catch(e){err(e.message)}};
$("v2-download").onclick=async()=>{if(!user)return;try{const remote=await fetchCloud();if(!remote)throw Error("No cloud data exists yet.");const check=C.validate(remote.snapshot);if(!check.ok)throw Error(check.error);if(!confirm("Replace this browser's workspace with cloud data? A local backup will download first."))return;backup();if(state.timer?.running)pauseTimer();Object.assign(state,C.stripForUI(remote.snapshot));state.activeId=null;state.timer=null;save();render();window.DevtimeTemplateUI?.paint();window.DevtimeLogbookUI?.render();window.DevtimeReportUI?.render();notify("Cloud workspace restored")}catch(e){err(e.message)}};
/* Validate credentials before calling Auth. Empty signup fields can be interpreted as an
   anonymous sign-in request, which Devtime does not support. */
function authCredentials(action){
  const emailField=$("v2-email"),passwordField=$("v2-password");
  const email=emailField.value.trim(),password=passwordField.value;
  if(!email){
    err("Enter your email address before you "+action+".");
    emailField.focus();
    return null;
  }
  if(!emailField.checkValidity()){
    err("Enter a valid email address, such as name@example.com.");
    emailField.focus();
    return null;
  }
  if(!password){
    err("Enter a password before you "+action+".");
    passwordField.focus();
    return null;
  }
  if(password.length<6){
    err("Your password must contain at least 6 characters.");
    passwordField.focus();
    return null;
  }
  return {email,password};
}
let authBusy=false;
async function handleEmailAuth(action){
  err("");
  const credentials=authCredentials(action==="signup"?"create an account":"sign in");
  if(!credentials)return;
  if(!client)return err("Devtime's account service is still loading. Try again in a moment.");
  if(authBusy)return;
  authBusy=true;
  const submit=$("v2-auth-form").querySelector('button[type="submit"]');
  const signup=$("v2-signup");
  const buttonText=submit.textContent,signupText=signup.textContent;
  submit.disabled=true;signup.disabled=true;
  if(action==="signup")signup.textContent="Creating account…";
  else submit.textContent="Signing in…";
  try{
    if(action==="signup"){
      const {data,error}=await client.auth.signUp({
        email:credentials.email,
        password:credentials.password,
        options:{emailRedirectTo:location.origin+location.pathname}
      });
      if(error)throw error;
      $("v2-password").value="";
      if(data?.session){
        user=data.user||data.session.user;
        show();
        $("v2-cloud-message").textContent="Your account is ready. You can now choose to upload your local work.";
        notify("Account created. Your local data is still on this browser.");
      }else{
        const message="Account request sent. Check your email for a confirmation link, then return to Devtime and sign in.";
        $("v2-cloud-message").textContent=message;
        notify("Check your email to confirm your account.");
      }
    }else{
      const {error}=await client.auth.signInWithPassword(credentials);
      if(error)throw error;
      const {data,error:profileError}=await client.auth.getUser();
      if(profileError||!data?.user)throw profileError||new Error("Could not verify your account. Please try again.");
      user=data.user;show();$("v2-password").value="";
      notify("Signed in. Choose Upload or Download to sync your workspace.");
    }
  }catch(problem){
    err(problem?.message||"Account request failed. Please try again.");
  }finally{
    submit.disabled=false;signup.disabled=false;
    submit.textContent=buttonText;signup.textContent=signupText;
    authBusy=false;
  }
}
$("v2-auth-form").onsubmit=e=>{e.preventDefault();handleEmailAuth("signin")};
$("v2-signup").onclick=()=>handleEmailAuth("signup");
$("v2-signout").onclick=async()=>{if(!client)return;const {error}=await client.auth.signOut();if(error)return err(error.message);user=null;rev=null;show();notify("Signed out; local data remains")};
async function boot(){if(!configured)return;try{const sdk=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.89.0/+esm");client=sdk.createClient(config.url,config.publishableKey);const {data}=await client.auth.getUser();user=data.user;show();client.auth.onAuthStateChange((e,session)=>{user=session?.user||null;show()})}catch(e){err("Cloud client unavailable; local mode remains active.")}}
const markWelcome=()=>{try{localStorage.setItem("devtime-v2-welcomed","yes")}catch{}$("v2-welcome").close()};$("v2-welcome-start").onclick=()=>{markWelcome();$("smart-planner").scrollIntoView({behavior:"smooth"})};$("v2-welcome-skip").onclick=markWelcome;try{if(!localStorage.getItem("devtime-v2-welcomed"))$("v2-welcome").showModal()}catch{}show();boot();
})();