-- Constancias en imagen (opcionales) para gastos, pagos (liquidaciones) y aportes a metas.
-- Bucket PRIVADO; cada pareja solo accede a la carpeta "<couple_id>/".
-- Nota: Supabase bloquea DELETE directo en storage.objects (trigger protect_delete);
-- por eso los archivos se borran desde la app con la API de Storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table public.receipts (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null default private.my_couple_id() references public.couples(id) on delete cascade,
  uploaded_by     uuid references public.profiles(id) on delete set null default auth.uid(),
  kind            text not null check (kind in ('expense', 'settlement', 'goal_contribution')),
  expense_id      uuid references public.expenses(id) on delete cascade,
  contribution_id uuid references public.goal_contributions(id) on delete cascade,
  path            text not null unique,
  created_at      timestamptz not null default now(),
  constraint receipts_target check (
    (kind in ('expense', 'settlement') and expense_id is not null and contribution_id is null)
    or (kind = 'goal_contribution' and contribution_id is not null and expense_id is null)
  ),
  constraint receipts_path_format check (
    path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|jpeg|png|heic|heif)$'
    and split_part(path, '/', 1) = couple_id::text
  )
);
create index receipts_couple_idx       on public.receipts (couple_id);
create index receipts_expense_idx      on public.receipts (expense_id);
create index receipts_contribution_idx on public.receipts (contribution_id);
create index receipts_uploaded_by_idx  on public.receipts (uploaded_by);

-- Máximo 5 constancias por gasto/aporte (evita abuso de almacenamiento).
create or replace function private.receipts_limit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.receipts r
      where (new.expense_id is not null and r.expense_id = new.expense_id)
         or (new.contribution_id is not null and r.contribution_id = new.contribution_id)) >= 5 then
    raise exception 'Máximo 5 constancias por registro';
  end if;
  return new;
end $$;
revoke execute on function private.receipts_limit() from public, anon, authenticated;
create trigger receipts_limit before insert on public.receipts
  for each row execute function private.receipts_limit();

alter table public.receipts enable row level security;
revoke all on public.receipts from anon, authenticated;
grant select, insert, delete on public.receipts to authenticated;
grant all on public.receipts to service_role;

create policy receipts_select on public.receipts for select to authenticated
  using (couple_id = (select private.my_couple_id()));
create policy receipts_insert on public.receipts for insert to authenticated
  with check (
    couple_id = (select private.my_couple_id())
    and uploaded_by = (select auth.uid())
    and (
      (expense_id is not null and exists (
        select 1 from public.expenses e where e.id = expense_id and e.couple_id = (select private.my_couple_id())))
      or (contribution_id is not null and exists (
        select 1 from public.goal_contributions c where c.id = contribution_id and c.couple_id = (select private.my_couple_id())))
    )
  );
create policy receipts_delete on public.receipts for delete to authenticated
  using (couple_id = (select private.my_couple_id()));

-- Storage: solo la carpeta de la propia pareja
create policy receipts_objects_select on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select private.my_couple_id())::text);
create policy receipts_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select private.my_couple_id())::text);
create policy receipts_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select private.my_couple_id())::text);
