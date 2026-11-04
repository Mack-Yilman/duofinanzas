-- Acceso SOLO por invitación del administrador (defensa en capas).
--  1) Trigger BEFORE INSERT en auth.users: ninguna cuenta se crea sin invitación
--     vigente, aunque el registro público siga activo en el panel de Supabase.
--  2) Las invitaciones solo las crea la Edge Function `admin-invite` (service role)
--     tras verificar que quien llama es administrador.
create extension if not exists citext with schema extensions;

create table public.invitations (
  email        extensions.citext primary key check (char_length(email::text) <= 254),
  invited_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  last_sent_at timestamptz not null default now(),
  send_count   int not null default 1,
  revoked_at   timestamptz
);
create index invitations_invited_by_idx on public.invitations (invited_by, last_sent_at desc);

alter table public.invitations enable row level security;  -- sin políticas: solo vía funciones
revoke all on public.invitations from anon, authenticated;
grant all on public.invitations to service_role;

-- 1) Bloqueo de altas sin invitación
create or replace function private.enforce_invite_only()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Arranque: mientras no exista ningún administrador se permite crear el primero.
  if not exists (select 1 from public.app_admins) then
    return new;
  end if;
  if new.email is null or not exists (
    select 1 from public.invitations i
    where i.email = lower(new.email)::extensions.citext and i.revoked_at is null
  ) then
    raise exception 'El registro es solo por invitación' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger enforce_invite_only
  before insert on auth.users
  for each row execute function private.enforce_invite_only();

-- 2) Preparación de invitación: SOLO service_role (la usa la Edge Function).
--    Valida límites, registra/renueva la invitación y audita.
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

  select count(*) into v_recent from public.invitations
   where invited_by = p_admin and last_sent_at > now() - interval '1 hour';
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

  -- Si existe un usuario que nunca entró (invitación previa), la función lo
  -- recrea para poder reenviar el correo.
  return jsonb_build_object('status', 'ok', 'pending_user', v_uid);
end $$;

revoke execute on function public.prepare_invitation(text, uuid) from public, anon, authenticated;
grant execute on function public.prepare_invitation(text, uuid) to service_role;

-- 3) RPCs para el panel de administración
create or replace function public.admin_list_invitations()
returns table (email text, invited_by_email text, created_at timestamptz, last_sent_at timestamptz,
               send_count int, status text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.admin_assert();
  return query
    select i.email::text, a.email::text, i.created_at, i.last_sent_at, i.send_count,
           case
             when i.revoked_at is not null then 'revoked'
             when u.last_sign_in_at is not null then 'accepted'
             else 'pending'
           end
    from public.invitations i
    left join auth.users a on a.id = i.invited_by
    left join auth.users u on lower(u.email) = i.email::text
    order by i.last_sent_at desc;
end $$;

create or replace function public.admin_revoke_invitation(p_email text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user uuid;
begin
  perform public.admin_assert();
  update public.invitations set revoked_at = now() where email = lower(trim(p_email))::extensions.citext;
  -- Si aún no la aceptó, se elimina la cuenta pendiente: el enlace deja de funcionar.
  select id into v_user from auth.users
   where lower(email) = lower(trim(p_email)) and last_sign_in_at is null;
  if v_user is not null then
    delete from auth.users where id = v_user;
  end if;
  perform public.admin_log('revoke_invitation', v_user, jsonb_build_object('email', lower(trim(p_email))));
end $$;

revoke execute on function public.admin_list_invitations(), public.admin_revoke_invitation(text) from public, anon;
grant execute on function public.admin_list_invitations(), public.admin_revoke_invitation(text) to authenticated;

-- 4) Al eliminar un usuario, su invitación queda revocada (no puede volver a registrarse).
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
  delete from auth.users where id = p_user;
  update public.invitations set revoked_at = now() where email = lower(v_email)::extensions.citext;
  if v_couple is not null and not exists (select 1 from public.profiles where couple_id = v_couple) then
    delete from public.couples where id = v_couple;
  end if;
  perform public.admin_log('delete_user', p_user, jsonb_build_object('email', v_email));
end $$;

revoke execute on function private.enforce_invite_only() from public, anon, authenticated;
