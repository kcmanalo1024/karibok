-- Idempotent upgrade for the existing KARIBOK workspace model.
-- No records are copied or deleted. Each user's linked entities remain one atomic snapshot.
begin;
create table if not exists public.workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
 revision bigint not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
drop policy if exists "Read own workspace" on public.workspaces;
drop policy if exists "Insert own workspace" on public.workspaces;
drop policy if exists "Update own workspace" on public.workspaces;
create policy "Read own workspace" on public.workspaces for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own workspace" on public.workspaces for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own workspace" on public.workspaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.workspaces from public, anon, authenticated;
grant select, insert, update on public.workspaces to authenticated;

-- Enforce references and centavo-based ledger data on RPC and direct REST writes.
create or replace function public.check_karibok_workspace()
returns trigger language plpgsql security invoker set search_path = public as $$
declare doc jsonb := new.data; collection text; item jsonb; field text; cents numeric; value text;
begin
 if jsonb_typeof(doc) is distinct from 'object' then raise exception 'Invalid workspace' using errcode='23514'; end if;
 foreach collection in array array['clients','projects','tasks','payments','sessions','categories'] loop
  if jsonb_typeof(doc->collection) is distinct from 'array' then raise exception 'Missing workspace collection: %',collection using errcode='23514'; end if;
 end loop;
 foreach collection in array array['accounts','transactions','utang'] loop
  if doc ? collection and jsonb_typeof(doc->collection) is distinct from 'array' then raise exception 'Invalid %',collection using errcode='23514'; end if;
  if tg_op='UPDATE' and not (doc ? collection) and jsonb_array_length(coalesce(old.data->collection,'[]'))>0 then
   raise exception 'Upgrade this client before saving finance data' using errcode='23514';
  end if;
 end loop;
 foreach collection in array array['clients','projects','tasks','payments','accounts','transactions','utang'] loop
  for item in select * from jsonb_array_elements(coalesce(doc->collection,'[]')) loop
   if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'id') is distinct from 'string' or btrim(coalesce(item->>'id',''))='' then raise exception 'Invalid record in %',collection using errcode='23514'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(coalesce(doc->collection,'[]')) r group by r->>'id' having count(*)>1) then raise exception 'Duplicate record in %',collection using errcode='23514'; end if;
 end loop;
 for item in select * from jsonb_array_elements(doc->'clients') loop
  if jsonb_typeof(item->'name') is distinct from 'string' or btrim(item->>'name')='' then raise exception 'Client name required' using errcode='23514'; end if;
  if coalesce(item->>'email','')<>'' and (item->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid client email' using errcode='23514'; end if;
  if coalesce(item->>'type','')<>'' and item->>'type' not in ('Business','Individual','Agency','Other') then raise exception 'Invalid client type' using errcode='23514'; end if;
 end loop;
 for item in select * from jsonb_array_elements(doc->'projects') loop
  if jsonb_typeof(item->'title') is distinct from 'string' or btrim(item->>'title')='' then raise exception 'Project name required' using errcode='23514'; end if;
  if item->>'status' is null or item->>'status' not in ('Not Started','In Progress','On Hold','Completed','Cancelled','Not started','In progress','On hold') then raise exception 'Invalid project status' using errcode='23514'; end if;
  if coalesce(item->>'clientId','')<>'' and not exists(select 1 from jsonb_array_elements(doc->'clients') c where c->>'id'=item->>'clientId') then raise exception 'Project references missing client' using errcode='23503'; end if;
  foreach field in array array['startDate','deadline'] loop
   value:=coalesce(item->>field,'');
   if value<>'' and (value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (value::date)::text<>value) then raise exception 'Invalid project date' using errcode='23514'; end if;
  end loop;
  if coalesce(item->>'startDate','')<>'' and coalesce(item->>'deadline','')<>'' and item->>'deadline'<item->>'startDate' then raise exception 'Project deadline precedes start' using errcode='23514'; end if;
  if item ? 'links' then
   if jsonb_typeof(item->'links') is distinct from 'object' then raise exception 'Invalid project links' using errcode='23514'; end if;
   for value in select jsonb_each_text.value from jsonb_each_text(item->'links') loop
    if value<>'' and value !~ '^https?://[^[:space:]]+$' then raise exception 'Project links must use HTTP or HTTPS' using errcode='23514'; end if;
   end loop;
  end if;
 end loop;
 foreach collection in array array['tasks','payments'] loop
  for item in select * from jsonb_array_elements(doc->collection) loop
   if coalesce(item->>'projectId','')<>'' and not exists(select 1 from jsonb_array_elements(doc->'projects') p where p->>'id'=item->>'projectId') then raise exception 'Record references missing project' using errcode='23503'; end if;
  end loop;
 end loop;
 for item in select * from jsonb_array_elements(coalesce(doc->'accounts','[]')) loop
  if jsonb_typeof(item->'name') is distinct from 'string' or btrim(item->>'name')='' then raise exception 'Account name required' using errcode='23514'; end if;
  if item->>'type' is null or item->>'type' not in ('Bank','E-wallet','Cash','Savings','Other') then raise exception 'Invalid account type' using errcode='23514'; end if;
  if jsonb_typeof(item->'startingBalanceCents') is distinct from 'number' or item->>'startingBalanceCents' !~ '^-?[0-9]+$' then raise exception 'Starting balance must be integer centavos' using errcode='23514'; end if;
  if abs((item->>'startingBalanceCents')::numeric)>99999999999 then raise exception 'Starting balance out of range' using errcode='23514'; end if;
 end loop;
 for item in select * from jsonb_array_elements(coalesce(doc->'transactions','[]')) loop
  if item->>'type' is null or item->>'type' not in ('expense','income','transfer') then raise exception 'Invalid transaction type' using errcode='23514'; end if;
  if jsonb_typeof(item->'amountCents') is distinct from 'number' or item->>'amountCents' !~ '^[0-9]+$' then raise exception 'Amount must be integer centavos' using errcode='23514'; end if;
  cents:=(item->>'amountCents')::numeric;
  if cents<=0 or cents>99999999999 then raise exception 'Amount out of range' using errcode='23514'; end if;
  if not coalesce((item->>'type'='expense' and item->>'paymentMethod'='COD' and item->'paymentRecorded'='false'::jsonb),false) and not exists(select 1 from jsonb_array_elements(coalesce(doc->'accounts','[]')) a where a->>'id'=item->>'accountId') then raise exception 'Transaction references missing account' using errcode='23503'; end if;
  value:=coalesce(item->>'date','');
  if value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (value::date)::text<>value then raise exception 'Invalid transaction date' using errcode='23514'; end if;
  if item->>'type'='transfer' then
   if item->>'accountId'=item->>'toAccountId' then raise exception 'Transfer accounts must differ' using errcode='23514'; end if;
   if not exists(select 1 from jsonb_array_elements(coalesce(doc->'accounts','[]')) a where a->>'id'=item->>'toAccountId') then raise exception 'Transfer references missing destination' using errcode='23503'; end if;
  else
   if jsonb_typeof(item->'description') is distinct from 'string' or btrim(item->>'description')='' then raise exception 'Transaction description required' using errcode='23514'; end if;
   if item->>'category' is null or (item->>'type'='expense' and item->>'category' not in ('Food','Transportation','Shopping','Bills','School','Health','Entertainment','Work','Other')) or (item->>'type'='income' and item->>'category' not in ('Salary','Freelance','Allowance','Gift','Other')) then raise exception 'Invalid transaction category' using errcode='23514'; end if;
   if coalesce(item->>'toAccountId','')<>'' then raise exception 'Only transfers have a destination account' using errcode='23514'; end if;
  end if;
 end loop;
 return new;
end $$;
revoke all on function public.check_karibok_workspace() from public, anon, authenticated;
drop trigger if exists validate_karibok_workspace on public.workspaces;
create trigger validate_karibok_workspace before insert or update of data on public.workspaces for each row execute function public.check_karibok_workspace();

create or replace function public.save_workspace(expected_revision bigint, workspace_data jsonb)
returns bigint language plpgsql security invoker set search_path = public as $$
declare new_revision bigint;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if expected_revision=0 then
  insert into public.workspaces(user_id,data,revision) values(auth.uid(),workspace_data,1) on conflict(user_id) do nothing returning revision into new_revision;
  if new_revision is not null then return new_revision; end if;
 end if;
 update public.workspaces set data=workspace_data,revision=revision+1,updated_at=now()
 where user_id=auth.uid() and revision=expected_revision returning revision into new_revision;
 if new_revision is null then raise exception 'Workspace changed on another device' using errcode='40001'; end if;
 return new_revision;
end $$;
revoke all on function public.save_workspace(bigint,jsonb) from public, anon;
grant execute on function public.save_workspace(bigint,jsonb) to authenticated;


create or replace function public.check_karibok_finance_extensions()
returns trigger language plpgsql security invoker set search_path=public as $$
declare d jsonb; p jsonb; a jsonb; total numeric; val text;
begin
 for a in select * from jsonb_array_elements(coalesce(new.data->'accounts','[]')) loop
  if a ? 'color' and (jsonb_typeof(a->'color') is distinct from 'string' or a->>'color' !~ '^#[0-9a-fA-F]{6}$') then raise exception 'Invalid account color' using errcode='23514'; end if;
 end loop;
 for d in select * from jsonb_array_elements(coalesce(new.data->'transactions','[]')) loop
  if d->>'type'='expense' and coalesce(d->>'paymentMethod','')<>'' then
   if d->>'paymentMethod' not in ('Cash','Bank','E-wallet','COD','Online Payment','Other') then raise exception 'Invalid payment method' using errcode='23514'; end if;
   if d->>'paymentMethod'='Other' and btrim(coalesce(d->>'customPaymentMethod',''))='' then raise exception 'Specify payment method' using errcode='23514'; end if;
   if d->>'paymentMethod'='COD' then
    if jsonb_typeof(d->'paymentRecorded') is distinct from 'boolean' then raise exception 'COD payment state required' using errcode='23514'; end if;
    if d->'paymentRecorded'='false'::jsonb and coalesce(d->>'accountId','')<>'' then raise exception 'Unpaid COD cannot reference account' using errcode='23514'; end if;
   end if;
   if d->>'paymentMethod' in ('Cash','Bank','E-wallet') and not exists(select 1 from jsonb_array_elements(new.data->'accounts') x where x->>'id'=d->>'accountId' and x->>'type'=d->>'paymentMethod') then raise exception 'Account does not match payment method' using errcode='23514'; end if;
  end if;
 end loop;
 for d in select * from jsonb_array_elements(coalesce(new.data->'utang','[]')) loop
  if coalesce(d->>'direction','') not in ('receivable','payable') or btrim(coalesce(d->>'person',''))='' or btrim(coalesce(d->>'reason',''))='' then raise exception 'Invalid Utang details' using errcode='23514'; end if;
  if jsonb_typeof(d->'amountCents') is distinct from 'number' or d->>'amountCents' !~ '^[0-9]+$' then raise exception 'Invalid Utang amount' using errcode='23514'; end if;
  if (d->>'amountCents')::numeric<=0 or (d->>'amountCents')::numeric>99999999999 then raise exception 'Invalid Utang amount' using errcode='23514'; end if;
  val:=coalesce(d->>'date','');if val !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (val::date)::text<>val then raise exception 'Invalid Utang date' using errcode='23514'; end if;
  val:=coalesce(d->>'dueDate','');if val<>'' and (val !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (val::date)::text<>val or val<d->>'date') then raise exception 'Invalid due date' using errcode='23514'; end if;
  if coalesce(d->>'accountId','')<>'' and not exists(select 1 from jsonb_array_elements(new.data->'accounts') x where x->>'id'=d->>'accountId') then raise exception 'Missing lending account' using errcode='23503'; end if;
  if jsonb_typeof(d->'repayments') is distinct from 'array' then raise exception 'Repayments must be an array' using errcode='23514'; end if;
  total:=0;
  for p in select * from jsonb_array_elements(d->'repayments') loop
   if jsonb_typeof(p->'id') is distinct from 'string' or btrim(p->>'id')='' then raise exception 'Invalid repayment ID' using errcode='23514'; end if;
   if jsonb_typeof(p->'amountCents') is distinct from 'number' or p->>'amountCents' !~ '^[0-9]+$' then raise exception 'Invalid repayment amount' using errcode='23514'; end if;
   if (p->>'amountCents')::numeric<=0 then raise exception 'Repayment must be positive' using errcode='23514'; end if;
   total:=total+(p->>'amountCents')::numeric;
   val:=coalesce(p->>'date','');if val !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (val::date)::text<>val or val<d->>'date' then raise exception 'Invalid repayment date' using errcode='23514'; end if;
   if not exists(select 1 from jsonb_array_elements(new.data->'accounts') x where x->>'id'=p->>'accountId') then raise exception 'Missing repayment account' using errcode='23503'; end if;
  end loop;
  if total>(d->>'amountCents')::numeric then raise exception 'Repayment exceeds remaining Utang' using errcode='23514'; end if;
  if exists(select 1 from jsonb_array_elements(d->'repayments') x group by x->>'id' having count(*)>1) then raise exception 'Duplicate repayment' using errcode='23514'; end if;
 end loop;
 return new;
end $$;
revoke all on function public.check_karibok_finance_extensions() from public,anon,authenticated;
drop trigger if exists validate_finance_extensions on public.workspaces;
create trigger validate_finance_extensions before insert or update of data on public.workspaces for each row execute function public.check_karibok_finance_extensions();

commit;
