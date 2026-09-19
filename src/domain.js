import {migrateOrganization} from './organize.js';
export const id = () => crypto.randomUUID();
export function dayKey(value = new Date()) { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function shiftDay(key, days) { const d=new Date(key+'T12:00:00'); d.setDate(d.getDate()+days); return dayKey(d); }
export function nextDue(key, repeat) {
 if(!key || repeat==='none' || !repeat)return '';
 if(repeat==='daily')return shiftDay(key,1);
 if(repeat==='weekly')return shiftDay(key,7);
 const d=new Date(key+'T12:00:00'); const day=d.getDate(); d.setDate(1);d.setMonth(d.getMonth()+1);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));return dayKey(d);
}
export function normalize(raw) {
 const v={name:'Student',photo:'',theme:'system',accent:'#8b3f2f',timeZone:'',tasks:[],categories:['School','Work','Freelance','Personal'],projects:[],clients:[],payments:[],accounts:[],transactions:[],utang:[],sessions:[],notes:[],timer:null,notificationsEnabled:false,dismissed:[],...raw};
 for(const k of ['tasks','categories','projects','clients','payments','accounts','transactions','utang','sessions','notes','dismissed']) if(!Array.isArray(v[k]))v[k]=[];
 if(!v.categories.length)v.categories=['Personal'];
 v.tasks=v.tasks.map(t=>({...t,recurrence:t.recurrence||'none'}));
 if(!raw?.schemaVersion){
  const titles=[...new Set(v.tasks.map(t=>t.project).filter(Boolean))];
  titles.forEach(title=>{if(!v.projects.some(p=>p.title===title))v.projects.push({id:id(),title,clientId:'',status:'In progress',category:v.tasks.find(t=>t.project===title).category,description:''});});
  v.tasks=v.tasks.map(t=>({...t,projectId:t.projectId||v.projects.find(p=>p.title===t.project)?.id||''}));
 }
 v.clients=v.clients.map(c=>({contactPerson:'',phone:'',type:'',email:'',notes:'',...c}));
 v.projects=v.projects.map(p=>({startDate:'',deadline:'',links:{},...p,status:({'Not started':'Not Started','In progress':'In Progress','On hold':'On Hold'})[p.status]||p.status||'Not Started'}));
 return migrateOrganization({...v,folders:Array.isArray(v.folders)?v.folders:[],readNotifications:Array.isArray(v.readNotifications)?v.readNotifications:[],schemaVersion:7});
}

export function normalizeSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) return [];
  return subtasks
    .map((subtask, index) => ({
      ...subtask,
      id: subtask?.id || `subtask-${index}-${Date.now()}`,
      title: String(subtask?.title || '').trim(),
      completed: Boolean(subtask?.completed),
      order: index,
    }))
    .filter(subtask => subtask.title);
}

export function subtasksProgress(subtasks) {
  const list = normalizeSubtasks(subtasks);
  return list.length ? Math.round((list.filter(subtask => subtask.completed).length / list.length) * 100) : null;
}
export function saveTask(data, task, now=new Date()) {
 const previous=data.tasks.find(t=>t.id===task.id);
 const subtasks = normalizeSubtasks(task.subtasks);
 const progress = subtasks.length ? subtasksProgress(subtasks) : task.progress;
 let saved={...task,title:task.title.trim(),progress,completedAt:progress===100?(previous?.completedAt||now.toISOString()):null};
 if(Array.isArray(task.subtasks)) saved.subtasks=subtasks;
 let tasks=previous?data.tasks.map(t=>t.id===saved.id?saved:t):[...data.tasks,saved];
 if(saved.progress===100&&previous?.progress!==100&&saved.recurrence!=='none'&&saved.due&&!saved.nextOccurrenceId){
  const child={...saved,id:id(),progress:0,previousProgress:0,completedAt:null,due:nextDue(saved.due,saved.recurrence),nextOccurrenceId:null};
  saved={...saved,nextOccurrenceId:child.id};tasks=tasks.map(t=>t.id===saved.id?saved:t).concat(child);
 }
 return {...data,tasks};
}
export function weekStart(now=new Date()){const d=dayKey(now);return shiftDay(d,-((new Date(d+'T12:00:00').getDay()+6)%7));}
export function analytics(data, now=new Date()) {
 const today=dayKey(now),start=weekStart(now),end=shiftDay(start,7);
 const completed=data.tasks.filter(t=>t.progress===100&&t.completedAt);
 const dates=new Set(completed.map(t=>dayKey(t.completedAt)));
 let cursor=dates.has(today)?today:shiftDay(today,-1),streak=0;
 while(dates.has(cursor)){streak++;cursor=shiftDay(cursor,-1);}
 const days=Array.from({length:7},(_,i)=>{const key=shiftDay(start,i);return {key,count:completed.filter(t=>dayKey(t.completedAt)===key).length};});
 return {start,end,days,streak,completed:days.reduce((s,d)=>s+d.count,0),seconds:data.sessions.filter(s=>dayKey(s.endedAt)>=start&&dayKey(s.endedAt)<end).reduce((n,s)=>n+s.seconds,0),overdue:data.tasks.filter(t=>t.progress<100&&t.due&&t.due<today).length};
}
export function stopTimer(data, now=Date.now(), finished=false) {
 const t=data.timer;if(!t)return data;
 const elapsed=(t.elapsed||0)+(t.startedAt?Math.max(0,(now-t.startedAt)/1000):0);
 const seconds=Math.round(t.kind==='focus'?Math.min(elapsed,t.duration):elapsed);
 const session={id:t.id,taskId:t.taskId||'',label:t.label||'Untitled session',kind:t.kind,seconds,endedAt:new Date(now).toISOString(),finished};
 return {...data,timer:null,sessions:seconds>0&&!data.sessions.some(s=>s.id===t.id)?[...data.sessions,session]:data.sessions};
}
export function income(payments){return payments.reduce((a,p)=>{const amount=Number(p.amount)||0;a.billed+=amount;a[p.paid?'paid':'unpaid']+=amount;return a;},{billed:0,paid:0,unpaid:0});}
export const money=n=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(n);
export const duration=s=>`${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
export function notices(data,now=new Date()){
 const today=dayKey(now), monday=weekStart(now),weekEnd=shiftDay(monday,6),nextEnd=shiftDay(monday,13);
 return data.tasks.filter(t=>!t.deletedAt&&t.progress<100&&t.due&&t.due<=shiftDay(today,14)).map(t=>{
 const days=Math.round((Date.parse(t.due+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
 const stage=days>7?'14':days>0?String(days):days===0?'today':'overdue';
 return {id:`due:${t.id}:${t.due}:${stage}`,title:t.title,detail:days<0?`Overdue · ${t.due}`:days===0?'Due today':`Due in ${days} day${days===1?'':'s'} · ${t.due}`,group:days<0?'Overdue':days===0?'Today':t.due<=weekEnd?'This Week':t.due<=nextEnd?'Next Week':'Later',task:t};
 }).concat(data.sessions.filter(s=>s.kind==='focus'&&s.finished).map(s=>({id:`focus:${s.id}`,title:'Focus session complete',detail:`${s.label} · ${Math.round(s.seconds/60)} minutes`,group:'Today'}))).filter(n=>!data.dismissed.includes(n.id));
}
