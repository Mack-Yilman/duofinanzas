-- Cumplimiento Ley N.º 29733 (Perú): consentimiento registrado y derechos ARCO.
alter table public.profiles
  add column consent_version text check (char_length(consent_version) <= 20),
  add column consent_at timestamptz;
-- (no se agregan al GRANT UPDATE: solo se escriben vía accept_terms)

create or replace function public.accept_terms(p_version text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if p_version is null or p_version !~ '^[0-9A-Za-z.\-]{1,20}$' then raise exception 'Versión inválida'; end if;
  update public.profiles set consent_version = p_version, consent_at = now() where id = auth.uid();
end $$;

-- Derecho de cancelación: el titular elimina su cuenta y sus datos personales.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_couple uuid; v_email text;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
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

revoke execute on function public.accept_terms(text), public.delete_my_account() from public, anon;
grant execute on function public.accept_terms(text), public.delete_my_account() to authenticated;
