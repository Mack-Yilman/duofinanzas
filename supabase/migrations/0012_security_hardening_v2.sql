-- v1.4.0 · Endurecimiento tras la auditoría de seguridad (ver docs/SECURITY-AUDIT.md).

-- 1) Gastos personales: privados también en la base de datos --------------------------------
-- Antes `expenses_all` solo filtraba por pareja: la UI ocultaba los gastos personales del otro,
-- pero la API los devolvía y permitía editarlos o borrarlos.
drop policy expenses_all on public.expenses;

create policy expenses_select on public.expenses for select to authenticated
  using (couple_id = (select private.my_couple_id())
         and (is_shared or paid_by = (select auth.uid())));

create policy expenses_insert on public.expenses for insert to authenticated
  with check (
    couple_id = (select private.my_couple_id())
    and (is_shared or paid_by = (select auth.uid()))
    and (paid_by is null or private.is_couple_member(paid_by))
    and (category_id is null or exists (select 1 from public.categories c
           where c.id = expenses.category_id and c.couple_id = (select private.my_couple_id())))
    and (recurring_id is null or exists (select 1 from public.recurring_expenses r
           where r.id = expenses.recurring_id and r.couple_id = (select private.my_couple_id())))
    and (settlement_id is null or exists (select 1 from public.settlements s
           where s.id = expenses.settlement_id and s.couple_id = (select private.my_couple_id())))
  );

create policy expenses_update on public.expenses for update to authenticated
  using (couple_id = (select private.my_couple_id())
         and (is_shared or paid_by = (select auth.uid())))
  with check (
    couple_id = (select private.my_couple_id())
    and (is_shared or paid_by = (select auth.uid()))
    and (paid_by is null or private.is_couple_member(paid_by))
    and (category_id is null or exists (select 1 from public.categories c
           where c.id = expenses.category_id and c.couple_id = (select private.my_couple_id())))
    and (recurring_id is null or exists (select 1 from public.recurring_expenses r
           where r.id = expenses.recurring_id and r.couple_id = (select private.my_couple_id())))
    and (settlement_id is null or exists (select 1 from public.settlements s
           where s.id = expenses.settlement_id and s.couple_id = (select private.my_couple_id())))
  );

create policy expenses_delete on public.expenses for delete to authenticated
  using (couple_id = (select private.my_couple_id())
         and (is_shared or paid_by = (select auth.uid())));

-- Integridad de los montos derivados (la app los calcula; la BD rechaza valores imposibles).
alter table public.expenses
  add constraint expenses_split_sum check (abs(split_share_a + split_share_b - 100) <= 0.01),
  add constraint expenses_fx_rate_range check (fx_rate > 0 and fx_rate < 100000),
  add constraint expenses_amount_base_range check (amount_base >= 0 and amount_base < 100000000000),
  add constraint expenses_amount_max check (amount < 1000000000);
alter table public.couples
  add constraint couples_split_mode_valid
  check (split_default_mode in ('proportional','equal','custom','owner_100'));
alter table public.categories add constraint categories_color_len check (char_length(color) <= 20);
alter table public.goals add constraint goals_contribution_mode_len check (char_length(contribution_mode) <= 20);

-- `created_by` lo fija la base de datos (antes se aceptaba cualquier miembro de la pareja).
create or replace function private.stamp_created_by()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
  else
    new.created_by := old.created_by;
  end if;
  return new;
end $$;
revoke execute on function private.stamp_created_by() from public, anon, authenticated;
create trigger expenses_stamp_created_by before insert or update on public.expenses
  for each row execute function private.stamp_created_by();
create trigger recurring_stamp_created_by before insert or update on public.recurring_expenses
  for each row execute function private.stamp_created_by();

-- 2) Ingresos: cada uno escribe solo los suyos (la pareja los ve para el reparto) -------------
drop policy incomes_all on public.incomes;
create policy incomes_select on public.incomes for select to authenticated
  using (couple_id = (select private.my_couple_id()));
create policy incomes_insert on public.incomes for insert to authenticated
  with check (couple_id = (select private.my_couple_id()) and user_id = (select auth.uid()));
create policy incomes_update on public.incomes for update to authenticated
  using (couple_id = (select private.my_couple_id()) and user_id = (select auth.uid()))
  with check (couple_id = (select private.my_couple_id()) and user_id = (select auth.uid()));
create policy incomes_delete on public.incomes for delete to authenticated
  using (couple_id = (select private.my_couple_id()) and user_id = (select auth.uid()));

-- 3) Constancias: siguen la visibilidad del gasto -----------------------------------------
-- Las constancias de un gasto personal solo las ve quien lo pagó.
drop policy receipts_select on public.receipts;
drop policy receipts_insert on public.receipts;
drop policy receipts_delete on public.receipts;

