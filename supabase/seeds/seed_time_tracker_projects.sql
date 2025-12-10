-- Shared seed: single set of clients/projects/tasks, and grant every user access
-- Run with elevated role (service_role/postgres) so RLS is bypassed.

-- ensure a globally available "Unassigned" client with deterministic UUID for app defaults
-- UUID chosen to be stable across environments; adjust if it collides in an existing db
insert into public.clients (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Unassigned')
on conflict (name) do nothing;

-- insert clients (idempotent by name)
with clients(name) as (
  values
    ('Aligned Marketplace'),
    ('Apree'),
    ('Archwell'),
    ('Backpack Healthcare'),
    ('BDC Advisors'),
    ('Community Health Options'),
    ('Doro Mind'),
    ('Firefly Health'),
    ('Flourish'),
    ('Harbor Health'),
    ('KK Advisory Services'),
    ('Lifepoint Health'),
    ('River Health'),
    ('Texicare'),
    ('Watershed')
)
insert into public.clients (name)
select c.name
from clients c
where not exists (
  select 1 from public.clients existing
  where existing.name = c.name
);

-- ensure a globally available "Unassigned" project under the Unassigned client
insert into public.time_tracker_projects (id, client_id, name, billable)
select '00000000-0000-0000-0000-000000000002', c.id, 'Unassigned', true
from public.clients c
where c.name = 'Unassigned'
on conflict (client_id, name) do nothing;

-- insert projects (idempotent by client+name)
with projects(client_name, name, billable) as (
  values
    ('Aligned Marketplace', 'Go-To-Market Marketing Strategy', true),
    ('Apree', 'ICHRA Assessment', true),
    ('Archwell', 'IBNR', true),
    ('Backpack Healthcare', 'Medicaid Bundled Payment Pricing', true),
    ('BDC Advisors', 'ECU Contracting', true),
    ('BDC Advisors', 'Emblem Health', true),
    ('BDC Advisors', 'Komodo', true),
    ('Community Health Options', 'Finance and Actuarial Workstream', true),
    ('Community Health Options', 'Path to Profitability and Sustainability', true),
    ('Community Health Options', 'SOW #2', true),
    ('Doro Mind', 'Provider Contracting', true),
    ('Firefly Health', 'Benefit Design Development', true),
    ('Flourish', 'SOW #1', true),
    ('Harbor Health', '2026 ACA Filing', true),
    ('KK Advisory Services', 'Business Development', true),
    ('KK Advisory Services', 'Internal Work', true),
    ('KK Advisory Services', 'Onsite Internal', true),
    ('Lifepoint Health', 'Contract Negotiation', true),
    ('River Health', 'Market Assessment', true),
    ('Texicare', 'DPC Analysis', true),
    ('Texicare', 'Texicare Strategy', true),
    ('Watershed', 'Growth Strategy Support', true),
    ('Watershed', 'Onsite', true)
)
insert into public.time_tracker_projects (client_id, name, billable)
select cl.id, p.name, p.billable
from projects p
join public.clients cl
  on cl.name = p.client_name
where not exists (
  select 1
  from public.time_tracker_projects existing
  where existing.client_id = cl.id
    and existing.name = p.name
);

-- ensure an "Unassigned" task for the unassigned project (optional use in UI)
insert into public.time_tracker_tasks (id, project_id, name)
select '00000000-0000-0000-0000-000000000003', p.id, 'Unassigned'
from public.time_tracker_projects p
where p.name = 'Unassigned'
on conflict (project_id, name) do nothing;

-- insert tasks (idempotent by project+name)
with task_defs(project_name, task_name) as (
  values
    ('ICHRA Assessment', 'Deck and Meetings'),
    ('ECU Contracting', 'GI'),
    ('Path to Profitability and Sustainability', 'Interim COO Wk of 9/1/25')
)
insert into public.time_tracker_tasks (project_id, name)
select proj.id, td.task_name
from task_defs td
join public.time_tracker_projects proj
  on proj.name = td.project_name
where not exists (
  select 1
  from public.time_tracker_tasks t
  where t.project_id = proj.id
    and t.name = td.task_name
);

-- grant every auth user access to every project (idempotent)
insert into public.project_access (project_id, user_id, role)
select proj.id, u.id, 'member'
from auth.users u
cross join public.time_tracker_projects proj
where not exists (
  select 1
  from public.project_access pa
  where pa.project_id = proj.id
    and pa.user_id = u.id
);
