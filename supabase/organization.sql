-- Additive validation for the existing per-user JSON workspace. No new tables or RLS changes.
begin;
create or replace function public.check_karibok_organization()
returns trigger language plpgsql security invoker set search_path=public as $$
declare doc jsonb:=new.data; kind text; item jsonb; parent jsonb;
begin
 if tg_op='UPDATE' and old.data->>'organizationVersion'='1' and coalesce(doc->>'organizationVersion','')<>'1' then
  raise exception 'Update KARIBOK before saving this workspace' using errcode='23514';
 end if;
 if doc->>'organizationVersion' is distinct from '1' then return new; end if;
 foreach kind in array array['folders','notes','tasks','readNotifications'] loop
  if jsonb_typeof(doc->kind) is distinct from 'array' then raise exception 'Invalid organization collection: %',kind using errcode='23514'; end if;
 end loop;
 foreach kind in array array['folders','notes','tasks'] loop
  for item in select * from jsonb_array_elements(doc->kind) loop
   if jsonb_typeof(item->'id') is distinct from 'string' or btrim(item->>'id')='' then raise exception 'Record ID required' using errcode='23514'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(doc->kind) r group by r->>'id' having count(*)>1) then raise exception 'Duplicate organization record' using errcode='23514'; end if;
 end loop;
 for item in select * from jsonb_array_elements(doc->'folders') loop
  if btrim(coalesce(item->>'name',''))='' then raise exception 'Folder name required' using errcode='23514'; end if;
  if coalesce(item->>'parentId','')<>'' then
   select f into parent from jsonb_array_elements(doc->'folders') f where f->>'id'=item->>'parentId';
   if parent is null or coalesce(parent->>'parentId','')<>'' or parent->>'id'=item->>'id' then raise exception 'Only one subfolder level is allowed' using errcode='23514'; end if;
   if coalesce(parent->>'deletedAt','')<>'' and coalesce(item->>'deletedAt','')='' then raise exception 'Active subfolder has trashed parent' using errcode='23514'; end if;
  end if;
 end loop;
 foreach kind in array array['tasks','notes','payments'] loop
  for item in select * from jsonb_array_elements(doc->kind) loop
   if coalesce(item->>'folderId','')<>'' and not exists(select 1 from jsonb_array_elements(doc->'folders') f where f->>'id'=item->>'folderId') then raise exception 'Missing folder' using errcode='23503'; end if;
   if kind in ('tasks','notes') and coalesce(item->>'deletedAt','')='' and exists(select 1 from jsonb_array_elements(doc->'folders') f where f->>'id'=item->>'folderId' and coalesce(f->>'deletedAt','')<>'') then raise exception 'Active record has trashed folder' using errcode='23514'; end if;
   if coalesce(item->>'clientId','')<>'' and not exists(select 1 from jsonb_array_elements(doc->'clients') c where c->>'id'=item->>'clientId') then raise exception 'Missing client' using errcode='23503'; end if;
  end loop;
 end loop;
 return new;
end $$;
revoke all on function public.check_karibok_organization() from public,anon,authenticated;
drop trigger if exists validate_organization on public.workspaces;
create trigger validate_organization before insert or update of data on public.workspaces for each row execute function public.check_karibok_organization();
commit;
