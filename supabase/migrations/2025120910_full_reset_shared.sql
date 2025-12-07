-- Full reset to shared clients/projects/tasks with project access and admin support
-- Destructive: drops prior tables and policies, rebuilds schema, RLS, realtime.

create extension if not exists "pgcrypto";

-- Drop legacy tables
drop table if exists public.active_timers cascade;
drop table if exists public.time_entries cascade;
drop table if exists public.time_tracker_tasks cascade;
drop table if exists public.project_access cascade;
drop table if exists public.time_tracker_projects cascade;
drop table if exists public.clients cascade;

-- Clients (shared)
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_name_unique unique (name)
);

-- Projects (shared)
create table public.time_tracker_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  billable boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_tracker_projects_client_name unique (client_id, name)
);

-- Project access (membership)
create table public.project_access (
  project_id uuid not null references public.time_tracker_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  constraint project_access_pkey primary key (project_id, user_id)
);

-- Tasks (shared per project)
create table public.time_tracker_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.time_tracker_projects(id) on delete cascade,
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_tracker_tasks_project_name unique (project_id, name)
);

-- Time entries (per user, must be on accessible project/task)
create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.time_tracker_projects(id) on delete set null,
  task_id uuid references public.time_tracker_tasks(id) on delete set null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_seconds integer,
  billable boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Active timers (per user)
create table public.active_timers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.time_tracker_projects(id) on delete set null,
  task_id uuid references public.time_tracker_tasks(id) on delete set null,
  description text,
  start_time timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint active_timers_user_unique unique (user_id)
);

-- Indexes
create index clients_name_idx on public.clients(name);
create index time_tracker_projects_client_idx on public.time_tracker_projects(client_id);
create index project_access_user_idx on public.project_access(user_id);
create index project_access_project_idx on public.project_access(project_id);
create index time_tracker_tasks_project_idx on public.time_tracker_tasks(project_id);
create index time_entries_user_idx on public.time_entries(user_id);
create index time_entries_project_idx on public.time_entries(project_id);
create index time_entries_task_idx on public.time_entries(task_id);
create index time_entries_start_time_idx on public.time_entries(start_time);
create index active_timers_user_idx on public.active_timers(user_id);
create index active_timers_project_idx on public.active_timers(project_id);
create index active_timers_task_idx on public.active_timers(task_id);

-- RLS enable
alter table public.clients enable row level security;
alter table public.time_tracker_projects enable row level security;
alter table public.project_access enable row level security;
alter table public.time_tracker_tasks enable row level security;
alter table public.time_entries enable row level security;
alter table public.active_timers enable row level security;

-- Policies
-- Helpers: treat admin via JWT claim role='admin'

-- Clients: visible if user has project access on that client; admins/service/postgres bypass
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
for select using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1
    from public.time_tracker_projects p
    join public.project_access pa on pa.project_id = p.id
    where p.client_id = clients.id
      and pa.user_id = auth.uid()
  )
);

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
for insert with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
);

drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
for update using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
)
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
);

drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
for delete using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
);

-- Projects: membership-based; admins can manage; insert allowed to admin/creator/elevated
-- allow everyone to see the global Unassigned project (id fixed in seeds)
drop policy if exists time_tracker_projects_select on public.time_tracker_projects;
create policy time_tracker_projects_select on public.time_tracker_projects
for select using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or id = '00000000-0000-0000-0000-000000000002'
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = id and pa.user_id = auth.uid()
  )
);

drop policy if exists time_tracker_projects_insert on public.time_tracker_projects;
create policy time_tracker_projects_insert on public.time_tracker_projects
for insert with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or auth.uid() = created_by
);

drop policy if exists time_tracker_projects_update on public.time_tracker_projects;
create policy time_tracker_projects_update on public.time_tracker_projects
for update using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = id and pa.user_id = auth.uid()
  )
)
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = id and pa.user_id = auth.uid()
  )
);

drop policy if exists time_tracker_projects_delete on public.time_tracker_projects;
create policy time_tracker_projects_delete on public.time_tracker_projects
for delete using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = id and pa.user_id = auth.uid()
  )
);

-- Project access table
drop policy if exists project_access_select on public.project_access;
create policy project_access_select on public.project_access
for select using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or auth.uid() = user_id
);

drop policy if exists project_access_insert on public.project_access;
create policy project_access_insert on public.project_access
for insert with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or auth.uid() = user_id
);

drop policy if exists project_access_update on public.project_access;
create policy project_access_update on public.project_access
for update using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or auth.uid() = user_id
)
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or auth.uid() = user_id
);

drop policy if exists project_access_delete on public.project_access;
create policy project_access_delete on public.project_access
for delete using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or auth.uid() = user_id
);

-- Tasks: membership-based; admin/elevated bypass
drop policy if exists time_tracker_tasks_select on public.time_tracker_tasks;
create policy time_tracker_tasks_select on public.time_tracker_tasks
for select using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = project_id and pa.user_id = auth.uid()
  )
);

