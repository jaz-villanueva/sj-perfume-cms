-- Audit trail (FR-17, NFR-7). Runs inside one transaction that is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

-- ------------------------------------------------------------------ setup (as postgres)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner.test@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'staff.test@example.com');
update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-0000000000a1';
insert into public.resellers (business_name, status) values ('Audit Reseller', 'active');

-- ------------------------------------------------------------------ staff makes ordinary changes
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b2"}';

insert into public.products (sku, name, retail_price, reseller_price) values ('AUD-001', 'Audit Perfume', 500, 400);
update public.products set retail_price = 550 where sku = 'AUD-001';
update public.products set retail_price = 550 where sku = 'AUD-001';  -- no real change
select public.record_stock_movement(jsonb_build_object(
  'product_id', (select id from public.products where sku = 'AUD-001'), 'kind', 'stock_in', 'quantity', 10, 'reference', 'DR-1'));
select public.record_sale(jsonb_build_object('channel', 'walk_in', 'lines', jsonb_build_array(
  jsonb_build_object('product_id', (select id from public.products where sku = 'AUD-001'), 'quantity', 2))));
insert into public.customers (name, mobile, email) values ('Private Person', '09990000077', 'private@example.com');

-- A sale is logged when its transaction commits; this makes it happen now, inside the test.
set constraints all immediate;

select is_empty('select * from public.audit_log', 'staff cannot read the audit log');
select throws_ok($$insert into public.audit_log (action, table_name) values ('insert', 'x')$$, '42501', null,
  'staff cannot write audit entries');
reset role;

set local role anon;
select throws_ok('select * from public.audit_log', '42501', null, 'anon cannot read the audit log');
reset role;

-- ------------------------------------------------------------------ what was recorded (as postgres)
select is(
  (select actor_role || ' ' || action || ' ' || record_label from public.audit_log where table_name = 'products' order by id limit 1),
  'staff insert AUD-001 Audit Perfume', 'a new product is logged with who added it');
select is(
  (select actor_id from public.audit_log where table_name = 'products' order by id limit 1),
  '00000000-0000-0000-0000-0000000000b2'::uuid, 'the entry names the acting user');
select is(
  (select old_data::text || ' -> ' || new_data::text from public.audit_log where table_name = 'products' and action = 'update'),
  '{"retail_price": 500.00} -> {"retail_price": 550.00}', 'an edit keeps only the changed values, before and after');
select is((select count(*)::int from public.audit_log where table_name = 'products'), 2,
  'saving without a real change adds no entry');
select is(
  (select new_data ->> 'kind' || ' ' || (new_data ->> 'quantity') from public.audit_log where table_name = 'stock_movements'),
  'stock_in 10', 'a stock-in is logged');
select is((select count(*)::int from public.audit_log where table_name = 'sales'), 1,
  'a sale is logged once, not once per step');
select is(
  (select (new_data ->> 'total') || ' ' || jsonb_array_length(new_data -> 'items') from public.audit_log where table_name = 'sales'),
  '1100.00 1', 'the sale entry has its final total and items');
select is((select count(*)::int from public.audit_log where table_name = 'stock_movements' and new_data ->> 'kind' = 'sale'), 0,
  'the sale''s own stock movements are not logged twice');
select is(
  (select new_data ->> 'name' || ' / ' || (new_data ->> 'mobile') from public.audit_log where table_name = 'customers'),
  '[personal data] / [personal data]', 'customer entries never keep personal details');

-- ------------------------------------------------------------------ owner
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a1"}';

select public.void_sale((select max(id) from public.sales), 'wrong item');
select is(
  (select action || ' ' || actor_role || ' ' || (new_data ->> 'void_reason') from public.audit_log where table_name = 'sales' and action <> 'insert'),
  'void owner wrong item', 'a void is logged as a void, with the reason');
select isnt_empty('select * from public.audit_log', 'the owner can read the audit log');
select throws_ok($$update public.audit_log set action = 'changed'$$, '42501', null, 'the owner cannot edit audit entries');
select throws_ok($$delete from public.audit_log$$, '42501', null, 'the owner cannot delete audit entries');
reset role;

set local role service_role;
set local request.jwt.claims to '{"role": "service_role"}';
select throws_ok($$delete from public.audit_log$$, '42501', null, 'not even the service role can delete audit entries');
reset role;
select throws_ok($$truncate public.audit_log$$, '42501', null, 'the log cannot be emptied');

select * from finish();
rollback;
