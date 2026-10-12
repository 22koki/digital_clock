/* Workspace snapshot validation and revision decisions. No credentials in snapshots. */
(function(root,factory){
  const api=factory(typeof module!=="undefined"&&module.exports?require("./scheduler.js"):root.DevtimeScheduler);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DevtimeCloudCore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(S){
  "use strict";
  const MAX_BYTES=900000;
  const fields=["blocks","projects","journal","debugCases","templates"];
  const maxItems={blocks:4000,projects:200,journal:5000,debugCases:2500,templates:50};
  function snapshot(state){
    const output={schema:"devtime2",version:1};
    for(const field of fields)output[field]=Array.isArray(state[field])?state[field]:[];
    output.reminderSettings=state.reminderSettings&&typeof state.reminderSettings==="object"?state.reminderSettings:{};
    output.selected=S.dateParts(state.selected)?state.selected:null;
    output.week=S.dateParts(state.week)?state.week:null;
    output.theme=state.theme==="light"?"light":"dark";
    output.selectedProject=String(state.selectedProject||"all");
    const safe=JSON.parse(JSON.stringify(output));
    const check=validate(safe);
    if(!check.ok)throw Error(check.error);
    return safe;
  }
  function validate(value){
    if(!value||typeof value!=="object"||Array.isArray(value)||value.schema!=="devtime2"||value.version!==1)return {ok:false,error:"Unknown cloud workspace format."};
    for(const field of fields){
      if(!Array.isArray(value[field])||value[field].length>maxItems[field])return {ok:false,error:"Invalid "+field+" collection."};
    }
    const validBlock=b=>b&&typeof b.id==="string"&&b.id.length<=160&&typeof b.title==="string"&&b.title.length<=250&&
      !!S.dateParts(b.date)&&Number.isFinite(S.minutes(b.start))&&Number.isInteger(Number(b.duration))&&Number(b.duration)>=1&&Number(b.duration)<=480;
    if(!value.blocks.every(validBlock))return {ok:false,error:"Your cloud schedule contains invalid blocks."};
    for(const field of ["projects","templates","debugCases","journal"]){
      if(!value[field].every(item=>item&&typeof item==="object"&&typeof item.id==="string"))return {ok:false,error:"Invalid saved "+field+" entries."};
    }
    if(typeof value.reminderSettings!=="object"||Array.isArray(value.reminderSettings))return {ok:false,error:"Invalid reminder settings."};
    if(value.selected!==null&&!S.dateParts(value.selected))return {ok:false,error:"Invalid selected day."};
    if(value.week!==null&&!S.dateParts(value.week))return {ok:false,error:"Invalid selected week."};
    const bytes=new TextEncoder().encode(JSON.stringify(value)).length;
    if(bytes>MAX_BYTES)return {ok:false,error:"Workspace exceeds the cloud limit. Export a backup and remove older entries first."};
    return {ok:true,bytes};
  }
  function selectAction({remoteExists=false,remoteRevision=null,cachedRevision=null,cachedDirty=false,hasCached=false}={}){
    if(!remoteExists)return "needs-upload-choice";
    if(!hasCached)return "needs-import-choice";
    if(remoteRevision===cachedRevision)return cachedDirty?"resume-push":"use-cached";
    return cachedDirty?"conflict":"pull-cloud";
  }
  function stripForUI(payload){const check=validate(payload);if(!check.ok)throw Error(check.error);
    return {blocks:payload.blocks,projects:payload.projects,journal:payload.journal,debugCases:payload.debugCases,templates:payload.templates,
      reminderSettings:payload.reminderSettings,selected:payload.selected,week:payload.week,theme:payload.theme,selectedProject:payload.selectedProject};
  }
  return {MAX_BYTES,snapshot,validate,selectAction,stripForUI};
});