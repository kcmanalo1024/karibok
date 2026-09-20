import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../src/domain.js';
import {saveNote,setNoteState,filterNotes} from '../src/notes.js';
import {trashRecord,restoreRecord} from '../src/organize.js';
import {createDatabase,asUser,USER_A,USER_B} from './postgres-fixture.js';
const fixture=()=>normalize({folders:[{id:'f',name:'Project'}],tasks:[{id:'t',title:'Task',folderId:'f',progress:0}],notes:[]});
const draft={id:'n',title:'  Mga ideya 日本語  ',body:'  Original words\n\nDo not translate. <script>text only</script>  ',tags:['Personal','日本語'],folderId:'f',taskId:'t'};
test('notes preserve original content, creation dates and links across edits and normalization',()=>{
 let d=saveNote(fixture(),draft,new Date('2026-09-01'));
 const created=d.notes[0].createdAt;
 d=saveNote(d,{...d.notes[0],tags:['Work'],body:draft.body+'\nEdited'},new Date('2026-09-02'));
 d=normalize(JSON.parse(JSON.stringify(d)));
 assert.equal(d.notes[0].title,draft.title);assert.equal(d.notes[0].body,draft.body+'\nEdited');
 assert.equal(d.notes[0].createdAt,created);assert.equal(d.notes[0].updatedAt,'2026-09-02T00:00:00.000Z');assert.equal(d.notes[0].taskId,'t');assert.equal(d.notes[0].folderId,'f');
 assert.throws(()=>saveNote(d,{id:'bad',title:' ',body:'\n'}));assert.throws(()=>saveNote(d,{...draft,id:'bad',taskId:'missing'}));
 assert.throws(()=>saveNote(d,{...draft,tags:Array.from({length:21},(_,i)=>String(i))}));
});
test('pin, archive, delete and restore preserve note data and search supports tags and content',()=>{
 let d=saveNote(fixture(),draft);
 d=setNoteState(d,'n',{pinned:true});assert.equal(filterNotes(d.notes,{query:'original',tag:'Personal'}).length,1);
 assert.equal(filterNotes(d.notes,{query:'日本語'}).length,1);assert.equal(filterNotes(d.notes,{tag:'Other'}).length,0);
 d=setNoteState(d,'n',{archived:true});assert.equal(filterNotes(d.notes).length,0);assert.equal(filterNotes(d.notes,{view:'archived'}).length,1);
 d=trashRecord(d,'notes','n');assert.equal(filterNotes(d.notes,{view:'archived'}).length,0);assert.equal(filterNotes(d.notes,{view:'deleted'}).length,1);assert.throws(()=>saveNote(d,draft));
 d=restoreRecord(d,'notes','n');assert.equal(filterNotes(d.notes,{view:'archived'}).length,1);
 d=setNoteState(d,'n',{archived:false});assert.equal(filterNotes(d.notes).length,1);assert.equal(d.notes[0].pinned,true);assert.equal(d.notes[0].body,draft.body);
 d=restoreRecord(trashRecord(d,'folders','f'),'notes','n');assert.ok(!d.folders[0].deletedAt);assert.equal(d.notes[0].folderId,'f');
});
test('legacy notes remain searchable without tags, dates or archive fields',()=>{
 const d=normalize({notes:[{id:'old',title:'Existing note',body:'Unchanged'}]});
 assert.equal(filterNotes(d.notes,{query:'unchanged'}).length,1);
 const updated=saveNote(d,{...d.notes[0],tags:['new']});assert.equal(updated.notes[0].body,'Unchanged');
});
test('notes round trip through the existing Supabase JSONB RPC with user isolation',async()=>{
 const {db}=await createDatabase();
 try {
  let d=saveNote(fixture(),draft),revision=0;
  for(const change of [x=>x,x=>setNoteState(x,'n',{pinned:true,archived:true}),x=>trashRecord(x,'notes','n'),x=>restoreRecord(x,'notes','n'),x=>setNoteState(x,'n',{archived:false})]) {
   d=change(d);
   await asUser(db,USER_A,'select public.save_workspace($1,$2::jsonb)',[revision++,JSON.stringify(d)]);
   const saved=(await asUser(db,USER_A,'select data from public.workspaces')).rows[0].data;
   assert.deepEqual(saved.notes,d.notes);
  }
  assert.equal((await asUser(db,USER_B,'select data from public.workspaces')).rows.length,0);
 } finally {await db.close();}
});
