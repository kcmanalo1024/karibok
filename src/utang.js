import { validDate } from './v4.js';
export const debtStatus=d=>{const paid=d.repayments.reduce((s,p)=>s+p.amountCents,0);return {paid,remaining:d.amountCents-paid,status:paid===d.amountCents?'Paid':paid?'Partially Paid':'Unpaid',progress:Math.round(paid/d.amountCents*100)};};
export function validateDebt(d,data){
 if(!['receivable','payable'].includes(d.direction)||!d.person?.trim()||!d.reason?.trim())throw Error('Enter a person, direction and reason.');
 if(!Number.isSafeInteger(d.amountCents)||d.amountCents<=0||d.amountCents>99999999999)throw Error('Enter a positive amount.');
 if(!validDate(d.date)||d.dueDate&&(!validDate(d.dueDate)||d.dueDate<d.date))throw Error('Enter valid dates; due date cannot precede borrowing.');
 if(d.accountId&&!data.accounts.some(a=>a.id===d.accountId))throw Error('Select an existing account.');
 if(!Array.isArray(d.repayments))throw Error('Invalid repayments.');
 const ids=new Set();for(const p of d.repayments){if(!p.id||ids.has(p.id))throw Error('Duplicate repayment.');ids.add(p.id);if(!Number.isSafeInteger(p.amountCents)||p.amountCents<=0||!validDate(p.date)||p.date<d.date||!data.accounts.some(a=>a.id===p.accountId))throw Error('Enter a positive repayment, valid date and account.');}
 if(debtStatus(d).remaining<0)throw Error('Repayment cannot exceed the remaining amount.');
}
export function debtBalanceEffects(data,balances){for(const d of data.utang||[]){const sign=d.direction==='receivable'?-1:1;if(d.accountId&&Object.hasOwn(balances,d.accountId))balances[d.accountId]+=sign*d.amountCents;for(const p of d.repayments)if(Object.hasOwn(balances,p.accountId))balances[p.accountId]-=sign*p.amountCents;}}
export function debtSummary(data,today){let owedToMe=0,iOwe=0,overdue=0,unpaid=0;for(const d of data.utang||[]){const {remaining}=debtStatus(d);if(d.direction==='receivable')owedToMe+=remaining;else iOwe+=remaining;if(remaining>0){unpaid++;if(d.dueDate&&d.dueDate<today)overdue+=remaining;}}return {owedToMe,iOwe,overdue,unpaid};}
