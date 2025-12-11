-- Polls with options and votes
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  votes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

-- helper: is admin
create or replace view public.admin_profiles as
select id from public.profiles where is_admin = true;

-- Increment helper for votes
create or replace function public.increment_poll_option_vote(option_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.poll_options
  set votes = coalesce(votes, 0) + 1
  where id = option_id_input;
end;
$$;

-- Increment helper for votes
create or replace function public.increment_poll_option_vote(option_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.poll_options
  set votes = coalesce(votes, 0) + 1
  where id = option_id_input;
end;
$$;

-- Polls policies: everyone authenticated can read/create; delete only creator or admin
drop policy if exists polls_read on public.polls;
create policy polls_read on public.polls for select using (auth.uid() is not null);

drop policy if exists polls_insert on public.polls;
create policy polls_insert on public.polls for insert with check (auth.uid() is not null);

drop policy if exists polls_delete on public.polls;
create policy polls_delete on public.polls
for delete using (
  auth.uid() is not null
  and (
    exists (select 1 from public.admin_profiles a where a.id = auth.uid())
    or created_by = auth.uid()
  )
);

-- Poll options: read all; insert/update/delete by poll owners or admins
drop policy if exists poll_options_read on public.poll_options;
create policy poll_options_read on public.poll_options for select using (auth.uid() is not null);

drop policy if exists poll_options_write on public.poll_options;
create policy poll_options_write on public.poll_options
for all using (
  auth.uid() is not null
  and (
    exists (select 1 from public.admin_profiles a where a.id = auth.uid())
    or exists (select 1 from public.polls p where p.id = poll_options.poll_id and p.created_by = auth.uid())
  )
) with check (
  auth.uid() is not null
  and (
    exists (select 1 from public.admin_profiles a where a.id = auth.uid())
    or exists (select 1 from public.polls p where p.id = poll_options.poll_id and p.created_by = auth.uid())
  )
);

-- Poll votes: any authenticated user can insert/select
drop policy if exists poll_votes_read on public.poll_votes;
create policy poll_votes_read on public.poll_votes for select using (auth.uid() is not null);

drop policy if exists poll_votes_insert on public.poll_votes;
create policy poll_votes_insert on public.poll_votes
for insert with check (auth.uid() is not null);

-- Touch triggers
drop trigger if exists polls_touch on public.polls;
create trigger polls_touch before update on public.polls for each row execute function public.touch_updated_at();

drop trigger if exists poll_options_touch on public.poll_options;
create trigger poll_options_touch before update on public.poll_options for each row execute function public.touch_updated_at();

-- Optional seed (only if empty)
insert into public.polls (question, created_by)
select 'Sample poll', null
where not exists (select 1 from public.polls);

insert into public.poll_options (poll_id, label)
select p.id, v.label
from public.polls p
join (values ('Option A'), ('Option B')) as v(label) on true
where not exists (select 1 from public.poll_options where poll_id = p.id);

notify pgrst, 'reload schema';

