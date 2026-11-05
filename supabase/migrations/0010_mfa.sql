-- Verificación en dos pasos (TOTP) opcional.
-- Si un usuario activó MFA, su sesión debe estar en nivel AAL2 (contraseña + código) para ver
-- datos de la pareja o usar funciones de administración. Con solo la contraseña (AAL1) la
-- base de datos le niega el acceso aunque llame a la API directamente: no depende de la UI.
-- Quien no activó MFA no nota ningún cambio.

create or replace function private.mfa_ok()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = (select auth.uid()) and f.status = 'verified'
      )
$$;
revoke execute on function private.mfa_ok() from public, anon;
grant execute on function private.mfa_ok() to authenticated;

-- Todas las políticas de la pareja dependen de esta función: sin AAL2 devuelve null
-- y ninguna fila coincide.
create or replace function private.my_couple_id()
returns uuid
language sql stable security definer set search_path = ''
as $$ select p.couple_id from public.profiles p where p.id = (select auth.uid()) and private.mfa_ok() $$;

-- Administración (admin_assert, is_admin y las Edge Functions que lo consultan).
create or replace function private.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())) and private.mfa_ok() $$;
