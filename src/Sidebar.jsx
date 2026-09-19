import React from 'react';
import {LayoutDashboard,CheckSquare,StickyNote,CalendarDays,Folder,Star,Users,WalletCards,Timer,Trash2,Settings,ChevronLeft,ChevronRight} from 'lucide-react';
import {notices} from './domain';
import {trashKinds} from './organize';

const groups=[
 ['WORKSPACE', [['Dashboard',LayoutDashboard],['Tasks',CheckSquare],['Notes',StickyNote],['Calendar',CalendarDays]]],
 ['ORGANIZE', [['Folders',Folder],['Favorites',Star],['Clients',Users],['Finances',WalletCards]]],
 ['PRODUCTIVITY', [['Focus',Timer]]],
 ['SYSTEM', [['Trash',Trash2],['Settings',Settings]]],
];

export default function Sidebar({data,raw,page,onNavigate,collapsed,onToggle,avatar}) {
 const badges={Tasks:notices(data).filter(n=>n.task&&!data.readNotifications.includes(n.id)).length,Trash:trashKinds.reduce((n,k)=>n+(raw[k]||[]).filter(r=>r.deletedAt).length,0)};
 const item=([name,Icon])=><button type="button" key={name} aria-label={name} aria-current={page===name?'page':undefined} title={collapsed?name:undefined} className={`nav-item ${page===name?'active':''}`} onClick={()=>onNavigate(name)}>
  <Icon size={18} aria-hidden="true"/><span className="nav-text">{name}</span>
  {badges[name]>0&&<span className="nav-badge" aria-label={`${badges[name]} ${name==='Tasks'?'unread deadline reminders':'items in Trash'}`}>{badges[name]>99?'99+':badges[name]}</span>}
 </button>;
 return <aside className={`sidebar file-sidebar ${collapsed?'is-collapsed':''}`} aria-label="Workspace sidebar">
  <div className="brand">{collapsed?<><img className="site-logo theme-logo-light" src="/Black_Logo.png" alt="KARIBOK"/><img className="site-logo theme-logo-dark" src="/White_Logo.png" alt="KARIBOK"/></>:<div className="brand-copy"><div className="brand-wordmark" role="img" aria-label="KARIBOK"><img className="theme-logo-light" src="/karibok-wordmark-black.png" alt=""/><img className="theme-logo-dark" src="/karibok-wordmark-white.png" alt=""/></div></div>}</div>
  <button type="button" className="sidebar-collapse" aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} aria-expanded={!collapsed} aria-controls="workspace-navigation" title={collapsed?'Expand sidebar':'Collapse sidebar'} onClick={onToggle}>{collapsed?<ChevronRight size={16}/>:<ChevronLeft size={16}/>}</button>
  <nav id="workspace-navigation" aria-label="Main navigation">{groups.map(([label,items])=><section className="nav-group" key={label} aria-label={label}><div className="nav-label">{label}</div>{items.map(item)}</section>)}</nav>
  <div className="sidebar-bottom"><button type="button" className="profile" aria-label={`Profile: ${data.name}`} title={collapsed?`Profile: ${data.name}`:undefined} onClick={()=>onNavigate('Settings')}>{avatar}<div className="profile-copy"><strong>{data.name}</strong><span>Personal workspace</span></div></button></div>
 </aside>;
}
