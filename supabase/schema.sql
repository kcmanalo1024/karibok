-- Run once in the Supabase SQL editor. Authentication must be enabled.
-- Workspace snapshots provide an atomic boundary for linked tasks, projects,
-- payments, preferences, and timer state. Revision checks prevent silent overwrites.
create table if not exists public.workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
 revision bigint not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
create policy "Read own workspace" on public.workspaces for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own workspace" on public.workspaces for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own workspace" on public.workspaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.workspaces from anon;
grant select, insert, update on public.workspaces to authenticated;
create or replace function public.save_workspace(expected_revision bigint, workspace_data jsonb)
returns bigint language plpgsql security invoker set search_path = public as $$
declare new_revision bigint;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 if jsonb_typeof(workspace_data) <> 'object' or not (workspace_data ?& array['tasks','categories','projects','clients','payments','sessions']) then
  raise exception 'Invalid workspace';
 end if;
 insert into public.workspaces(user_id,data,revision) values(auth.uid(),'{}',0) on conflict(user_id) do nothing;
 update public.workspaces set data=workspace_data,revision=revision+1,updated_at=now()
 where user_id=auth.uid() and revision=expected_revision returning revision into new_revision;
 if new_revision is null then raise exception 'Workspace changed on another device' using errcode='40001'; end if;
 return new_revision;
end $$;
revoke all on function public.save_workspace(bigint,jsonb) from public, anon;
grant execute on function public.save_workspace(bigint,jsonb) to authenticated;
