-- Broaden client policies to allow admins via JWT role, profile id, or profile email.
-- Keeps existing service_role/postgres bypass.

drop policy if exists clients_insert on public.clients;

create policy clients_insert on public.clients
for insert
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
);

-- Align update policy with the same admin allowances.
drop policy if exists clients_update on public.clients;

create policy clients_update on public.clients
for update
using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
)
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
);

