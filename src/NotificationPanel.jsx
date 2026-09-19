import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Bell,CalendarClock,CheckCheck,Timer,X} from 'lucide-react';
import {notices} from './domain';
import './notifications.css';

const groups=['Overdue','Today','This Week','Next Week','Later'];
export default function NotificationPanel({data,update,onEdit,notify,onClose,triggerRef}) {
 const panel=useRef(null),closeButton=useRef(null);
 const [position,setPosition]=useState({top:80,right:16});
 const list=notices(data),unread=list.filter(n=>!data.readNotifications.includes(n.id)).length;
 useLayoutEffect(()=>{
  const place=()=>{const rect=triggerRef.current?.getBoundingClientRect();setPosition({top:Math.max(12,Math.min((rect?.bottom||64)+12,window.innerHeight-200)),right:Math.max(12,window.innerWidth-(rect?.right||window.innerWidth-16))});};
  place();window.addEventListener('resize',place);return()=>window.removeEventListener('resize',place);
 },[triggerRef]);
 useEffect(()=>{
  const trigger=triggerRef.current,previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';closeButton.current?.focus();
  const outside=event=>{if(!panel.current?.contains(event.target)&&!trigger?.contains(event.target))onClose();};
  const key=event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}
   if(event.key==='Tab'){
    const buttons=[...panel.current.querySelectorAll('button:not(:disabled),[tabindex="0"]')];
    const first=buttons[0],last=buttons.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
   }
  };
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);
  return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);trigger?.focus();};
 },[onClose,triggerRef]);
 const markRead=id=>update(d=>({...d,readNotifications:[...new Set([...d.readNotifications,id])]}));
 return createPortal(<><div className="notification-backdrop" aria-hidden="true"/><section ref={panel} className="notification-panel" id="notification-panel" role="dialog" aria-labelledby="notification-heading" style={{top:position.top,right:position.right,'--notification-top':`${position.top}px`}}>
  <header className="notification-panel-header"><div><h2 id="notification-heading"><Bell/>Notifications</h2><p>{unread?`${unread} unread`:'You’re all caught up'}</p></div><button ref={closeButton} className="icon-btn" aria-label="Close notifications" onClick={onClose}><X/></button></header>
  <div className="notification-toolbar"><span>Deadline reminders</span><button className="text-btn" disabled={!unread} onClick={()=>update(d=>({...d,readNotifications:[...new Set([...d.readNotifications,...list.map(n=>n.id)])]}))}><CheckCheck/>Mark all as read</button></div>
  <div className="notification-panel-list" tabIndex={0} aria-label="Notification groups">{groups.map(group=>{
   const items=list.filter(n=>n.group===group);
   return <section className="notification-group" key={group} aria-label={group}><h3>{group}<span>{items.length}</span></h3>{items.length?items.map(n=>{
    const isUnread=!data.readNotifications.includes(n.id);
    return <article key={n.id} className={`notification-item ${isUnread?'is-unread':''}`}><button className="notification-open" onClick={()=>{markRead(n.id);if(n.task){onClose();onEdit(n.task);}}}><span className="notification-item-icon">{n.task?<CalendarClock/>:<Timer/>}</span><span className="notification-copy"><strong>{n.title}{isUnread&&<span className="notification-unread-dot" aria-label="Unread"/>}</strong><small>{n.detail}</small></span></button><button className="more" aria-label={`Dismiss ${n.title}`} title="Dismiss" onClick={()=>update(d=>({...d,dismissed:[...new Set([...d.dismissed,n.id])]}))}><X/></button></article>;
   }):<p className="notification-group-empty">No reminders</p>}</section>;
  })}</div>
  <footer className="notification-panel-footer"><button className="text-btn" onClick={async()=>{if(!('Notification'in window)){notify('Desktop notifications are unavailable.');return;}const permission=await Notification.requestPermission();update({notificationsEnabled:permission==='granted'});notify(permission==='granted'?'Desktop reminders enabled.':'Desktop reminders are not enabled.');}}><Bell/>{data.notificationsEnabled?'Desktop reminders enabled':'Enable desktop reminders'}</button><p>Desktop reminders work while KARIBOK is open.</p></footer>
 </section></>,document.body);
}
