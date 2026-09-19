import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,notices,saveTask} from '../src/domain.js';
import {saveFolder,trashRecord,restoreRecord,permanentlyDelete,activeWorkspace} from '../src/organize.js';
import {createDatabase,asUser,USER_A,USER_B} from './postgres-fixture.js';
const fixture=()=>normalize({clients:[{id:'c',name:'Client'}],folders:[{id:'f',name:'Folder',parentId:''},{id:'sub',name:'Subfolder',parentId:'f'}],tasks:[{id:'t',title:'Task',folderId:'sub',clientId:'c',progress:0,due:'2026-09-28'}],notes:[{id:'n',title:'Note',body:'Text',folderId:'f',clientId:'c'}]});
test('folder CRUD validates depth and preserves shared IDs, independent client links and archive state',()=>{
 let d=fixture();d=saveFolder(d,{...d.folders[0],name:'Renamed',favorite:true,archived:true});assert.equal(d.folders[0].name,'Renamed');assert.equal(d.tasks[0].folderId,'sub');assert.equal(d.tasks[0].clientId,'c');
 assert.throws(()=>saveFolder(d,{id:'third',name:'Third',parentId:'sub'}));assert.throws(()=>saveFolder(d,{...d.folders[0],parentId:'sub'}));
 d=saveTask(d,{...d.tasks[0],folderId:''});assert.equal(d.tasks.length,1);assert.equal(d.tasks[0].folderId,'');assert.equal(d.tasks[0].clientId,'c');
});
test('trash retains records indefinitely; restores hierarchy; permanent deletion removes descendants only',()=>{
 let d=fixture();d=trashRecord(d,'folders','f');assert.equal(activeWorkspace(d).tasks.length,0);assert.equal(d.tasks.length,1);assert.ok(d.notes[0].deletedAt);assert.equal(d.folders.filter(f=>f.deletedAt).length,2);
 d=normalize(d);d=restoreRecord(d,'folders','f');assert.equal(activeWorkspace(d).tasks.length,1);assert.equal(d.tasks[0].folderId,'sub');assert.equal(d.notes[0].folderId,'f');assert.equal(d.folders[1].parentId,'f');
 d=trashRecord(d,'tasks','t');d=trashRecord(d,'folders','f');d=restoreRecord(d,'folders','f');assert.ok(d.tasks[0].deletedAt,'independently trashed task stays trashed');
 d=restoreRecord(trashRecord(d,'folders','f'),'tasks','t');assert.ok(!d.folders[0].deletedAt&&!d.folders[1].deletedAt);
 d=permanentlyDelete(trashRecord(d,'folders','f'),'folders','f');assert.equal(d.folders.length,0);assert.equal(d.tasks.length,0);assert.equal(d.notes.length,0);assert.equal(d.clients.length,1);assert.throws(()=>permanentlyDelete(d,'clients','c'));
});
test('deadline thresholds, read/dismiss identity, groups, completion and trash',()=>{
 const d=fixture(),at=day=>new Date(`2026-09-${day}T12:00:00`);
 assert.equal(notices(d,at(13)).length,0);assert.match(notices(d,at(14))[0].id,/:14$/);assert.match(notices(d,at(21))[0].id,/:7$/);assert.match(notices(d,at(27))[0].id,/:1$/);assert.equal(notices(d,at(28))[0].group,'Today');assert.equal(notices(d,at(29))[0].group,'Overdue');
 assert.equal(notices(saveTask(d,{...d.tasks[0],progress:100}),at(28)).length,0);assert.equal(notices(trashRecord(d,'tasks','t'),at(28)).length,0);
 const dismissed={...d,dismissed:[notices(d,at(21))[0].id]};assert.equal(notices(dismissed,at(21)).length,0);assert.equal(notices(dismissed,at(22)).length,1);
});
test('organization persistence, constraints, restore and two-user RLS through the existing RPC',async()=>{
 const {db}=await createDatabase();try{let d=fixture();let revision=0;const save=async()=>{await asUser(db,USER_A,'select public.save_workspace($1,$2::jsonb)',[revision,JSON.stringify(d)]);revision++;};await save();
 for(const mutate of [x=>x.folders.push({...x.folders[0]}),x=>x.folders[0].parentId='sub',x=>x.tasks[0].folderId='foreign',x=>x.notes[0].clientId='foreign',x=>x.folders[0].deletedAt=new Date().toISOString()]){const invalid=structuredClone(d);mutate(invalid);await assert.rejects(asUser(db,USER_A,'select public.save_workspace($1,$2::jsonb)',[revision,JSON.stringify(invalid)]));}
 d=trashRecord(d,'folders','f');await save();d=restoreRecord(d,'folders','f');await save();d=permanentlyDelete(trashRecord(d,'clients','c'),'clients','c');await save();assert.equal(d.tasks[0].clientId,'');
 const row=(await asUser(db,USER_A,'select data from public.workspaces')).rows[0];assert.deepEqual(row.data,d);assert.equal((await asUser(db,USER_B,'select * from public.workspaces')).rows.length,0);
 await assert.rejects(asUser(db,USER_B,'insert into public.workspaces(user_id,data) values($1,$2::jsonb)',[USER_A,JSON.stringify(d)]));
 }finally{await db.close();}
});