create or replace function private.receipt_target_visible(p_expense uuid, p_contribution uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_expense is not null then exists (
      select 1 from public.expenses e
       where e.id = p_expense and e.couple_id = private.my_couple_id()
         and (e.is_shared or e.paid_by = (select auth.uid())))
    when p_contribution is not null then exists (
      select 1 from public.goal_contributions c
       where c.id = p_contribution and c.couple_id = private.my_couple_id())
    else false
  end
$$;
revoke execute on function private.receipt_target_visible(uuid, uuid) from public, anon;
grant execute on function private.receipt_target_visible(uuid, uuid) to authenticated;

create policy receipts_select on public.receipts for select to authenticated
  using (couple_id = (select private.my_couple_id())
         and private.receipt_target_visible(expense_id, contribution_id));
create policy receipts_insert on public.receipts for insert to authenticated
  with check (
    couple_id = (select private.my_couple_id())
    and uploaded_by = (select auth.uid())
    and private.receipt_target_visible(expense_id, contribution_id)
  );
create policy receipts_delete on public.receipts for delete to authenticated
  using (couple_id = (select private.my_couple_id())
         and private.receipt_target_visible(expense_id, contribution_id));

-- 4) Storage: sin listar la carpeta, con formato de nombre y cuota --------------------------
-- Antes cualquier miembro podía listar y descargar todos los archivos de la carpeta de la
-- pareja (incluidas constancias de gastos personales) y subir archivos sin límite.
create or replace function private.receipt_path_visible(p_path text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.receipts r
     where r.path = p_path and r.couple_id = private.my_couple_id()
       and private.receipt_target_visible(r.expense_id, r.contribution_id))
$$;
revoke execute on function private.receipt_path_visible(text) from public, anon;
grant execute on function private.receipt_path_visible(text) to authenticated;

-- Cuota: 500 archivos por pareja y 30 subidas por hora por usuario.
create or replace function private.receipt_quota_ok()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select count(*) from storage.objects o
           where o.bucket_id = 'receipts'
             and (storage.foldername(o.name))[1] = private.my_couple_id()::text) < 500
     and (select count(*) from storage.objects o
           where o.bucket_id = 'receipts' and o.owner_id = (select auth.uid())::text
             and o.created_at > now() - interval '1 hour') < 30
$$;
revoke execute on function private.receipt_quota_ok() from public, anon;
grant execute on function private.receipt_quota_ok() to authenticated;

drop policy receipts_objects_select on storage.objects;
drop policy receipts_objects_insert on storage.objects;
drop policy receipts_objects_delete on storage.objects;

create policy receipts_objects_select on storage.objects for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select private.my_couple_id())::text
    and (owner_id = (select auth.uid())::text or private.receipt_path_visible(name))
  );
create policy receipts_objects_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select private.my_couple_id())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|jpeg|png|heic|heif|pdf)$'
    and private.receipt_quota_ok()
  );
create policy receipts_objects_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select private.my_couple_id())::text
    and (owner_id = (select auth.uid())::text or private.receipt_path_visible(name))
  );

-- 5) MFA también para acciones sobre la propia cuenta --------------------------------------
-- Con MFA activa, solo la contraseña (o un enlace de recuperación) no basta para borrar la
-- cuenta, aceptar términos ni cambiar el perfil.
drop policy profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) and private.mfa_ok())
  with check (id = (select auth.uid()) and private.mfa_ok());

create or replace function public.accept_terms(p_version text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not private.mfa_ok() then raise exception 'Verificación en dos pasos requerida' using errcode = '42501'; end if;
  if p_version is null or p_version !~ '^[0-9A-Za-z.\-]{1,20}$' then raise exception 'Versión inválida'; end if;
  update public.profiles set consent_version = p_version, consent_at = now() where id = auth.uid();
end $$;

-- 6) Código de invitación: rota y se protege contra fuerza bruta ---------------------------
create or replace function private.new_invite_code()
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare v_code text;
begin
  loop
    v_code := 'DUO-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
    exit when not exists (select 1 from public.couples where invite_code = v_code);
  end loop;
  return v_code;
end $$;
revoke execute on function private.new_invite_code() from public, anon, authenticated;

-- Intentos de unión (solo accesible desde funciones; el esquema private no se expone).
create table private.join_attempts (
  id      bigint generated always as identity primary key,
  user_id uuid not null,
  at      timestamptz not null default now()
);
create index join_attempts_user_idx on private.join_attempts (user_id, at);
alter table private.join_attempts enable row level security;
revoke all on private.join_attempts from public, anon, authenticated;

