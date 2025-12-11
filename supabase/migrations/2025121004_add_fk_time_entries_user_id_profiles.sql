-- Ensure time_entries.user_id references profiles.id for embeds/joins

-- Drop existing FK if it points elsewhere
alter table if exists public.time_entries
  drop constraint if exists time_entries_user_id_fkey;

-- Recreate FK to profiles.id
alter table public.time_entries
  add constraint time_entries_user_id_fkey
  foreign key (user_id) references public.profiles(id)
  on delete cascade;

-- Refresh PostgREST schema cache so embeds resolve
notify pgrst, 'reload schema';

