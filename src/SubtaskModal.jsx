import React,{useEffect,useRef,useState} from 'react';
import {Plus,X,ListTree,ArrowUp,ArrowDown,Trash2} from 'lucide-react';
import {normalizeSubtasks,subtasksProgress} from './domain';

export default function SubtaskModal({task,onClose,onSave}) {
 const dialog=useRef(null),newInput=useRef(null);
 const [draft,setDraft]=useState(()=>normalizeSubtasks(task.subtasks));
 const [title,setTitle]=useState('');
 useEffect(()=>{const previous=document.activeElement;dialog.current.showModal();return()=>previous?.focus();},[]);
 const completed=draft.filter(s=>s.completed).length,progress=subtasksProgress(draft)??0;
 const update=(id,patch)=>setDraft(items=>items.map(s=>s.id===id?{...s,...patch}:s));
 const add=event=>{event.preventDefault();if(!title.trim())return;setDraft(items=>[...items,{id:crypto.randomUUID(),title:title.trim(),completed:false}]);setTitle('');newInput.current?.focus();};
 const move=(index,direction)=>setDraft(items=>{const next=[...items],target=index+direction;if(target<0||target>=next.length)return items;[next[index],next[target]]=[next[target],next[index]];return next;});
 return <dialog ref={dialog} className="modal subtask-editor" aria-labelledby="subtask-heading" aria-describedby="subtask-parent" onCancel={onClose} onClick={e=>{if(e.target===dialog.current)onClose();}}>
  <header className="subtask-header"><div><div className="subtask-heading"><span className="subtask-heading-icon"><ListTree/></span><h2 id="subtask-heading">Subtasks</h2></div><p id="subtask-parent">{task.title}</p></div><button type="button" className="icon-btn" aria-label="Close subtasks" onClick={onClose}><X/></button></header>
  <section className="subtask-summary" aria-label="Subtask progress"><div><span>{completed} of {draft.length} completed</span><strong>{progress}%</strong></div><div className="progress-track" role="progressbar" aria-label="Subtask completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="progress-fill" style={{width:`${progress}%`}}/></div></section>
  <form className="subtask-create" onSubmit={add}><input ref={newInput} autoFocus aria-label="New subtask" value={title} maxLength={150} onChange={e=>setTitle(e.target.value)} placeholder="Add the next step…"/><button className="primary" disabled={!title.trim()} type="submit"><Plus/>Add</button></form>
  <div className="subtask-items" role="list" aria-label="Subtasks">{draft.length?draft.map((s,i)=><div className={`subtask-item ${s.completed?'is-complete':''}`} role="listitem" key={s.id}>
   <input type="checkbox" className="subtask-checkbox" aria-label={`Complete ${s.title}`} checked={s.completed} onChange={e=>update(s.id,{completed:e.target.checked})}/>
   <input className="subtask-title" aria-label={`Edit ${s.title}`} value={s.title} maxLength={150} onChange={e=>update(s.id,{title:e.target.value})}/>
   <div className="subtask-item-actions"><button type="button" className="more" disabled={i===0} aria-label={`Move ${s.title} up`} title="Move up" onClick={()=>move(i,-1)}><ArrowUp/></button><button type="button" className="more" disabled={i===draft.length-1} aria-label={`Move ${s.title} down`} title="Move down" onClick={()=>move(i,1)}><ArrowDown/></button><button type="button" className="more" aria-label={`Delete subtask ${s.title}`} title="Delete subtask" onClick={()=>setDraft(items=>items.filter(item=>item.id!==s.id))}><Trash2/></button></div>
  </div>):<div className="subtask-empty"><ListTree/><strong>One step at a time</strong><p>Add a subtask to break this task into smaller steps.</p></div>}</div>
  <footer className="subtask-footer"><span>Changes save with this task.</span><div><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="button" className="primary" onClick={()=>onSave(draft)}>Save changes</button></div></footer>
 </dialog>;
}
