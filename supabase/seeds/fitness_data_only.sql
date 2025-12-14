-- Fitness Data Only Seed
-- Contains only fitness-related sample data
-- Uses different IDs to avoid conflicts with existing data

-- =============================================================================
-- FITNESS SAMPLE DATA
-- =============================================================================

-- Fitness client (using a different ID to avoid conflicts)
INSERT INTO public.fitness_clients (id, name, email, notes)
VALUES ('660e8400-e29b-41d4-a716-446655440000', 'Sample Client', 'sample@example.com', 'Sample fitness client - update with real user email')
ON CONFLICT (name) DO NOTHING;

-- Sample exercises (using different IDs)
INSERT INTO public.exercises (id, name, category, muscle_groups, equipment, instructions, difficulty, is_time_based)
VALUES
  ('660e8400-e29b-41d4-a716-446655440001', 'Barbell Squat', 'strength', ARRAY['quads', 'glutes', 'hamstrings'], ARRAY['barbell', 'squat rack'], 'Stand with feet shoulder-width apart, lower until thighs are parallel to ground, then drive up through heels.', 'intermediate', false),
  ('660e8400-e29b-41d4-a716-446655440002', 'Bench Press', 'strength', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['barbell', 'bench'], 'Lie on bench, grip bar slightly wider than shoulders, lower to chest, then press up explosively.', 'intermediate', false),
  ('660e8400-e29b-41d4-a716-446655440003', 'Deadlift', 'strength', ARRAY['hamstrings', 'glutes', 'back'], ARRAY['barbell'], 'Stand with feet hip-width apart, hinge at hips to grip bar, keep back straight, drive through heels to stand up.', 'advanced', false),
  ('660e8400-e29b-41d4-a716-446655440008', 'Plank', 'strength', ARRAY['core', 'shoulders'], ARRAY['bodyweight'], 'Start in push-up position with forearms on ground, body in straight line from head to heels. Hold position without letting hips sag or pike up.', 'intermediate', true),
  ('660e8400-e29b-41d4-a716-446655440009', 'Wall Sit', 'strength', ARRAY['quads', 'glutes'], ARRAY['wall'], 'Lean against wall with feet shoulder-width apart, slide down until knees are at 90 degrees. Hold position with back flat against wall.', 'intermediate', true)
ON CONFLICT (id) DO NOTHING;

-- Sample workout template (using different ID and referencing the new client)
INSERT INTO public.workout_templates (id, client_id, name, description)
VALUES ('660e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440000', 'Full Body Strength', 'Complete strength workout hitting all major muscle groups')
ON CONFLICT (id) DO NOTHING;

-- Sample template exercises (using different IDs)
INSERT INTO public.template_exercises (id, template_id, exercise_id, sets, reps, weight, rest_seconds, sort_order)
VALUES
  ('660e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', 3, 8, 225.0, 120, 1),
  ('660e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', 3, 10, 185.0, 90, 2),
  ('660e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440003', 3, 5, 315.0, 180, 3)
ON CONFLICT (id) DO NOTHING;