drop policy if exists time_tracker_tasks_insert on public.time_tracker_tasks;
create policy time_tracker_tasks_insert on public.time_tracker_tasks
for insert with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = project_id and pa.user_id = auth.uid()
  )
);

drop policy if exists time_tracker_tasks_update on public.time_tracker_tasks;
create policy time_tracker_tasks_update on public.time_tracker_tasks
for update using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = project_id and pa.user_id = auth.uid()
  )
)
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = project_id and pa.user_id = auth.uid()
  )
);

drop policy if exists time_tracker_tasks_delete on public.time_tracker_tasks;
create policy time_tracker_tasks_delete on public.time_tracker_tasks
for delete using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = project_id and pa.user_id = auth.uid()
  )
);

-- Time entries: user-owned and must have project access; admin/elevated bypass
-- allow entries on the global Unassigned project without membership
drop policy if exists time_entries_select on public.time_entries;
create policy time_entries_select on public.time_entries
for select using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or (
    auth.uid() = user_id and
    (
      time_entries.project_id = '00000000-0000-0000-0000-000000000002'
      or exists (
        select 1 from public.project_access pa
        where pa.user_id = auth.uid()
          and pa.project_id = coalesce(time_entries.project_id,
            (select t.project_id from public.time_tracker_tasks t where t.id = time_entries.task_id)
          )
      )
    )
  )
);

drop policy if exists time_entries_insert on public.time_entries;
create policy time_entries_insert on public.time_entries
for insert with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or (
    auth.uid() = user_id and
    (
      time_entries.project_id = '00000000-0000-0000-0000-000000000002'
      or exists (
        select 1 from public.project_access pa
        where pa.user_id = auth.uid()
          and pa.project_id = coalesce(time_entries.project_id,
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
  or (
    auth.uid() = user_id and
    (
      time_entries.project_id = '00000000-0000-0000-0000-000000000002'
      or exists (
        select 1 from public.project_access pa
        where pa.user_id = auth.uid()
          and pa.project_id = coalesce(time_entries.project_id,
            (select t.project_id from public.time_tracker_tasks t where t.id = time_entries.task_id)
          )
      )
    )
  )
)
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or coalesce(auth.jwt()->>'role','') = 'admin'
  or (
    auth.uid() = user_id and
    (
      time_entries.project_id = '00000000-0000-0000-0000-000000000002'
      or exists (
        select 1 from public.project_access pa
        where pa.user_id = auth.uid()
          and pa.project_id = coalesce(time_entries.project_id,
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
  or (
    auth.uid() = user_id and
    (
      time_entries.project_id = '00000000-0000-0000-0000-000000000002'
      or exists (
        select 1 from public.project_access pa
        where pa.user_id = auth.uid()
          and pa.project_id = coalesce(time_entries.project_id,
            (select t.project_id from public.time_tracker_tasks t where t.id = time_entries.task_id)
          )
      )
    )
  )
);

-- Active timers: per-user
drop policy if exists active_timers_select on public.active_timers;
create policy active_timers_select on public.active_timers
for select using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or auth.uid() = user_id
);

drop policy if exists active_timers_insert on public.active_timers;
create policy active_timers_insert on public.active_timers
for insert with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or auth.uid() = user_id
);

drop policy if exists active_timers_update on public.active_timers;
create policy active_timers_update on public.active_timers
for update using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or auth.uid() = user_id
)
with check (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or auth.uid() = user_id
);

drop policy if exists active_timers_delete on public.active_timers;
create policy active_timers_delete on public.active_timers
for delete using (
  auth.role() = 'service_role'
  or current_user = 'postgres'
  or auth.uid() = user_id
);

-- Touch trigger
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists clients_touch on public.clients;
create trigger clients_touch before update on public.clients
for each row execute function public.touch_updated_at();

drop trigger if exists time_tracker_projects_touch on public.time_tracker_projects;
create trigger time_tracker_projects_touch before update on public.time_tracker_projects
for each row execute function public.touch_updated_at();

drop trigger if exists time_tracker_tasks_touch on public.time_tracker_tasks;
create trigger time_tracker_tasks_touch before update on public.time_tracker_tasks
for each row execute function public.touch_updated_at();

drop trigger if exists time_entries_touch on public.time_entries;
create trigger time_entries_touch before update on public.time_entries
for each row execute function public.touch_updated_at();

drop trigger if exists active_timers_touch on public.active_timers;
create trigger active_timers_touch before update on public.active_timers
for each row execute function public.touch_updated_at();

-- Realtime guarded membership
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'clients'
  ) then
    execute 'alter publication supabase_realtime add table public.clients';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'time_tracker_projects'
  ) then
    execute 'alter publication supabase_realtime add table public.time_tracker_projects';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_access'
  ) then
    execute 'alter publication supabase_realtime add table public.project_access';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'time_tracker_tasks'
  ) then
    execute 'alter publication supabase_realtime add table public.time_tracker_tasks';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'time_entries'
  ) then
    execute 'alter publication supabase_realtime add table public.time_entries';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'active_timers'
  ) then
    execute 'alter publication supabase_realtime add table public.active_timers';
  end if;
end;
$$;

