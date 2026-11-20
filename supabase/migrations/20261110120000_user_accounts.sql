-- User accounts (FR-3, FR-16; shared foundation).
--
-- The Owner manages Staff accounts through the admin-users Edge Function, which holds the
-- service-role key. That function changes the sign-in side (Supabase Auth) and calls
-- admin_apply_account_change below for the profile side, passing the Owner's id so the audit
-- trail (next migration) records who made each change.
--
-- Accounts are never hard-deleted: past sales and audit entries point at them (FR-16). A
-- deleted account is soft-deleted in Supabase Auth and marked here with deleted_at.

alter table public.profiles
  add column email text,
  add column deleted_at timestamptz,
  add constraint profiles_deleted_is_inactive check (deleted_at is null or not is_active);

comment on column public.profiles.email is 'Sign-in e-mail, copied from auth.users so the Owner can list accounts without the service-role key.';
comment on column public.profiles.deleted_at is 'Set when the Owner deletes the account. The row stays so history keeps its name.';

update public.profiles p set email = u.email from auth.users u where u.id = p.id;

-- New accounts: copy the e-mail too. When the admin-users function creates the account it puts
-- the Owner's id in app_metadata.created_by (only the service role can set app_metadata), and
-- that becomes the actor of the audit entry for the new profile.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'created_by', '') ~ '^[0-9a-fA-F-]{36}$' then
    perform set_config('app.actor_id', new.raw_app_meta_data ->> 'created_by', true);
  end if;
  insert into public.profiles (id, full_name, email)
  values (new.id,
          coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
          new.email);
  return new;
end;
$$;

-- Any signed-in user changes their own display name (FR-3: Staff manage only their own
-- profile). Passwords are changed with supabase.auth.updateUser in the browser.
create function public.update_my_profile(p_full_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_full_name, ''));
  v_row public.profiles;
begin
  if not public.is_member() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_name = '' or length(v_name) > 100 then
    raise exception 'invalid name' using hint = 'Enter a name of 1 to 100 characters.';
  end if;
  update public.profiles set full_name = v_name where id = auth.uid() returning * into v_row;
  return jsonb_build_object('id', v_row.id, 'full_name', v_row.full_name);
end;
$$;

-- Profile side of the Owner's account actions. Service role only: the admin-users function
-- calls it after checking the caller's sign-in, and passes the caller as p_actor. It checks
-- again that the actor is an active Owner and that the target is a Staff account.
--
--   update          p_full_name (required), p_email (optional, already changed in Auth)
--   deactivate      is_active = false
--   reactivate      is_active = true (not for deleted accounts)
--   delete          is_active = false, deleted_at = now(); repeating it is harmless
--   password_reset  no profile change; writes an audit entry (the password itself is never stored)
create function public.admin_apply_account_change(
  p_actor uuid, p_user_id uuid, p_action text, p_full_name text default null, p_email text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_target public.profiles;
  v_name text := btrim(coalesce(p_full_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if not exists (select 1 from public.profiles a
                  where a.id = p_actor and a.role = 'owner' and a.is_active and a.deleted_at is null) then
    raise exception 'only the owner can manage accounts' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('update', 'deactivate', 'reactivate', 'delete', 'password_reset') then
    raise exception 'invalid action' using hint = 'Unknown account action.';
  end if;

  -- The audit trigger on profiles reads this to name the Owner as the actor.
  perform set_config('app.actor_id', p_actor::text, true);

  select * into v_target from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'account not found' using errcode = 'P0002', hint = 'Account not found.';
  end if;
  if v_target.role <> 'staff' then
    raise exception 'not a staff account' using errcode = '42501', hint = 'Only Staff accounts can be managed here.';
  end if;
  if v_target.deleted_at is not null and p_action <> 'delete' then
    raise exception 'account deleted' using hint = 'This account was deleted and can no longer be changed.';
  end if;

  if p_action = 'update' then
    if v_name = '' or length(v_name) > 100 then
      raise exception 'invalid name' using hint = 'Enter a name of 1 to 100 characters.';
    end if;
    if v_email <> '' and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
      raise exception 'invalid email' using hint = 'Enter a valid e-mail address.';
    end if;
    update public.profiles
       set full_name = v_name, email = coalesce(nullif(v_email, ''), email)
     where id = p_user_id returning * into v_target;
  elsif p_action = 'deactivate' then
    update public.profiles set is_active = false where id = p_user_id returning * into v_target;
  elsif p_action = 'reactivate' then
    update public.profiles set is_active = true where id = p_user_id returning * into v_target;
  elsif p_action = 'delete' then
    if v_target.deleted_at is null then
      update public.profiles set is_active = false, deleted_at = now() where id = p_user_id returning * into v_target;
    end if;
  elsif p_action = 'password_reset' then
    perform public.write_audit_entry('password_reset', 'profiles', p_user_id::text, v_target.full_name, null, null);
  end if;

  return jsonb_build_object(
    'id', v_target.id, 'full_name', v_target.full_name, 'email', v_target.email, 'role', v_target.role,
    'is_active', v_target.is_active, 'deleted_at', v_target.deleted_at, 'created_at', v_target.created_at);
end;
$$;

-- Access. update_my_profile: any signed-in user (it checks the role itself).
-- admin_apply_account_change: the service role only, never the browser.
revoke execute on function public.update_my_profile(text) from public, anon;
grant execute on function public.update_my_profile(text) to authenticated;
revoke execute on function public.admin_apply_account_change(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_apply_account_change(uuid, uuid, text, text, text) to service_role;
