-- Complete App Seed Data
-- Run this after db reset to populate all tables with sample data
-- Execute in Supabase SQL Editor

-- =============================================================================
-- PROFILES (including your restored profiles)
-- =============================================================================

INSERT INTO public.profiles (id, email, full_name, role, avatar_url, is_admin, created_at, updated_at, bio)
VALUES
  ('b2738339-2b67-48ff-981f-a33d4f426166', 'david@kkadvisory.org', 'David CC', 'Client', NULL, false, '2025-12-13 06:00:47.282909+00', '2025-12-13 06:00:47.282909+00', 'Bio'),
  ('6c993260-abfa-40c3-93b5-d61aab7f5286', 'qrafzv0123@gmail.com', 'David Chou', 'admin', NULL, true, '2025-12-12 22:27:40.277272+00', '2025-12-13 16:24:29.173099+00', 'Bio')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TEAM MEMBERS
-- =============================================================================

INSERT INTO public.team_members (id, name, role, bio, expertise, photo, slack, calendly, email, linkedin)
VALUES
  ('aa111111-1111-1111-1111-111111111111','Alex Rivera','Strategy Partner','Drives growth and GTM excellence across fintech and SaaS.','{"GTM","Pricing","Fintech","Board Prep"}','https://placehold.co/400x400?text=Profile','slack://user?team=ABC&id=DEF','https://calendly.com/placeholder','alex.rivera@example.com','https://linkedin.com/in/placeholder'),
  ('aa222222-2222-2222-2222-222222222222','Priya Desai','Data & AI Lead','Builds data platforms and ML pilots that ship quickly.','{"AI/ML","Analytics","Data Strategy","MLOps"}','https://placehold.co/400x400?text=Profile','slack://user?team=ABC&id=DEG','https://calendly.com/placeholder','priya.desai@example.com','https://linkedin.com/in/placeholder'),
  ('aa333333-3333-3333-3333-333333333333','Jordan Kim','Engagement Manager','Runs cross-functional sprints and client storytelling.','{"PMO","Storytelling","Workshops","Change"}','https://placehold.co/400x400?text=Profile','slack://user?team=ABC&id=DEH','https://calendly.com/placeholder','jordan.kim@example.com','https://linkedin.com/in/placeholder')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- KNOWLEDGE ASSETS
-- =============================================================================

INSERT INTO public.knowledge_assets (id, title, description, tags, last_updated, owner, link)
VALUES
  ('bb111111-1111-1111-1111-111111111111','PE Pitch MegaDeck','30-slide master narrative for private equity and diligence.','{"Pitch","PE","Narrative"}','2024-11-02','Alex Rivera','https://docs.google.com/placeholder'),
  ('bb222222-2222-2222-2222-222222222222','AI Discovery Template','Workshop template to uncover AI automation wins in 90 minutes.','{"AI","Workshop","Template"}','2024-10-15','Priya Desai','https://docs.google.com/placeholder'),
  ('bb333333-3333-3333-3333-333333333333','Operating Model Blueprint','Target org design and RACI for digital transformations.','{"Ops","Org Design","RACI"}','2024-09-28','Jordan Kim','https://docs.google.com/placeholder')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PROJECTS
-- =============================================================================

INSERT INTO public.projects (id, client, name, partner, stage, next_milestone, next_date, team, drive)
VALUES
  ('cc111111-1111-1111-1111-111111111111','Helio Bank','Digital KYC Reboot','Alex Rivera','Active','MVP pilot','2024-12-20','[{"name":"Priya Desai"},{"name":"Jordan Kim"}]','https://drive.google.com/placeholder'),
  ('cc222222-2222-2222-2222-222222222222','Northwind Energy','AI Ops Playbook','Priya Desai','Pitch','Exec pitch','2024-12-15','[{"name":"Alex Rivera"}]','https://drive.google.com/placeholder'),
  ('cc333333-3333-3333-3333-333333333333','Zen Health','Care Journey Redesign','Jordan Kim','Lead','Discovery','2024-12-05','[{"name":"Priya Desai"}]','https://drive.google.com/placeholder')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- WINS/BLOG POSTS
-- =============================================================================

INSERT INTO public.wins_posts (id, title, content, author, date, image, type, linkedin_url, excerpt, featured, tags)
VALUES
  ('dd111111-1111-1111-1111-111111111111','Closed Helio Bank','We landed the digital KYC rebuild with a rapid 6-week pilot.','Alex Rivera','2024-11-10','https://placehold.co/800x450?text=Placeholder','internal',NULL,NULL,false,'{}'),
  ('dd222222-2222-2222-2222-222222222222','AI Lab Launched','Stood up a reusable AI lab with governance in under a month.','Priya Desai','2024-10-22','https://placehold.co/800x450?text=Placeholder','internal',NULL,NULL,false,'{}')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- OOO EVENTS
-- =============================================================================

INSERT INTO public.ooo_events (id, person, type, location, start_date, end_date, notes)
VALUES
  ('ee111111-1111-1111-1111-111111111111','Alex Rivera','OOO','Lisbon','2024-12-12','2024-12-18','Partial availability in evenings.'),
  ('ee222222-2222-2222-2222-222222222222','Priya Desai','Travel','NYC - Client','2024-12-04','2024-12-06','On-site with Helio Bank.')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- QUICK LINKS
