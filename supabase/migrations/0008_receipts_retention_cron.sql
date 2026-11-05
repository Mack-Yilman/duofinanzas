-- Ahorro de almacenamiento (plan Free: 1 GB de Storage):
--  1) Caducidad: las constancias con más de 12 meses se eliminan (el gasto/aporte se conserva).
--  2) Mantenimiento semanal con pg_cron: caduca las antiguas y llama a la Edge Function
--     `cleanup-receipts`, que borra del Storage los archivos sin registro (huérfanos).
-- El secreto que autentica al cron ante la Edge Function se GENERA aquí dentro de Vault:
-- nunca existe en el repositorio ni en el navegador.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 1) Caducidad -----------------------------------------------------------------------------
create or replace function private.expire_old_receipts(p_age interval default '12 months')
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.receipts where created_at < now() - p_age;
  get diagnostics v_count = row_count;
  if v_count > 0 then
    insert into public.admin_audit (admin_id, action, detail)
    values (null, 'expire_receipts', jsonb_build_object('removed', v_count, 'older_than', p_age::text));
  end if;
  return v_count;
end $$;
revoke execute on function private.expire_old_receipts(interval) from public, anon, authenticated;

-- 2) Secreto del cron en Vault (idempotente) -----------------------------------------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret',
      'Autentica al job receipts-maintenance ante la Edge Function cleanup-receipts');
  end if;
end $$;

-- La Edge Function (service_role) valida la cabecera x-cron-secret con esta función.
create or replace function public.verify_cron_secret(p_secret text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select s.decrypted_secret = p_secret and length(p_secret) = 64
       from vault.decrypted_secrets s where s.name = 'cron_secret'),
    false)
$$;
revoke execute on function public.verify_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verify_cron_secret(text) to service_role;

-- 3) Job semanal ---------------------------------------------------------------------------
create or replace function private.run_receipts_maintenance()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_secret text;
begin
  perform private.expire_old_receipts();
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
  if v_secret is null then
    raise warning 'cron_secret no existe en Vault; se omite la limpieza de Storage';
    return;
  end if;
  -- La URL del proyecto es pública por diseño.
  perform net.http_post(
    url := 'https://vjglzizutcijcyexcume.supabase.co/functions/v1/cleanup-receipts',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end $$;
revoke execute on function private.run_receipts_maintenance() from public, anon, authenticated;

-- Domingos 08:17 UTC (03:17 en Lima). cron.schedule reemplaza el job si ya existe.
select cron.schedule('receipts-maintenance', '17 8 * * 0', 'select private.run_receipts_maintenance()');
