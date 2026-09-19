import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../src/domain.js';
import {parseCents,clientSummary,accountBalances,financeSummary,validateTransaction,deletionReason,upsert} from '../src/v4.js';
test('direct client summary uses completed task counts',()=>{
 const d=normalize({clients:[{id:'c',name:'Client'}],projects:[{id:'p',title:'Project',clientId:'c',status:'In progress'},{id:'empty',title:'Empty',clientId:'c',status:'Completed'}],tasks:[{id:'1',projectId:'p',progress:100},{id:'2',projectId:'p',progress:90},{id:'3',projectId:'p',progress:10},{id:'4',progress:100}],schemaVersion:4});
 assert.equal(clientSummary(d,'c').tasks,3);assert.equal(clientSummary(d,'c').active,2);assert.equal(clientSummary(d,'c').completedTasks,1);assert.equal(d.folders.length,2);
});
test('balances, transfers, edits and deletes are derived once from integer centavos',()=>{
 let d=normalize({accounts:[{id:'bpi',name:'BPI',type:'Bank',startingBalanceCents:1000000},{id:'gcash',name:'GCash',type:'E-wallet',startingBalanceCents:200000},{id:'cash',name:'Cash',type:'Cash',startingBalanceCents:350000}],transactions:[]});
 const expense={id:'expense',description:'Groceries',type:'expense',accountId:'gcash',category:'Food',amountCents:85000,date:'2026-09-15'};
 d=upsert(d,'transactions',expense);assert.equal(accountBalances(d).gcash,115000);
 d=upsert(d,'transactions',{...expense,id:'income',type:'income',category:'Freelance',amountCents:300000});assert.equal(accountBalances(d).gcash,415000);
 const before=financeSummary(d,'2026-09').total;
 const transfer={id:'transfer',type:'transfer',accountId:'bpi',toAccountId:'cash',amountCents:200000,date:'2026-09-15'};validateTransaction(transfer,d);d=upsert(d,'transactions',transfer);assert.equal(accountBalances(d).bpi,800000);assert.equal(accountBalances(d).cash,550000);assert.equal(financeSummary(d,'2026-09').total,before);assert.equal(financeSummary(d,'2026-09').income,300000);assert.equal(financeSummary(d,'2026-09').expenses,85000);
 d=upsert(d,'transactions',{...expense,amountCents:50000});assert.equal(accountBalances(d).gcash,450000);assert.equal(d.transactions.length,3);
 d={...d,transactions:d.transactions.filter(t=>t.id!=='expense')};assert.equal(accountBalances(d).gcash,500000);assert.equal(financeSummary(d,'2026-09').expenses,0);assert.ok(deletionReason(d,'accounts','cash'));
 d=upsert(d,'transactions',{...transfer,accountId:'gcash',toAccountId:'bpi',amountCents:10000});assert.equal(accountBalances(d).cash,350000);assert.equal(accountBalances(d).bpi,1010000);assert.equal(accountBalances(d).gcash,490000);
});
test('money precision and invalid transaction references are rejected',()=>{
 assert.equal(parseCents('0.10')+parseCents('0.20'),30);assert.equal(parseCents('-2.05',true),-205);for(const value of ['1.234','NaN','Infinity','1e3','abc'])assert.throws(()=>parseCents(value));
 const data=normalize({accounts:[{id:'a'}]});assert.throws(()=>validateTransaction({type:'transfer',accountId:'a',toAccountId:'a',amountCents:100,date:'2026-09-15'},data));assert.throws(()=>validateTransaction({type:'income',accountId:'x',amountCents:100,date:'2026-09-15'},data));
});
test('migration preserves legacy payments, project metadata as folders, preferences and tasks',()=>{const d=normalize({schemaVersion:4,name:'Kaycee',payments:[{id:'old',amount:3000,paid:true}],projects:[{id:'p',title:'P',status:'On hold'}],tasks:[{id:'t',projectId:'p',progress:40}]});assert.equal(d.payments.length,1);assert.equal(d.folders[0].status,'On Hold');assert.deepEqual(d.accounts,[]);assert.deepEqual(d.transactions,[]);assert.deepEqual(normalize(d),d);});
