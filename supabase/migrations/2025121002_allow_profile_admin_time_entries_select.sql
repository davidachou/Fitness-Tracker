-- Allow profile-based admins to read all time entries (not just JWT role=admin)
drop policy if exists time_entries_select on public.time_entries;

create policy time_entries_select on public.time_entries
for select using (
  -- service/admin bypass
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  -- profile-level admins
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
  -- user-owned entries with project access (or unassigned project)
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

