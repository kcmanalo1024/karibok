import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,nextDue,saveTask,analytics,stopTimer,income,shiftDay} from '../src/domain.js';
test('recurrence handles leap years, year boundaries and month ends',()=>{
 assert.equal(nextDue('2026-12-31','daily'),'2027-01-01');
 assert.equal(nextDue('2028-01-31','monthly'),'2028-02-29');
 assert.equal(nextDue('2026-01-31','monthly'),'2026-02-28');
 assert.equal(nextDue('2026-09-15','weekly'),'2026-09-22');
 assert.equal(shiftDay('2026-03-01',-1),'2026-02-28');
});
test('completing a recurring task creates one successor, reopening cannot duplicate it',()=>{
 const task={id:'t',title:'Repeat',category:'School',progress:0,recurrence:'weekly',due:'2026-09-15'};
 let data=normalize({tasks:[task],schemaVersion:4});
 data=saveTask(data,{...task,progress:100},new Date('2026-09-15T12:00:00'));
 assert.equal(data.tasks.length,2);assert.equal(data.tasks[1].due,'2026-09-22');assert.ok(data.tasks[0].completedAt);
 data=saveTask(data,{...data.tasks[0],progress:0});assert.equal(data.tasks[0].completedAt,null);
 data=saveTask(data,{...data.tasks[0],progress:100});assert.equal(data.tasks.length,2);
});
test('migration retains profile and connects existing project labels',()=>{
 const data=normalize({name:'Kaycee',accent:'#112233',tasks:[{id:'1',title:'A',project:'School project',progress:50,category:'School'}]});
 assert.equal(data.name,'Kaycee');assert.equal(data.accent,'#112233');assert.equal(data.folders.length,1);assert.equal(data.tasks[0].folderId,data.folders[0].id);
 assert.deepEqual(normalize(data),data);
});
test('weekly summaries count actual completion timestamps and local-date streaks',()=>{
 const now=new Date('2026-09-15T15:00:00');
 const data=normalize({tasks:[{id:'a',progress:100,completedAt:'2026-09-14T12:00:00'},{id:'b',progress:100,completedAt:'2026-09-15T12:00:00'},{id:'old',progress:100},{id:'c',progress:30,due:'2026-09-10'}],sessions:[{endedAt:'2026-09-15T12:00:00',seconds:900},{endedAt:'2026-09-01T12:00:00',seconds:1800}],schemaVersion:4});
 const a=analytics(data,now);assert.equal(a.start,'2026-09-14');assert.equal(a.completed,2);assert.equal(a.streak,2);assert.equal(a.seconds,900);assert.equal(a.overdue,1);
});
test('timers cap focus duration, preserve paused time and never duplicate sessions',()=>{
 let data=normalize({timer:{id:'timer',kind:'focus',startedAt:1000,elapsed:10,duration:60},schemaVersion:4});
 data=stopTimer(data,120000,true);assert.equal(data.sessions[0].seconds,60);assert.equal(data.timer,null);assert.equal(stopTimer(data,140000).sessions.length,1);
 const paused=stopTimer(normalize({timer:{id:'paused',kind:'tracker',startedAt:null,elapsed:35},schemaVersion:4}),999999);assert.equal(paused.sessions[0].seconds,35);
});
test('income totals reflect paid and unpaid records',()=>{assert.deepEqual(income([{amount:500,paid:true},{amount:750.50,paid:false}]),{billed:1250.5,paid:500,unpaid:750.5});});
