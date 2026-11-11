-- User accounts (FR-1, FR-2, FR-3, FR-16). Runs inside one transaction that is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- ------------------------------------------------------------------ setup (as postgres)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner.test@example.com', '{"full_name": "Test Owner"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'staff.test@example.com', '{"full_name": "Test Staff"}');
update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-0000000000a1';
insert into public.products (sku, name, retail_price, reseller_price) values ('ACC-001', 'Account Test Perfume', 100, 80);

-- What Supabase Auth does when the admin-users function adds an account for the Owner: insert
-- the user, then save app_metadata (with created_by) in a later step of the same transaction.
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000c3', 'new.staff@example.com', '{"full_name": "New Staff"}',
   '{"provider": "email", "providers": ["email"]}');
update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"created_by": "00000000-0000-0000-0000-0000000000a1"}'
 where id = '00000000-0000-0000-0000-0000000000c3';

-- New-account entries are written at commit; this makes that happen now, inside the test.
set constraints all immediate;

select is((select email from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'),
  'staff.test@example.com', 'a new account copies its e-mail into the profile');
select is((select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000c3'),
  'New Staff', 'a new account takes the name the Owner entered');
select is(
  (select actor_id from public.audit_log where table_name = 'profiles' and action = 'insert'
      and record_id = '00000000-0000-0000-0000-0000000000c3'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'the audit trail names the Owner who created the account');
select is(
  (select count(*)::int from public.audit_log where table_name = 'profiles' and action = 'insert' and actor_id is null
      and record_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2')),
  2, 'accounts added in the Supabase dashboard are logged with no user');

-- ------------------------------------------------------------------ not signed in
set local role anon;
select throws_ok($$select public.update_my_profile('Anyone')$$, '42501', null, 'anon cannot change a profile');
reset role;

-- ------------------------------------------------------------------ staff
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b2"}';

select is(public.update_my_profile('  Staff Renamed ') ->> 'full_name', 'Staff Renamed', 'staff can change their own name');
select throws_ok($$select public.update_my_profile('   ')$$, 'P0001', 'invalid name', 'a blank name is refused');
select is((select count(*)::int from public.profiles), 1, 'staff see only their own profile');
select throws_ok($$update public.profiles set role = 'owner'$$, '42501', null, 'staff cannot change roles directly');
select throws_ok(
  $$select public.admin_apply_account_change('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c3', 'deactivate')$$,
  '42501', null, 'the browser cannot call the account-management function');
reset role;

-- ------------------------------------------------------------------ service role (the admin-users function)
-- Requests made with the service-role key carry no user id.
set local role service_role;
set local request.jwt.claims to '{"role": "service_role"}';

select is((select role from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'owner',
  'the admin-users function can read accounts to check who is calling');
select throws_ok(
  $$select public.admin_apply_account_change('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c3', 'deactivate')$$,
  '42501', 'only the owner can manage accounts', 'the function refuses an actor who is not the Owner');
select throws_ok(
  $$select public.admin_apply_account_change('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'deactivate')$$,
  '42501', 'not a staff account', 'the Owner account cannot be deactivated here');

select is(
  public.admin_apply_account_change('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2',
    'update', 'Staff Edited', 'Staff.Edited@Example.com') ->> 'email',
  'staff.edited@example.com', 'the Owner can edit a Staff name and e-mail');
select is(
  (public.admin_apply_account_change('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 'deactivate') ->> 'is_active')::boolean,
  false, 'the Owner can deactivate a Staff account');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b2"}';
select is(public.is_member(), false, 'a deactivated account loses access on its next request');
select is_empty('select * from public.products', 'a deactivated account reads no data');
reset role;

set local role service_role;
set local request.jwt.claims to '{"role": "service_role"}';
select is(
  (public.admin_apply_account_change('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 'reactivate') ->> 'is_active')::boolean,
  true, 'the Owner can reactivate it');
select lives_ok(
  $$select public.admin_apply_account_change('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 'password_reset')$$,
  'a password reset is recorded');
select isnt(
  public.admin_apply_account_change('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c3', 'delete') ->> 'deleted_at',
  null, 'the Owner can delete a Staff account');
select throws_ok(
  $$select public.admin_apply_account_change('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c3', 'reactivate')$$,
  'P0001', 'account deleted', 'a deleted account cannot be reactivated');
select lives_ok(
  $$select public.admin_apply_account_change('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c3', 'delete')$$,
  'deleting twice is harmless');
reset role;

select is(
  (select array_agg(action order by id)::text from public.audit_log
    where table_name = 'profiles' and record_id = '00000000-0000-0000-0000-0000000000b2'
      and actor_id = '00000000-0000-0000-0000-0000000000a1'),
  '{update,deactivate,reactivate,password_reset}', 'each Owner action on the account is in the audit trail');
select throws_ok(
  $$update public.profiles set deleted_at = now() where id = '00000000-0000-0000-0000-0000000000b2'$$,
  '23514', null, 'a deleted account is always inactive');

select * from finish();
rollback;
