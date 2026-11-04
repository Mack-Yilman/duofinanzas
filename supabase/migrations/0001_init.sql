-- DúoFinanzas · Esquema inicial para Supabase (Postgres + Auth + RLS)
-- Ejecutar completo en un proyecto NUEVO: Supabase Dashboard → SQL Editor → Run.
--
-- Principios de seguridad:
--  * RLS activo en todas las tablas; cada pareja solo ve/modifica lo suyo.
--  * Permisos mínimos por rol: `anon` no tiene acceso a ninguna tabla.
--  * Funciones SECURITY DEFINER con search_path vacío y nombres calificados.
--  * Las políticas usan (select fn()) para que Postgres evalúe una vez por consulta.

-- ─────────────────────────────────────────────────────────────
-- Tablas
-- ─────────────────────────────────────────────────────────────
create table public.couples (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(name) <= 80),
  base_currency      text not null default 'PEN' check (base_currency in ('PEN','USD','EUR')),
  split_default_mode text not null default 'proportional',
  invite_code        text not null unique,
  fx_rate            numeric(12,4) not null default 3.80 check (fx_rate > 0 and fx_rate < 1000),
  cutoff_day         smallint not null default 1 check (cutoff_day between 1 and 31),
  created_at         timestamptz not null default now()
);

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null default '' check (char_length(name) <= 80),
  email        text not null default '',
  avatar_color text not null default 'indigo' check (avatar_color ~ '^[a-z]{3,10}$'),
  couple_id    uuid references public.couples(id) on delete set null,
  role         text not null default 'member' check (role in ('owner','member')),
  created_at   timestamptz not null default now()
);

-- Administradores de la plataforma. Sin políticas: solo accesible vía funciones.
create table public.app_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Registro de auditoría de acciones de administración.
create table public.admin_audit (
  id          bigint generated always as identity primary key,
  admin_id    uuid references auth.users(id) on delete set null,
  action      text not null,
  target_user uuid,
  detail      jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Funciones auxiliares (usadas por las políticas)
-- ─────────────────────────────────────────────────────────────
create or replace function public.my_couple_id()
returns uuid
language sql stable security definer set search_path = ''
as $$ select p.couple_id from public.profiles p where p.id = auth.uid() $$;

create or replace function public.is_couple_member(uid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.couple_id is not null and p.couple_id = public.my_couple_id()
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.app_admins a where a.user_id = auth.uid()) $$;

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  icon        text not null default '🏷️' check (char_length(icon) <= 16),
  color       text not null default 'blue',
  kind        text not null default 'shared' check (kind in ('shared','personal','both')),
  is_archived boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.incomes (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 120),
  amount         numeric(14,2) not null check (amount >= 0),
  currency       text not null default 'PEN' check (currency in ('PEN','USD','EUR')),
  type           text not null default 'salary' check (type in ('salary','freelance','bonus','other')),
  period         text not null default 'monthly' check (period in ('monthly','one_time')),
  effective_date date not null default current_date,
  is_active      boolean not null default true,
  notes          text not null default '' check (char_length(notes) <= 500),
  created_at     timestamptz not null default now()
);

create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 120),
  amount        numeric(14,2) not null check (amount >= 0),
  currency      text not null default 'PEN' check (currency in ('PEN','USD','EUR')),
  amount_base   numeric(14,2) not null default 0,
  fx_rate       numeric(12,6) not null default 1,
  fx_date       date not null default current_date,
  date          date not null default current_date,
  category_id   uuid references public.categories(id) on delete set null,
  paid_by       uuid references public.profiles(id) on delete set null,
  split_mode    text not null default 'proportional' check (split_mode in ('proportional','equal','custom','owner_100')),
  split_share_a numeric(7,4) not null default 50 check (split_share_a between 0 and 100),
  split_share_b numeric(7,4) not null default 50 check (split_share_b between 0 and 100),
  is_shared     boolean not null default true,
  is_settled    boolean not null default false,
  notes         text not null default '' check (char_length(notes) <= 500),
  created_by    uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);

