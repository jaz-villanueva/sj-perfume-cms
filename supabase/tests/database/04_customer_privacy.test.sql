-- Customer privacy (FR-7, NFR-5). Runs inside one transaction that is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

-- ------------------------------------------------------------------ setup (as postgres)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner.test@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'staff.test@example.com');
update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-0000000000a1';
insert into public.products (sku, name, retail_price, reseller_price) values ('PRV-001', 'Privacy Perfume', 300, 250);
update public.product_stock set on_hand = 20 where product_id = (select id from public.products where sku = 'PRV-001');
insert into public.customers (name, mobile, email, address) values ('Maria Clara', '09991112222', 'maria@example.com', 'Ermita');
insert into public.resellers (business_name, contact_person, mobile, status) values ('Privacy Scents', 'Juan Cruz', '09993334444', 'active');

create temp table ids as
select (select id from public.products where sku = 'PRV-001') as p,
       (select id from public.customers where mobile = '09991112222') as c,
       (select id from public.resellers where business_name = 'Privacy Scents') as r;
grant select on ids to anon, authenticated;

-- Filled in later while signed in as the Owner (temporary tables are created here, as postgres,
-- the same way as in 01_sales).
create temp table owner_results (export_doc jsonb, revenue_before text);
grant select, insert on owner_results to authenticated;

-- ------------------------------------------------------------------ staff
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b2"}';

select public.record_sale(jsonb_build_object('channel', 'walk_in', 'customer_id', (select c from ids),
  'lines', jsonb_build_array(jsonb_build_object('product_id', (select p from ids), 'quantity', 2))));
select public.record_sale(jsonb_build_object('channel', 'online', 'customer_id', (select c from ids),
  'lines', jsonb_build_array(jsonb_build_object('product_id', (select p from ids), 'quantity', 1))));
select public.record_sale(jsonb_build_object('channel', 'reseller', 'reseller_id', (select r from ids),
  'lines', jsonb_build_array(jsonb_build_object('product_id', (select p from ids), 'quantity', 4))));

select is((select count(*)::int from public.sales where customer_id = (select c from ids)), 2,
  'staff can list a customer''s sales');
select throws_ok(format('select public.export_data_subject(%L, %s)', 'customer', (select c from ids)), '42501', null,
  'staff cannot export personal data');
select throws_ok(format('select public.anonymize_customer(%s)', (select c from ids)), '42501', null,
  'staff cannot anonymise a customer');
select throws_ok(format('update public.customers set anonymized_at = now() where id = %s', (select c from ids)), '42501', null,
  'staff cannot anonymise by editing the record directly');
reset role;

-- ------------------------------------------------------------------ owner
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a1"}';

insert into owner_results (export_doc, revenue_before)
select public.export_data_subject('customer', (select c from ids)),
       public.dashboard_summary(0, 90) -> 'summary' ->> 'revenue';
select is((select export_doc -> 'record' ->> 'mobile' from owner_results), '09991112222', 'the export has the customer''s details');
select is((select jsonb_array_length(export_doc -> 'sales') from owner_results), 2, 'the export lists the customer''s sales');
select is(
  (select jsonb_array_length(public.export_data_subject('reseller', (select r from ids)) -> 'sales')), 1,
  'a reseller''s data can be exported too');
select throws_ok($$select public.export_data_subject('supplier', 1)$$, 'P0001', 'invalid kind', 'an unknown kind is refused');

select is((public.anonymize_customer((select c from ids)) ->> 'sales_kept')::int, 2, 'the owner can anonymise a customer');
select is(
  (select concat_ws('|', name, mobile, email, address) from public.customers where id = (select c from ids)),
  'Anonymised customer #' || (select c from ids), 'name, mobile, e-mail and address are erased');
select is((select count(*)::int from public.sales where customer_id = (select c from ids)), 2, 'the customer''s sales are kept');
select is((public.dashboard_summary(0, 90) -> 'summary' ->> 'revenue'), (select revenue_before from owner_results),
  'sales totals are unchanged');
select throws_ok(format('select public.anonymize_customer(%s)', (select c from ids)), 'P0001', 'already anonymised',
  'a customer cannot be anonymised twice');
select throws_ok(
  format($$select public.record_sale('{"channel":"walk_in","customer_id":%s,"lines":[{"product_id":%s,"quantity":1}]}')$$,
         (select c from ids), (select p from ids)),
  'P0002', 'customer not found', 'new sales cannot be linked to an anonymised customer');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b2"}';
update public.customers set name = 'Maria Clara' where id = (select c from ids);
reset role;
select is((select name from public.customers where id = (select c from ids)), 'Anonymised customer #' || (select c from ids),
  'an anonymised record cannot be edited back');

select is_empty(
  $$select 1 from public.audit_log
     where (coalesce(old_data::text, '') || coalesce(new_data::text, '') || coalesce(record_label, ''))
           ~ '(Maria|09991112222|maria@example|Ermita|Juan Cruz|09993334444)'$$,
  'no personal details are left in the audit log');

select * from finish();
rollback;
