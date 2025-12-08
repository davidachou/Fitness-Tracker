-- Standardize RLS: admins are profiles with is_admin=true (by email) or JWT role='admin'.
-- Avoid casting non-UUID sub values; use email-based lookups for admin and membership.
-- Keep service_role/postgres bypass everywhere.

-- CLIENTS
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
for select using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or exists (
    select 1
    from public.time_tracker_projects p
    join public.project_access pa on pa.project_id = p.id
    where p.client_id = clients.id
      and pa.user_id in (
        select id from public.profiles
        where email = coalesce(auth.jwt()->>'email','')
      )
  )
);

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
for insert with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
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
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
);

drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
for delete using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
);

-- PROJECTS
drop policy if exists time_tracker_projects_select on public.time_tracker_projects;
create policy time_tracker_projects_select on public.time_tracker_projects
for select using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or id = '00000000-0000-0000-0000-000000000002' -- Unassigned
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = id
      and pa.user_id in (
        select id from public.profiles
        where email = coalesce(auth.jwt()->>'email','')
      )
  )
);

drop policy if exists time_tracker_projects_insert on public.time_tracker_projects;
create policy time_tracker_projects_insert on public.time_tracker_projects
for insert with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.id = time_tracker_projects.created_by
  )
);

drop policy if exists time_tracker_projects_update on public.time_tracker_projects;
create policy time_tracker_projects_update on public.time_tracker_projects
for update
using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = id
      and pa.user_id in (
        select id from public.profiles
        where email = coalesce(auth.jwt()->>'email','')
      )
  )
)
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = id
      and pa.user_id in (
        select id from public.profiles
        where email = coalesce(auth.jwt()->>'email','')
      )
  )
);

drop policy if exists time_tracker_projects_delete on public.time_tracker_projects;
create policy time_tracker_projects_delete on public.time_tracker_projects
for delete using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = id
      and pa.user_id in (
        select id from public.profiles
        where email = coalesce(auth.jwt()->>'email','')
      )
  )
);

-- PROJECT ACCESS
drop policy if exists project_access_select on public.project_access;
create policy project_access_select on public.project_access
for select using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or user_id in (
    select id from public.profiles
    where email = coalesce(auth.jwt()->>'email','')
  )
);

drop policy if exists project_access_insert on public.project_access;
create policy project_access_insert on public.project_access
for insert with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or user_id in (
    select id from public.profiles
    where email = coalesce(auth.jwt()->>'email','')
  )
);

drop policy if exists project_access_update on public.project_access;
create policy project_access_update on public.project_access
for update
using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or user_id in (
    select id from public.profiles
    where email = coalesce(auth.jwt()->>'email','')
  )
)
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or user_id in (
    select id from public.profiles
    where email = coalesce(auth.jwt()->>'email','')
  )
);

drop policy if exists project_access_delete on public.project_access;
create policy project_access_delete on public.project_access
for delete using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or user_id in (
    select id from public.profiles
    where email = coalesce(auth.jwt()->>'email','')
  )
);

-- TASKS
drop policy if exists time_tracker_tasks_select on public.time_tracker_tasks;
create policy time_tracker_tasks_select on public.time_tracker_tasks
for select using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = time_tracker_tasks.project_id
      and pa.user_id in (
        select id from public.profiles
        where email = coalesce(auth.jwt()->>'email','')
      )
  )
);

drop policy if exists time_tracker_tasks_insert on public.time_tracker_tasks;
create policy time_tracker_tasks_insert on public.time_tracker_tasks
for insert with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = time_tracker_tasks.project_id
      and pa.user_id in (
        select id from public.profiles
        where email = coalesce(auth.jwt()->>'email','')
      )
  )
);

drop policy if exists time_tracker_tasks_update on public.time_tracker_tasks;
create policy time_tracker_tasks_update on public.time_tracker_tasks
for update
using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = time_tracker_tasks.project_id
      and pa.user_id in (
        select id from public.profiles
        where email = coalesce(auth.jwt()->>'email','')
      )
  )
)
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = time_tracker_tasks.project_id
      and pa.user_id in (
        select id from public.profiles
        where email = coalesce(auth.jwt()->>'email','')
      )
  )
);

drop policy if exists time_tracker_tasks_delete on public.time_tracker_tasks;
create policy time_tracker_tasks_delete on public.time_tracker_tasks
for delete using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = time_tracker_tasks.project_id
      and pa.user_id in (
        select id from public.profiles
        where email = coalesce(auth.jwt()->>'email','')
      )
  )
);

-- TIME ENTRIES
drop policy if exists time_entries_select on public.time_entries;
create policy time_entries_select on public.time_entries
for select using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.email = coalesce(auth.jwt()->>'email','')
      and p.is_admin = true
  )
  or user_id in (
    select id from public.profiles
    where email = coalesce(auth.jwt()->>'email','')
  )
);

drop policy if exists time_entries_insert on public.time_entries;
create policy time_entries_insert on public.time_entries
for insert
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or (
    user_id in (
      select id from public.profiles
      where email = coalesce(auth.jwt()->>'email','')
    )
    and (
      time_entries.project_id = '00000000-0000-0000-0000-000000000002'
      or exists (
        select 1 from public.project_access pa
        where pa.user_id in (
          select id from public.profiles
          where email = coalesce(auth.jwt()->>'email','')
        )
        and pa.project_id = coalesce(
          time_entries.project_id,
          (select t.project_id from public.time_tracker_tasks t where t.id = time_entries.task_id)
        )
      )
    )
  )
);

drop policy if exists time_entries_update on public.time_entries;
create policy time_entries_update on public.time_entries
for update
using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or user_id in (
    select id from public.profiles
    where email = coalesce(auth.jwt()->>'email','')
  )
)
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or user_id in (
    select id from public.profiles
    where email = coalesce(auth.jwt()->>'email','')
  )
);

drop policy if exists time_entries_delete on public.time_entries;
create policy time_entries_delete on public.time_entries
for delete using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or user_id in (
    select id from public.profiles
    where email = coalesce(auth.jwt()->>'email','')
  )
);

-- ACTIVE TIMERS
drop policy if exists active_timers_select on public.active_timers;
create policy active_timers_select on public.active_timers
for select using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or user_id in (
    select id from public.profiles
    where email = coalesce(auth.jwt()->>'email','')
  )
);

drop policy if exists active_timers_insert on public.active_timers;
create policy active_timers_insert on public.active_timers
for insert with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or user_id in (
    select id from public.profiles
    where email = coalesce(auth.jwt()->>'email','')
  )
);

drop policy if exists active_timers_update on public.active_timers;
create policy active_timers_update on public.active_timers
for update
using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or user_id in (
    select id from public.profiles
    where email = coalesce(auth.jwt()->>'email','')
  )
)
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or user_id in (
    select id from public.profiles
    where email = coalesce(auth.jwt()->>'email','')
  )
);

drop policy if exists active_timers_delete on public.active_timers;
create policy active_timers_delete on public.active_timers
for delete using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or user_id in (
    select id from public.profiles
    where email = coalesce(auth.jwt()->>'email','')
  )
);

