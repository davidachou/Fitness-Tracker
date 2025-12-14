-- Improved mock data with multiple workout templates and better consistency
-- Clear existing data first
DELETE FROM exercise_logs;
DELETE FROM workout_sessions;
DELETE FROM template_exercises;
DELETE FROM workout_templates;

-- Create multiple workout templates for variety
INSERT INTO workout_templates (client_id, name, description, created_by)
VALUES (
  '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid,
  'Full Body Strength',
  'Complete strength workout hitting all major muscle groups',
  '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid
);

INSERT INTO workout_templates (client_id, name, description, created_by)
VALUES (
  '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid,
  'Upper Body Focus',
  'Targeted upper body strength and muscle building',
  '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid
);

INSERT INTO workout_templates (client_id, name, description, created_by)
VALUES (
  '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid,
  'Core & Conditioning',
  'Core strength and cardiovascular endurance',
  '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid
);

-- Template exercises for Full Body Strength
INSERT INTO template_exercises (template_id, exercise_id, sets, reps, weight, rest_seconds, sort_order)
SELECT wt.id, '550e8400-e29b-41d4-a716-446655440001'::uuid, 3, 8, 135, 120, 1 FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO template_exercises (template_id, exercise_id, sets, reps, weight, rest_seconds, sort_order)
SELECT wt.id, '550e8400-e29b-41d4-a716-446655440002'::uuid, 3, 10, 135, 90, 2 FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO template_exercises (template_id, exercise_id, sets, reps, weight, rest_seconds, sort_order)
SELECT wt.id, '550e8400-e29b-41d4-a716-446655440003'::uuid, 3, 5, 225, 180, 3 FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO template_exercises (template_id, exercise_id, sets, reps, rest_seconds, sort_order)
SELECT wt.id, '550e8400-e29b-41d4-a716-446655440008'::uuid, 1, 1, 60, 4 FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

-- Template exercises for Upper Body Focus
INSERT INTO template_exercises (template_id, exercise_id, sets, reps, weight, rest_seconds, sort_order)
SELECT wt.id, '550e8400-e29b-41d4-a716-446655440002'::uuid, 4, 8, 145, 90, 1 FROM workout_templates wt WHERE wt.name = 'Upper Body Focus';

INSERT INTO template_exercises (template_id, exercise_id, sets, reps, weight, rest_seconds, sort_order)
SELECT wt.id, '550e8400-e29b-41d4-a716-446655440001'::uuid, 3, 10, 125, 120, 2 FROM workout_templates wt WHERE wt.name = 'Upper Body Focus';

INSERT INTO template_exercises (template_id, exercise_id, sets, reps, rest_seconds, sort_order)
SELECT wt.id, '550e8400-e29b-41d4-a716-446655440008'::uuid, 1, 1, 45, 3 FROM workout_templates wt WHERE wt.name = 'Upper Body Focus';

-- Template exercises for Core & Conditioning
INSERT INTO template_exercises (template_id, exercise_id, sets, reps, rest_seconds, sort_order)
SELECT wt.id, '550e8400-e29b-41d4-a716-446655440008'::uuid, 3, 1, 60, 1 FROM workout_templates wt WHERE wt.name = 'Core & Conditioning';

INSERT INTO template_exercises (template_id, exercise_id, sets, reps, rest_seconds, sort_order)
SELECT wt.id, '550e8400-e29b-41d4-a716-446655440009'::uuid, 3, 1, 45, 2 FROM workout_templates wt WHERE wt.name = 'Core & Conditioning';

-- Create workout sessions using different templates for variety
-- Full Body Strength sessions (most common)
INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '42 minutes', 2520, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '38 minutes', 2280, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days' + INTERVAL '45 minutes', 2700, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '40 minutes', 2400, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

