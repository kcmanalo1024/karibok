// Relationships reference the original records; Trash never makes copies.
export const trashKinds = ['folders','tasks','notes','clients','payments','transactions','accounts','utang'];
export function activeWorkspace(data) {
 return {...data,...Object.fromEntries(trashKinds.map(k=>[k,(data[k]||[]).filter(r=>!r.deletedAt)]))};
}
export function migrateOrganization(data) {
 if(data.organizationVersion===1)return data;
 const folders=[...(data.folders||[])];
 for(const p of data.projects||[])if(!folders.some(f=>f.id===p.id))folders.push({...p,name:p.title,parentId:'',favorite:false,archived:false});
 const migrate=r=>{const p=(data.projects||[]).find(p=>p.id===r.projectId);const {projectId,project,...rest}=r;return {...rest,folderId:r.folderId||p?.id||'',clientId:r.clientId||p?.clientId||''};};
 return {...data,folders,tasks:data.tasks.map(migrate),notes:data.notes.map(migrate),payments:data.payments.map(migrate),projects:[],organizationVersion:1};
}
export function saveFolder(data,folder) {
 const name=folder.name.trim();if(!name)throw Error('Enter a folder name.');
 const parent=folder.parentId&&data.folders.find(f=>f.id===folder.parentId&&!f.deletedAt);
 if(folder.parentId&&(!parent||parent.parentId||parent.id===folder.id||data.folders.some(f=>f.parentId===folder.id)))throw Error('Folders support one level of subfolders.');
 const value={...folder,name};return {...data,folders:data.folders.some(f=>f.id===value.id)?data.folders.map(f=>f.id===value.id?value:f):[...data.folders,value]};
}
export function trashRecord(data,kind,id,now=new Date()) {
 const record=data[kind].find(r=>r.id===id);if(!record||record.deletedAt)return data;
 const group=crypto.randomUUID(),deletedAt=now.toISOString();
 const folderIds=new Set(kind==='folders'?[id,...data.folders.filter(f=>f.parentId===id).map(f=>f.id)]:[]);
 const next={...data};
 for(const k of trashKinds)next[k]=(data[k]||[]).map(r=>!r.deletedAt&&((k===kind&&r.id===id)||(k==='folders'&&folderIds.has(r.id))||(['tasks','notes'].includes(k)&&folderIds.has(r.folderId)))?{...r,deletedAt,trashGroup:group}:r);
 if(kind==='tasks'&&data.timer?.taskId===id)next.timer={...data.timer,taskId:''};
 return next;
}
export function restoreRecord(data,kind,id) {
 const record=data[kind].find(r=>r.id===id);if(!record?.deletedAt)return data;
 const next={...data};const folders=new Set(),clients=new Set();
 const addParent=id=>{const f=data.folders.find(f=>f.id===id);if(f){folders.add(id);if(f.parentId)addParent(f.parentId);}};
 if(kind==='folders')addParent(id);else if(record.folderId)addParent(record.folderId);
 for(const k of trashKinds)next[k]=(data[k]||[]).map(r=>{
  const restore=(k===kind&&r.id===id)||(kind==='folders'&&r.trashGroup===record.trashGroup)||(k==='folders'&&folders.has(r.id));
  if(!restore)return r;if(r.clientId)clients.add(r.clientId);const {deletedAt,trashGroup,...rest}=r;return rest;
 });
 // Restore a linked client too, preserving the original direct relationship.
 next.clients=next.clients.map(c=>clients.has(c.id)?({...c,deletedAt:null,trashGroup:null}):c);
 return next;
}
export function permanentlyDelete(data,kind,id) {
 const record=data[kind].find(r=>r.id===id);if(!record?.deletedAt)throw Error('Move this item to Trash first.');
 const folderIds=new Set(kind==='folders'?[id,...data.folders.filter(f=>f.parentId===id).map(f=>f.id)]:[]);
 const next={...data};
 for(const k of trashKinds)next[k]=(data[k]||[]).filter(r=>!((k===kind&&r.id===id)||(k==='folders'&&folderIds.has(r.id))||(['tasks','notes'].includes(k)&&folderIds.has(r.folderId))));
 for(const k of ['tasks','notes','payments'])next[k]=next[k].map(r=>({...r,...(kind==='clients'&&r.clientId===id?{clientId:''}:{}),...(folderIds.has(r.folderId)?{folderId:''}:{})}));
 const removedTasks=new Set(data.tasks.filter(t=>!next.tasks.some(r=>r.id===t.id)).map(t=>t.id));
 next.sessions=data.sessions.map(s=>removedTasks.has(s.taskId)?{...s,taskId:''}:s);
 if(removedTasks.has(data.timer?.taskId))next.timer={...data.timer,taskId:''};
 return next;
}
