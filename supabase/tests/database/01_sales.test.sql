-- Sales, stock and access rules (FR-2, FR-7, FR-9, NFR-5 single-session part).
-- Runs inside one transaction that is rolled back, so it leaves no data behind.
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- ------------------------------------------------------------------ setup (as postgres)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner.test@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'staff.test@example.com');
update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-0000000000a1';

insert into public.products (sku, name, retail_price, reseller_price, reorder_level)
values ('TEST-001', 'Test Perfume', 850.00, 680.00, 1), ('TEST-002', 'Test Mist', 100.10, 80.00, 1);
update public.product_stock set on_hand = 2 where product_id = (select id from public.products where sku = 'TEST-001');
update public.product_stock set on_hand = 50 where product_id = (select id from public.products where sku = 'TEST-002');
insert into public.product_costs (product_id, cost_price) select id, 500 from public.products where sku = 'TEST-001';
insert into public.resellers (business_name, status) values ('Test Reseller', 'active'), ('Old Reseller', 'inactive');

create temp table ids as
select (select id from public.products where sku = 'TEST-001') as p1,
       (select id from public.products where sku = 'TEST-002') as p2,
       (select id from public.resellers where business_name = 'Test Reseller') as r_active,
       (select id from public.resellers where business_name = 'Old Reseller') as r_old;
grant select on ids to anon, authenticated;

select is((select role from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'), 'staff',
  'a new account gets a profile with the staff role');

-- ------------------------------------------------------------------ not signed in
set local role anon;
select throws_ok('select * from public.sales', '42501', null, 'anon cannot read sales');
select throws_ok('select * from public.customers', '42501', null, 'anon cannot read customers');
select throws_ok($$select public.record_sale('{"channel":"walk_in","lines":[]}')$$, '42501', null, 'anon cannot record a sale');
reset role;

-- ------------------------------------------------------------------ staff
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b2"}';

select is((select count(*)::int from public.products where sku like 'TEST-%'), 2, 'staff can read products');
select is_empty('select * from public.product_costs', 'staff cannot see cost prices');
select throws_ok($$insert into public.sales (sale_no, channel, total) values ('X', 'walk_in', 1)$$, '42501', null,
  'staff cannot write sales directly');
select throws_ok($$update public.product_stock set on_hand = 999$$, '42501', null, 'staff cannot change stock directly');

select is(
  (public.record_sale(jsonb_build_object('channel', 'walk_in', 'lines', jsonb_build_array(
     jsonb_build_object('product_id', (select p1 from ids), 'quantity', 1),
     jsonb_build_object('product_id', (select p1 from ids), 'quantity', 1))))) ->> 'total',
  '1700.00', 'repeated lines are added together and priced at retail');
select is((select on_hand from public.product_stock where product_id = (select p1 from ids)), 0, 'the sale deducts stock');
select is((select sum(quantity)::int from public.stock_movements where product_id = (select p1 from ids) and kind = 'sale'), -2,
  'the sale writes stock movements');

select throws_ok(
  format($$select public.record_sale('{"channel":"walk_in","lines":[{"product_id":%s,"quantity":5},{"product_id":%s,"quantity":1}]}')$$,
         (select p2 from ids), (select p1 from ids)),
  'P0001', 'insufficient stock', 'a sale beyond the stock on hand is refused');
select is((select on_hand from public.product_stock where product_id = (select p2 from ids)), 50,
  'a refused sale saves nothing, not even the lines that had stock');

select is(
  (public.record_sale(jsonb_build_object('channel', 'reseller', 'reseller_id', (select r_active from ids), 'lines',
     jsonb_build_array(jsonb_build_object('product_id', (select p2 from ids), 'quantity', 3))))) ->> 'total',
  '240.00', 'reseller sales use the reseller price');
select throws_ok(
  format($$select public.record_sale('{"channel":"reseller","reseller_id":%s,"lines":[{"product_id":%s,"quantity":1}]}')$$,
         (select r_old from ids), (select p2 from ids)),
  'P0001', 'invalid reseller', 'an inactive reseller is refused');
select throws_ok(
  format($$select public.record_sale('{"channel":"online","lines":[{"product_id":%s,"quantity":1.5}]}')$$, (select p2 from ids)),
  'P0001', 'invalid line', 'fractional quantities are refused');

select throws_ok(
  format('select public.void_sale(%s, %L)', (select max(id) from public.sales), 'mistake'),
  '42501', null, 'staff cannot void a sale');

insert into public.customers (name, mobile) values ('Test Customer', '09990000001');
select throws_ok($$insert into public.customers (name, mobile) values ('Copy', '09990000001')$$, '23505', null,
  'a duplicate mobile number is refused');
select throws_ok($$insert into public.customers (name, mobile) values ('No Mobile', null)$$, '23514', null,
  'a customer needs a mobile number');
select throws_ok($$insert into public.customers (name, mobile) values ('Bad', '12345')$$, '23514', null,
  'the mobile number must be stored as 09XXXXXXXXX');

-- ------------------------------------------------------------------ owner
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a1"}';

select isnt_empty('select * from public.product_costs', 'the owner can see cost prices');
select is(
  public.void_sale((select min(s.id) from public.sales s join public.sale_items i on i.sale_id = s.id where i.product_id = (select p1 from ids)), 'customer returned it') ->> 'status',
  'voided', 'the owner can void a sale');
select is((select on_hand from public.product_stock where product_id = (select p1 from ids)), 2, 'voiding returns the stock');
select throws_ok(
  format('select public.void_sale(%s, %L)', (select min(s.id) from public.sales s join public.sale_items i on i.sale_id = s.id where i.product_id = (select p1 from ids)), 'again'),
  'P0001', 'already voided', 'a sale cannot be voided twice');

reset role;
select * from finish();
rollback;
