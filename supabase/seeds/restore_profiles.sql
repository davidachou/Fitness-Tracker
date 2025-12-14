-- Seed file to restore profiles data
-- Generated from database backup before schema reset
-- Run after: npx supabase db reset

INSERT INTO public.profiles (id, email, full_name, role, avatar_url, is_admin, created_at, updated_at, bio)
VALUES
  ('b2738339-2b67-48ff-981f-a33d4f426166', 'david@kkadvisory.org', 'David CC', 'Client', NULL, false, '2025-12-13 06:00:47.282909+00', '2025-12-13 06:00:47.282909+00', 'Bio'),
  ('6c993260-abfa-40c3-93b5-d61aab7f5286', 'qrafzv0123@gmail.com', 'David Chou', 'admin', NULL, true, '2025-12-12 22:27:40.277272+00', '2025-12-13 16:24:29.173099+00', 'Bio')
ON CONFLICT (id) DO NOTHING;
