-- Replace admin_profiles view usage with direct profiles.is_admin checks for polls
begin;

-- Drop dependent policies first, then drop the view, then recreate policies
drop policy if exists polls_delete on public.polls;
drop policy if exists poll_options_write on public.poll_options;

-- Remove the helper view so the table is not exposed
drop view if exists public.admin_profiles;

-- Recreate polls delete policy to check profiles.is_admin directly
create policy polls_delete on public.polls
for delete using (
  auth.uid() is not null
  and (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
    or created_by = auth.uid()
  )
);

-- Recreate poll_options write policy to check profiles.is_admin directly
create policy poll_options_write on public.poll_options
for all using (
  auth.uid() is not null
  and (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
    or exists (
      select 1 from public.polls p2
      where p2.id = poll_options.poll_id and p2.created_by = auth.uid()
    )
  )
) with check (
  auth.uid() is not null
  and (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
    or exists (
      select 1 from public.polls p2
      where p2.id = poll_options.poll_id and p2.created_by = auth.uid()
    )
  )
);

-- Reload PostgREST
notify pgrst, 'reload schema';

commit;

