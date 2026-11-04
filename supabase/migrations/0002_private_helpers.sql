-- Endurecimiento tras el análisis de seguridad de Supabase (Database Advisors):
-- los helpers que usan las políticas RLS pasan a un esquema `private` que la API
-- NO expone, así no se pueden invocar vía /rest/v1/rpc.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.my_couple_id()
returns uuid
language sql stable security definer set search_path = ''
as $$ select p.couple_id from public.profiles p where p.id = auth.uid() $$;

create or replace function private.is_couple_member(uid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.couple_id is not null and p.couple_id = private.my_couple_id()
  )
$$;

create or replace function private.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.app_admins a where a.user_id = auth.uid()) $$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

alter table public.categories         alter column couple_id set default private.my_couple_id();
alter table public.incomes            alter column couple_id set default private.my_couple_id();
alter table public.expenses           alter column couple_id set default private.my_couple_id();
alter table public.goals              alter column couple_id set default private.my_couple_id();
alter table public.goal_contributions alter column couple_id set default private.my_couple_id();

drop policy couples_select on public.couples;
drop policy couples_update on public.couples;
create policy couples_select on public.couples for select to authenticated
  using (id = (select private.my_couple_id()));
create policy couples_update on public.couples for update to authenticated
  using (id = (select private.my_couple_id())) with check (id = (select private.my_couple_id()));

drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or couple_id = (select private.my_couple_id()));

drop policy categories_all on public.categories;
create policy categories_all on public.categories for all to authenticated
  using (couple_id = (select private.my_couple_id()))
  with check (couple_id = (select private.my_couple_id()));

drop policy goals_all on public.goals;
create policy goals_all on public.goals for all to authenticated
  using (couple_id = (select private.my_couple_id()))
  with check (couple_id = (select private.my_couple_id()));

drop policy incomes_all on public.incomes;
create policy incomes_all on public.incomes for all to authenticated
  using (couple_id = (select private.my_couple_id()))
  with check (couple_id = (select private.my_couple_id()) and private.is_couple_member(user_id));

drop policy expenses_all on public.expenses;
create policy expenses_all on public.expenses for all to authenticated
  using (couple_id = (select private.my_couple_id()))
  with check (
    couple_id = (select private.my_couple_id())
    and (paid_by is null or private.is_couple_member(paid_by))
    and (category_id is null or exists (
      select 1 from public.categories c where c.id = category_id and c.couple_id = (select private.my_couple_id())
    ))
  );

drop policy contributions_select on public.goal_contributions;
drop policy contributions_insert on public.goal_contributions;
drop policy contributions_delete on public.goal_contributions;
create policy contributions_select on public.goal_contributions for select to authenticated
  using (couple_id = (select private.my_couple_id()));
create policy contributions_insert on public.goal_contributions for insert to authenticated
  with check (
    couple_id = (select private.my_couple_id())
    and user_id = (select auth.uid())
    and exists (select 1 from public.goals g where g.id = goal_id and g.couple_id = (select private.my_couple_id()))
  );
create policy contributions_delete on public.goal_contributions for delete to authenticated
  using (couple_id = (select private.my_couple_id()));

create or replace function public.admin_assert()
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Acceso denegado' using errcode = '42501'; end if;
end $$;
revoke execute on function public.admin_assert() from public, anon, authenticated;

drop function public.is_couple_member(uuid);
drop function public.my_couple_id();
drop function public.is_admin();
-- Wrapper INVOKER (sin privilegios extra) para que la UI sepa si mostrar el panel.
create function public.is_admin()
returns boolean
language sql stable security invoker set search_path = ''
as $$ select private.is_admin() $$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- Cuenta de administrador inicial: tras registrarte en la app, ejecuta
--   insert into public.app_admins (user_id)
--   select id from auth.users where email = 'TU_CORREO' on conflict do nothing;
