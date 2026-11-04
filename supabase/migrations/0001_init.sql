-- DúoFinanzas · Esquema inicial para Supabase (Postgres + Auth + RLS)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotencia: pensado para un proyecto nuevo.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Tablas
-- ─────────────────────────────────────────────────────────────
create table public.couples (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  base_currency      text not null default 'PEN' check (base_currency in ('PEN','USD','EUR')),
  split_default_mode text not null default 'proportional',
  invite_code        text not null unique,
  fx_rate            numeric(12,4) not null default 3.80 check (fx_rate > 0),
  cutoff_day         smallint not null default 1 check (cutoff_day between 1 and 31),
  created_at         timestamptz not null default now()
);

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null default '',
  email        text not null default '',
  avatar_color text not null default 'indigo',
  couple_id    uuid references public.couples(id) on delete set null,
  role         text not null default 'member' check (role in ('owner','member')),
  created_at   timestamptz not null default now()
);

-- Devuelve la pareja del usuario autenticado. SECURITY DEFINER evita recursión de RLS.
create or replace function public.my_couple_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select couple_id from public.profiles where id = auth.uid() $$;

-- ¿El usuario indicado pertenece a mi pareja?
create or replace function public.is_couple_member(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and couple_id is not null and couple_id = public.my_couple_id()
  )
$$;

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  name        text not null,
  icon        text not null default '🏷️',
  color       text not null default 'blue',
  kind        text not null default 'shared' check (kind in ('shared','personal','both')),
  is_archived boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.incomes (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  name           text not null,
  amount         numeric(14,2) not null check (amount >= 0),
  currency       text not null default 'PEN' check (currency in ('PEN','USD','EUR')),
  type           text not null default 'salary' check (type in ('salary','freelance','bonus','other')),
  period         text not null default 'monthly' check (period in ('monthly','one_time')),
  effective_date date not null default current_date,
  is_active      boolean not null default true,
  notes          text not null default '',
  created_at     timestamptz not null default now()
);

create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  name          text not null,
  amount        numeric(14,2) not null check (amount >= 0),
  currency      text not null default 'PEN' check (currency in ('PEN','USD','EUR')),
  amount_base   numeric(14,2) not null default 0,
  fx_rate       numeric(12,6) not null default 1,
  fx_date       date not null default current_date,
  date          date not null default current_date,
  category_id   uuid references public.categories(id) on delete set null,
  paid_by       uuid references public.profiles(id) on delete set null,
  split_mode    text not null default 'proportional' check (split_mode in ('proportional','equal','custom','owner_100')),
  split_share_a numeric(7,4) not null default 50,
  split_share_b numeric(7,4) not null default 50,
  is_shared     boolean not null default true,
  is_settled    boolean not null default false,
  notes         text not null default '',
  created_by    uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);

create table public.goals (
  id                uuid primary key default gen_random_uuid(),
  couple_id         uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  name              text not null,
  target_amount     numeric(14,2) not null default 0,
  current_amount    numeric(14,2) not null default 0,
  currency          text not null default 'PEN' check (currency in ('PEN','USD','EUR')),
  target_date       date,
  contribution_mode text not null default 'proportional',
  icon              text not null default '🎯',
  is_achieved       boolean not null default false,
  created_at        timestamptz not null default now()
);

