-- Allow profile-based admins to insert clients (in addition to service_role/postgres/JWT admin)
drop policy if exists clients_insert on public.clients;

create policy clients_insert on public.clients
for insert
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);

-- Optional: uncomment if you want profile admins to update/delete clients too
drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
for update using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
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
);

