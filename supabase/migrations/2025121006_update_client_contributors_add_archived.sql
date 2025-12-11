-- Recreate client_contributors with client archived flag
drop function if exists public.client_contributors();

create function public.client_contributors()
returns table (
  client_id   uuid,
  client_name text,
  archived    boolean,
  user_id     uuid,
  full_name   text,
  avatar_url  text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    te.client_id,
    c.name as client_name,
    coalesce(c.archived, false) as archived,
    p.id as user_id,
    coalesce(p.full_name, 'Teammate') as full_name,
    p.avatar_url
  from public.time_entries te
  join public.clients c on c.id = te.client_id
  join public.profiles p on p.id = te.user_id
  where te.client_id is not null
  group by te.client_id, c.name, c.archived, p.id, p.full_name, p.avatar_url;
$$;

-- Permissions stay the same
revoke all on function public.client_contributors() from public;
grant execute on function public.client_contributors() to authenticated, service_role;

-- Refresh PostgREST schema
notify pgrst, 'reload schema';

