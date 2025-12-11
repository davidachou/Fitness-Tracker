-- Add client_id to active_timers so timers retain client when using unassigned project
alter table public.active_timers
  add column if not exists client_id uuid references public.clients(id);

create index if not exists active_timers_client_idx on public.active_timers(client_id);

-- Refresh schema cache
notify pgrst, 'reload schema';

-- Recreate time_entries write policies to allow profile admins (is_admin=true)
drop policy if exists time_entries_insert on public.time_entries;
create policy time_entries_insert on public.time_entries
for insert with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
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
);

drop policy if exists time_entries_update on public.time_entries;
create policy time_entries_update on public.time_entries
for update using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
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
) with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
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
);

drop policy if exists time_entries_delete on public.time_entries;
create policy time_entries_delete on public.time_entries
for delete using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
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
);

