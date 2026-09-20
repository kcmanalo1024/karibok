import React,{useState} from 'react';
import {Plus,Search,Pin,Archive,RotateCcw,Trash2,Pencil,StickyNote} from 'lucide-react';
import {Heading,Dialog} from './features';
import {noteTags,saveNote,setNoteState,filterNotes} from './notes';
import {trashRecord,restoreRecord} from './organize';
import './notes.css';

export const newNote = links => ({id:crypto.randomUUID(),title:'',body:'',tags:[],folderId:'',taskId:'',pinned:false,archived:false,...links});
const titleOf=n=>n.title||'Untitled note';
function NoteDate({label,value}) {
 const date=new Date(value);
 return <span>{label}: {value&&!Number.isNaN(date.getTime())?<time dateTime={date.toISOString()} title={date.toLocaleString()}>{date.toLocaleDateString()}</time>:'Not recorded'}</span>;
}
export function NoteEditor({note,data,onClose,update,notify}) {
 const [draft,setDraft]=useState(()=>({...note,title:note.title||'',body:note.body||''})),[tags,setTags]=useState(noteTags(note).join(', ')),[error,setError]=useState('');
 const linkField=(label,key,collection,name)=><label className="field">{label}<select value={draft[key]||''} onChange={e=>setDraft({...draft,[key]:e.target.value})}><option value="">None</option>{draft[key]&&!data[collection].some(r=>r.id===draft[key])&&<option value={draft[key]}>Unavailable linked record</option>}{data[collection].map(r=><option key={r.id} value={r.id}>{r[name]}{r.archived?' (archived)':''}</option>)}</select></label>;
 return <Dialog title={data.notes.some(n=>n.id===note.id)?'Edit note':'Create note'} submitLabel="Save note" onClose={onClose} onSubmit={e=>{e.preventDefault();try{const value={...draft,tags:tags.split(',').map(t=>t.trim()).filter(Boolean)};saveNote(data,value);update(current=>saveNote(current,value));onClose();notify('Note saved.');}catch(e){setError(e.message);}}}>
  <label className="field">Title<input aria-label="Note title" maxLength={200} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="What do you want to remember?"/></label>
  <label className="field">Content<textarea aria-label="Note content" maxLength={50000} rows={7} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})} placeholder="Write a note…"/></label>
  <label className="field">Tags<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Ideas, Personal, Research" aria-describedby="note-tags-help"/></label><p id="note-tags-help" className="muted text-xs">Separate tags with commas. Up to 20 tags.</p>
  <div className="form-grid">{linkField('Project / folder','folderId','folders','name')}{linkField('Task','taskId','tasks','title')}</div>
  {draft.clientId&&linkField('Client','clientId','clients','name')}
  {error&&<p role="alert" className="note-error">{error}</p>}
 </Dialog>;
}
export default function NotesPage({raw,data,update,onEdit,onOpenTask,notify}) {
 const [query,setQuery]=useState(''),[tag,setTag]=useState(''),[view,setView]=useState('active');
 const notes=filterNotes(raw.notes,{view,query,tag});
 const tags=[...new Set(raw.notes.flatMap(noteTags))].sort((a,b)=>a.localeCompare(b));
 const act=(note,action)=>{
  if(action==='delete'){update(d=>trashRecord(d,'notes',note.id));notify('Note moved to Deleted notes and Trash.');}
  if(action==='restore'){update(d=>restoreRecord(d,'notes',note.id));notify(note.archived?'Note restored to Archived.':'Note restored.');}
  if(action==='archive'){update(d=>setNoteState(d,note.id,{archived:!note.archived}));notify(note.archived?'Note restored to Active.':'Note archived.');}
  if(action==='pin')update(d=>setNoteState(d,note.id,{pinned:!note.pinned}));
 };
 const cards=list=><div className="notes-grid">{list.map(n=>{
  const folder=data.folders.find(f=>f.id===n.folderId),task=data.tasks.find(t=>t.id===n.taskId);
  return <article className="panel note-card" key={n.id}>
   <div className="note-card-heading"><h3 translate="no">{n.pinned&&<Pin size={15} aria-label="Pinned"/>}{titleOf(n)}</h3>{!n.deletedAt&&<button className="icon-btn" aria-label={`Edit ${titleOf(n)}`} onClick={()=>onEdit(n)}><Pencil size={16}/></button>}</div>
   <p className="note-content" translate="no">{n.body||<span className="muted">No content.</span>}</p>
   {!!noteTags(n).length&&<div className="note-tags" translate="no">{noteTags(n).map(t=><button className="tag" key={t} onClick={()=>setTag(t)} aria-label={`Filter tag ${t}`}>{t}</button>)}</div>}
   {(n.folderId||n.taskId)&&<div className="note-links">{n.folderId&&<span>Project / folder: <span translate="no">{folder?.name||'Unavailable'}</span></span>}{n.taskId&&(task?<button className="text-btn" onClick={()=>onOpenTask(task)}>Task: <span translate="no">{task.title}</span></button>:<span>Task: Unavailable</span>)}</div>}
   <div className="note-dates"><NoteDate label="Created" value={n.createdAt}/><NoteDate label="Updated" value={n.updatedAt||n.createdAt}/>{n.deletedAt&&<NoteDate label="Deleted" value={n.deletedAt}/>}</div>
   <div className="note-actions">{n.deletedAt?<button className="secondary" onClick={()=>act(n,'restore')}><RotateCcw size={15}/>Restore</button>:<><button className="secondary" aria-pressed={!!n.pinned} onClick={()=>act(n,'pin')}><Pin size={15}/>{n.pinned?'Unpin':'Pin'}</button><button className="secondary" onClick={()=>act(n,'archive')}>{n.archived?<RotateCcw size={15}/>:<Archive size={15}/>} {n.archived?'Restore':'Archive'}</button><button className="secondary" onClick={()=>act(n,'delete')}><Trash2 size={15}/>Delete</button></>}</div>
  </article>;
 })}</div>;
 return <div className="notes-page"><Heading eyebrow="YOUR IDEAS" title="Notes" description="Capture a thought. Keep it connected to your work." action={<button className="primary" onClick={()=>onEdit(newNote())}><Plus size={17}/>Create note</button>}/>
  <div className="notes-toolbar"><label className="notes-search"><Search size={17}/><input aria-label="Search notes" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search titles, content, or tags"/></label><label className="notes-filter">Tag<select aria-label="Filter notes by tag" value={tag} onChange={e=>setTag(e.target.value)}><option value="">All tags</option>{tags.map(t=><option key={t} value={t}>{t}</option>)}</select></label></div>
  <div className="notes-views" aria-label="Note views">{[['active','Active'],['archived','Archived'],['deleted','Deleted']].map(([key,label])=><button key={key} className={`filter ${view===key?'selected':''}`} aria-pressed={view===key} onClick={()=>setView(key)}>{label} ({filterNotes(raw.notes,{view:key}).length})</button>)}{(query||tag)&&<button className="text-btn" onClick={()=>{setQuery('');setTag('');}}>Clear filters</button>}</div>
  {!notes.length?<div className="empty"><StickyNote/><h3>{query||tag?'No matching notes':view==='archived'?'No archived notes':view==='deleted'?'No deleted notes':'No notes yet'}</h3><p>{query||tag?'Try another search or clear your filters.':view==='active'?'Create your first note to keep an idea close.':view==='archived'?'Archived notes stay here until you restore them.':'Notes you delete can be restored here or from Trash.'}</p>{!query&&!tag&&view==='active'&&<button className="primary" onClick={()=>onEdit(newNote())}>Create note</button>}</div>:view==='active'?<>{notes.some(n=>n.pinned)&&<section aria-label="Pinned notes"><h2 className="notes-section-title">Pinned</h2>{cards(notes.filter(n=>n.pinned))}</section>}{notes.some(n=>!n.pinned)&&<section aria-label="Other notes"><h2 className="notes-section-title">{notes.some(n=>n.pinned)?'Other notes':'All notes'}</h2>{cards(notes.filter(n=>!n.pinned))}</section>}</>:<section aria-label={`${view} notes`}><h2 className="notes-section-title">{view==='archived'?'Archived notes':'Deleted notes'}</h2>{cards(notes)}</section>}
 </div>;
}
