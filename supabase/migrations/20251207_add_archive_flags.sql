-- Add archive flags for clients and projects
alter table public.clients
  add column if not exists archived boolean not null default false,
  add column if not exists archived_at timestamptz;

alter table public.time_tracker_projects
  add column if not exists archived boolean not null default false,
  add column if not exists archived_at timestamptz;

-- Optional: prevent inserting time entries on archived projects (service_role/postgres/admin bypass)
drop policy if exists time_entries_insert on public.time_entries;

create policy time_entries_insert on public.time_entries
for insert
with check (
  -- existing insert rules
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or (
    auth.uid() = user_id
    and (
      time_entries.project_id = '00000000-0000-0000-0000-000000000002'
      or exists (
        select 1 from public.project_access pa
        where pa.user_id = auth.uid()
          and pa.project_id = coalesce(
            time_entries.project_id,
            (select t.project_id from public.time_tracker_tasks t where t.id = time_entries.task_id)
          )
      )
    )
  )
  -- archived guard
  and not exists (
    select 1 from public.time_tracker_projects p
    where p.id = coalesce(
      time_entries.project_id,
      (select t.project_id from public.time_tracker_tasks t where t.id = time_entries.task_id)
    )
    and p.archived = true
  )
);

