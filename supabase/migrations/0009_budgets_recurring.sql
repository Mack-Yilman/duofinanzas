-- Presupuestos por categoría y gastos recurrentes.
-- Reglas del proyecto: RLS activo, revoke all a anon/authenticated, GRANT mínimo y políticas
-- con (select private.my_couple_id()).

-- 1) Presupuestos ---------------------------------------------------------------------------
-- Un límite mensual (por periodo de corte) por categoría, en la moneda base (PEN).
create table public.budgets (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null default private.my_couple_id() references public.couples(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount      numeric(14,2) not null check (amount > 0 and amount < 1000000000),
  created_at  timestamptz not null default now(),
  constraint budgets_one_per_category unique (couple_id, category_id)
);
create index budgets_category_idx on public.budgets (category_id);

alter table public.budgets enable row level security;
revoke all on public.budgets from anon, authenticated;
grant select, insert, update, delete on public.budgets to authenticated;
grant all on public.budgets to service_role;

create policy budgets_select on public.budgets for select to authenticated
  using (couple_id = (select private.my_couple_id()));
create policy budgets_insert on public.budgets for insert to authenticated
  with check (
    couple_id = (select private.my_couple_id())
    and exists (select 1 from public.categories c
                where c.id = category_id and c.couple_id = (select private.my_couple_id()))
  );
create policy budgets_update on public.budgets for update to authenticated
  using (couple_id = (select private.my_couple_id()))
  with check (
    couple_id = (select private.my_couple_id())
    and exists (select 1 from public.categories c
                where c.id = category_id and c.couple_id = (select private.my_couple_id()))
  );
create policy budgets_delete on public.budgets for delete to authenticated
  using (couple_id = (select private.my_couple_id()));

-- 2) Gastos recurrentes ---------------------------------------------------------------------
-- Plantillas mensuales. La app (navegador) crea el gasto cuando llega `next_date`, con el mismo
-- cálculo de tipo de cambio y reparto que un gasto manual; el índice único evita duplicados
-- si ambos miembros abren la app a la vez.
create table public.recurring_expenses (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null default private.my_couple_id() references public.couples(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  amount       numeric(14,2) not null check (amount > 0 and amount < 1000000000),
  currency     text not null default 'PEN' check (currency in ('PEN','USD','EUR')),
  category_id  uuid references public.categories(id) on delete set null,
  paid_by      uuid not null references public.profiles(id) on delete cascade,
  split_mode   text not null default 'proportional' check (split_mode in ('proportional','equal','custom','owner_100')),
  is_shared    boolean not null default true,
  day_of_month smallint not null check (day_of_month between 1 and 28),
  next_date    date not null,
  is_active    boolean not null default true,
  created_by   uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);
create index recurring_expenses_couple_idx   on public.recurring_expenses (couple_id);
create index recurring_expenses_category_idx on public.recurring_expenses (category_id);
create index recurring_expenses_paid_by_idx  on public.recurring_expenses (paid_by);
create index recurring_expenses_created_idx  on public.recurring_expenses (created_by);

alter table public.recurring_expenses enable row level security;
revoke all on public.recurring_expenses from anon, authenticated;
grant select, insert, update, delete on public.recurring_expenses to authenticated;
grant all on public.recurring_expenses to service_role;

-- Un gasto personal recurrente solo lo ve y gestiona quien lo paga (igual que los gastos).
create policy recurring_select on public.recurring_expenses for select to authenticated
  using (couple_id = (select private.my_couple_id()) and (is_shared or paid_by = (select auth.uid())));
create policy recurring_insert on public.recurring_expenses for insert to authenticated
  with check (
    couple_id = (select private.my_couple_id())
    and private.is_couple_member(paid_by)
    and (category_id is null or exists (select 1 from public.categories c
                where c.id = category_id and c.couple_id = (select private.my_couple_id())))
    and (is_shared or paid_by = (select auth.uid()))
  );
create policy recurring_update on public.recurring_expenses for update to authenticated
  using (couple_id = (select private.my_couple_id()) and (is_shared or paid_by = (select auth.uid())))
  with check (
    couple_id = (select private.my_couple_id())
    and private.is_couple_member(paid_by)
    and (category_id is null or exists (select 1 from public.categories c
                where c.id = category_id and c.couple_id = (select private.my_couple_id())))
    and (is_shared or paid_by = (select auth.uid()))
  );
create policy recurring_delete on public.recurring_expenses for delete to authenticated
  using (couple_id = (select private.my_couple_id()) and (is_shared or paid_by = (select auth.uid())));

-- 3) Vínculo gasto ↔ plantilla ---------------------------------------------------------------
alter table public.expenses
  add column recurring_id uuid references public.recurring_expenses(id) on delete set null;
create unique index expenses_recurring_date_uidx on public.expenses (recurring_id, date)
  where recurring_id is not null;

-- La política de gastos también valida que la plantilla sea de la propia pareja
-- (las FK se comprueban sin RLS y permitirían enlazar un id ajeno).
drop policy expenses_all on public.expenses;
create policy expenses_all on public.expenses for all to authenticated
  using (couple_id = (select private.my_couple_id()))
  with check (
    couple_id = (select private.my_couple_id())
    and (paid_by is null or private.is_couple_member(paid_by))
    and (category_id is null or exists (select 1 from public.categories c
           where c.id = expenses.category_id and c.couple_id = (select private.my_couple_id())))
    and (recurring_id is null or exists (select 1 from public.recurring_expenses r
           where r.id = expenses.recurring_id and r.couple_id = (select private.my_couple_id())))
  );
