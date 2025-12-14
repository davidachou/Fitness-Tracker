-- Fitness-Only Seed Data
-- Run this after migrations to populate only fitness-related tables
-- Execute in Supabase SQL Editor or via push

-- =============================================================================
-- PROFILES (including your restored profiles)
-- =============================================================================

INSERT INTO public.profiles (id, email, full_name, role, avatar_url, is_admin, created_at, updated_at, bio)
VALUES
  ('b2738339-2b67-48ff-981f-a33d4f426166', 'david@kkadvisory.org', 'David CC', 'Client', NULL, false, '2025-12-13 06:00:47.282909+00', '2025-12-13 06:00:47.282909+00', 'Bio'),
  ('6c993260-abfa-40c3-93b5-d61aab7f5286', 'qrafzv0123@gmail.com', 'David Chou', 'admin', NULL, true, '2025-12-12 22:27:40.277272+00', '2025-12-13 16:24:29.173099+00', 'Bio')
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
