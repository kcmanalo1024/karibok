export const CLIENT_TYPES = ['Business', 'Individual', 'Agency', 'Other'];
export const PROJECT_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];
export const ACCOUNT_TYPES = ['Bank', 'E-wallet', 'Cash', 'Savings', 'Other'];
export const EXPENSE_CATEGORIES = ['Food', 'Transportation', 'Shopping', 'Bills', 'School', 'Health', 'Entertainment', 'Work', 'Other'];
export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Allowance', 'Gift', 'Other'];
export function projectSummary(data, projectId) {
  const tasks = data.tasks.filter(t => t.projectId === projectId);
  const completed = tasks.filter(t => t.progress === 100).length;
  return { tasks, total: tasks.length, completed, progress: tasks.length ? Math.round(completed / tasks.length * 100) : null };
}
export function clientSummary(data, clientId) {
  const projects = data.projects.filter(p => p.clientId === clientId);
  const ids = new Set(projects.map(p => p.id));
  const tasks = data.tasks.filter(t => ids.has(t.projectId));
  return { projects, total: projects.length, active: projects.filter(p => !['Completed', 'Cancelled'].includes(p.status)).length,
    completedProjects: projects.filter(p => p.status === 'Completed').length, tasks: tasks.length, completedTasks: tasks.filter(t => t.progress === 100).length };
}
export function parseCents(value, allowNegative = false) {
  const text = String(value).trim();
  if (!(allowNegative ? /^-?\d+(\.\d{1,2})?$/ : /^\d+(\.\d{1,2})?$/).test(text)) throw Error('Use a valid amount with at most two decimal places.');
  const negative = text.startsWith('-');
  const [whole, fraction = ''] = text.replace('-', '').split('.');
  const cents = (Number(whole) * 100 + Number(fraction.padEnd(2, '0'))) * (negative ? -1 : 1);
  if (!Number.isSafeInteger(cents) || Math.abs(cents) > 99999999999) throw Error('The amount is too large.');
  return cents;
}
export function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
export function safeURL(value) { if (!value) return ''; try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
export function validateClient(client) {
  if (!client.name?.trim()) throw Error('Enter a client or business name.');
  if (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) throw Error('Enter a valid email address.');
  if (client.type && !CLIENT_TYPES.includes(client.type)) throw Error('Choose a valid client type.');
}
export function validateProject(project, data) {
  if (!project.title?.trim()) throw Error('Enter a project name.');
  if (project.clientId && !data.clients.some(c => c.id === project.clientId)) throw Error('That client is no longer available.');
  if (!PROJECT_STATUSES.includes(project.status)) throw Error('Choose a valid project status.');
  if ((project.startDate && !validDate(project.startDate)) || (project.deadline && !validDate(project.deadline))) throw Error('Enter valid project dates.');
  if (project.startDate && project.deadline && project.deadline < project.startDate) throw Error('Deadline must be on or after the start date.');
  for (const value of Object.values(project.links || {})) if (value && !safeURL(value)) throw Error('Project links must start with https:// or http://.');
}
export function validateAccount(account) {
  if (!account.name?.trim()) throw Error('Enter an account name.');
  if (!ACCOUNT_TYPES.includes(account.type)) throw Error('Choose a valid account type.');
  if (!Number.isSafeInteger(account.startingBalanceCents) || Math.abs(account.startingBalanceCents) > 99999999999) throw Error('Enter a valid starting balance.');
}
export function validateTransaction(transaction, data) {
  const t = transaction;
  if (!['expense', 'income', 'transfer'].includes(t.type)) throw Error('Choose a transaction type.');
  if (!Number.isSafeInteger(t.amountCents) || t.amountCents <= 0 || t.amountCents > 99999999999) throw Error('Amount must be greater than zero with at most two decimal places.');
  if (!data.accounts.some(a => a.id === t.accountId)) throw Error('Select an account.');
  if (!validDate(t.date)) throw Error('Enter a valid transaction date.');
  if (t.type === 'transfer') {
    if (!data.accounts.some(a => a.id === t.toAccountId)) throw Error('Select a destination account.');
    if (t.toAccountId === t.accountId) throw Error('Choose two different accounts for a transfer.');
  } else {
    if (!t.description?.trim()) throw Error('Enter a purchase description or income source.');
    if (!(t.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).includes(t.category)) throw Error('Select a category.');
  }
}
export function accountBalances(data) {
  const balances = Object.fromEntries(data.accounts.map(a => [a.id, a.startingBalanceCents]));
  for (const t of data.transactions) {
    if (Object.hasOwn(balances, t.accountId)) balances[t.accountId] += t.type === 'income' ? t.amountCents : -t.amountCents;
    if (t.type === 'transfer' && Object.hasOwn(balances, t.toAccountId)) balances[t.toAccountId] += t.amountCents;
  }
  return balances;
}
export function financeSummary(data, month) {
  const balances = accountBalances(data);
  const monthly = data.transactions.filter(t => t.date.slice(0, 7) === month);
  const income = monthly.filter(t => t.type === 'income').reduce((n, t) => n + t.amountCents, 0);
  const expenses = monthly.filter(t => t.type === 'expense').reduce((n, t) => n + t.amountCents, 0);
  const spending = {};
  monthly.filter(t => t.type === 'expense').forEach(t => { spending[t.category] = (spending[t.category] || 0) + t.amountCents; });
  const sumType = type => data.accounts.filter(a => a.type === type).reduce((n, a) => n + balances[a.id], 0);
  return { balances, total: Object.values(balances).reduce((n, value) => n + value, 0), cash: sumType('Cash'), savings: sumType('Savings'), income, expenses, net: income - expenses, spending };
}
export function deletionReason(data, kind, id) {
  if (kind === 'clients' && data.projects.some(p => p.clientId === id)) return 'Reassign or delete this client’s projects before deleting the client.';
  if (kind === 'projects' && (data.tasks.some(t => t.projectId === id) || data.payments.some(p => p.projectId === id))) return 'Reassign or delete linked tasks and payment records before deleting the project.';
  if (kind === 'accounts' && data.transactions.some(t => t.accountId === id || t.toAccountId === id)) return 'Reassign or delete this account’s transactions before deleting the account.';
  return '';
}
export function upsert(data, kind, record) { return { ...data, [kind]: data[kind].some(r => r.id === record.id) ? data[kind].map(r => r.id === record.id ? record : r) : [...data[kind], record] }; }