create table public.goal_contributions (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null default public.my_couple_id() references public.couples(id) on delete cascade,
  goal_id    uuid not null references public.goals(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  name       text not null default 'Aporte',
  amount     numeric(14,2) not null check (amount > 0),
  currency   text not null default 'PEN' check (currency in ('PEN','USD','EUR')),
  date       date not null default current_date,
  created_at timestamptz not null default now()
);

-- Índices para las consultas habituales
create index on public.profiles (couple_id);
create index on public.categories (couple_id);
create index on public.incomes (couple_id);
create index on public.expenses (couple_id, date desc);
create index on public.goals (couple_id);
create index on public.goal_contributions (goal_id);
create index on public.goal_contributions (couple_id, date);

-- ─────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────

-- Crea el perfil automáticamente al registrarse (nombre desde user_metadata).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantiene goals.current_amount sincronizado con sus aportes (atómico, sin carreras).
create or replace function public.sync_goal_amount()
returns trigger
language plpgsql security definer set search_path = public
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
-- RPCs de onboarding (no se expone la búsqueda por código de invitación)
-- ─────────────────────────────────────────────────────────────
create or replace function public.create_couple(p_name text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
  v_code text;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if (select couple_id from profiles where id = auth.uid()) is not null then
    raise exception 'Ya perteneces a una pareja';
  end if;

  loop
    v_code := 'DUO-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    exit when not exists (select 1 from couples where invite_code = v_code);
  end loop;

  insert into couples (name, invite_code) values (coalesce(nullif(trim(p_name), ''), 'Nuestra pareja'), v_code)
  returning id into v_id;

  update profiles set couple_id = v_id, role = 'owner' where id = auth.uid();

  insert into categories (couple_id, name, icon, color) values
    (v_id, 'Hogar', '🏠', 'blue'),
    (v_id, 'Comida', '🛒', 'green'),
    (v_id, 'Transporte', '🚗', 'yellow'),
    (v_id, 'Entretenimiento', '🎬', 'purple'),
    (v_id, 'Salud', '🏥', 'red');

  return v_id;
end $$;

create or replace function public.join_couple(p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if (select couple_id from profiles where id = auth.uid()) is not null then
    raise exception 'Ya perteneces a una pareja';
  end if;

  select id into v_id from couples where invite_code = upper(trim(p_code));
  if v_id is null then raise exception 'Código de invitación inválido'; end if;
  if (select count(*) from profiles where couple_id = v_id) >= 2 then
    raise exception 'Esta pareja ya está completa';
  end if;

  update profiles set couple_id = v_id, role = 'member' where id = auth.uid();
  return v_id;
end $$;

revoke all on function public.create_couple(text) from public, anon;
revoke all on function public.join_couple(text) from public, anon;
grant execute on function public.create_couple(text) to authenticated;
grant execute on function public.join_couple(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security: cada pareja SOLO ve y modifica sus datos
-- ─────────────────────────────────────────────────────────────
alter table public.couples            enable row level security;
alter table public.profiles           enable row level security;
alter table public.categories         enable row level security;
alter table public.incomes            enable row level security;
alter table public.expenses           enable row level security;
alter table public.goals              enable row level security;
alter table public.goal_contributions enable row level security;

-- couples: leer/editar solo la propia (alta solo vía RPC)
create policy couples_select on public.couples for select to authenticated
  using (id = public.my_couple_id());
create policy couples_update on public.couples for update to authenticated
  using (id = public.my_couple_id()) with check (id = public.my_couple_id());
revoke update on public.couples from authenticated;
grant update (name, fx_rate, cutoff_day, base_currency, split_default_mode) on public.couples to authenticated;

-- profiles: ver el propio y el de la pareja; editar solo nombre/color (nunca couple_id/role)
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or (couple_id is not null and couple_id = public.my_couple_id()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (name, avatar_color) on public.profiles to authenticated;

-- categories y goals: CRUD dentro de la pareja
create policy categories_all on public.categories for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
create policy goals_all on public.goals for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());

-- incomes: dentro de la pareja y el dueño debe ser miembro
create policy incomes_all on public.incomes for all to authenticated
  using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id() and public.is_couple_member(user_id));

-- expenses: dentro de la pareja; quien paga debe ser miembro
create policy expenses_all on public.expenses for all to authenticated
  using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id() and (paid_by is null or public.is_couple_member(paid_by)));

-- goal_contributions: ver los de la pareja; crear solo a nombre propio y en metas de la pareja
create policy contributions_select on public.goal_contributions for select to authenticated
  using (couple_id = public.my_couple_id());
create policy contributions_insert on public.goal_contributions for insert to authenticated
  with check (
    couple_id = public.my_couple_id()
    and user_id = auth.uid()
    and exists (select 1 from public.goals g where g.id = goal_id and g.couple_id = public.my_couple_id())
  );
create policy contributions_delete on public.goal_contributions for delete to authenticated
  using (couple_id = public.my_couple_id());
