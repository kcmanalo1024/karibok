import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../src/domain.js';
import {createDatabase,asUser,USER_A,USER_B} from './postgres-fixture.js';
const base=()=>normalize({schemaVersion:4,clients:[{id:'client',name:'ABC Coffee Shop',email:'abc@example.com'}],projects:[{id:'project',title:'Website',status:'In progress',clientId:'client'}],tasks:[{id:'task',title:'Design',projectId:'project',progress:0}],accounts:[{id:'bank',name:'BPI',type:'Bank',startingBalanceCents:1000000},{id:'cash',name:'Cash',type:'Cash',startingBalanceCents:0}],transactions:[]});
test('SQL migration, ledger constraints, atomic revision checks and two-user RLS',async()=>{
 const {db,schema}=await createDatabase();
 try {
  const first=base();await asUser(db,USER_A,'select public.save_workspace($1,$2::jsonb)',[0,JSON.stringify(first)]);
  await db.exec(schema); // safe to apply the upgrade again without deleting data
  assert.equal((await asUser(db,USER_A,'select data,revision from public.workspaces')).rows[0].data.clients[0].name,'ABC Coffee Shop');
  assert.equal((await asUser(db,USER_B,'select * from public.workspaces where user_id=$1',[USER_A])).rows.length,0);
  await assert.rejects(asUser(db,USER_B,'insert into public.workspaces(user_id,data) values($1,$2::jsonb)',[USER_A,JSON.stringify(first)]),e=>e.code==='42501');
  assert.equal((await asUser(db,USER_B,'update public.workspaces set data=$1::jsonb where user_id=$2 returning user_id',[JSON.stringify(first),USER_A])).rows.length,0);
  await asUser(db,USER_B,'select public.save_workspace($1,$2::jsonb)',[0,JSON.stringify(normalize({}))]);
  assert.equal((await asUser(db,USER_B,'select * from public.workspaces')).rows.length,1);
  for(const mutate of [
    d=>d.projects[0].clientId='other-users-client',
    d=>d.tasks[0].projectId='missing',
    d=>d.clients=[],
    d=>d.accounts.push({...d.accounts[0]}),
    d=>d.accounts[0].startingBalanceCents=1.5,
    d=>d.projects[0].links={other:'javascript:alert(1)'},
    d=>d.transactions.push({id:'bad',type:'transfer',amountCents:20000,accountId:'bank',toAccountId:'bank',date:'2026-09-15'}),
    d=>d.transactions.push({id:'bad',type:'transfer',amountCents:20000,accountId:'bank',toAccountId:'foreign-account',date:'2026-09-15'}),
    d=>d.transactions.push({id:'bad',type:'expense',amountCents:-1,accountId:'bank',description:'Food',category:'Food',date:'2026-09-15'}),
    d=>d.transactions.push({id:'bad',type:'expense',amountCents:1.5,accountId:'bank',description:'Food',category:'Food',date:'2026-09-15'}),
    d=>d.transactions.push({id:'bad',type:'expense',amountCents:100,accountId:'bank',description:'Food',category:'Food',date:'2026-02-30'})
  ]) {const invalid=structuredClone(first);mutate(invalid);await assert.rejects(asUser(db,USER_A,'select public.save_workspace($1,$2::jsonb)',[1,JSON.stringify(invalid)]));}
  assert.equal((await asUser(db,USER_A,'select revision from public.workspaces')).rows[0].revision,1);
  const valid=structuredClone(first);valid.transactions=[{id:'transfer',type:'transfer',amountCents:200000,accountId:'bank',toAccountId:'cash',date:'2026-09-15',category:'',description:'Transfer'}];
  await asUser(db,USER_A,'select public.save_workspace($1,$2::jsonb)',[1,JSON.stringify(valid)]);
  await assert.rejects(asUser(db,USER_A,'select public.save_workspace($1,$2::jsonb)',[1,JSON.stringify(first)]),e=>e.code==='40001');
  const missingAccount=structuredClone(valid);missingAccount.accounts.pop();await assert.rejects(asUser(db,USER_A,'update public.workspaces set data=$1::jsonb',[JSON.stringify(missingAccount)]),e=>e.code==='23503');
  const oldClient=structuredClone(valid);delete oldClient.accounts;delete oldClient.transactions;await assert.rejects(asUser(db,USER_A,'select public.save_workspace($1,$2::jsonb)',[2,JSON.stringify(oldClient)]),e=>e.code==='23514');
  await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon');await tx.query('select * from public.workspaces');}),e=>e.code==='42501');
 }finally{await db.close();}
});
