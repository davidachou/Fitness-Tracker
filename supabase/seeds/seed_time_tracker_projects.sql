-- Basic seed data for Fitness Tracker
-- Run with elevated role (service_role/postgres) so RLS is bypassed.

-- Create default "Unassigned" client and project for time tracking
INSERT INTO public.clients (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Unassigned')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.time_tracker_projects (id, client_id, name, billable)
SELECT '00000000-0000-0000-0000-000000000002', c.id, 'Unassigned', true
FROM public.clients c
WHERE c.name = 'Unassigned'
ON CONFLICT (client_id, name) DO NOTHING;

INSERT INTO public.time_tracker_tasks (id, project_id, name)
SELECT '00000000-0000-0000-0000-000000000003', p.id, 'Unassigned'
FROM public.time_tracker_projects p
WHERE p.name = 'Unassigned'
ON CONFLICT (project_id, name) DO NOTHING;
