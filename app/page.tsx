'use client';
import { useEffect, useState } from 'react';
import { totals, money } from '@/lib/finance';

type Employee = { id: string; name: string; role: string; telegram_user_id?: string; telegram_chat_id?: string };
type Transaction = Record<string, any>;
const initial = { kind: 'sale', reference: '', customer: '', project: 'A', description: '', amount: '', richard: '50', anastasia: '30', jean_claude: '20', category: 'Materials', allocation: 'A' };

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [role, setRole] = useState('');
  const [rows, setRows] = useState<Transaction[]>([]);
  const [form, setForm] = useState<any>(initial);
  const [message, setMessage] = useState('');
  const me = employees.find((employee) => employee.id === role);

  const load = async (viewerId = role) => {
    try {
      const response = await fetch(`/api/data${viewerId ? `?viewer_id=${encodeURIComponent(viewerId)}` : ''}`);
      const data = await response.json();
      if (!response.ok || data.error) return setMessage(data.error || 'Unable to load data.');
      setEmployees(data.employees || []);
      setRows(data.rows || []);
      if (!role && data.employees?.[0]) setRole(data.employees[0].id);
    } catch { setMessage('Unable to connect to the data service.'); }
  };

  useEffect(() => { load(); }, [role]);
  const set = (key: string, value: string) => setForm((current: any) => ({ ...current, [key]: value }));
  const send = async () => {
    const response = await fetch('/api/transactions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, submitter_id: role }) });
    const data = await response.json();
    setMessage(data.error || `Saved ${data.reference}`);
    if (!data.error) { setForm(initial); load(); }
  };
  const decide = async (transaction: Transaction) => {
    const decision = transaction.kind === 'sale'
      ? prompt('Richard / Anastasia / Jean-Claude percentages', `${transaction.proposed_richard}/${transaction.proposed_anastasia}/${transaction.proposed_jean_claude}`)
      : prompt('Final allocation (A, B, Company overhead)', transaction.proposed_allocation);
    if (!decision) return;
    let body: any = { manager_id: role, transaction_id: transaction.id };
    if (transaction.kind === 'sale') { const [richard, anastasia, jeanClaude] = decision.split('/'); body = { ...body, richard, anastasia, jean_claude: jeanClaude }; }
    else body.allocation = decision;
    const response = await fetch('/api/decisions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    setMessage(data.error || `${transaction.reference} approved`);
    load();
  };
  const link = async (employee: Employee) => {
    const telegramUserId = prompt(`Telegram user ID for ${employee.name}`, employee.telegram_user_id || '');
    if (telegramUserId === null) return;
    const telegramChatId = prompt('Telegram chat ID', employee.telegram_chat_id || '');
    const response = await fetch('/api/employees', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ manager_id: role, employee_id: employee.id, telegram_user_id: telegramUserId, telegram_chat_id: telegramChatId }) });
    const data = await response.json();
    setMessage(data.error || 'Telegram account linked');
    load();
  };
  const retry = async (transaction: Transaction, kind: string) => {
    const response = await fetch('/api/retry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: transaction.id, kind }) });
    const data = await response.json();
    setMessage(data.error || 'Retry completed');
    load();
  };
  const financials = totals(rows);
  const fields = me?.role === 'sales'
    ? [['reference', 'Reference'], ['customer', 'Customer'], ['project', 'Project A or B'], ['description', 'Description'], ['amount', 'Amount'], ['richard', 'Richard percent'], ['anastasia', 'Anastasia percent'], ['jean_claude', 'Jean-Claude percent']]
    : [['reference', 'Reference'], ['description', 'Description'], ['category', 'Category'], ['amount', 'Amount'], ['allocation', 'Proposed allocation']];

  return <main>
    <h1>Friends Included finance system</h1>
    <p>Select a demonstration role. Employees can view only their own submissions; Svetlana has the company-wide dashboard.</p>
    <label>Demonstration role <select value={role} onChange={(event) => setRole(event.target.value)}>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.name}</option>)}</select></label>
    <p className="notice">{message}</p>
    {(me?.role === 'sales' || me?.role === 'expense_reporter') && <section><h2>New {me.role === 'sales' ? 'sale' : 'expense'}</h2><div className="form">{fields.map(([key, label]) => <label key={key}>{label}<input value={form[key]} onChange={(event) => set(key, event.target.value)} /></label>)}<button onClick={send}>Submit</button></div></section>}
    {me?.role === 'manager' && <><section><h2>Manager setup</h2>{employees.filter((employee) => employee.id !== role).map((employee) => <article key={employee.id}>{employee.name}: {employee.telegram_user_id || 'not linked'} <button onClick={() => link(employee)}>Link Telegram</button></article>)}</section><section><h2>Pending manager decisions</h2>{rows.filter((transaction) => ['pending_approval', 'awaiting_allocation'].includes(transaction.status)).map((transaction) => <article key={transaction.id}><b>{transaction.reference}</b> — {money(+transaction.amount)} — {transaction.description} <button onClick={() => decide(transaction)}>Review and approve</button></article>)}</section><section><h2>Financial dashboard</h2><div className="cards">{['A', 'B'].map((project) => <div className="card" key={project}><h3>Project {project}</h3><p>Approved income {money(financials[project].income)}</p><p>Commission {money(financials[project].commission)}</p><p>Allocated expenses {money(financials[project].expenses)}</p><b>Result {money(financials[project].result)}</b></div>)}<div className="card"><h3>Company</h3><p>Overhead {money(financials.overhead)}</p><p>Awaiting allocation {money(financials.awaiting)}</p><b>Result {money(financials.company)}</b></div></div><p>Commission earned: Richard {money(financials.people[0])}; Anastasia {money(financials.people[1])}; Jean-Claude {money(financials.people[2])}</p></section></>}
    <section><h2>{me?.role === 'manager' ? 'All records' : 'My records'}</h2>{rows.map((transaction) => <article key={transaction.id}><b>{transaction.reference}</b> · {transaction.status} · {money(+transaction.amount)} · Sheets: {transaction.sync_status}{transaction.sync_status === 'failed' && <button onClick={() => retry(transaction, 'sync')}>Retry Sheets</button>} · Telegram: {transaction.notification_status}{transaction.notification_status === 'failed' && <button onClick={() => retry(transaction, 'notification')}>Retry notification</button>}</article>)}</section>
  </main>;
}
