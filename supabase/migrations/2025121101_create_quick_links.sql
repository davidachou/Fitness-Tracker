-- Quick links table with admin-gated writes
create table if not exists public.quick_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  icon text,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quick_links enable row level security;

-- Allow any authenticated user to read
drop policy if exists quick_links_read on public.quick_links;
create policy quick_links_read on public.quick_links
for select using (auth.uid() is not null);

-- Writes allowed only for admins
drop policy if exists quick_links_write on public.quick_links;
create policy quick_links_write on public.quick_links
for all using (
  auth.uid() is not null
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
) with check (
  auth.uid() is not null
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
);

-- Keep updated_at fresh
drop trigger if exists quick_links_touch on public.quick_links;
create trigger quick_links_touch
before update on public.quick_links
for each row execute function public.touch_updated_at();

-- Seed defaults if empty
insert into public.quick_links (label, description, icon, url)
select * from (values
  ('Healthcare Article Repo', 'Modern healthcare tutorial archive', 'Folder', 'https://modern-healthcare.vercel.app/tutorial'),
  ('Expenses', 'Submit expenses (link pending)', 'Receipt', 'https://example.com/expenses'),
  ('Clockify', 'Time tracking dashboard', 'Clock', 'https://app.clockify.me/tracker')
) as v(label, description, icon, url)
where not exists (select 1 from public.quick_links);

notify pgrst, 'reload schema';