-- Upper Body Focus sessions
-- Additional Full Body Strength sessions for better consistency
INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days' + INTERVAL '32 minutes', 1920, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days' + INTERVAL '39 minutes', 2340, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '29 days', NOW() - INTERVAL '29 days' + INTERVAL '37 minutes', 2220, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '36 days', NOW() - INTERVAL '36 days' + INTERVAL '42 minutes', 2520, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '43 days', NOW() - INTERVAL '43 days' + INTERVAL '39 minutes', 2340, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days' + INTERVAL '44 minutes', 2640, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '57 days', NOW() - INTERVAL '57 days' + INTERVAL '37 minutes', 2220, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '64 days', NOW() - INTERVAL '64 days' + INTERVAL '41 minutes', 2460, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '71 days', NOW() - INTERVAL '71 days' + INTERVAL '40 minutes', 2400, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

-- Upper Body Focus sessions
INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Upper Body Focus', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days' + INTERVAL '35 minutes', 2100, 'completed' FROM workout_templates wt WHERE wt.name = 'Upper Body Focus';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Upper Body Focus', NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days' + INTERVAL '41 minutes', 2460, 'completed' FROM workout_templates wt WHERE wt.name = 'Upper Body Focus';

-- Core & Conditioning sessions
INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Core & Conditioning', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days' + INTERVAL '48 minutes', 2880, 'completed' FROM workout_templates wt WHERE wt.name = 'Core & Conditioning';

-- Additional Full Body Strength sessions
INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days' + INTERVAL '32 minutes', 1920, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days' + INTERVAL '39 minutes', 2340, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '29 days', NOW() - INTERVAL '29 days' + INTERVAL '37 minutes', 2220, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '36 days', NOW() - INTERVAL '36 days' + INTERVAL '42 minutes', 2520, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '43 days', NOW() - INTERVAL '43 days' + INTERVAL '39 minutes', 2340, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days' + INTERVAL '44 minutes', 2640, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '57 days', NOW() - INTERVAL '57 days' + INTERVAL '37 minutes', 2220, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '64 days', NOW() - INTERVAL '64 days' + INTERVAL '41 minutes', 2460, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

INSERT INTO workout_sessions (client_id, conducted_by, template_id, template_name, started_at, completed_at, duration_seconds, status)
SELECT '719bcfb8-f0f7-4a44-a677-d484879e88a2'::uuid, '342daf0e-8f8e-4802-a9bc-d1970640ef61'::uuid, wt.id, 'Full Body Strength', NOW() - INTERVAL '71 days', NOW() - INTERVAL '71 days' + INTERVAL '40 minutes', 2400, 'completed' FROM workout_templates wt WHERE wt.name = 'Full Body Strength';

-- Create exercise logs using separate INSERT statements to avoid UNION type issues
-- Full Body Strength - recent session (3 days ago)
INSERT INTO exercise_logs (session_id, template_exercise_id, exercise_id, sets_completed, reps_completed, weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at)
SELECT ws.id, te.id, '550e8400-e29b-41d4-a716-446655440001'::uuid, 3, 8, 155, 3, 8, 135, 'Barbell Squat', ws.started_at + INTERVAL '5 minutes'
FROM workout_sessions ws
JOIN template_exercises te ON ws.template_id = te.template_id
WHERE ws.template_name = 'Full Body Strength' AND te.exercise_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
AND ws.started_at >= NOW() - INTERVAL '4 days';

INSERT INTO exercise_logs (session_id, template_exercise_id, exercise_id, sets_completed, reps_completed, weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at)
SELECT ws.id, te.id, '550e8400-e29b-41d4-a716-446655440002'::uuid, 3, 10, 155, 3, 10, 135, 'Bench Press', ws.started_at + INTERVAL '15 minutes'
FROM workout_sessions ws
JOIN template_exercises te ON ws.template_id = te.template_id
WHERE ws.template_name = 'Full Body Strength' AND te.exercise_id = '550e8400-e29b-41d4-a716-446655440002'::uuid
AND ws.started_at >= NOW() - INTERVAL '4 days';

