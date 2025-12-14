-- Debug script to check analytics data
-- Run this in Supabase SQL Editor to see what data exists

-- 1. Check fitness clients
SELECT 'Fitness Clients' as section, COUNT(*) as count FROM fitness_clients;
SELECT id, name, email, is_active, created_at FROM fitness_clients ORDER BY created_at DESC;

-- 2. Check workout sessions
SELECT 'Workout Sessions' as section, COUNT(*) as count FROM workout_sessions;
SELECT
  id,
  client_id,
  template_name,
  status,
  started_at,
  completed_at,
  duration_seconds,
  created_at
FROM workout_sessions
ORDER BY started_at DESC
LIMIT 10;

-- 3. Check exercise logs
SELECT 'Exercise Logs' as section, COUNT(*) as count FROM exercise_logs;
SELECT
  id,
  session_id,
  exercise_name,
  sets_completed,
  reps_completed,
  weight_used,
  completed_at,
  created_at
FROM exercise_logs
ORDER BY completed_at DESC
LIMIT 10;

-- 4. Check if sessions have associated logs
SELECT
  'Sessions with logs' as section,
  COUNT(DISTINCT ws.id) as sessions_with_logs
FROM workout_sessions ws
JOIN exercise_logs el ON ws.id = el.session_id
WHERE ws.status = 'completed';

-- 5. Check sessions without logs
SELECT
  'Sessions without logs' as section,
  COUNT(DISTINCT ws.id) as sessions_without_logs
FROM workout_sessions ws
LEFT JOIN exercise_logs el ON ws.id = el.session_id
WHERE el.id IS NULL AND ws.status = 'completed';

-- 6. Check recent sessions for a specific client (replace with actual client ID)
-- You'll need to replace 'your-client-id-here' with the actual client ID
-- SELECT * FROM workout_sessions WHERE client_id = 'your-client-id-here' ORDER BY started_at DESC;
