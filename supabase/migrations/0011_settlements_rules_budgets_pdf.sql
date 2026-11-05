-- v1.4.0 · Historial de liquidaciones, reglas de categorización, presupuesto por persona y PDF.
-- Reglas del proyecto: RLS activo, revoke all a anon/authenticated, GRANT mínimo y políticas
-- con (select private.my_couple_id()). Las FK se validan contra la propia pareja con `exists`
-- (Postgres comprueba las FK sin RLS).

-- 1) Historial de liquidaciones -------------------------------------------------------------
-- Una fila por moneda y por liquidación: quién pagó a quién, cuánto y cuántos gastos cerró.
-- Es un historial inmutable: sin UPDATE ni DELETE para los usuarios.
create table public.settlements (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null default private.my_couple_id() references public.couples(id) on delete cascade,
  from_user     uuid references public.profiles(id) on delete set null,
  to_user       uuid references public.profiles(id) on delete set null,
  amount        numeric(14,2) not null check (amount >= 0 and amount < 1000000000),
  currency      text not null check (currency in ('PEN','USD','EUR')),
  expense_count integer not null check (expense_count between 1 and 10000),
  created_by    uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  constraint settlements_distinct_users check (from_user is null or to_user is null or from_user <> to_user)
);
create index settlements_couple_idx  on public.settlements (couple_id, created_at desc);
create index settlements_from_idx    on public.settlements (from_user);
create index settlements_to_idx      on public.settlements (to_user);
create index settlements_created_idx on public.settlements (created_by);

alter table public.settlements enable row level security;
revoke all on public.settlements from anon, authenticated;
grant select, insert on public.settlements to authenticated;
grant all on public.settlements to service_role;

create policy settlements_select on public.settlements for select to authenticated
  using (couple_id = (select private.my_couple_id()));
create policy settlements_insert on public.settlements for insert to authenticated
  with check (
    couple_id = (select private.my_couple_id())
    and created_by = (select auth.uid())
    and private.is_couple_member(from_user)
    and private.is_couple_member(to_user)
  );

-- Vínculo gasto ↔ liquidación (la política de gastos lo valida en 0012).
alter table public.expenses
  add column settlement_id uuid references public.settlements(id) on delete set null;
create index expenses_settlement_idx on public.expenses (settlement_id);

-- Registra una liquidación y marca sus gastos en una sola transacción.
-- SECURITY INVOKER: corre con los permisos de quien llama, así que RLS de `settlements` y
-- `expenses` aplica igual que si lo hiciera la app. Falla si algún gasto no es de la pareja,
-- no es compartido, ya estaba liquidado o es de otra moneda.
create or replace function public.record_settlement(
  p_currency text, p_from uuid, p_to uuid, p_amount numeric, p_expense_ids uuid[]
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare v_id uuid; v_n int := coalesce(array_length(p_expense_ids, 1), 0); v_updated int;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if v_n = 0 or v_n > 10000 then raise exception 'Sin gastos que liquidar'; end if;

  insert into public.settlements (from_user, to_user, amount, currency, expense_count)
  values (p_from, p_to, round(p_amount, 2), p_currency, v_n)
  returning id into v_id;

  update public.expenses
     set is_settled = true, settlement_id = v_id
   where id = any (p_expense_ids)
     and is_shared and not is_settled and currency = p_currency;
  get diagnostics v_updated = row_count;

  if v_updated <> v_n then
    raise exception 'Algunos gastos ya no están pendientes. Actualiza la página e inténtalo de nuevo.';
  end if;
  return v_id;
end $$;
revoke execute on function public.record_settlement(text, uuid, uuid, numeric, uuid[]) from public, anon;
grant execute on function public.record_settlement(text, uuid, uuid, numeric, uuid[]) to authenticated;

-- 2) Reglas de categorización al importar -------------------------------------------------
-- "Si la descripción contiene <pattern>, usar <category>". Compartidas por la pareja.
create table public.category_rules (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null default private.my_couple_id() references public.couples(id) on delete cascade,
  pattern     text not null check (char_length(btrim(pattern)) between 2 and 60),
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create unique index category_rules_pattern_uidx on public.category_rules (couple_id, lower(btrim(pattern)));
create index category_rules_category_idx on public.category_rules (category_id);

alter table public.category_rules enable row level security;
revoke all on public.category_rules from anon, authenticated;
grant select, insert, update, delete on public.category_rules to authenticated;
grant all on public.category_rules to service_role;

create policy category_rules_select on public.category_rules for select to authenticated
  using (couple_id = (select private.my_couple_id()));
create policy category_rules_insert on public.category_rules for insert to authenticated
  with check (
    couple_id = (select private.my_couple_id())
    and exists (select 1 from public.categories c
                where c.id = category_id and c.couple_id = (select private.my_couple_id()))
  );
create policy category_rules_update on public.category_rules for update to authenticated
  using (couple_id = (select private.my_couple_id()))
  with check (
    couple_id = (select private.my_couple_id())
    and exists (select 1 from public.categories c
                where c.id = category_id and c.couple_id = (select private.my_couple_id()))
  );
create policy category_rules_delete on public.category_rules for delete to authenticated
  using (couple_id = (select private.my_couple_id()));

-- 3) Presupuesto por persona ----------------------------------------------------------------
-- user_id NULL = presupuesto compartido (cuenta gastos compartidos);
-- user_id = yo  = presupuesto personal (cuenta solo mis gastos personales; nadie más lo ve).
alter table public.budgets
  add column user_id uuid references public.profiles(id) on delete cascade;
alter table public.budgets drop constraint budgets_one_per_category;
alter table public.budgets
  add constraint budgets_one_per_owner unique nulls not distinct (couple_id, category_id, user_id);
create index budgets_user_idx on public.budgets (user_id);

drop policy budgets_select on public.budgets;
drop policy budgets_insert on public.budgets;
drop policy budgets_update on public.budgets;
drop policy budgets_delete on public.budgets;

create policy budgets_select on public.budgets for select to authenticated
  using (couple_id = (select private.my_couple_id())
         and (user_id is null or user_id = (select auth.uid())));
create policy budgets_insert on public.budgets for insert to authenticated
  with check (
    couple_id = (select private.my_couple_id())
    and (user_id is null or user_id = (select auth.uid()))
    and exists (select 1 from public.categories c
                where c.id = category_id and c.couple_id = (select private.my_couple_id()))
  );
create policy budgets_update on public.budgets for update to authenticated
  using (couple_id = (select private.my_couple_id())
         and (user_id is null or user_id = (select auth.uid())))
  with check (
    couple_id = (select private.my_couple_id())
    and (user_id is null or user_id = (select auth.uid()))
    and exists (select 1 from public.categories c
                where c.id = category_id and c.couple_id = (select private.my_couple_id()))
  );
create policy budgets_delete on public.budgets for delete to authenticated
  using (couple_id = (select private.my_couple_id())
         and (user_id is null or user_id = (select auth.uid())));

-- 4) PDF de boletas electrónicas ----------------------------------------------------------
-- Se acepta application/pdf. El bucket baja a 3 MB (imágenes ya comprimidas ≤ ~400 KB;
-- la app limita los PDF a 2 MB).
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'],
       file_size_limit = 3145728
 where id = 'receipts';

alter table public.receipts drop constraint receipts_path_format;
alter table public.receipts add constraint receipts_path_format check (
  path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|jpeg|png|heic|heif|pdf)$'
  and split_part(path, '/', 1) = couple_id::text
);