INSERT INTO exercise_logs (session_id, template_exercise_id, exercise_id, sets_completed, reps_completed, weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at)
SELECT ws.id, te.id, '550e8400-e29b-41d4-a716-446655440003'::uuid, 3, 5, 245, 3, 5, 225, 'Deadlift', ws.started_at + INTERVAL '25 minutes'
FROM workout_sessions ws
JOIN template_exercises te ON ws.template_id = te.template_id
WHERE ws.template_name = 'Full Body Strength' AND te.exercise_id = '550e8400-e29b-41d4-a716-446655440003'::uuid
AND ws.started_at >= NOW() - INTERVAL '4 days';

INSERT INTO exercise_logs (session_id, template_exercise_id, exercise_id, sets_completed, reps_completed, time_completed, planned_sets, planned_reps, planned_duration_seconds, exercise_name, completed_at)
SELECT ws.id, te.id, '550e8400-e29b-41d4-a716-446655440008'::uuid, 1, 1, 75, 1, 1, 60, 'Plank', ws.started_at + INTERVAL '42 minutes'
FROM workout_sessions ws
JOIN template_exercises te ON ws.template_id = te.template_id
WHERE ws.template_name = 'Full Body Strength' AND te.exercise_id = '550e8400-e29b-41d4-a716-446655440008'::uuid
AND ws.started_at >= NOW() - INTERVAL '4 days';

-- Upper Body Focus session (12 days ago)
INSERT INTO exercise_logs (session_id, template_exercise_id, exercise_id, sets_completed, reps_completed, weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at)
SELECT ws.id, te.id, '550e8400-e29b-41d4-a716-446655440002'::uuid, 4, 8, 145, 4, 8, 145, 'Bench Press', ws.started_at + INTERVAL '5 minutes'
FROM workout_sessions ws
JOIN template_exercises te ON ws.template_id = te.template_id
WHERE ws.template_name = 'Upper Body Focus' AND te.exercise_id = '550e8400-e29b-41d4-a716-446655440002'::uuid;

INSERT INTO exercise_logs (session_id, template_exercise_id, exercise_id, sets_completed, reps_completed, weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at)
SELECT ws.id, te.id, '550e8400-e29b-41d4-a716-446655440001'::uuid, 3, 10, 125, 3, 10, 125, 'Barbell Squat', ws.started_at + INTERVAL '15 minutes'
FROM workout_sessions ws
JOIN template_exercises te ON ws.template_id = te.template_id
WHERE ws.template_name = 'Upper Body Focus' AND te.exercise_id = '550e8400-e29b-41d4-a716-446655440001'::uuid;

INSERT INTO exercise_logs (session_id, template_exercise_id, exercise_id, sets_completed, reps_completed, time_completed, planned_sets, planned_reps, planned_duration_seconds, exercise_name, completed_at)
SELECT ws.id, te.id, '550e8400-e29b-41d4-a716-446655440008'::uuid, 1, 1, 50, 1, 1, 45, 'Plank', ws.started_at + INTERVAL '25 minutes'
FROM workout_sessions ws
JOIN template_exercises te ON ws.template_id = te.template_id
WHERE ws.template_name = 'Upper Body Focus' AND te.exercise_id = '550e8400-e29b-41d4-a716-446655440008'::uuid;

-- Additional exercise logs for newer Full Body Strength sessions
INSERT INTO exercise_logs (session_id, template_exercise_id, exercise_id, sets_completed, reps_completed, weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at)
SELECT ws.id, te.id, '550e8400-e29b-41d4-a716-446655440001'::uuid, 2, 6, 125, 3, 8, 135, 'Barbell Squat', ws.started_at + INTERVAL '3 minutes'
FROM workout_sessions ws
JOIN template_exercises te ON ws.template_id = te.template_id
WHERE ws.template_name = 'Full Body Strength' AND te.exercise_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
AND ws.started_at >= NOW() - INTERVAL '26 days' AND ws.started_at < NOW() - INTERVAL '20 days';

