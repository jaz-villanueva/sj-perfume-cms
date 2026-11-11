-- Name the Owner on the audit entry for a new account (FR-17).
--
-- The admin-users function passes the Owner's id in app_metadata.created_by (only the service
-- role can set app_metadata). Supabase Auth inserts the user first and saves app_metadata in a
-- later step of the same transaction, so the insert trigger never saw created_by and the entry
-- said "System". The entry for a new profile is now written when the transaction commits, when
-- created_by is in place. Accounts added in the Supabase dashboard have no created_by and stay
-- "System".

-- The insert trigger no longer needs to look for the creator.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id,
          coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
          new.email);
  return new;
end;
$$;

create function public.audit_profile_created() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb;
  v_created_by text;
  v_previous text := current_setting('app.actor_id', true);
begin
  select to_jsonb(p) into v_row from public.profiles p where p.id = new.id;
  if v_row is null then
    return null;
  end if;

  select u.raw_app_meta_data ->> 'created_by' into v_created_by from auth.users u where u.id = new.id;
  if coalesce(v_created_by, '') ~ '^[0-9a-fA-F-]{36}$' then
    perform set_config('app.actor_id', v_created_by, true);
  end if;

  perform public.write_audit_entry('insert', 'profiles', new.id::text, v_row ->> 'full_name', null, v_row);
  perform set_config('app.actor_id', coalesce(v_previous, ''), true);
  return null;
end;
$$;

drop trigger profiles_audit on public.profiles;
create trigger profiles_audit after update on public.profiles
  for each row execute function public.audit_row_change();
create constraint trigger profiles_audit_insert after insert on public.profiles
  deferrable initially deferred
  for each row execute function public.audit_profile_created();

revoke execute on function public.audit_profile_created() from public, anon, authenticated, service_role;
