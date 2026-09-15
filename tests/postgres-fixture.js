import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
export const USER_A = '00000000-0000-4000-8000-000000000001';
export const USER_B = '00000000-0000-4000-8000-000000000002';
export async function createDatabase() {
  const db = new PGlite();
  await db.exec(`create role authenticated; create role anon; create schema auth;
    create table auth.users(id uuid primary key);
    insert into auth.users values ('${USER_A}'),('${USER_B}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  await db.exec(schema);
  return { db, schema };
}
export async function asUser(db, user, sql, params=[]) {
  return db.transaction(async tx => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [user]);
    return tx.query(sql,params);
  });
}
