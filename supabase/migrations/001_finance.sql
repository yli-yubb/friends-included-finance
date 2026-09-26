create type employee_role as enum ('manager','sales','expense_reporter');
create type transaction_kind as enum ('sale','expense');
create type transaction_status as enum ('pending_approval','awaiting_allocation','recorded_overhead','approved');
create table employees (id uuid primary key default gen_random_uuid(), name text not null unique, role employee_role not null, telegram_user_id text unique, telegram_chat_id text, created_at timestamptz not null default now());
insert into employees(name,role) values ('Svetlana de Monte Carlo','manager'),('Richard Darling','sales'),('Anastasia Ferrari','sales'),('Jean-Claude Bērziņš','sales'),('Kevin von Whatever','expense_reporter');
create table transactions (
 id uuid primary key default gen_random_uuid(), reference text not null unique check(reference ~ '^[SE][0-9]+$'), kind transaction_kind not null, submitter_id uuid not null references employees(id), submitted_at timestamptz not null default now(), notification_chat_id text,
 customer text, project text check(project in ('A','B')), description text not null, amount numeric(12,2) not null check(amount > 0), category text check(category in ('Materials','Travel','Other')),
 proposed_richard numeric(5,2), proposed_anastasia numeric(5,2), proposed_jean_claude numeric(5,2), approved_richard numeric(5,2), approved_anastasia numeric(5,2), approved_jean_claude numeric(5,2),
 proposed_allocation text check(proposed_allocation in ('A','B','Company overhead')), final_allocation text check(final_allocation in ('A','B','Company overhead')), status transaction_status not null,
 decided_at timestamptz, decided_by uuid references employees(id), sync_status text not null default 'pending' check(sync_status in ('pending','synced','failed')), notification_status text not null default 'not_required' check(notification_status in ('not_required','pending','sent','failed'))
);
create or replace function shares_valid(a numeric,b numeric,c numeric) returns boolean language sql immutable as $$ select a between 0 and 100 and b between 0 and 100 and c between 0 and 100 and a+b+c=100 $$;
create or replace function submit_transaction(p jsonb) returns transactions language plpgsql security definer as $$
declare e employees; r transactions;
begin select * into e from employees where id=(p->>'submitter_id')::uuid;
 if e.id is null then raise exception 'Unknown employee'; end if;
 if p->>'kind'='sale' then
  if e.role <> 'sales' then raise exception 'Only salespeople may submit sales'; end if;
  if not shares_valid((p->>'richard')::numeric,(p->>'anastasia')::numeric,(p->>'jean_claude')::numeric) then raise exception 'Commission shares must total 100%%'; end if;
  insert into transactions(reference,kind,submitter_id,notification_chat_id,customer,project,description,amount,proposed_richard,proposed_anastasia,proposed_jean_claude,status,notification_status)
  values(p->>'reference','sale',e.id,coalesce(p->>'chat_id',e.telegram_chat_id),p->>'customer',p->>'project',p->>'description',(p->>'amount')::numeric,(p->>'richard')::numeric,(p->>'anastasia')::numeric,(p->>'jean_claude')::numeric,'pending_approval',case when coalesce(p->>'chat_id',e.telegram_chat_id) is null then 'not_required' else 'pending' end) returning * into r;
 else
  if e.role <> 'expense_reporter' then raise exception 'Only Kevin may submit expenses'; end if;
  insert into transactions(reference,kind,submitter_id,notification_chat_id,description,amount,category,proposed_allocation,final_allocation,status,notification_status)
  values(p->>'reference','expense',e.id,coalesce(p->>'chat_id',e.telegram_chat_id),p->>'description',(p->>'amount')::numeric,p->>'category',p->>'allocation',case when p->>'allocation'='Company overhead' then 'Company overhead' else null end,case when p->>'allocation'='Company overhead' then 'recorded_overhead' else 'awaiting_allocation' end,case when coalesce(p->>'chat_id',e.telegram_chat_id) is null then 'not_required' else 'pending' end) returning * into r;
 end if; return r;
end $$;
create or replace function decide_transaction(p jsonb) returns transactions language plpgsql security definer as $$
declare t transactions; m employees; r transactions;
begin select * into m from employees where id=(p->>'manager_id')::uuid; if m.role <> 'manager' then raise exception 'Only Svetlana may decide transactions'; end if;
 select * into t from transactions where id=(p->>'transaction_id')::uuid for update; if t.decided_at is not null then raise exception 'Transaction already decided'; end if;
 if t.kind='sale' then if not shares_valid((p->>'richard')::numeric,(p->>'anastasia')::numeric,(p->>'jean_claude')::numeric) then raise exception 'Commission shares must total 100%%'; end if;
  update transactions set approved_richard=(p->>'richard')::numeric,approved_anastasia=(p->>'anastasia')::numeric,approved_jean_claude=(p->>'jean_claude')::numeric,status='approved',decided_at=now(),decided_by=m.id,sync_status='pending',notification_status=case when notification_chat_id is null then 'not_required' else 'pending' end where id=t.id returning * into r;
 else update transactions set final_allocation=p->>'allocation',status='approved',decided_at=now(),decided_by=m.id,sync_status='pending',notification_status=case when notification_chat_id is null then 'not_required' else 'pending' end where id=t.id returning * into r; end if; return r;
end $$;