-- =============================================================================

INSERT INTO public.quick_links (id, label, description, icon, url)
VALUES
  ('ff111111-1111-1111-1111-111111111111','Proposals Drive','Templates and signed pitch assets','Folder','https://drive.google.com/proposals'),
  ('ff222222-2222-2222-2222-222222222222','Expenses','Submit expenses in 60 seconds','Receipt','https://example.com/expenses'),
  ('ff333333-3333-3333-3333-333333333333','Time Tracking','Toggl workspace','Clock','https://toggl.com/placeholder'),
  ('ff444444-4444-4444-4444-444444444444','VPN','Secure client access','Shield','https://example.com/vpn')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CLIENT FEEDBACK
-- =============================================================================

INSERT INTO public.client_feedback (id, message, client_name, client_email)
VALUES
  ('gg111111-1111-1111-1111-111111111111','Team was responsive and pragmatic. Loved the concise updates.',NULL,NULL)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- RESOURCE BOOKINGS
-- =============================================================================

INSERT INTO public.resource_bookings (id, resource, start, "end", booked_by)
VALUES
  ('hh111111-1111-1111-1111-111111111111','Room A','2024-12-05T14:00:00Z','2024-12-05T15:00:00Z','Alex Rivera'),
  ('hh222222-2222-2222-2222-222222222222','Laptop 1','2024-12-06T09:00:00Z','2024-12-06T12:00:00Z','Priya Desai')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- POLLS
-- =============================================================================

INSERT INTO public.polls (id, question)
VALUES
  ('ii111111-1111-1111-1111-111111111111','Best date for the offsite?'),
  ('ii222222-2222-2222-2222-222222222222','Which client gift box?')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- POLL OPTIONS
-- =============================================================================

INSERT INTO public.poll_options (id, poll_id, label, votes)
VALUES
  ('io111111-1111-1111-1111-111111111111','ii111111-1111-1111-1111-111111111111','Jan 10',5),
  ('io222222-2222-2222-2222-222222222222','ii111111-1111-1111-1111-111111111111','Jan 17',8),
  ('io333333-3333-3333-3333-333333333333','ii111111-1111-1111-1111-111111111111','Jan 24',3),
  ('io444444-4444-4444-4444-444444444444','ii222222-2222-2222-2222-222222222222','Local artisan foods',6),
  ('io555555-5555-5555-5555-555555555555','ii222222-2222-2222-2222-222222222222','Portable chargers',4),
  ('io666666-6666-6666-6666-666666666666','ii222222-2222-2222-2222-222222222222','Desk plants',7)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- FITNESS SAMPLE DATA
-- =============================================================================

-- Fitness client (linked to your profile)
INSERT INTO public.fitness_clients (id, name, email, notes)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'David C', 'qrafzv0123@gmail.com', 'Primary fitness client')
ON CONFLICT (name) DO NOTHING;

-- Sample exercises
INSERT INTO public.exercises (id, name, category, muscle_groups, equipment, instructions, difficulty, is_time_based)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Barbell Squat', 'strength', ARRAY['quads', 'glutes', 'hamstrings'], ARRAY['barbell', 'squat rack'], 'Stand with feet shoulder-width apart, lower until thighs are parallel to ground, then drive up through heels.', 'intermediate', false),
  ('550e8400-e29b-41d4-a716-446655440002', 'Bench Press', 'strength', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['barbell', 'bench'], 'Lie on bench, grip bar slightly wider than shoulders, lower to chest, then press up explosively.', 'intermediate', false),
  ('550e8400-e29b-41d4-a716-446655440003', 'Deadlift', 'strength', ARRAY['hamstrings', 'glutes', 'back'], ARRAY['barbell'], 'Stand with feet hip-width apart, hinge at hips to grip bar, keep back straight, drive through heels to stand up.', 'advanced', false),
  ('550e8400-e29b-41d4-a716-446655440008', 'Plank', 'strength', ARRAY['core', 'shoulders'], ARRAY['bodyweight'], 'Start in push-up position with forearms on ground, body in straight line from head to heels. Hold position without letting hips sag or pike up.', 'intermediate', true),
  ('550e8400-e29b-41d4-a716-446655440009', 'Wall Sit', 'strength', ARRAY['quads', 'glutes'], ARRAY['wall'], 'Lean against wall with feet shoulder-width apart, slide down until knees are at 90 degrees. Hold position with back flat against wall.', 'intermediate', true)
ON CONFLICT (id) DO NOTHING;

-- Sample workout template
INSERT INTO public.workout_templates (id, client_id, name, description)
VALUES ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Full Body Strength', 'Complete strength workout hitting all major muscle groups')
ON CONFLICT (id) DO NOTHING;

-- Sample template exercises
INSERT INTO public.template_exercises (id, template_id, exercise_id, sets, reps, weight, rest_seconds, sort_order)
VALUES
  ('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 3, 8, 225.0, 120, 1),
  ('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 3, 10, 185.0, 90, 2),
  ('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 3, 5, 315.0, 180, 3)
ON CONFLICT (id) DO NOTHING;
