-- Base tables for the MVP: user roles (shared), a minimal products / stock / resellers set
-- (Module 1 builds on these), customers and sales with record_sale / void_sale (Module 2), and
-- the low_stock view and dashboard_summary function the dashboard expects (Module 3).
--
-- Conventions (docs/database-schema.md): money is numeric(12,2) pesos, times are timestamptz,
-- keys are bigint identity, business records are never hard-deleted. Every table has RLS.
-- Functions that change stock or sales are security definer with an empty search_path.

-- =============================================================================================
-- Shared: profiles and roles (FR-1, FR-2)
-- =============================================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('owner', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per sign-in account. New accounts start as staff; the Owner role is set by SQL or the admin-users function.';

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every new auth user gets a profile (role staff).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role of the signed-in user, or null when not signed in or deactivated.
create function public.current_app_role() returns text
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active
$$;

create function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_app_role() = 'owner', false)
$$;

-- Owner or Staff: any active internal user.
create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_app_role() in ('owner', 'staff'), false)
$$;

-- =============================================================================================
-- Module 1 (minimal): products, cost prices, stock, movements, resellers (FR-4, FR-5, FR-8)
-- =============================================================================================

create table public.products (
  id bigint generated always as identity primary key,
  sku text not null unique check (btrim(sku) <> ''),
  name text not null check (btrim(name) <> ''),
  brand text,
  scent_family text,
  size_ml integer check (size_ml > 0),
  description text,
  retail_price numeric(12, 2) not null check (retail_price >= 0),
  reseller_price numeric(12, 2) not null check (reseller_price >= 0),
  reorder_level integer not null default 5 check (reorder_level >= 0),
  lead_time_days integer not null default 7 check (lead_time_days >= 0),
  photo_path text,
  is_active boolean not null default true,
  show_in_catalog boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Cost prices are Owner-only, so they live in their own table (RLS can't hide one column).
create table public.product_costs (
  product_id bigint primary key references public.products (id),
  cost_price numeric(12, 2) not null check (cost_price >= 0),
  updated_at timestamptz not null default now()
);

-- Current balance per product. Only the stock functions below change it.
create table public.product_stock (
  product_id bigint primary key references public.products (id),
  on_hand integer not null default 0 check (on_hand >= 0),
  updated_at timestamptz not null default now()
);

create function public.create_product_stock() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.product_stock (product_id) values (new.id);
  return new;
end;
$$;

create trigger products_stock_row after insert on public.products
  for each row execute function public.create_product_stock();

create table public.resellers (
  id bigint generated always as identity primary key,
  business_name text not null check (btrim(business_name) <> ''),
  contact_person text,
  mobile text,
  email text,
  address text,
  price_tier text not null default 'standard',
  status text not null default 'active' check (status in ('active', 'inactive')),
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger resellers_updated_at before update on public.resellers
  for each row execute function public.set_updated_at();

-- =============================================================================================
-- Module 2: customers and sales (FR-7 customers, FR-9 sales in SRS v1.2)
-- =============================================================================================

create table public.customers (
  id bigint generated always as identity primary key,
  name text not null check (btrim(name) <> ''),
  -- Stored as 09XXXXXXXXX (the app normalises it), so one number can't be saved twice.
  mobile text unique check (mobile ~ '^09[0-9]{9}$'),
  email text,
  address text,
  preferred_channel text not null default 'walk_in' check (preferred_channel in ('walk_in', 'online')),
  consent_at timestamptz not null default now(),
  anonymized_at timestamptz,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Only an anonymised record may lose its mobile number.
  check (mobile is not null or anonymized_at is not null)
);

create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

create sequence public.sale_no_seq;

create table public.sales (
  id bigint generated always as identity primary key,
  sale_no text not null unique,
  sold_at timestamptz not null default now(),
  channel text not null check (channel in ('walk_in', 'online', 'reseller')),
  customer_id bigint references public.customers (id),
  reseller_id bigint references public.resellers (id),
  total numeric(12, 2) not null default 0 check (total >= 0),
  status text not null default 'completed' check (status in ('completed', 'voided')),
  void_reason text,
  voided_at timestamptz,
  voided_by uuid references public.profiles (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  -- Reseller sales name the reseller; other sales never do.
  check ((channel = 'reseller') = (reseller_id is not null)),
  check (channel <> 'reseller' or customer_id is null),
  check ((status = 'voided') = (voided_at is not null))
);

create index sales_sold_at_idx on public.sales (sold_at desc);

create table public.sale_items (
  id bigint generated always as identity primary key,
  sale_id bigint not null references public.sales (id),
  product_id bigint not null references public.products (id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) generated always as (round(quantity * unit_price, 2)) stored,
  unique (sale_id, product_id)
);

-- Append-only ledger: every change to stock is one row; rows are never edited.
create table public.stock_movements (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id),
  kind text not null check (kind in ('stock_in', 'sale', 'void', 'return', 'adjustment')),
  quantity integer not null check (quantity <> 0),
  reason text,
  reference text,
  sale_id bigint references public.sales (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);

-- =============================================================================================
-- Stock and sales functions
-- =============================================================================================

-- Stock-in, return or adjustment (Module 1 contract). quantity is positive for stock_in and
-- return; an adjustment can be negative and needs a reason. Refuses to go below zero.
create function public.record_stock_movement(payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_product_id bigint := (payload ->> 'product_id')::bigint;
  v_kind text := payload ->> 'kind';
  v_quantity integer := (payload ->> 'quantity')::integer;
  v_reason text := nullif(btrim(payload ->> 'reason'), '');
  v_on_hand integer;
  v_movement_id bigint;
begin
  if not public.is_member() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_kind is null or v_kind not in ('stock_in', 'return', 'adjustment') then
    raise exception 'invalid kind' using hint = 'Use stock_in, return or adjustment.';
  end if;
  if v_quantity is null or v_quantity = 0 or (v_kind <> 'adjustment' and v_quantity < 0) then
    raise exception 'invalid quantity' using hint = 'Enter a quantity other than zero.';
  end if;
  if v_kind = 'adjustment' and v_reason is null then
    raise exception 'reason required' using hint = 'An adjustment needs a reason.';
  end if;

  select s.on_hand into v_on_hand from public.product_stock s where s.product_id = v_product_id for update;
  if not found then
    raise exception 'product not found' using errcode = 'P0002', hint = 'Product not found.';
  end if;
  if v_on_hand + v_quantity < 0 then
    raise exception 'insufficient stock' using hint = format('Only %s in stock; stock cannot go below zero.', v_on_hand);
  end if;

  insert into public.stock_movements (product_id, kind, quantity, reason, reference, created_by)
  values (v_product_id, v_kind, v_quantity, v_reason, nullif(btrim(payload ->> 'reference'), ''), auth.uid())
  returning id into v_movement_id;

  update public.product_stock
     set on_hand = on_hand + v_quantity, updated_at = now()
   where product_id = v_product_id
  returning on_hand into v_on_hand;

  return jsonb_build_object('movement_id', v_movement_id, 'on_hand', v_on_hand);
end;
$$;

-- One sale as one transaction (FR-9). payload = { channel, customer_id, reseller_id,
-- lines: [{ product_id, quantity }] }. Prices come from the products table, never from the
-- browser. Locks the stock rows in product-id order; if any product is short, nothing is saved.
create function public.record_sale(payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_channel text := payload ->> 'channel';
  v_customer_id bigint := nullif(payload ->> 'customer_id', '')::bigint;
  v_reseller_id bigint := nullif(payload ->> 'reseller_id', '')::bigint;
  v_line record;
  v_sale_id bigint;
  v_sale_no text;
  v_total numeric(12, 2);
begin
  if not public.is_member() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_channel is null or v_channel not in ('walk_in', 'online', 'reseller') then
    raise exception 'invalid channel' using hint = 'Choose walk-in, online or reseller.';
  end if;

  if v_channel = 'reseller' then
    v_customer_id := null;
    if v_reseller_id is null
       or not exists (select 1 from public.resellers r where r.id = v_reseller_id and r.status = 'active') then
      raise exception 'invalid reseller' using hint = 'Choose an active reseller.';
    end if;
  else
    v_reseller_id := null;
    if v_customer_id is not null
       and not exists (select 1 from public.customers c where c.id = v_customer_id and c.anonymized_at is null) then
      raise exception 'customer not found' using errcode = 'P0002', hint = 'The customer no longer exists.';
    end if;
  end if;

  if jsonb_typeof(payload -> 'lines') is distinct from 'array' or jsonb_array_length(payload -> 'lines') = 0 then
    raise exception 'no items' using hint = 'Add at least one product.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(payload -> 'lines') l
     where coalesce(l ->> 'product_id', '') !~ '^[0-9]+$'
        or coalesce(l ->> 'quantity', '') !~ '^[1-9][0-9]{0,5}$'
  ) then
    raise exception 'invalid line' using hint = 'Quantities must be whole numbers, 1 or more.';
  end if;

  -- Lock the stock rows in product-id order so two sales of the same products can't deadlock,
  -- and a second sale of the last unit waits, then sees the reduced balance.
  perform 1
     from public.product_stock s
    where s.product_id in (select (l ->> 'product_id')::bigint from jsonb_array_elements(payload -> 'lines') l)
    order by s.product_id
      for update;

  -- Check every product before saving anything. Repeated products are added together.
  for v_line in
    select q.product_id, q.quantity, p.name, p.is_active, s.on_hand
      from (select (l ->> 'product_id')::bigint as product_id, sum((l ->> 'quantity')::integer)::integer as quantity
              from jsonb_array_elements(payload -> 'lines') l
             group by 1) q
      left join public.products p on p.id = q.product_id
      left join public.product_stock s on s.product_id = q.product_id
     order by q.product_id
  loop
    if v_line.name is null or not v_line.is_active then
      raise exception 'product not found' using errcode = 'P0002', hint = format('Product %s is not available.', v_line.product_id);
    end if;
    if v_line.on_hand < v_line.quantity then
      raise exception 'insufficient stock' using hint = format('Only %s %s available.', v_line.on_hand, v_line.name);
    end if;
  end loop;

  v_sale_no := 'S-' || to_char(now() at time zone 'Asia/Manila', 'YYYY') || '-'
               || lpad(nextval('public.sale_no_seq')::text, 6, '0');

  insert into public.sales (sale_no, channel, customer_id, reseller_id, created_by)
  values (v_sale_no, v_channel, v_customer_id, v_reseller_id, auth.uid())
  returning id into v_sale_id;

  insert into public.sale_items (sale_id, product_id, quantity, unit_price)
  select v_sale_id, q.product_id, q.quantity,
         case when v_channel = 'reseller' then p.reseller_price else p.retail_price end
    from (select (l ->> 'product_id')::bigint as product_id, sum((l ->> 'quantity')::integer)::integer as quantity
            from jsonb_array_elements(payload -> 'lines') l
           group by 1) q
    join public.products p on p.id = q.product_id;

  insert into public.stock_movements (product_id, kind, quantity, reference, sale_id, created_by)
  select i.product_id, 'sale', -i.quantity, v_sale_no, v_sale_id, auth.uid()
    from public.sale_items i
   where i.sale_id = v_sale_id;

  update public.product_stock s
     set on_hand = s.on_hand - i.quantity, updated_at = now()
    from public.sale_items i
   where i.sale_id = v_sale_id and s.product_id = i.product_id;

  select sum(i.line_total) into v_total from public.sale_items i where i.sale_id = v_sale_id;
  update public.sales set total = v_total where id = v_sale_id;

  return jsonb_build_object('sale_id', v_sale_id, 'sale_no', v_sale_no, 'total', v_total);
end;
$$;

-- Owner only. Keeps the sale, marks it voided and returns its stock with compensating movements.
create function public.void_sale(p_sale_id bigint, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_status text;
  v_sale_no text;
  v_reason text := nullif(btrim(p_reason), '');
begin
  if not public.is_owner() then
    raise exception 'only the owner can void a sale' using errcode = '42501';
  end if;
  if v_reason is null then
    raise exception 'reason required' using hint = 'Enter a reason for voiding the sale.';
  end if;

  select s.status, s.sale_no into v_status, v_sale_no from public.sales s where s.id = p_sale_id for update;
  if not found then
    raise exception 'sale not found' using errcode = 'P0002', hint = 'Sale not found.';
  end if;
  if v_status = 'voided' then
    raise exception 'already voided' using hint = 'This sale is already voided.';
  end if;

  perform 1
     from public.product_stock s
    where s.product_id in (select i.product_id from public.sale_items i where i.sale_id = p_sale_id)
    order by s.product_id
      for update;

  insert into public.stock_movements (product_id, kind, quantity, reason, reference, sale_id, created_by)
  select i.product_id, 'void', i.quantity, v_reason, v_sale_no, p_sale_id, auth.uid()
    from public.sale_items i
   where i.sale_id = p_sale_id;

  update public.product_stock s
     set on_hand = s.on_hand + i.quantity, updated_at = now()
    from public.sale_items i
   where i.sale_id = p_sale_id and s.product_id = i.product_id;

  update public.sales
     set status = 'voided', void_reason = v_reason, voided_at = now(), voided_by = auth.uid()
   where id = p_sale_id;

  return jsonb_build_object('sale_id', p_sale_id, 'status', 'voided');
end;
$$;

-- =============================================================================================
-- Module 3: what the dashboard reads (docs/api-contracts.md, "Dashboard")
-- =============================================================================================

create view public.low_stock with (security_invoker = true) as
select p.id, p.sku, p.name, s.on_hand, p.reorder_level
  from public.products p
  join public.product_stock s on s.product_id = p.id
 where p.is_active and s.on_hand <= p.reorder_level;

-- Totals for the last p_days days (0 = all time) and a daily series for the last p_chart_days
-- days, both counted in Philippine time. Voided sales never count. Runs with the caller's
-- rights, so RLS applies (signed-out callers get zeros).
create function public.dashboard_summary(p_days integer default 0, p_chart_days integer default 90) returns jsonb
language sql stable set search_path = '' as $$
  with today as (
    select (now() at time zone 'Asia/Manila')::date as d
  ),
  counted as (
    select sa.*, (sa.sold_at at time zone 'Asia/Manila')::date as sold_on
      from public.sales sa
     where sa.status = 'completed'
  ),
  period as (
    select c.* from counted c, today t
     where coalesce(p_days, 0) = 0 or c.sold_on > t.d - p_days
  ),
  items as (
    select i.*, p.sku, p.name from public.sale_items i join period s on s.id = i.sale_id join public.products p on p.id = i.product_id
  )
  select jsonb_build_object(
    'summary', (
      select jsonb_build_object(
        'revenue', coalesce(sum(total), 0)::numeric(12, 2)::text,
        'sales_count', count(*),
        'units', (select coalesce(sum(quantity), 0) from items),
        'average_sale', coalesce(round(avg(total), 2), 0)::numeric(12, 2)::text)
        from period),
    'by_channel', (
      select jsonb_agg(jsonb_build_object('channel', x.channel, 'revenue', x.revenue::text, 'sales_count', x.n) order by x.ord)
        from (select ch.channel, ch.ord, coalesce(sum(p.total), 0)::numeric(12, 2) as revenue, count(p.id) as n
                from (values ('walk_in', 1), ('online', 2), ('reseller', 3)) as ch(channel, ord)
                left join period p on p.channel = ch.channel
               group by ch.channel, ch.ord) x),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', x.sold_on::text, 'revenue', x.revenue::text, 'sales_count', x.n) order by x.sold_on)
        from (select c.sold_on, sum(c.total)::numeric(12, 2) as revenue, count(*) as n
                from counted c, today t
               where c.sold_on > t.d - coalesce(p_chart_days, 90)
               group by c.sold_on) x), '[]'::jsonb),
    'top_products', coalesce((
      select jsonb_agg(jsonb_build_object('product_id', x.product_id, 'sku', x.sku, 'name', x.name, 'units', x.units, 'revenue', x.revenue::text)
                       order by x.units desc, x.revenue desc)
        from (select product_id, sku, name, sum(quantity) as units, sum(line_total)::numeric(12, 2) as revenue
                from items group by product_id, sku, name
               order by units desc, revenue desc limit 5) x), '[]'::jsonb),
    'top_buyers', coalesce((
      select jsonb_agg(jsonb_build_object('kind', x.kind, 'id', x.id, 'name', x.name, 'sales_count', x.n, 'revenue', x.revenue::text)
                       order by x.revenue desc, x.n desc)
        from (select b.kind, b.id, b.name, count(*) as n, sum(b.total)::numeric(12, 2) as revenue
                from (select 'reseller' as kind, r.id, r.business_name as name, p.total
                        from period p join public.resellers r on r.id = p.reseller_id
                      union all
                      select 'customer', c.id, c.name, p.total
                        from period p join public.customers c on c.id = p.customer_id) b
               group by b.kind, b.id, b.name
               order by revenue desc, n desc limit 5) x), '[]'::jsonb)
  )
$$;

-- =============================================================================================
-- Access: grants and row-level security (deny by default)
-- =============================================================================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_costs enable row level security;
alter table public.product_stock enable row level security;
alter table public.stock_movements enable row level security;
alter table public.resellers enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

revoke all on public.profiles, public.products, public.product_costs, public.product_stock,
  public.stock_movements, public.resellers, public.customers, public.sales, public.sale_items,
  public.low_stock
  from anon, authenticated;
revoke all on sequence public.sale_no_seq from anon, authenticated;

-- Reads: any signed-in, active Owner or Staff. Writes to stock and sales only through functions.
grant select on public.profiles, public.products, public.product_stock, public.stock_movements,
  public.resellers, public.customers, public.sales, public.sale_items, public.low_stock
  to authenticated;
grant insert, update on public.products, public.customers to authenticated;
grant insert, update on public.resellers to authenticated;
grant select, insert, update on public.product_costs to authenticated;

create policy "Members read profiles of active users or their own" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_owner());

create policy "Members read products" on public.products
  for select to authenticated using (public.is_member());
create policy "Members add products" on public.products
  for insert to authenticated with check (public.is_member());
create policy "Members edit products" on public.products
  for update to authenticated using (public.is_member()) with check (public.is_member());

create policy "Owner manages cost prices" on public.product_costs
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

create policy "Members read stock" on public.product_stock
  for select to authenticated using (public.is_member());
create policy "Members read stock movements" on public.stock_movements
  for select to authenticated using (public.is_member());

create policy "Members read resellers" on public.resellers
  for select to authenticated using (public.is_member());
create policy "Owner adds resellers" on public.resellers
  for insert to authenticated with check (public.is_owner());
create policy "Owner edits resellers" on public.resellers
  for update to authenticated using (public.is_owner()) with check (public.is_owner());

create policy "Members read customers" on public.customers
  for select to authenticated using (public.is_member());
create policy "Members add customers" on public.customers
  for insert to authenticated with check (public.is_member());
create policy "Members edit customers" on public.customers
  for update to authenticated using (public.is_member()) with check (public.is_member());

create policy "Members read sales" on public.sales
  for select to authenticated using (public.is_member());
create policy "Members read sale items" on public.sale_items
  for select to authenticated using (public.is_member());

-- Functions: callable by signed-in users only; each one checks the role itself.
revoke execute on function public.record_stock_movement(jsonb), public.record_sale(jsonb),
  public.void_sale(bigint, text), public.dashboard_summary(integer, integer),
  public.current_app_role(), public.is_owner(), public.is_member()
  from public, anon;
grant execute on function public.record_stock_movement(jsonb), public.record_sale(jsonb),
  public.void_sale(bigint, text), public.dashboard_summary(integer, integer),
  public.current_app_role(), public.is_owner(), public.is_member()
  to authenticated;
revoke execute on function public.handle_new_user(), public.create_product_stock(), public.set_updated_at()
  from public, anon, authenticated;
