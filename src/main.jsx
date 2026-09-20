import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutDashboard, CheckSquare, Settings, Plus, Search, CircleCheck, Circle, Trash2, Pencil, X, Clock3, Layers, TrendingUp, Sun, Moon, Monitor, Upload, Sparkles, Folder, Star, StickyNote, ArrowUp, ArrowDown, ArrowRight, ListTree, HandCoins } from 'lucide-react';
import './styles.css';
import './depth.css';
import './v4.css';
import LiveClock from './LiveClock';
import TimeZoneSettings from './TimeZoneSettings';
import './live-clock.css';
import {OrganizePage,Relationships} from './OrganizePage';
import {activeWorkspace,trashRecord,trashKinds} from './organize';
import './organize.css';
import {FinancePage} from './FinancePage';
import {CalendarDays,Users,WalletCards,Bell,Timer} from 'lucide-react';
import {useWorkspace} from './useWorkspace';
import {SplashScreen, AuthScreen, WorkspaceLoading} from './AuthFlow';
import {saveTask,notices,normalizeSubtasks,subtasksProgress} from './domain';
import {CalendarPage,FocusPage,AccountPanel,CategoryManager,useTimer,Dialog} from './features';
import {dashboardGreeting} from './timeZones.js';
import './quick-add.css';
import Sidebar from './Sidebar';
import './sidebar.css';
import './icons.css';
import SubtaskModal from './SubtaskModal';
import './subtasks.css';
import NotificationPanel from './NotificationPanel';
import ProfileCropper from './ProfileCropper';
import './auth.css';
const dateKey = (offset=0) => { const d=new Date(); d.setDate(d.getDate()+offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const zonedDateKey = (date,tz) => { const p=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).reduce((a,x)=>(a[x.type]=x.value,a),{}); return `${p.year}-${p.month}-${p.day}`; };
const seed = [
 ['Finish database project','School','Database Management',75,0,'High'],
 ['Client poster revision','Freelance','Client A — Branding',60,1,'High'],
 ['Submit Web Development activity','School','Web Development',40,3,'Medium'],
 ['Send final logo files','Freelance','Client B — Logo',100,4,'Medium'],
 ['Buy school supplies','Personal','',0,5,'Low']
].map(([title,category,project,progress,offset,priority],i)=>({id:String(i),title,category,project,progress,due:dateKey(offset),priority}));
const defaults={tasks:seed,categories:['School','Work','Freelance','Personal'],name:'Kaycee',photo:'',theme:'dark',accent:'#8b3f2f'};
function useAppearance(data) {
 useEffect(()=>{
  const media=matchMedia('(prefers-color-scheme: dark)');
  const rgb=data.accent.slice(1).match(/../g)?.map(x=>parseInt(x,16))||[139,63,47];
  const luminance=values=>values.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  const root=document.documentElement;
  root.style.setProperty('--accent',data.accent);
  root.style.setProperty('--on-accent',contrast(luminance(rgb),luminance([17,17,17]))>contrast(luminance(rgb),1)?'#111111':'#ffffff');
  const apply=()=>{
   const theme=data.theme==='system'?(media.matches?'dark':'light'):data.theme;
   root.dataset.theme=theme;
   // Accent text must remain readable on every neutral surface, even for custom colors.
   const backgrounds=theme==='dark'?[[23,24,25],[34,36,38],[43,45,48]]:[[245,244,242],[255,255,255],[238,237,235]];
   let ink=rgb;
   for(let amount=0;amount<=100;amount++){
    ink=rgb.map(c=>Math.round(c+(theme==='dark'?255-c:-c)*amount/100));
    if(backgrounds.every(bg=>contrast(luminance(ink),luminance(bg))>=4.5))break;
   }
   root.style.setProperty('--accent-ink',`rgb(${ink.join(',')})`);
   document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#171819':'#f5f4f2');
  };
  apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);
 },[data.theme,data.accent]);
}
function App() {
 const workspace = useWorkspace(defaults);
 const [splash, setSplash] = useState(true);
 useAppearance(workspace.data);
 useEffect(() => {
   const timer = setTimeout(() => setSplash(false), 3000);
   return () => clearTimeout(timer);
 }, []);
 if (splash) return <SplashScreen />;
 if (!workspace.authChecked) return <WorkspaceLoading workspace={workspace} />;
 if (!workspace.user) return <AuthScreen sessionError={workspace.authError} onRetry={() => workspace.retry()} />;
 if (!workspace.ready) return <WorkspaceLoading workspace={workspace} />;
 return <WorkspaceApp key={workspace.user.id} workspace={workspace} />;
}
function WorkspaceApp({workspace}) {
 const raw=workspace.data, data=activeWorkspace(raw);
 const update=patch=>workspace.update(current=>{
  if(typeof patch==='function')return patch(current);
  const next={...current,...patch};
  for(const k of trashKinds)if(Array.isArray(patch[k]))next[k]=[...patch[k],...current[k].filter(r=>r.deletedAt&&!patch[k].some(x=>x.id===r.id))];
  return next;
 });
 const [notificationsOpen,setNotificationsOpen]=useState(false);
 const notificationTrigger=useRef(null);
 const closeNotifications=useCallback(()=>setNotificationsOpen(false),[]);
 const [page,setPage]=useState('Dashboard'),[query,setQuery]=useState(''),[filter,setFilter]=useState('All'),[editor,setEditor]=useState(null),[message,setMessage]=useState(''),[quickAdd,setQuickAdd]=useState(null),[noteEditor,setNoteEditor]=useState(null),[subtaskTask,setSubtaskTask]=useState(null);

 const [systemDark,setSystemDark]=useState(()=>matchMedia('(prefers-color-scheme: dark)').matches);
 useEffect(()=>{const media=matchMedia('(prefers-color-scheme: dark)');const changed=()=>setSystemDark(media.matches);media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);},[]);
 const isDark=data.theme==='dark'||(data.theme==='system'&&systemDark);
 const now=useTimer(data,update,setMessage);
 const [sidebarCollapsed,setSidebarCollapsed]=useState(()=>{try{return localStorage.getItem('karibok-sidebar-collapsed')==='true';}catch{return false;}});
 const toggleSidebar=()=>setSidebarCollapsed(value=>{const next=!value;try{localStorage.setItem('karibok-sidebar-collapsed',String(next));}catch{}return next;});
 useEffect(()=>{window.scrollTo({top:0});},[page]);
 useEffect(()=>{if(!data.categories.includes(filter)&&filter!=='All')setFilter('All');},[data.categories,filter]);
 useEffect(()=>{if(!data.notificationsEnabled||!('Notification' in window)||Notification.permission!=='granted')return;for(const notice of notices(data)){const key='karibok-notified-'+(workspace.user?.id||'guest')+'-'+notice.id;try{if(!localStorage.getItem(key)){new Notification(notice.title,{body:notice.detail});localStorage.setItem(key,'1');}}catch{}}},[data.tasks,data.sessions,data.notificationsEnabled,dateKey()]);

 const tasks=data.tasks.filter(t=>(filter==='All'||t.category===filter)&&`${t.title} ${data.folders.find(f=>f.id===t.folderId)?.name||''} ${t.category}`.toLowerCase().includes(query.toLowerCase()));
 const complete=data.tasks.filter(t=>t.progress===100).length;
 const average=list=>list.length?Math.round(list.reduce((s,t)=>s+t.progress,0)/list.length):0;
 const edit=t=>setEditor(t?{...t}:{id:crypto.randomUUID(),title:'',category:data.categories[0],folderId:'',clientId:'',recurrence:'none',priority:'Medium',due:'',progress:0});
 const toggle=id=>update(d=>{const t=d.tasks.find(t=>t.id===id);return saveTask(d,{...t,progress:t.progress===100?(t.previousProgress||0):100,previousProgress:t.progress===100?0:t.progress});});
 const remove=id=>{update(d=>trashRecord(d,'tasks',id));setMessage('Task moved to Trash.');};
 const [cropFile,setCropFile]=useState(null);
 const upload=e=>{const file=e.target.files?.[0];e.target.value='';if(file)setCropFile(file);};
 const avatar=<span className="avatar">{data.photo?<img src={data.photo} alt="Profile"/>:data.name.slice(0,1).toUpperCase()}</span>;
 const handleQuickAdd=kind=>{setQuickAdd(null);if(kind==='task'){setPage('Tasks');edit();}else if(kind==='note'){setNoteEditor({id:crypto.randomUUID(),title:'',body:''});}else {setPage(kind==='client'?'Clients':kind==='folder'?'Folders':'Finances');setQuickAdd({kind,id:crypto.randomUUID()});}};
 const noteSave=event=>{event.preventDefault();if(!noteEditor.title.trim()&&!noteEditor.body.trim())return;update(d=>{const note={...noteEditor,title:noteEditor.title.trim()||'Untitled note',body:noteEditor.body.trim(),createdAt:noteEditor.createdAt||new Date().toISOString()};return {...d,notes:d.notes.some(n=>n.id===note.id)?d.notes.map(n=>n.id===note.id?note:n):[...d.notes,note]};});setNoteEditor(null);setMessage('Note saved.');};
 const row=t=><div className={`task-row ${t.progress===100?'done':''}`} key={t.id}><button className="check" aria-label={`${t.progress===100?'Reopen':'Complete'} ${t.title}`} onClick={()=>toggle(t.id)}>{t.progress===100?<CircleCheck size={21}/>:<Circle size={21}/>}</button><div className="task-info"><strong>{t.title}</strong><span>{data.folders.find(f=>f.id===t.folderId)?.name||t.category} · {t.progress}%</span><div className="progress-track mt-2"><div className="progress-fill" style={{width:`${t.progress}%`}}/></div></div><span className="tag">{t.category}</span><span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span><span className={`due ${t.due&&t.due<dateKey()&&t.progress<100?'overdue':''}`}>{!t.due?'No deadline':t.due===dateKey()?'Today':new Date(t.due+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:new Date(t.due+'T00:00:00').getFullYear()!==new Date().getFullYear()?'numeric':undefined})}</span><button className={(t.subtasks||[]).length?'subtask-indicator':'more'} aria-label={`Manage subtasks ${t.title}`} title="Subtasks" onClick={()=>setSubtaskTask(t)}><ListTree size={16}/>{(t.subtasks||[]).length>0&&<span>{t.subtasks.filter(s=>s.completed).length}/{t.subtasks.length}</span>}</button><button className="more" aria-label={`Edit ${t.title}`} onClick={()=>edit(t)}><Pencil size={16}/></button><button className="more" aria-label={`Delete ${t.title}`} onClick={()=>remove(t.id)}><Trash2 size={16}/></button></div>;
 return <div className="app"><Sidebar data={data} raw={raw} page={page} onNavigate={setPage} collapsed={sidebarCollapsed} onToggle={toggleSidebar} avatar={avatar}/><main className={`main ${sidebarCollapsed?'sidebar-is-collapsed':''}`}><header className={`topbar ${notificationsOpen?'notifications-open':''}`}><div className="search"><Search size={18}/><input aria-label="Search tasks" placeholder="Search your tasks…" value={query} onChange={e=>{setQuery(e.target.value);if(page!=='Dashboard'&&page!=='Tasks')setPage('Tasks');}}/></div><div className="header-profile"><LiveClock timeZone={data.timeZone}/><button type="button" className="icon-btn header-theme-toggle" aria-label={isDark?'Switch to light mode':'Switch to dark mode'} title={isDark?'Switch to light mode':'Switch to dark mode'} onClick={()=>update({theme:isDark?'light':'dark'})}>{isDark?<Sun size={19}/>:<Moon size={19}/>}</button><button ref={notificationTrigger} type="button" aria-haspopup="dialog" aria-expanded={notificationsOpen} aria-controls={notificationsOpen?'notification-panel':undefined} className="icon-btn notification-bell" aria-label={`Notifications, ${notices(data).filter(n=>!data.readNotifications.includes(n.id)).length} unread`} onClick={()=>setNotificationsOpen(open=>!open)}><Bell size={19}/>{notices(data).filter(n=>!data.readNotifications.includes(n.id)).length>0&&<span className="notification-badge">{notices(data).filter(n=>!data.readNotifications.includes(n.id)).length}</span>}</button><button className="user-pill" onClick={()=>setPage('Settings')}>{avatar}<span>{data.name}</span></button></div></header><div className="content">
 {data.timer&&page!=='Focus'&&<button className="timer-banner" onClick={()=>setPage('Focus')}><Timer size={16}/> {data.timer.startedAt?'Timer running':'Timer paused'} · {data.timer.label}<span className="icon-label">Open timer <ArrowRight/></span></button>}
 {page==='Calendar'?<CalendarPage data={data} onEdit={edit} onAdd={due=>setEditor({id:crypto.randomUUID(),title:'',category:data.categories[0],folderId:'',clientId:'',recurrence:'none',priority:'Medium',due,progress:0})}/>:
 page==='Focus'?<FocusPage data={data} update={update} now={now} notify={setMessage}/>:
 page==='Finances'?<FinancePage data={data} update={update} notify={setMessage} quickAdd={quickAdd} onQuickAddHandled={()=>setQuickAdd(null)}/>:
 ['Clients','Folders','Favorites','Notes','Trash'].includes(page)?<OrganizePage key={page} page={page} data={data} raw={raw} update={update} renderTask={row} onNote={setNoteEditor} quickAdd={quickAdd} onQuickAddHandled={()=>setQuickAdd(null)} onAddTask={links=>setEditor({id:crypto.randomUUID(),title:'',category:data.categories[0],recurrence:'none',priority:'Medium',due:'',progress:0,...links})}/>:
 <> {page!=='Settings'?<><section className="hero"><div><div className="eyebrow">{new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).toUpperCase()}</div><h1>{page==='Dashboard'?dashboardGreeting(new Date(now),data.timeZone,data.name):'Your tasks, organized.'}</h1><p>{page==='Dashboard'?'A little progress goes a long way. Make room for what matters.':'School, work, and everything in between.'}</p></div><button className="primary" onClick={()=>edit()}><Plus size={18}/> Add task</button></section>
 {page==='Dashboard'&&<section className="stat-grid">{[['Tasks completed',`${complete}/${data.tasks.length}`,'One step closer',CircleCheck],['Due today',data.tasks.filter(t=>t.due===dateKey()&&t.progress<100).length,'Your next priorities',Clock3],['In progress',data.tasks.filter(t=>t.progress>0&&t.progress<100).length,'Keep the momentum',Layers],['Overall progress',`${average(data.tasks)}%`,'Across all your tasks',TrendingUp]].map(([title,value,note,Icon])=><div className="stat-card" key={title}><div className="stat-icon"><Icon size={19}/></div><div className="stat-title">{title}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>)}</section>}
 <div className={page==='Dashboard'?'dashboard-grid':'task-page'}><section className="panel tasks-panel"><div className="panel-head"><div><div className="eyebrow">{page==='Dashboard'?'MAKE IT HAPPEN':'YOUR LIST'}</div><h2>What's on your plate?</h2></div><span className="muted text-xs">{tasks.length} tasks</span></div><div className="flex flex-wrap gap-2 mb-4">{['All',...data.categories].map(c=><button key={c} className={`filter ${filter===c?'selected':''}`} onClick={()=>setFilter(c)}>{c}</button>)}</div><div className="task-list">{tasks.length?tasks.map(row):<div className="empty"><CheckSquare size={30}/><h3>A little breathing room.</h3><p>{data.tasks.length?'No tasks match this view. Try another category or search.':'Add your first task to get started.'}</p></div>}</div></section>
 {page==='Dashboard'&&<section className="panel"><div className="panel-head"><div><div className="eyebrow">THE BIGGER PICTURE</div><h2>Your progress</h2></div><TrendingUp size={19}/></div>{data.categories.map(c=>{const list=data.tasks.filter(t=>t.category===c);return <div className="progress-stat" key={c}><div><span>{c} <small className="muted">({list.length})</small></span><strong>{average(list)}%</strong></div><div className="progress-track"><div className="progress-fill" style={{width:`${average(list)}%`}}/></div></div>})}<div className="quote">“Hindi kailangan mabilis. Kailangan lang umusad.”</div></section>}</div><p className="local-note">{workspace.status} · Your personal space to make progress</p></>:
 <><section className="page-head"><div><div className="eyebrow">MAKE YOURSELF AT HOME</div><h1>Personal, like you.</h1><p>Your profile. Your colors. Your kind of workspace.</p></div><span className="tag">Preferences save automatically</span></section><div className="settings-grid"><section className="panel settings-panel"><h2>Profile</h2><p className="muted">A familiar face in your workspace.</p><div className="flex items-center gap-4 my-6">{cropFile&&<ProfileCropper file={cropFile} onCancel={()=>setCropFile(null)} onSave={photo=>{update({photo});setCropFile(null);setMessage('Profile picture updated.');}}/>}<div className="profile-large">{avatar}</div><label className="secondary cursor-pointer flex items-center gap-2"><Upload size={16}/> Change picture<input className="sr-only" type="file" accept="image/png,image/jpeg" onChange={upload}/></label>{data.photo&&<button className="text-btn" onClick={()=>update({photo:''})}>Remove</button>}</div><p className="muted text-xs">JPG or PNG. Maximum 10 MB. Crop before saving.</p><label className="field">Display name<input maxLength={40} value={data.name} onChange={e=>update({name:e.target.value})} onBlur={()=>{if(!data.name.trim())update({name:'Student'});}}/></label></section><section className="panel settings-panel"><h2>Appearance</h2><p className="muted">Set the mood for your next good idea.</p><label className="field">Theme</label><div className="flex gap-2">{[['system',Monitor],['light',Sun],['dark',Moon]].map(([theme,Icon])=><button aria-pressed={data.theme===theme} key={theme} className={`theme-option ${theme===data.theme?'selected':''}`} onClick={()=>update({theme})}><Icon size={20}/>{theme}</button>)}</div><label className="field">Accent color</label><div className="flex flex-wrap items-center gap-3">{['#8b3f2f','#526b51','#6253a3','#2563eb','#be416b','#d39836'].map(c=><button className="swatch" key={c} aria-label={`Use ${c} accent`} aria-pressed={data.accent===c} style={{background:c,outline:data.accent===c?'2px solid var(--text)':'none'}} onClick={()=>update({accent:c})}/>)}<input aria-label="Custom accent color" type="color" value={data.accent} onChange={e=>update({accent:e.target.value})}/><span className="muted text-xs">{data.accent.toUpperCase()}</span></div><div className="appearance-preview"><span className="tag">Your accent, in the details</span><div className="progress-track my-4"><div className="progress-fill" style={{width:'68%'}}/></div><button className="primary" onClick={()=>setPage('Dashboard')}>See your dashboard</button></div></section><TimeZoneSettings value={data.timeZone} onChange={timeZone=>update({timeZone})}/><CategoryManager data={data} update={update} notify={setMessage}/><AccountPanel workspace={workspace} notify={setMessage}/></div></>}
 </>}
 </div></main>{notificationsOpen&&<NotificationPanel data={data} update={update} onEdit={edit} notify={setMessage} onClose={closeNotifications} triggerRef={notificationTrigger}/>}<QuickAdd onSelect={handleQuickAdd}/>{subtaskTask&&<SubtaskModal task={subtaskTask} onClose={()=>setSubtaskTask(null)} onSave={subtasks=>{update(d=>{const current=d.tasks.find(t=>t.id===subtaskTask.id);return current?saveTask(d,{...current,subtasks}):d});setSubtaskTask(null)}}/>}{message&&<div className="toast" role="status">{message}<button aria-label="Dismiss notification" onClick={()=>setMessage('')}><X size={16}/></button></div>}{editor&&<TaskModal task={editor} setTask={setEditor} categories={data.categories} data={data} editing={data.tasks.some(t=>t.id===editor.id)} onClose={()=>setEditor(null)} onSave={e=>{e.preventDefault();if(!editor.title.trim())return;update(d=>saveTask(d,{...editor,title:editor.title.trim()}));setEditor(null);}}/>}{noteEditor&&<Dialog title={data.notes.some(n=>n.id===noteEditor.id)?"Edit note":"Add note"} submitLabel="Save Note" onClose={()=>setNoteEditor(null)} onSubmit={noteSave}><label className="field">Title<input aria-label="Note title" value={noteEditor.title} onChange={e=>setNoteEditor({...noteEditor,title:e.target.value})} placeholder="What do you want to remember?"/></label><label className="field">Note<textarea aria-label="Note content" value={noteEditor.body} onChange={e=>setNoteEditor({...noteEditor,body:e.target.value})} rows="5" placeholder="Write a note…"/></label><Relationships data={data} value={noteEditor} onChange={setNoteEditor}/></Dialog>}</div>;
}
function TaskModal({task,setTask,categories,data,editing,onClose,onSave}){const ref=useRef(null);useEffect(()=>{const previous=document.activeElement;ref.current.showModal();return()=>previous?.focus();},[]);const change=(key,value)=>setTask({...task,[key]:value});return <dialog ref={ref} className="modal" onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose();}}><div className="modal-head"><div><div className="eyebrow">{editing?'A LITTLE ADJUSTMENT':'ONE STEP FORWARD'}</div><h2>{editing?'Edit task':'Add something to the list'}</h2></div><button className="icon-btn" aria-label="Close task editor" onClick={onClose}><X size={18}/></button></div><form onSubmit={onSave}><label>Task title<input autoFocus required maxLength={150} value={task.title} onChange={e=>change('title',e.target.value)} placeholder="What do you want to get done?"/></label><Relationships data={data} value={task} onChange={setTask}/><div className="form-grid"><label>Category<select value={task.category} onChange={e=>change('category',e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Priority<select value={task.priority} onChange={e=>change('priority',e.target.value)}>{['Low','Medium','High'].map(c=><option key={c}>{c}</option>)}</select></label></div><label>Repeat<select value={task.recurrence||'none'} onChange={e=>change('recurrence',e.target.value)}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label>Deadline<input required={task.recurrence!=='none'} type="date" value={task.due} onChange={e=>change('due',e.target.value)}/></label><label>Progress · {task.progress}%<input type="range" min="0" max="100" step="5" value={task.progress} onChange={e=>change('progress',Number(e.target.value))}/></label><div className="modal-actions"><button className="secondary" type="button" onClick={onClose}>Cancel</button><button className="primary" type="submit">{editing?'Save changes':'Add task'}</button></div></form></dialog>}
function QuickAdd({onSelect}) {
 const [open,setOpen]=useState(false), root=useRef(null); const items=[['task','Task',CheckSquare],['folder','Folder',Folder],['client','Client',Users],['transaction','Transaction',WalletCards],['utang','Utang',HandCoins],['note','Note',StickyNote]];
 useEffect(()=>{const outside=e=>{if(root.current&&!root.current.contains(e.target))setOpen(false);};const escape=e=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[]);
 const keyDown=e=>{if(!open)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const b=[...root.current.querySelectorAll('[role=menuitem]')],i=b.indexOf(document.activeElement);b[(i+(e.key==='ArrowDown'?1:-1)+b.length)%b.length]?.focus();}if(e.key==='Enter'&&document.activeElement.getAttribute('role')==='menuitem')document.activeElement.click();};
 return <div className="quick-add" ref={root} onKeyDown={keyDown}><button className="quick-add-trigger" aria-label="Quick Add" aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(v=>!v)}><Plus size={22}/></button>{open&&<div className="quick-add-menu" role="menu" aria-label="Quick Add options">{items.map(([kind,label,Icon])=><button role="menuitem" key={kind} onClick={()=>{setOpen(false);onSelect(kind);}}><Icon aria-hidden="true"/>{label}</button>)}</div>}</div>;
}

createRoot(document.getElementById('root')).render(<App/>);
















