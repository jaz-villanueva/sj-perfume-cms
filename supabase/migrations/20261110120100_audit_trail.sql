-- Audit trail (FR-17, NFR-7; shared foundation).
--
-- Triggers write one entry for every important change: who did it, when, which record, what
-- kind of action, and the values before and after. Nobody can edit or delete an entry, not even
-- the service role. Only the Owner can read the log (SRS §4: Staff get no view).
--
-- Privacy (NFR-5): entries for customers and resellers never keep personal details (name,
-- mobile, e-mail, address). They record that the field changed, not its value, so anonymising a
-- customer (customer privacy migration) leaves no personal data behind in the log.

create table public.audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid,                     -- the signed-in user; null for system changes
  actor_role text,                   -- 'owner' or 'staff' at the time; null for system changes
  action text not null,              -- insert, update, delete, or a named action (void, anonymize, export, ...)
  table_name text not null,
  record_id text,
  record_label text,                 -- e.g. a sale number or product SKU, so entries read well later
  old_data jsonb,                    -- for updates: only the columns that changed
  new_data jsonb
);

comment on table public.audit_log is 'FR-17 audit trail. Written by triggers and functions only; append-only; Owner read-only.';

create index audit_log_created_at_idx on public.audit_log (created_at desc, id desc);
create index audit_log_record_idx on public.audit_log (table_name, record_id);

-- Who is acting: the signed-in user, or the Owner named by the admin-users function.
create function public.audit_actor() returns uuid
language sql stable set search_path = '' as $$
  select coalesce(
    auth.uid(),
    case when coalesce(current_setting('app.actor_id', true), '') ~ '^[0-9a-fA-F-]{36}$'
         then current_setting('app.actor_id', true)::uuid end)
$$;

