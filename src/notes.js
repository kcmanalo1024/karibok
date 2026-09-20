export const noteTags = note => Array.isArray(note.tags) ? note.tags.filter(t=>typeof t==='string') : [];
export function saveNote(data, draft, now=new Date()) {
 const previous=data.notes.find(n=>n.id===draft.id);
 if(previous?.deletedAt)throw Error('Restore this note before editing it.');
 const title=typeof draft.title==='string'?draft.title:'';
 const body=typeof draft.body==='string'?draft.body:'';
 if(!title.trim()&&!body.trim())throw Error('Add a title or some content to your note.');
 if(title.length>200||body.length>50000)throw Error('Keep the title within 200 characters and content within 50,000 characters.');
 const tags=[...new Set(noteTags(draft))];
 if(tags.length>20||tags.some(t=>t.length>50))throw Error('Use up to 20 tags, with 50 characters per tag.');
 for(const [key,collection] of [['folderId','folders'],['taskId','tasks'],['clientId','clients']]) {
  if(draft[key]&&!data[collection].some(r=>r.id===draft[key]&&!r.deletedAt)&&draft[key]!==previous?.[key])throw Error('The linked record is no longer available. Choose another link.');
 }
 const note={...previous,...draft,title,body,tags,pinned:!!draft.pinned,archived:!!draft.archived,createdAt:previous?.createdAt||draft.createdAt||now.toISOString(),updatedAt:now.toISOString()};
 return {...data,notes:previous?data.notes.map(n=>n.id===note.id?note:n):[...data.notes,note]};
}
export function setNoteState(data,id,patch,now=new Date()) {
 return {...data,notes:data.notes.map(n=>n.id===id&&!n.deletedAt?{...n,...patch,updatedAt:now.toISOString()}:n)};
}
export function filterNotes(notes,{view='active',query='',tag=''}={}) {
 const needle=query.toLocaleLowerCase().trim();
 return notes.filter(n=>(view==='deleted'?!!n.deletedAt:!n.deletedAt&&(view==='archived'?!!n.archived:!n.archived))&&(!tag||noteTags(n).includes(tag))&&(!needle||[n.title,n.body,...noteTags(n)].some(v=>String(v||'').toLocaleLowerCase().includes(needle))))
  .sort((a,b)=>(Date.parse(b.updatedAt||b.createdAt)||0)-(Date.parse(a.updatedAt||a.createdAt)||0));
}
