import React, { useState } from 'react';
import { Plus, ArrowLeft, ArrowUpRight, Users, FolderKanban } from 'lucide-react';
import { Heading, Empty, Dialog } from './features';
import { id } from './domain';
import { CLIENT_TYPES, PROJECT_STATUSES, clientSummary, projectSummary, validateClient, validateProject, safeURL, deletionReason, upsert } from './v4';
import { Field, Metrics, RecordActions, DeleteDialog } from './v4ui';

export function WorkPage({ page, data, update, notify, onAddTask, renderTask }) {
  const [view, setView] = useState(null);
  const [editor, setEditor] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [taskId, setTaskId] = useState('');
  const isClients = page === 'Clients';
  const client = view?.kind === 'client' ? data.clients.find(c => c.id === view.id) : null;
  const project = view?.kind === 'project' ? data.projects.find(p => p.id === view.id) : null;
  const openEditor = (kind, value) => { setError(''); setEditor({ kind, value: { ...value } }); };
  const newClient = () => openEditor('clients', { id: id(), name: '', contactPerson: '', email: '', phone: '', type: '', notes: '' });
  const newProject = (clientId = '') => openEditor('projects', { id: id(), title: '', clientId, category: data.categories[0], description: '', startDate: '', deadline: '', status: 'Not Started', links: {} });
  const openProject = p => { setView({ kind: 'project', id: p.id, clientId: client?.id || view?.clientId }); setAssigning(false); };
  const requestDelete = (kind, record) => { const reason = deletionReason(data, kind, record.id); if (reason) return notify(reason); setDeleting({ kind, record }); };
  const change = (key, value) => setEditor(e => ({ ...e, value: { ...e.value, [key]: value } }));
  const projectCard = p => {
    const summary = projectSummary(data, p.id);
    return <article className="panel work-card" key={p.id}>
      <div className="record-title"><h2><button className="title-link" onClick={() => openProject(p)}>{p.title}<ArrowUpRight size={15}/></button></h2><RecordActions label={p.title} onEdit={() => openEditor('projects', p)} onDelete={() => requestDelete('projects', p)}/></div>
      <p className="muted text-sm">{data.clients.find(c => c.id === p.clientId)?.name || 'Independent project'}</p>
      <div className="work-card-meta"><span className="tag">{p.status}</span><span className="muted">{p.deadline ? `Due ${p.deadline}` : 'No deadline'}</span></div>
      {summary.total ? <><div className="project-progress-label"><span>{summary.completed} / {summary.total} tasks completed</span><strong>{summary.progress}%</strong></div><div className="progress-track"><div className="progress-fill" style={{width:`${summary.progress}%`}}/></div></> : <p className="muted text-sm mt-4">No tasks yet. Open this project to add work.</p>}
    </article>;
  };
  const back = () => { setView(project && view?.clientId ? {kind:'client',id:view.clientId} : null); setAssigning(false); };

  return <>
    {(client || project) && <button className="text-btn v4-back" onClick={back}><ArrowLeft size={15}/> {project && view?.clientId ? 'Back to client' : `All ${page.toLowerCase()}`}</button>}
    {client ? <>
      <Heading eyebrow="CLIENT · WHO" title={client.name} description={client.email || 'Your client, their projects, and the work ahead.'} action={<button className="primary" onClick={() => newProject(client.id)}><Plus size={17}/> Create project</button>}/>
      <div className="work-detail-grid"><section className="panel"><div className="panel-head"><h2>Client details</h2><RecordActions label={client.name} onEdit={() => openEditor('clients', client)} onDelete={() => requestDelete('clients', client)}/></div><dl className="detail-list">{[['Contact person',client.contactPerson],['Email',client.email],['Phone',client.phone],['Client type',client.type]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div>)}</dl>{client.notes && <p className="v4-notes">{client.notes}</p>}</section><section className="panel"><h2>Work overview</h2>{(() => {const s=clientSummary(data,client.id);return <Metrics items={[["Active projects",s.active],["Total projects",s.total],["Completed projects",s.completedProjects],["Total tasks",s.tasks],["Completed tasks",s.completedTasks]]}/>;})()}</section></div>
      <div className="v4-section-heading"><h2>Projects</h2></div>
      {clientSummary(data,client.id).total ? <div className="records-grid">{clientSummary(data,client.id).projects.map(projectCard)}</div> : <section className="panel"><Empty>No projects yet. Create a project for this client to start tracking work.</Empty></section>}
    </> : project ? <>
      <Heading eyebrow="PROJECT · WHAT" title={project.title} description={data.clients.find(c => c.id === project.clientId)?.name || 'Independent project'} action={<div className="flex gap-2"><button className="secondary" onClick={() => openEditor('projects',project)}>Edit project</button><button className="primary" onClick={() => onAddTask(project)}><Plus size={17}/> Add task</button></div>}/>
      <div className="work-detail-grid"><section className="panel"><div className="panel-head"><h2>Project details</h2><RecordActions label={project.title} onEdit={() => openEditor('projects',project)} onDelete={() => requestDelete('projects',project)}/></div><p className="v4-notes">{project.description || 'No description added.'}</p><dl className="detail-list">{[['Status',project.status],['Start date',project.startDate || 'Not set'],['Deadline',project.deadline || 'Not set']].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="project-links">{Object.entries(project.links || {}).filter(([,url]) => safeURL(url)).map(([name,url]) => <a key={name} href={safeURL(url)} target="_blank" rel="noopener noreferrer">{{figma:'Figma',drive:'Google Drive',github:'GitHub',other:'Project link'}[name] || name}<ArrowUpRight size={14}/></a>)}</div></section><section className="panel"><h2>Task progress</h2>{(() => {const s=projectSummary(data,project.id);return s.total ? <><div className="project-completion"><strong>{s.progress}%</strong><span>{s.completed} / {s.total} tasks completed</span></div><div className="progress-track"><div className="progress-fill" style={{width:`${s.progress}%`}}/></div><p className="muted text-sm mt-4">Calculated from completed tasks.</p></> : <Empty>No tasks yet. Add your first task to start tracking progress.</Empty>;})()}</section></div>
      <section className="panel mt-4"><div className="panel-head"><div><div className="eyebrow">TASKS · HOW</div><h2>Project tasks</h2></div><button className="text-btn" onClick={() => {setTaskId('');setError('');setAssigning(true);}}>Assign existing task</button></div>
        {['Active tasks','Completed tasks'].map((label,index) => {const tasks=data.tasks.filter(t=>t.projectId===project.id&&(t.progress===100)===(index===1));return <div className="project-task-group" key={label}><h3>{label} <span className="muted">({tasks.length})</span></h3>{tasks.length ? <div className="task-list">{tasks.map(renderTask)}</div> : <p className="muted text-sm">{index ? 'Completed work will appear here.' : 'No active tasks in this project.'}</p>}</div>;})}
      </section>
    </> : <>
      <Heading eyebrow={isClients ? 'CLIENTS · WHO' : 'PROJECTS · WHAT'} title={isClients ? 'Good work. Good people.' : 'Ideas into progress.'} description={isClients ? 'The people and businesses you work for.' : 'Connect a client, define the work, and track its tasks.'} action={<button className="primary" onClick={() => isClients ? newClient() : newProject()}><Plus size={17}/> {isClients ? 'Add client' : 'New project'}</button>}/>
      {isClients ? data.clients.length ? <div className="records-grid">{data.clients.map(c => {const s=clientSummary(data,c.id);return <article className="panel work-card" key={c.id}><div className="record-title"><h2><button className="title-link" onClick={() => setView({kind:'client',id:c.id})}>{c.name}<ArrowUpRight size={15}/></button></h2><RecordActions label={c.name} onEdit={() => openEditor('clients',c)} onDelete={() => requestDelete('clients',c)}/></div><p className="muted text-sm">{[c.contactPerson,c.type].filter(Boolean).join(' · ') || c.email || 'Client'}</p>{s.total ? <><Metrics items={[["Active projects",s.active],["Total projects",s.total]]}/><p className="muted text-sm">{s.completedTasks} / {s.tasks} tasks completed</p></> : <p className="muted text-sm mt-4">No projects yet. Create a project for this client to start tracking work.</p>}</article>;})}</div> : <section className="panel"><Empty>No clients yet. Add your first client to start organizing freelance work.</Empty></section>
      : data.projects.length ? <div className="records-grid">{data.projects.map(projectCard)}</div> : <section className="panel"><Empty>No projects yet. Create a project and connect it to a client.</Empty></section>}
    </>}
    {editor && <Dialog title={`${data[editor.kind].some(r=>r.id===editor.value.id)?'Edit':'Add'} ${editor.kind==='clients'?'client':'project'}`} submitLabel={editor.kind==='clients'?'Save Client':'Save Project'} wide onClose={() => setEditor(null)} onSubmit={event => {
      event.preventDefault();setError('');try {
        const value={...editor.value};if(editor.kind==='clients'){value.name=value.name.trim();value.email=value.email.trim();validateClient(value);}else{value.title=value.title.trim();validateProject(value,data);}
        update(d=>{editor.kind==='clients'?validateClient(value):validateProject(value,d);const next=upsert(d,editor.kind,value);return editor.kind==='projects'?{...next,tasks:next.tasks.map(t=>t.projectId===value.id?{...t,project:value.title}:t)}:next;});setEditor(null);
      }catch(e){setError(e.message);}
    }}>
      {editor.kind==='clients' ? <><Field label="Client / Business Name" value={editor.value.name} onChange={v=>change('name',v)} required/><div className="form-grid"><Field label="Contact Person" value={editor.value.contactPerson} onChange={v=>change('contactPerson',v)}/><Field label="Client Type" value={editor.value.type} onChange={v=>change('type',v)} options={[{value:'',label:'Not specified'},...CLIENT_TYPES]}/><Field label="Email" type="email" value={editor.value.email} onChange={v=>change('email',v)}/><Field label="Phone" type="tel" value={editor.value.phone} onChange={v=>change('phone',v)}/></div><Field label="Notes" multiline value={editor.value.notes} onChange={v=>change('notes',v)}/></> : <>
        <Field label="Project Name" value={editor.value.title} onChange={v=>change('title',v)} required/>
        <div className="form-grid"><Field label="Client" value={editor.value.clientId} onChange={v=>change('clientId',v)} options={[{value:'',label:'No client — independent project'},...data.clients.map(c=>({value:c.id,label:c.name}))]}/><Field label="Status" value={editor.value.status} onChange={v=>change('status',v)} options={PROJECT_STATUSES}/></div>
        <Field label="Description" multiline value={editor.value.description} onChange={v=>change('description',v)}/><div className="form-grid"><Field label="Start Date" type="date" value={editor.value.startDate} onChange={v=>change('startDate',v)}/><Field label="Deadline" type="date" min={editor.value.startDate||undefined} value={editor.value.deadline} onChange={v=>change('deadline',v)}/></div><Field label="Category" value={editor.value.category} onChange={v=>change('category',v)} options={data.categories}/>
        <details className="project-links-form"><summary>Project links (optional)</summary>{[['figma','Figma URL'],['drive','Google Drive URL'],['github','GitHub URL'],['other','Other project URL']].map(([key,label])=><Field key={key} label={label} type="url" placeholder="https://" value={editor.value.links?.[key]||''} onChange={v=>change('links',{...editor.value.links,[key]:v})}/>)}</details>
      </>}{error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
    </Dialog>}
    {assigning && project && <Dialog title="Assign existing task" submitLabel="Assign task" onClose={()=>setAssigning(false)} onSubmit={e=>{e.preventDefault();try{update(d=>{if(!d.projects.some(p=>p.id===project.id)||!d.tasks.some(t=>t.id===taskId))throw Error('That task or project is no longer available.');return {...d,tasks:d.tasks.map(t=>t.id===taskId?{...t,projectId:project.id,project:project.title}:t)};});setAssigning(false);}catch(e){setError(e.message);}}}><Field label="Task to assign" value={taskId} required onChange={setTaskId} options={[{value:'',label:'Select a task'},...data.tasks.filter(t=>t.projectId!==project.id).map(t=>({value:t.id,label:`${t.title}${t.projectId?' — from '+(data.projects.find(p=>p.id===t.projectId)?.title||'another project'):''}`}))]}/><p className="muted text-sm">Assigning moves the task from its current project, if any. It stays visible in All tasks.</p>{error&&<p role="alert">{error}</p>}</Dialog>}
    {deleting && <DeleteDialog label={deleting.record.name||deleting.record.title} onClose={()=>setDeleting(null)} onDelete={()=>{try{update(d=>{const reason=deletionReason(d,deleting.kind,deleting.record.id);if(reason)throw Error(reason);return {...d,[deleting.kind]:d[deleting.kind].filter(r=>r.id!==deleting.record.id)};});setDeleting(null);if(view?.id===deleting.record.id)setView(null);}catch(e){notify(e.message);setDeleting(null);}}}/>}
  </>;
}