create table public.goals (
  id                uuid primary key default gen_random_uuid(),
  couple_id         uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 120),
  target_amount     numeric(14,2) not null default 0 check (target_amount >= 0),
  current_amount    numeric(14,2) not null default 0 check (current_amount >= 0),
  currency          text not null default 'PEN' check (currency in ('PEN','USD','EUR')),
  target_date       date,
  contribution_mode text not null default 'proportional',
  icon              text not null default '🎯' check (char_length(icon) <= 16),
  is_achieved       boolean not null default false,
  created_at        timestamptz not null default now()
);

create table public.goal_contributions (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  goal_id    uuid not null references public.goals(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  name       text not null default 'Aporte' check (char_length(name) <= 120),
  amount     numeric(14,2) not null check (amount > 0),
  currency   text not null default 'PEN' check (currency in ('PEN','USD','EUR')),
  date       date not null default current_date,
  created_at timestamptz not null default now()
);

-- Índices: consultas por pareja + claves foráneas (evita seq scans en cascadas)
create index profiles_couple_idx              on public.profiles (couple_id);
create index categories_couple_idx            on public.categories (couple_id);
create index incomes_couple_idx               on public.incomes (couple_id);
create index incomes_user_idx                 on public.incomes (user_id);
create index expenses_couple_date_idx         on public.expenses (couple_id, date desc);
create index expenses_category_idx            on public.expenses (category_id);
create index expenses_paid_by_idx             on public.expenses (paid_by);
create index expenses_created_by_idx          on public.expenses (created_by);
create index goals_couple_idx                 on public.goals (couple_id);
create index goal_contributions_goal_idx      on public.goal_contributions (goal_id);
create index goal_contributions_couple_idx    on public.goal_contributions (couple_id, date);
create index goal_contributions_user_idx      on public.goal_contributions (user_id);
create index admin_audit_admin_idx            on public.admin_audit (admin_id);
create index admin_audit_created_idx          on public.admin_audit (created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)), 80),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantiene goals.current_amount sincronizado con sus aportes (atómico).
create or replace function public.sync_goal_amount()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.goals set current_amount = current_amount + new.amount where id = new.goal_id;
  elsif tg_op = 'DELETE' then
    update public.goals set current_amount = greatest(0, current_amount - old.amount) where id = old.goal_id;
  end if;
  return null;
end $$;

create trigger goal_contributions_sync
  after insert or delete on public.goal_contributions
  for each row execute function public.sync_goal_amount();