-- Devuelve NULL (sin excepción) si el código no sirve: así el intento queda registrado y el
-- mensaje no revela si el código existe o si la pareja está completa.
create or replace function public.join_couple(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if (select couple_id from public.profiles where id = v_uid) is not null then
    raise exception 'Ya perteneces a una pareja';
  end if;
  delete from private.join_attempts where at < now() - interval '1 day';
  if (select count(*) from private.join_attempts
       where user_id = v_uid and at > now() - interval '1 hour') >= 10 then
    raise exception 'Demasiados intentos. Espera una hora.';
  end if;

  -- Bloquea la fila: dos uniones simultáneas no pueden dejar 3 miembros.
  select id into v_id from public.couples
   where invite_code = upper(btrim(coalesce(p_code, ''))) for update;
  if v_id is null or (select count(*) from public.profiles where couple_id = v_id) >= 2 then
    insert into private.join_attempts (user_id) values (v_uid);
    return null;
  end if;

  update public.profiles set couple_id = v_id, role = 'member' where id = v_uid;
  -- Pareja completa: el código usado deja de servir.
  update public.couples set invite_code = private.new_invite_code() where id = v_id;
  return v_id;
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
  if v_couple is not null and not exists (select 1 from public.profiles where couple_id = v_couple) then
    delete from public.couples where id = v_couple;
  elsif v_couple is not null then
    -- Quien salió no puede volver a entrar con el código que conocía.
    update public.couples set invite_code = private.new_invite_code() where id = v_couple;
  end if;
  perform public.admin_log('remove_from_couple', p_user, jsonb_build_object('couple', v_couple));
end $$;

create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_couple uuid; v_email text;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if not private.mfa_ok() then raise exception 'Verificación en dos pasos requerida' using errcode = '42501'; end if;
  lock table public.app_admins in share row exclusive mode;
  if exists (select 1 from public.app_admins where user_id = v_uid)
     and (select count(*) from public.app_admins) = 1 then
    raise exception 'Eres el único administrador: nombra a otro antes de eliminar tu cuenta';
  end if;
  select p.couple_id, u.email into v_couple, v_email
    from auth.users u left join public.profiles p on p.id = u.id where u.id = v_uid;
  delete from auth.users where id = v_uid;
  update public.invitations set revoked_at = now() where email = lower(v_email)::extensions.citext;
  if v_couple is not null and not exists (select 1 from public.profiles where couple_id = v_couple) then
    delete from public.couples where id = v_couple;
  elsif v_couple is not null then
    update public.couples set invite_code = private.new_invite_code() where id = v_couple;
  end if;
  insert into public.admin_audit (admin_id, action, target_user, detail)
  values (null, 'self_delete', v_uid, jsonb_build_object('email', v_email));
end $$;

-- Permisos de las funciones redefinidas (create or replace conserva los grants; se reafirman).
revoke execute on function public.join_couple(text), public.delete_my_account(), public.accept_terms(text),
  public.admin_remove_from_couple(uuid) from public, anon;
grant execute on function public.join_couple(text), public.delete_my_account(), public.accept_terms(text),
  public.admin_remove_from_couple(uuid) to authenticated;

-- 7) Invitaciones: el límite cuenta envíos, no correos distintos ----------------------------
-- Antes reenviar al mismo correo actualizaba la misma fila y no sumaba al límite de 20/hora.
create or replace function public.prepare_invitation(p_email text, p_admin uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_uid   uuid;
  v_last  timestamptz;
  v_recent int;
begin
  if not exists (select 1 from public.app_admins where user_id = p_admin) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    return jsonb_build_object('status', 'invalid_email');
  end if;

  select count(*) into v_recent from public.admin_audit
   where admin_id = p_admin and action = 'invite' and created_at > now() - interval '1 hour';
  if v_recent >= 20 then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  select id, last_sign_in_at into v_uid, v_last from auth.users where lower(email) = v_email;
  if v_uid is not null and v_last is not null then
    return jsonb_build_object('status', 'already_active');
  end if;

  insert into public.invitations (email, invited_by)
  values (v_email::extensions.citext, p_admin)
  on conflict (email) do update
    set invited_by = excluded.invited_by,
        last_sent_at = now(),
        send_count = public.invitations.send_count + 1,
        revoked_at = null;

  insert into public.admin_audit (admin_id, action, target_user, detail)
  values (p_admin, 'invite', v_uid, jsonb_build_object('email', v_email));

  return jsonb_build_object('status', 'ok', 'pending_user', v_uid);
end $$;
revoke execute on function public.prepare_invitation(text, uuid) from public, anon, authenticated;
grant execute on function public.prepare_invitation(text, uuid) to service_role;

-- 8) Secreto del cron: comparación de resúmenes (no depende de cuántos caracteres coinciden).
create or replace function public.verify_cron_secret(p_secret text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select length(p_secret) = 64
        and extensions.digest(s.decrypted_secret, 'sha256') = extensions.digest(p_secret, 'sha256')
       from vault.decrypted_secrets s where s.name = 'cron_secret'),
    false)
$$;
revoke execute on function public.verify_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verify_cron_secret(text) to service_role;