-- The one place entries are written. Used by the triggers below and by functions that log a
-- named action (password reset, data export).
create function public.write_audit_entry(
  p_action text, p_table text, p_record_id text, p_label text, p_old jsonb, p_new jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := public.audit_actor();
begin
  insert into public.audit_log (actor_id, actor_role, action, table_name, record_id, record_label, old_data, new_data)
  values (v_actor, (select p.role from public.profiles p where p.id = v_actor),
          p_action, p_table, p_record_id, p_label, p_old, p_new);
end;
$$;

-- Personal fields are replaced by a marker (NFR-5). Other tables pass through unchanged.
create function public.audit_redact(p_table text, p_data jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  v_key text;
  v_personal text[] := case p_table
    when 'customers' then array['name', 'mobile', 'email', 'address']
    when 'resellers' then array['contact_person', 'mobile', 'email', 'address']
    else array[]::text[] end;
begin
  if p_data is null then
    return null;
  end if;
  foreach v_key in array v_personal loop
    if p_data ? v_key and jsonb_typeof(p_data -> v_key) <> 'null' then
      p_data := jsonb_set(p_data, array[v_key], '"[personal data]"');
    end if;
  end loop;
  return p_data;
end;
$$;

-- A short label for the record, kept with the entry.
create function public.audit_label(p_table text, p_row jsonb) returns text
language plpgsql stable set search_path = '' as $$
begin
  return case p_table
    when 'products' then concat_ws(' ', p_row ->> 'sku', p_row ->> 'name')
    when 'product_costs' then (select concat_ws(' ', p.sku, p.name) from public.products p where p.id = (p_row ->> 'product_id')::bigint)
    when 'stock_movements' then (select concat_ws(' ', p.sku, p.name) from public.products p where p.id = (p_row ->> 'product_id')::bigint)
    when 'customers' then 'Customer #' || (p_row ->> 'id')
    when 'resellers' then p_row ->> 'business_name'
    when 'sales' then p_row ->> 'sale_no'
    when 'profiles' then p_row ->> 'full_name'
    else null end;
end;
$$;

-- Generic row trigger. For updates it keeps only the changed columns (updated_at ignored) and
-- skips the entry when nothing else changed.
create function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_table text := tg_table_name;
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changed text[];
  v_action text := lower(tg_op);
begin
  if tg_op = 'UPDATE' then
    select array_agg(k) into v_changed
      from jsonb_object_keys(v_new) k
     where k <> 'updated_at' and (v_old -> k) is distinct from (v_new -> k);
    if v_changed is null then
      return null;
    end if;
    -- record_sale fills in the total right after creating the sale; that is part of the
    -- recorded sale (logged at commit by audit_sale_recorded), not a separate change.
    if v_table = 'sales' and v_changed = array['total'] and (v_old ->> 'created_at')::timestamptz = now() then
      return null;
    end if;
    select jsonb_object_agg(k, v_old -> k) into v_old from unnest(v_changed) k;
    select jsonb_object_agg(k, v_new -> k) into v_new from unnest(v_changed) k;

    -- Name the actions people look for.
    v_action := case
      when v_table = 'sales' and v_new ->> 'status' = 'voided' then 'void'
      when v_table = 'customers' and v_new ? 'anonymized_at' and v_new ->> 'anonymized_at' is not null then 'anonymize'
      when v_table = 'profiles' and v_new ? 'deleted_at' and v_new ->> 'deleted_at' is not null then 'delete_account'
      when v_table = 'profiles' and v_new ->> 'is_active' = 'false' then 'deactivate'
      when v_table = 'profiles' and v_new ->> 'is_active' = 'true' then 'reactivate'
      else 'update' end;
  end if;

  perform public.write_audit_entry(
    v_action, v_table,
    coalesce(v_row ->> 'id', v_row ->> 'product_id'),
    public.audit_label(v_table, v_row),
    public.audit_redact(v_table, v_old),
    public.audit_redact(v_table, v_new));
  return null;
end;
$$;

-- A sale is logged once, when its transaction commits, so the entry has the final total and
-- the items (record_sale writes them after the sales row).
create function public.audit_sale_recorded() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb;
begin
  select to_jsonb(s) || jsonb_build_object('items', coalesce((
           select jsonb_agg(jsonb_build_object('product_id', i.product_id, 'sku', p.sku, 'name', p.name,
                                               'quantity', i.quantity, 'unit_price', i.unit_price)
                            order by i.product_id)
             from public.sale_items i join public.products p on p.id = i.product_id
            where i.sale_id = s.id), '[]'::jsonb))
    into v_row
    from public.sales s where s.id = new.id;
  if v_row is not null then
    perform public.write_audit_entry('insert', 'sales', new.id::text, v_row ->> 'sale_no', null, v_row);
  end if;
  return null;
end;
$$;

-- Entries can't be changed or removed by anyone using the API, including the service role.
create function public.audit_log_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'audit entries cannot be changed or deleted' using errcode = '42501';
end;
$$;

create trigger audit_log_no_change before update or delete on public.audit_log
  for each row execute function public.audit_log_append_only();
create trigger audit_log_no_truncate before truncate on public.audit_log
  for each statement execute function public.audit_log_append_only();

-- What is audited. Stock balances (product_stock) follow the movement ledger, so the ledger
-- entries are logged instead; sale and void movements are covered by the sale's own entries.
create trigger profiles_audit after insert or update on public.profiles
  for each row execute function public.audit_row_change();
create trigger products_audit after insert or update or delete on public.products
  for each row execute function public.audit_row_change();
create trigger product_costs_audit after insert or update or delete on public.product_costs
  for each row execute function public.audit_row_change();
create trigger resellers_audit after insert or update or delete on public.resellers
  for each row execute function public.audit_row_change();
create trigger customers_audit after insert or update or delete on public.customers
  for each row execute function public.audit_row_change();
create trigger sales_audit_update after update on public.sales
  for each row execute function public.audit_row_change();
create constraint trigger sales_audit_insert after insert on public.sales
  deferrable initially deferred
  for each row execute function public.audit_sale_recorded();
create trigger stock_movements_audit after insert on public.stock_movements
  for each row when (new.kind in ('stock_in', 'return', 'adjustment'))
  execute function public.audit_row_change();

-- Access: the Owner reads; nobody writes except through the functions above.
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated, service_role;
grant select on public.audit_log to authenticated, service_role;

create policy "Owner reads the audit log" on public.audit_log
  for select to authenticated using (public.is_owner());

revoke execute on function public.audit_actor(), public.write_audit_entry(text, text, text, text, jsonb, jsonb),
  public.audit_redact(text, jsonb), public.audit_label(text, jsonb), public.audit_row_change(),
  public.audit_sale_recorded(), public.audit_log_append_only()
  from public, anon, authenticated, service_role;
