-- Make clients policies tolerant of non-UUID JWT sub (e.g., OAuth provider IDs)
-- Keep admin allowances via JWT role, profile id (when UUID), or profile email.

drop policy if exists clients_insert on public.clients;

create policy clients_insert on public.clients
for insert
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or (
    auth.jwt()->>'sub' ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$'
    and exists (
      select 1 from public.profiles p
      where p.id = (auth.jwt()->>'sub')::uuid
        and p.is_admin = true
    )
  )
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
);

drop policy if exists clients_update on public.clients;

create policy clients_update on public.clients
for update
using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or (
    auth.jwt()->>'sub' ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$'
    and exists (
      select 1 from public.profiles p
      where p.id = (auth.jwt()->>'sub')::uuid
        and p.is_admin = true
    )
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
  or (
    auth.jwt()->>'sub' ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$'
    and exists (
      select 1 from public.profiles p
      where p.id = (auth.jwt()->>'sub')::uuid
        and p.is_admin = true
    )
  )
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
);