INSERT INTO exercise_logs (session_id, template_exercise_id, exercise_id, sets_completed, reps_completed, weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at)
SELECT ws.id, te.id, '550e8400-e29b-41d4-a716-446655440002'::uuid, 2, 7, 125, 3, 10, 135, 'Bench Press', ws.started_at + INTERVAL '10 minutes'
FROM workout_sessions ws
JOIN template_exercises te ON ws.template_id = te.template_id
WHERE ws.template_name = 'Full Body Strength' AND te.exercise_id = '550e8400-e29b-41d4-a716-446655440002'::uuid
AND ws.started_at >= NOW() - INTERVAL '26 days' AND ws.started_at < NOW() - INTERVAL '20 days';

INSERT INTO exercise_logs (session_id, template_exercise_id, exercise_id, sets_completed, reps_completed, weight_used, planned_sets, planned_reps, planned_weight, exercise_name, completed_at)
SELECT ws.id, te.id, '550e8400-e29b-41d4-a716-446655440003'::uuid, 2, 3, 205, 3, 5, 225, 'Deadlift', ws.started_at + INTERVAL '18 minutes'
FROM workout_sessions ws
JOIN template_exercises te ON ws.template_id = te.template_id
WHERE ws.template_name = 'Full Body Strength' AND te.exercise_id = '550e8400-e29b-41d4-a716-446655440003'::uuid
AND ws.started_at >= NOW() - INTERVAL '26 days' AND ws.started_at < NOW() - INTERVAL '20 days';

INSERT INTO exercise_logs (session_id, template_exercise_id, exercise_id, sets_completed, reps_completed, time_completed, planned_sets, planned_reps, planned_duration_seconds, exercise_name, completed_at)
SELECT ws.id, te.id, '550e8400-e29b-41d4-a716-446655440008'::uuid, 1, 1, 55, 1, 1, 60, 'Plank', ws.started_at + INTERVAL '29 minutes'
FROM workout_sessions ws
JOIN template_exercises te ON ws.template_id = te.template_id
WHERE ws.template_name = 'Full Body Strength' AND te.exercise_id = '550e8400-e29b-41d4-a716-446655440008'::uuid
AND ws.started_at >= NOW() - INTERVAL '26 days' AND ws.started_at < NOW() - INTERVAL '20 days';

-- Core & Conditioning session (15 days ago)
INSERT INTO exercise_logs (session_id, template_exercise_id, exercise_id, sets_completed, reps_completed, time_completed, planned_sets, planned_reps, planned_duration_seconds, exercise_name, completed_at)
SELECT ws.id, te.id, '550e8400-e29b-41d4-a716-446655440008'::uuid, 3, 1, 65, 3, 1, 60, 'Plank', ws.started_at + INTERVAL '5 minutes'
FROM workout_sessions ws
JOIN template_exercises te ON ws.template_id = te.template_id
WHERE ws.template_name = 'Core & Conditioning' AND te.exercise_id = '550e8400-e29b-41d4-a716-446655440008'::uuid
AND ws.started_at >= NOW() - INTERVAL '16 days';

INSERT INTO exercise_logs (session_id, template_exercise_id, exercise_id, sets_completed, reps_completed, time_completed, planned_sets, planned_reps, planned_duration_seconds, exercise_name, completed_at)
SELECT ws.id, te.id, '550e8400-e29b-41d4-a716-446655440009'::uuid, 3, 1, 50, 3, 1, 45, 'Wall Sit', ws.started_at + INTERVAL '25 minutes'
FROM workout_sessions ws
JOIN template_exercises te ON ws.template_id = te.template_id
WHERE ws.template_name = 'Core & Conditioning' AND te.exercise_id = '550e8400-e29b-41d4-a716-446655440009'::uuid
AND ws.started_at >= NOW() - INTERVAL '16 days';

COMMIT;