-- ─────────────────────────────────────────────────────────────
-- RPCs de onboarding
-- ─────────────────────────────────────────────────────────────
create or replace function public.create_couple(p_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_code text;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if (select couple_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'Ya perteneces a una pareja';
  end if;

  loop
    v_code := 'DUO-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
    exit when not exists (select 1 from public.couples where invite_code = v_code);
  end loop;

  insert into public.couples (name, invite_code)
  values (left(coalesce(nullif(trim(p_name), ''), 'Nuestra pareja'), 80), v_code)
  returning id into v_id;

  update public.profiles set couple_id = v_id, role = 'owner' where id = auth.uid();

  insert into public.categories (couple_id, name, icon, color) values
    (v_id, 'Hogar', '🏠', 'blue'),
    (v_id, 'Comida', '🛒', 'green'),
    (v_id, 'Transporte', '🚗', 'yellow'),
    (v_id, 'Entretenimiento', '🎬', 'purple'),
    (v_id, 'Salud', '🏥', 'red');

  return v_id;
end $$;

create or replace function public.join_couple(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if (select couple_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'Ya perteneces a una pareja';
  end if;

  select id into v_id from public.couples where invite_code = upper(trim(p_code));
  if v_id is null then raise exception 'Código de invitación inválido'; end if;
  if (select count(*) from public.profiles where couple_id = v_id) >= 2 then
    raise exception 'Esta pareja ya está completa';
  end if;

  update public.profiles set couple_id = v_id, role = 'member' where id = auth.uid();
  return v_id;
end $$;

-- ─────────────────────────────────────────────────────────────
-- RPCs de administración (todas verifican is_admin() y quedan auditadas).
-- El admin gestiona CUENTAS; no puede leer los datos financieros de las parejas.
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_assert()
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Acceso denegado' using errcode = '42501'; end if;
end $$;

create or replace function public.admin_log(p_action text, p_target uuid, p_detail jsonb default '{}')
returns void
language sql security definer set search_path = ''
as $$ insert into public.admin_audit (admin_id, action, target_user, detail) values (auth.uid(), p_action, p_target, p_detail) $$;

create or replace function public.admin_list_users()
returns table (
  id uuid, name text, email text, couple_id uuid, couple_name text, role text,
  is_admin boolean, email_confirmed boolean, banned boolean,
  created_at timestamptz, last_sign_in_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.admin_assert();
  return query
    select u.id, coalesce(p.name, ''), u.email::text, p.couple_id, c.name, coalesce(p.role, 'member'),
           exists (select 1 from public.app_admins a where a.user_id = u.id),
           u.email_confirmed_at is not null,
           coalesce(u.banned_until > now(), false),
           u.created_at, u.last_sign_in_at
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.couples c on c.id = p.couple_id
    order by u.created_at desc;
end $$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.admin_assert();
  return jsonb_build_object(
    'users',    (select count(*) from auth.users),
    'couples',  (select count(*) from public.couples),
    'expenses', (select count(*) from public.expenses),
    'active7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days')
  );
end $$;

create or replace function public.admin_set_banned(p_user uuid, p_banned boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.admin_assert();
  if p_user = auth.uid() then raise exception 'No puedes bloquear tu propia cuenta'; end if;
  update auth.users
     set banned_until = case when p_banned then 'infinity'::timestamptz else null end
   where id = p_user;
  if p_banned then
    delete from auth.sessions where user_id = p_user;  -- cierra sus sesiones activas
  end if;
  perform public.admin_log(case when p_banned then 'ban' else 'unban' end, p_user);
end $$;

create or replace function public.admin_remove_from_couple(p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_couple uuid;
begin
  perform public.admin_assert();
  select couple_id into v_couple from public.profiles where id = p_user;
  update public.profiles set couple_id = null, role = 'member' where id = p_user;
  -- Una pareja sin miembros se elimina junto con sus datos.
  if v_couple is not null and not exists (select 1 from public.profiles where couple_id = v_couple) then
    delete from public.couples where id = v_couple;
  end if;
  perform public.admin_log('remove_from_couple', p_user, jsonb_build_object('couple', v_couple));
end $$;

create or replace function public.admin_set_admin(p_user uuid, p_admin boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.admin_assert();
  if p_admin then
    insert into public.app_admins (user_id) values (p_user) on conflict do nothing;
  else
    if p_user = auth.uid() then raise exception 'No puedes quitarte el rol de administrador'; end if;
    delete from public.app_admins where user_id = p_user;
  end if;
  perform public.admin_log(case when p_admin then 'grant_admin' else 'revoke_admin' end, p_user);
end $$;

create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_couple uuid; v_email text;
begin
  perform public.admin_assert();
  if p_user = auth.uid() then raise exception 'No puedes eliminar tu propia cuenta'; end if;
  select p.couple_id, u.email into v_couple, v_email
    from auth.users u left join public.profiles p on p.id = u.id where u.id = p_user;
  delete from auth.users where id = p_user;  -- cascada: perfil, ingresos, aportes
  if v_couple is not null and not exists (select 1 from public.profiles where couple_id = v_couple) then
    delete from public.couples where id = v_couple;
  end if;
  perform public.admin_log('delete_user', p_user, jsonb_build_object('email', v_email));
end $$;

create or replace function public.admin_audit_log(p_limit int default 50)
returns table (id bigint, admin_email text, action text, target_user uuid, detail jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.admin_assert();
  return query
    select l.id, u.email::text, l.action, l.target_user, l.detail, l.created_at
    from public.admin_audit l left join auth.users u on u.id = l.admin_id
    order by l.created_at desc
    limit least(greatest(p_limit, 1), 200);
end $$;

-- ─────────────────────────────────────────────────────────────
-- Permisos de ejecución: nada para anon; solo lo necesario para authenticated.
-- ─────────────────────────────────────────────────────────────
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.my_couple_id(), public.is_couple_member(uuid), public.is_admin(),
  public.create_couple(text), public.join_couple(text),
  public.admin_list_users(), public.admin_stats(), public.admin_set_banned(uuid, boolean),
  public.admin_remove_from_couple(uuid), public.admin_set_admin(uuid, boolean),
  public.admin_delete_user(uuid), public.admin_audit_log(int)
to authenticated;
-- Internas: no invocables por la API.
revoke execute on function public.admin_assert(), public.admin_log(text, uuid, jsonb),
  public.handle_new_user(), public.sync_goal_amount() from authenticated;

-- ─────────────────────────────────────────────────────────────
-- Permisos de tablas + Row Level Security
-- ─────────────────────────────────────────────────────────────
revoke all on all tables in schema public from anon, authenticated;

alter table public.couples            enable row level security;
alter table public.profiles           enable row level security;
alter table public.app_admins         enable row level security;
alter table public.admin_audit        enable row level security;
alter table public.categories         enable row level security;
alter table public.incomes            enable row level security;
alter table public.expenses           enable row level security;
alter table public.goals              enable row level security;
alter table public.goal_contributions enable row level security;

-- couples: leer/editar solo la propia (alta solo vía RPC)
grant select on public.couples to authenticated;
grant update (name, fx_rate, cutoff_day, base_currency, split_default_mode) on public.couples to authenticated;
create policy couples_select on public.couples for select to authenticated
  using (id = (select public.my_couple_id()));
create policy couples_update on public.couples for update to authenticated
  using (id = (select public.my_couple_id())) with check (id = (select public.my_couple_id()));

-- profiles: ver el propio y el de la pareja; editar solo nombre/color
grant select on public.profiles to authenticated;
grant update (name, avatar_color) on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or couple_id = (select public.my_couple_id()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- categories y goals: CRUD dentro de la pareja
grant select, insert, update, delete on public.categories, public.goals to authenticated;
create policy categories_all on public.categories for all to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (couple_id = (select public.my_couple_id()));
create policy goals_all on public.goals for all to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (couple_id = (select public.my_couple_id()));

-- incomes: dentro de la pareja y el dueño debe ser miembro
grant select, insert, update, delete on public.incomes to authenticated;
create policy incomes_all on public.incomes for all to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (couple_id = (select public.my_couple_id()) and public.is_couple_member(user_id));

-- expenses: dentro de la pareja; quien paga y la categoría deben ser de la pareja
grant select, insert, update, delete on public.expenses to authenticated;
create policy expenses_all on public.expenses for all to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (
    couple_id = (select public.my_couple_id())
    and (paid_by is null or public.is_couple_member(paid_by))
    and (category_id is null or exists (
      select 1 from public.categories c where c.id = category_id and c.couple_id = (select public.my_couple_id())
    ))
  );

-- goal_contributions: ver/borrar los de la pareja; crear solo a nombre propio
grant select, insert, delete on public.goal_contributions to authenticated;
create policy contributions_select on public.goal_contributions for select to authenticated
  using (couple_id = (select public.my_couple_id()));
create policy contributions_insert on public.goal_contributions for insert to authenticated
  with check (
    couple_id = (select public.my_couple_id())
    and user_id = (select auth.uid())
    and exists (select 1 from public.goals g where g.id = goal_id and g.couple_id = (select public.my_couple_id()))
  );
create policy contributions_delete on public.goal_contributions for delete to authenticated
  using (couple_id = (select public.my_couple_id()));

-- app_admins / admin_audit: sin políticas → inaccesibles por la API (solo vía RPC).
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;
