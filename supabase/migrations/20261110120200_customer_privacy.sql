-- Customer privacy (NFR-5, Data Privacy Act of 2012; Module 2).
--
-- The Owner can export everything kept about one customer or reseller, and can anonymise a
-- customer who asks to be removed. Anonymising keeps the customer's sales, so sales totals,
-- reports and forecasts stay correct; only the personal details are erased.

-- Only the Owner anonymises. Owner and Staff may still add and edit customers, but only the
-- business fields, and never an anonymised record.
revoke update on public.customers from authenticated;
grant update (name, mobile, email, address, preferred_channel) on public.customers to authenticated;

alter policy "Members add customers" on public.customers
  with check (public.is_member() and anonymized_at is null);
alter policy "Members edit customers" on public.customers
  using (public.is_member() and anonymized_at is null)
  with check (public.is_member() and anonymized_at is null);

-- Everything kept about one person: their record and every sale linked to them.
-- p_kind is 'customer' or 'reseller'. Owner only. The export itself is logged.
create function public.export_data_subject(p_kind text, p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_record jsonb;
  v_sales jsonb;
  v_table text;
begin
  if not public.is_owner() then
    raise exception 'only the owner can export personal data' using errcode = '42501';
  end if;

  if p_kind = 'customer' then
    v_table := 'customers';
    select jsonb_build_object(
             'id', c.id, 'name', c.name, 'mobile', c.mobile, 'email', c.email, 'address', c.address,
             'preferred_channel', c.preferred_channel, 'consent_at', c.consent_at,
             'anonymized_at', c.anonymized_at, 'created_at', c.created_at, 'updated_at', c.updated_at)
      into v_record from public.customers c where c.id = p_id;
  elsif p_kind = 'reseller' then
    v_table := 'resellers';
    select jsonb_build_object(
             'id', r.id, 'business_name', r.business_name, 'contact_person', r.contact_person,
             'mobile', r.mobile, 'email', r.email, 'address', r.address, 'price_tier', r.price_tier,
             'status', r.status, 'consent_at', r.consent_at, 'created_at', r.created_at, 'updated_at', r.updated_at)
      into v_record from public.resellers r where r.id = p_id;
  else
    raise exception 'invalid kind' using hint = 'Choose customer or reseller.';
  end if;

  if v_record is null then
    raise exception 'not found' using errcode = 'P0002', hint = 'Record not found.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'sale_no', s.sale_no, 'sold_at', s.sold_at, 'channel', s.channel, 'status', s.status,
           'total', s.total, 'void_reason', s.void_reason,
           'items', (select coalesce(jsonb_agg(jsonb_build_object(
                              'sku', p.sku, 'name', p.name, 'quantity', i.quantity,
                              'unit_price', i.unit_price, 'line_total', i.line_total) order by p.sku), '[]'::jsonb)
                       from public.sale_items i join public.products p on p.id = i.product_id
                      where i.sale_id = s.id))
         order by s.sold_at), '[]'::jsonb)
    into v_sales
    from public.sales s
   where (p_kind = 'customer' and s.customer_id = p_id)
      or (p_kind = 'reseller' and s.reseller_id = p_id);

  perform public.write_audit_entry('export', v_table, p_id::text,
    case when p_kind = 'customer' then 'Customer #' || p_id else v_record ->> 'business_name' end,
    null, jsonb_build_object('sales_count', jsonb_array_length(v_sales)));

  return jsonb_build_object(
    'exported_at', now(),
    'kind', p_kind,
    'record', v_record,
    'sales', v_sales,
    'note', 'Personal data held by SJ Perfume Trading for this person (Data Privacy Act of 2012, RA 10173).');
end;
$$;

-- Erases a customer's personal details and keeps their sales. Owner only; cannot be undone.
create function public.anonymize_customer(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_anonymized_at timestamptz;
begin
  if not public.is_owner() then
    raise exception 'only the owner can anonymise a customer' using errcode = '42501';
  end if;

  select c.anonymized_at into v_anonymized_at from public.customers c where c.id = p_id for update;
  if not found then
    raise exception 'customer not found' using errcode = 'P0002', hint = 'Customer not found.';
  end if;
  if v_anonymized_at is not null then
    raise exception 'already anonymised' using hint = 'This customer was already anonymised.';
  end if;

  update public.customers
     set name = 'Anonymised customer #' || id, mobile = null, email = null, address = null,
         anonymized_at = now()
   where id = p_id;

  return jsonb_build_object(
    'customer_id', p_id,
    'anonymized_at', now(),
    'sales_kept', (select count(*) from public.sales s where s.customer_id = p_id));
end;
$$;

revoke execute on function public.export_data_subject(text, bigint), public.anonymize_customer(bigint) from public, anon;
grant execute on function public.export_data_subject(text, bigint), public.anonymize_customer(bigint) to authenticated;
