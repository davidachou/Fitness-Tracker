-- Verification script for exercise names fix
-- Run this after applying the migration to confirm it worked

-- Check overall statistics
SELECT
  'Exercise Logs Summary' as metric,
  COUNT(*) as total_logs,
  COUNT(CASE WHEN exercise_name IS NULL OR exercise_name = '' THEN 1 END) as blank_names,
  COUNT(CASE WHEN exercise_name IS NOT NULL AND exercise_name != '' THEN 1 END) as named_logs,
  ROUND(
    COUNT(CASE WHEN exercise_name IS NOT NULL AND exercise_name != '' THEN 1 END)::decimal /
    NULLIF(COUNT(*), 0) * 100, 1
  ) as fix_percentage
FROM exercise_logs;

-- Check by workout
SELECT
  w.name as workout_name,
  COUNT(el.id) as total_logs,
  COUNT(CASE WHEN el.exercise_name IS NOT NULL AND el.exercise_name != '' THEN 1 END) as named_logs,
  COUNT(CASE WHEN el.exercise_name IS NULL OR el.exercise_name = '' THEN 1 END) as blank_logs
FROM workouts w
LEFT JOIN workout_sessions ws ON w.id = ws.workout_id
LEFT JOIN exercise_logs el ON ws.id = el.session_id
GROUP BY w.id, w.name
ORDER BY w.name;

-- Sample of fixed logs
SELECT
  ws.started_at,
  w.name as workout_name,
  el.exercise_name,
  el.sets_completed,
  el.reps_completed,
  el.weight_used
FROM workout_sessions ws
JOIN workouts w ON ws.workout_id = w.id
JOIN exercise_logs el ON ws.id = el.session_id
WHERE el.exercise_name IS NOT NULL AND el.exercise_name != ''
ORDER BY ws.started_at DESC
LIMIT 10;
