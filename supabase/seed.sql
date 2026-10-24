-- Demo data for local development and the staging project. Loaded by `supabase db reset`;
-- on staging, run it once in the SQL Editor after the migrations.
-- Synthetic data only: real client records must never be committed to this public repository.

-- Products, with opening stock recorded as stock-in movements.
insert into public.products (sku, name, brand, scent_family, size_ml, description, retail_price, reseller_price, reorder_level, show_in_catalog)
values
  ('SJ-000101', 'Rose Velvet Eau de Parfum', 'SJ Signature', 'Floral', 50, 'Soft rose with a velvet musk base.', 850.00, 680.00, 5, true),
  ('SJ-000102', 'Ocean Breeze Eau de Toilette', 'SJ Signature', 'Fresh', 100, 'Clean marine notes for everyday wear.', 1200.00, 960.00, 5, true),
  ('SJ-000103', 'Vanilla Musk Eau de Parfum', 'SJ Signature', 'Gourmand', 30, 'Warm vanilla and white musk.', 550.00, 440.00, 5, true),
  ('SJ-000104', 'Citrus Bloom Body Mist', 'SJ Daily', 'Citrus', 250, 'Light citrus mist.', 350.00, 280.00, 10, true),
  ('SJ-000105', 'Oud Noir Extrait', 'SJ Signature', 'Woody', 50, 'Deep oud and amber.', 1850.00, 1480.00, 3, true),
  ('SJ-000106', 'Sakura Mist Eau de Toilette', 'SJ Daily', 'Floral', 100, 'Cherry blossom and pear.', 650.00, 520.00, 5, true)
on conflict (sku) do nothing;

insert into public.stock_movements (product_id, kind, quantity, reason, reference)
select p.id, 'stock_in', s.qty, 'Opening stock', 'OPENING'
  from (values ('SJ-000101', 30), ('SJ-000102', 20), ('SJ-000103', 6), ('SJ-000104', 60), ('SJ-000105', 4), ('SJ-000106', 25)) as s(sku, qty)
  join public.products p on p.sku = s.sku
 where not exists (select 1 from public.stock_movements m where m.product_id = p.id and m.reference = 'OPENING');

update public.product_stock ps
   set on_hand = (select coalesce(sum(m.quantity), 0) from public.stock_movements m where m.product_id = ps.product_id);

insert into public.resellers (business_name, contact_person, mobile, address, status, consent_at)
select * from (values
  ('Scents by Mia', 'Mia Torres', '09171110001', 'Pasig City', 'active', now()),
  ('Aroma Corner QC', 'Paolo Lim', '09171110002', 'Quezon City', 'active', now()),
  ('Fragrance Hub', 'Grace Uy', '09171110003', 'Manila', 'inactive', now())
) as r(business_name, contact_person, mobile, address, status, consent_at)
where not exists (select 1 from public.resellers);

insert into public.customers (name, mobile, email, address, preferred_channel, consent_at)
values
  ('Ana Reyes', '09171234567', 'ana.reyes@example.com', 'Malate, Manila', 'walk_in', now() - interval '20 days'),
  ('Carlo Mendoza', '09181112222', null, 'Pasay City', 'online', now() - interval '18 days'),
  ('Bea Santos', '09223334444', 'bea.s@example.com', null, 'online', now() - interval '15 days'),
  ('Diego Ramos', '09335556666', null, 'Quezon City', 'walk_in', now() - interval '12 days'),
  ('Ella Cruz', '09457778888', 'ella.cruz@example.com', 'Makati City', 'online', now() - interval '10 days')
on conflict (mobile) do nothing;

-- A week and a half of past sales, so the dashboard and sales list are not empty.
-- Same steps as record_sale, but with a past date and no signed-in user.
create function pg_temp.seed_sale(p_days_ago integer, p_channel text, p_customer text, p_reseller text, p_lines jsonb)
returns void language plpgsql as $$
declare
  v_sale_id bigint;
  v_sale_no text := 'S-' || to_char(now() at time zone 'Asia/Manila', 'YYYY') || '-' || lpad(nextval('public.sale_no_seq')::text, 6, '0');
begin
  insert into public.sales (sale_no, sold_at, channel, customer_id, reseller_id)
  values (v_sale_no, now() - make_interval(days => p_days_ago, hours => 2),
          p_channel,
          (select id from public.customers where mobile = p_customer),
          (select id from public.resellers where business_name = p_reseller))
  returning id into v_sale_id;

  insert into public.sale_items (sale_id, product_id, quantity, unit_price)
  select v_sale_id, p.id, (l ->> 'qty')::integer,
         case when p_channel = 'reseller' then p.reseller_price else p.retail_price end
    from jsonb_array_elements(p_lines) l
    join public.products p on p.sku = l ->> 'sku';

  insert into public.stock_movements (product_id, kind, quantity, reference, sale_id, created_at)
  select i.product_id, 'sale', -i.quantity, v_sale_no, v_sale_id, now() - make_interval(days => p_days_ago, hours => 2)
    from public.sale_items i where i.sale_id = v_sale_id;

  update public.product_stock s set on_hand = s.on_hand - i.quantity
    from public.sale_items i where i.sale_id = v_sale_id and s.product_id = i.product_id;

  update public.sales set total = (select sum(line_total) from public.sale_items where sale_id = v_sale_id)
   where id = v_sale_id;
end;
$$;

do $$
begin
  if exists (select 1 from public.sales) then
    return;
  end if;
  perform pg_temp.seed_sale(10, 'walk_in', '09171234567', null, '[{"sku": "SJ-000101", "qty": 1}]');
  perform pg_temp.seed_sale(9, 'reseller', null, 'Scents by Mia', '[{"sku": "SJ-000102", "qty": 5}, {"sku": "SJ-000104", "qty": 10}]');
  perform pg_temp.seed_sale(8, 'online', '09181112222', null, '[{"sku": "SJ-000104", "qty": 2}]');
  perform pg_temp.seed_sale(6, 'walk_in', null, null, '[{"sku": "SJ-000106", "qty": 1}, {"sku": "SJ-000103", "qty": 1}]');
  perform pg_temp.seed_sale(5, 'online', '09223334444', null, '[{"sku": "SJ-000101", "qty": 2}]');
  perform pg_temp.seed_sale(4, 'reseller', null, 'Aroma Corner QC', '[{"sku": "SJ-000101", "qty": 6}, {"sku": "SJ-000106", "qty": 6}]');
  perform pg_temp.seed_sale(3, 'walk_in', '09335556666', null, '[{"sku": "SJ-000105", "qty": 1}]');
  perform pg_temp.seed_sale(2, 'online', '09457778888', null, '[{"sku": "SJ-000102", "qty": 1}, {"sku": "SJ-000104", "qty": 3}]');
  perform pg_temp.seed_sale(1, 'walk_in', '09171234567', null, '[{"sku": "SJ-000103", "qty": 2}]');
  perform pg_temp.seed_sale(0, 'reseller', null, 'Scents by Mia', '[{"sku": "SJ-000104", "qty": 12}]');
end;
$$;
