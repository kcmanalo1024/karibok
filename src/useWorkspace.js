import {useEffect,useRef,useState} from 'react';
import {supabase} from './supabase';
import {normalize} from './domain';
const guestKey='karibok-v1';
function localRead(fallback){try{return normalize(JSON.parse(localStorage.getItem(guestKey))||fallback);}catch{return normalize(fallback);}}
export function useWorkspace(fallback){
 const [data,setData]=useState(()=>localRead(fallback));
 const [user,setUser]=useState(null),[ready,setReady]=useState(!supabase),[status,setStatus]=useState(supabase?'Connecting…':'Saved in this browser'),[conflict,setConflict]=useState(false);
 const [authChecked,setAuthChecked]=useState(!supabase),[authError,setAuthError]=useState('');
 const ref=useRef({data,user:null,revision:0,dirty:false,serial:0,busy:false,ready:!supabase,generation:0,conflict:false,authChecked:!supabase});
 const setCurrent=d=>{ref.current.data=normalize(d);setData(ref.current.data);};
 const persist=()=>{const r=ref.current;try{localStorage.setItem(r.user?`karibok-user-${r.user.id}`:guestKey,JSON.stringify(r.user?{data:r.data,revision:r.revision,dirty:r.dirty}:r.data));return true;}catch{setStatus('Storage unavailable. Export a backup before closing.');return false;}};
 const update=patch=>{const r=ref.current;if(!r.ready||!r.user)return;const d=typeof patch==='function'?patch(r.data):{...r.data,...patch};r.serial++;r.dirty=!!r.user;setCurrent(d);if(persist())setStatus(r.user?'Changes waiting to sync':'Saved in this browser');};
 const load=async(session)=>{
  const r=ref.current;r.authChecked=true;setAuthChecked(true);setAuthError('');const generation=++r.generation;r.ready=false;r.user=session?.user||null;r.dirty=false;r.conflict=false;r.busy=false;setConflict(false);setUser(r.user);setReady(false);
  if(!r.user){setCurrent(localRead(fallback));r.revision=0;r.ready=true;setReady(true);setStatus('Saved in this browser');return;}
  setStatus('Loading your workspace…');
  try {
  const {data:row,error}=await supabase.from('workspaces').select('data,revision').eq('user_id',r.user.id).maybeSingle();
  if(generation!==r.generation)return;
  if(error){setStatus(`Could not load cloud data: ${error.message}`);return;}
  let cache;try{cache=JSON.parse(localStorage.getItem(`karibok-user-${r.user.id}`));}catch{}
  r.revision=row?.revision||0;
  if(cache?.dirty){setCurrent(cache.data);r.dirty=true;r.revision=cache.revision||0;if(r.revision!==(row?.revision||0)){r.conflict=true;setConflict(true);setStatus('Another device changed this workspace. Export your draft, then load the cloud version.');}else setStatus('Restored unsynced changes');}
  else {setCurrent(row?.data||normalize({name:session.user.user_metadata?.display_name||'Student'}));setStatus('Synced');}
  r.ready=true;setReady(true);persist();
  } catch(error) { if(generation===r.generation)setStatus(`Could not load cloud data: ${error.message}`); }
 };
 async function sync(){const r=ref.current;if(!supabase||!r.user||!r.ready||r.busy||r.conflict)return;r.busy=true;const generation=r.generation;
  try{
   if(r.dirty){const serial=r.serial;const {data:revision,error}=await supabase.rpc('save_workspace',{expected_revision:r.revision,workspace_data:r.data});if(generation!==r.generation)return;if(error){if(error.code==='40001'){r.conflict=true;setConflict(true);throw Error('Another device changed this workspace. Export your draft, then load the cloud version.');}throw error;}r.revision=revision;r.dirty=r.serial!==serial;persist();setStatus(r.dirty?'Changes waiting to sync':'Synced');}
   else {const {data:row,error}=await supabase.from('workspaces').select('data,revision').eq('user_id',r.user.id).maybeSingle();if(generation!==r.generation)return;if(error)throw error;if(!r.dirty&&row&&row.revision>r.revision){r.revision=row.revision;setCurrent(row.data);persist();setStatus('Synced');}}
  }catch(e){if(generation===r.generation)setStatus(`Not synced: ${e.message}`);}finally{if(generation===r.generation)r.busy=false;}
 }
 useEffect(()=>{
  if(!supabase)return;
  let active=true;
  // Keep this callback synchronous: Supabase APIs must run outside its auth lock.
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(!active)return;
   ref.current.authChecked=true;setAuthChecked(true);setAuthError('');
   if(!ref.current.ready||ref.current.user?.id!==session?.user?.id)void load(session);
  });
  supabase.auth.getSession().then(({data:{session},error})=>{
   if(!active||ref.current.authChecked)return;
   if(error)throw error;
   void load(session);
  }).catch(error=>{if(active&&!ref.current.authChecked){setAuthError(error.message||'Could not check your session. Please try again.');setAuthChecked(true);}});
  const timer=setInterval(()=>void sync(),15000);
  const online=()=>void sync();window.addEventListener('online',online);
  return()=>{active=false;subscription.unsubscribe();clearInterval(timer);window.removeEventListener('online',online);ref.current.generation++;};
 },[]);
 useEffect(()=>{if(!ready||!user)return;const timer=setTimeout(()=>void sync(),700);return()=>clearTimeout(timer);},[data,ready,user]);
 useEffect(()=>{const warn=e=>{if(ref.current.dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
 const reload=async()=>{const r=ref.current;if(!r.user)return;try{if(r.dirty)localStorage.setItem(`karibok-conflict-backup-${Date.now()}`,JSON.stringify(r.data));localStorage.removeItem(`karibok-user-${r.user.id}`);}catch{setStatus('Could not back up this draft. Export it before retrying.');return;}const {data:{session}}=await supabase.auth.getSession();await load(session);};
 return {data,update,user,ready,status,authChecked,authError,conflict,sync,reload,retry:async()=>{if(!supabase)return;try{const {data:{session},error}=await supabase.auth.getSession();if(error)throw error;await load(session);}catch(error){setAuthError(error.message);setAuthChecked(true);}},signOut:async()=>{if(ref.current.dirty){await sync();if(ref.current.dirty)throw Error('Changes are not synced. Export a backup or resolve the sync issue before signing out.');}const {error}=await supabase.auth.signOut();if(error)throw error;}};
}
