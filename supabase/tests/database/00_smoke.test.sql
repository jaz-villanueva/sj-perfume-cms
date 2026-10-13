-- Proves the pgTAP pipeline runs in CI. Each migration adds its own RLS and function tests next to this file.
begin;
create extension if not exists pgtap with schema extensions;

select plan(2);

select has_schema('public');
select has_extension('pgtap');

select * from finish();
rollback;
