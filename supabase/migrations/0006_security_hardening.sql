-- Endurecimiento tras la auditoría de seguridad (security-review):
--  * Serializa las operaciones que podrían dejar la plataforma sin administradores
--    (si app_admins quedara vacía, el trigger permitiría altas sin invitación).
--  * cancel_invitation: la Edge Function revoca la invitación si el correo no se envía.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_couple uuid; v_email text;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
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
  end if;
  insert into public.admin_audit (admin_id, action, target_user, detail)
  values (null, 'self_delete', v_uid, jsonb_build_object('email', v_email));
end $$;

create or replace function public.admin_set_admin(p_user uuid, p_admin boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.admin_assert();
  lock table public.app_admins in share row exclusive mode;
  if p_admin then
    insert into public.app_admins (user_id) values (p_user) on conflict do nothing;
  else
    if p_user = auth.uid() then raise exception 'No puedes quitarte el rol de administrador'; end if;
    if (select count(*) from public.app_admins) <= 1 then raise exception 'Debe quedar al menos un administrador'; end if;
    delete from public.app_admins where user_id = p_user;
  end if;
  perform public.admin_log(case when p_admin then 'grant_admin' else 'revoke_admin' end, p_user);
end $$;

create or replace function public.cancel_invitation(p_email text)
returns void
language sql security definer set search_path = ''
as $$ update public.invitations set revoked_at = now() where email = lower(trim(p_email))::extensions.citext $$;
revoke execute on function public.cancel_invitation(text) from public, anon, authenticated;
grant execute on function public.cancel_invitation(text) to service_role;
