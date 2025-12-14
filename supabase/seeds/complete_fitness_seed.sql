-- Complete Fitness Seed Data
-- Includes sample workout sessions and exercise logs for testing analytics

-- =============================================================================
-- SAMPLE WORKOUT SESSIONS AND EXERCISE LOGS
-- =============================================================================

-- Sample workout session 1 (completed 3 days ago)
INSERT INTO public.workout_sessions (id, client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
VALUES (
  '770e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000', -- David C
  '6c993260-abfa-40c3-93b5-d61aab7f5286', -- David Chou (admin)
  '550e8400-e29b-41d4-a716-446655440004',
  'Full Body Strength',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days' + INTERVAL '45 minutes',
  2700, -- 45 minutes
  'completed'
)
ON CONFLICT (id) DO NOTHING;

-- Sample workout session 2 (completed 1 week ago)
INSERT INTO public.workout_sessions (id, client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
VALUES (
  '770e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440000', -- David C
  '6c993260-abfa-40c3-93b5-d61aab7f5286', -- David Chou (admin)
  '550e8400-e29b-41d4-a716-446655440004',
  'Full Body Strength',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days' + INTERVAL '38 minutes',
  2280, -- 38 minutes
  'completed'
)
ON CONFLICT (id) DO NOTHING;

-- Sample workout session 3 (completed 2 weeks ago)
INSERT INTO public.workout_sessions (id, client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
VALUES (
  '770e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440000', -- David C
  '6c993260-abfa-40c3-93b5-d61aab7f5286', -- David Chou (admin)
  '550e8400-e29b-41d4-a716-446655440004',
  'Full Body Strength',
  NOW() - INTERVAL '14 days',
  NOW() - INTERVAL '14 days' + INTERVAL '52 minutes',
  3120, -- 52 minutes
  'completed'
)
ON CONFLICT (id) DO NOTHING;

-- Sample workout session 4 (completed 3 weeks ago - different workout)
INSERT INTO public.workout_sessions (id, client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
VALUES (
  '770e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440000', -- David C
  '6c993260-abfa-40c3-93b5-d61aab7f5286', -- David Chou (admin)
  NULL,
  'Upper Body Focus',
  NOW() - INTERVAL '21 days',
  NOW() - INTERVAL '21 days' + INTERVAL '35 minutes',
  2100, -- 35 minutes
  'completed'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXERCISE LOGS FOR SESSION 1 (3 days ago)
-- =============================================================================

-- Barbell Squat
INSERT INTO public.exercise_logs (
  id, session_id, template_exercise_id, exercise_id, sets_completed, reps_completed,
  weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at
)
VALUES (
  '880e8400-e29b-41d4-a716-446655440001',
  '770e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440001',
  3, 24, -- completed 3 sets of 8 reps each
  225.0,
  3, 8, 225.0,
  'Barbell Squat',
  NOW() - INTERVAL '3 days' + INTERVAL '10 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Bench Press
INSERT INTO public.exercise_logs (
  id, session_id, template_exercise_id, exercise_id, sets_completed, reps_completed,
  weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at
)
VALUES (
  '880e8400-e29b-41d4-a716-446655440002',
  '770e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440006',
  '550e8400-e29b-41d4-a716-446655440002',
  3, 30, -- completed 3 sets of 10 reps each
  185.0,
  3, 10, 185.0,
  'Bench Press',
  NOW() - INTERVAL '3 days' + INTERVAL '20 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Deadlift
INSERT INTO public.exercise_logs (
  id, session_id, template_exercise_id, exercise_id, sets_completed, reps_completed,
  weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at
)
VALUES (
  '880e8400-e29b-41d4-a716-446655440003',
  '770e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440007',
  '550e8400-e29b-41d4-a716-446655440003',
  3, 15, -- completed 3 sets of 5 reps each
  315.0,
  3, 5, 315.0,
  'Deadlift',
  NOW() - INTERVAL '3 days' + INTERVAL '35 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXERCISE LOGS FOR SESSION 2 (1 week ago)
-- =============================================================================

-- Barbell Squat (progress - heavier weight)
INSERT INTO public.exercise_logs (
  id, session_id, template_exercise_id, exercise_id, sets_completed, reps_completed,
  weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at
)
VALUES (
  '880e8400-e29b-41d4-a716-446655440004',
  '770e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440001',
  3, 24,
  235.0, -- increased weight
  3, 8, 225.0,
  'Barbell Squat',
  NOW() - INTERVAL '7 days' + INTERVAL '8 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Bench Press (same weight)
INSERT INTO public.exercise_logs (
  id, session_id, template_exercise_id, exercise_id, sets_completed, reps_completed,
  weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at
)
VALUES (
  '880e8400-e29b-41d4-a716-446655440005',
  '770e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440006',
  '550e8400-e29b-41d4-a716-446655440002',
  3, 30,
  185.0,
  3, 10, 185.0,
  'Bench Press',
  NOW() - INTERVAL '7 days' + INTERVAL '18 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Deadlift (progress)
INSERT INTO public.exercise_logs (
  id, session_id, template_exercise_id, exercise_id, sets_completed, reps_completed,
  weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at
)
VALUES (
  '880e8400-e29b-41d4-a716-446655440006',
  '770e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440007',
  '550e8400-e29b-41d4-a716-446655440003',
  3, 15,
  325.0, -- increased weight
  3, 5, 315.0,
  'Deadlift',
  NOW() - INTERVAL '7 days' + INTERVAL '30 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXERCISE LOGS FOR SESSION 3 (2 weeks ago)
-- =============================================================================

-- Barbell Squat
INSERT INTO public.exercise_logs (
  id, session_id, template_exercise_id, exercise_id, sets_completed, reps_completed,
  weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at
)
VALUES (
  '880e8400-e29b-41d4-a716-446655440007',
  '770e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440001',
  3, 24,
  215.0,
  3, 8, 225.0,
  'Barbell Squat',
  NOW() - INTERVAL '14 days' + INTERVAL '12 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Bench Press
INSERT INTO public.exercise_logs (
  id, session_id, template_exercise_id, exercise_id, sets_completed, reps_completed,
  weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at
)
VALUES (
  '880e8400-e29b-41d4-a716-446655440008',
  '770e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440006',
  '550e8400-e29b-41d4-a716-446655440002',
  3, 30,
  185.0,
  3, 10, 185.0,
  'Bench Press',
  NOW() - INTERVAL '7 days' + INTERVAL '22 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Deadlift
INSERT INTO public.exercise_logs (
  id, session_id, template_exercise_id, exercise_id, sets_completed, reps_completed,
  weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at
)
VALUES (
  '880e8400-e29b-41d4-a716-446655440009',
  '770e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440007',
  '550e8400-e29b-41d4-a716-446655440003',
  3, 15,
  305.0,
  3, 5, 315.0,
  'Deadlift',
  NOW() - INTERVAL '14 days' + INTERVAL '40 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXERCISE LOGS FOR SESSION 4 (3 weeks ago - Upper Body Focus)
-- =============================================================================

-- Bench Press (extra focus)
INSERT INTO public.exercise_logs (
  id, session_id, template_exercise_id, exercise_id, sets_completed, reps_completed,
  weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at
)
VALUES (
  '880e8400-e29b-41d4-a716-446655440010',
  '770e8400-e29b-41d4-a716-446655440004',
  NULL, -- No template exercise for custom workout
  '550e8400-e29b-41d4-a716-446655440002',
  4, 40, -- 4 sets of 10
  195.0, -- heavier for upper body focus
  4, 10, 185.0,
  'Bench Press',
  NOW() - INTERVAL '21 days' + INTERVAL '15 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Additional upper body exercise - Overhead Press (not in template)
INSERT INTO public.exercise_logs (
  id, session_id, template_exercise_id, exercise_id, sets_completed, reps_completed,
  weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at
)
VALUES (
  '880e8400-e29b-41d4-a716-446655440011',
  '770e8400-e29b-41d4-a716-446655440004',
  NULL,
  '550e8400-e29b-41d4-a716-446655440001', -- Using squat exercise ID for now (should create overhead press exercise)
  3, 24,
  135.0,
  3, 8, 135.0,
  'Overhead Press',
  NOW() - INTERVAL '21 days' + INTERVAL '25 minutes'
)
ON CONFLICT (id) DO NOTHING;
