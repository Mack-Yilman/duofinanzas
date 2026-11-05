-- Limpieza de constancias huérfanas: archivos del bucket `receipts` sin fila en
-- public.receipts (cuentas o parejas eliminadas). Storage no permite borrar con SQL,
-- así que la Edge Function `cleanup-receipts` obtiene las rutas aquí y las borra
-- con la API de Storage. Ambas funciones son SOLO para service_role.
create or replace function public.orphan_receipt_paths(p_min_age interval default '1 hour')
returns table (name text)
language sql stable security definer set search_path = ''
as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'receipts'
    and o.created_at < now() - p_min_age        -- no tocar subidas en curso
    and not exists (select 1 from public.receipts r where r.path = o.name)
  order by o.created_at
  limit 1000
$$;

create or replace function public.log_system_action(p_admin uuid, p_action text, p_detail jsonb default '{}')
returns void
language sql security definer set search_path = ''
as $$ insert into public.admin_audit (admin_id, action, detail) values (p_admin, p_action, p_detail) $$;

revoke execute on function public.orphan_receipt_paths(interval), public.log_system_action(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.orphan_receipt_paths(interval), public.log_system_action(uuid, text, jsonb)
  to service_role;
