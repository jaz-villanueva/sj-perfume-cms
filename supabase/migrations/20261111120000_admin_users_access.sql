-- Read access for the admin-users Edge Function (FR-3).
--
-- The function uses the service-role key and reads profiles to check that the caller is the
-- Owner and to return the changed account. This project does not expose new tables to the API
-- roles automatically, so the service role had no access to profiles and every request failed
-- with "permission denied for table profiles". It needs read access only: all changes go through
-- admin_apply_account_change, which it may already run.
grant select on public.profiles to service_role;
