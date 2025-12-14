-- Comprehensive diagnostic for exercise logging issues

-- 1. Check exercise logs with blank names
SELECT
  'Blank exercise names' as issue,
  COUNT(*) as count
FROM exercise_logs
WHERE exercise_name IS NULL OR exercise_name = '';

-- 2. Check if workout_exercises have valid exercise references
SELECT
  'Broken exercise references' as issue,
  COUNT(*) as count
FROM workout_exercises we
LEFT JOIN exercises e ON we.exercise_id = e.id
WHERE e.id IS NULL;

-- 3. Check sessions with missing exercise logs
SELECT
  'Sessions missing logs' as issue,
  COUNT(DISTINCT ws.id) as sessions_without_logs
FROM workout_sessions ws
LEFT JOIN exercise_logs el ON ws.id = el.session_id
WHERE el.id IS NULL AND ws.status = 'completed';

-- 4. Check exercises per workout
SELECT
  w.name as workout_name,
  COUNT(we.id) as exercises_in_workout,
  COUNT(CASE WHEN e.id IS NOT NULL THEN 1 END) as valid_exercises,
  COUNT(CASE WHEN e.id IS NULL THEN 1 END) as broken_exercises
FROM workouts w
LEFT JOIN workout_exercises we ON w.id = we.workout_id
LEFT JOIN exercises e ON we.exercise_id = e.id
GROUP BY w.id, w.name
ORDER BY w.name;

-- 5. Sample of recent logs with issues
SELECT
  ws.started_at,
  w.name as workout_name,
  el.exercise_name,
  el.sets_completed,
  el.reps_completed,
  CASE
    WHEN el.exercise_name IS NULL OR el.exercise_name = '' THEN 'BLANK NAME'
    ELSE 'OK'
  END as status
FROM workout_sessions ws
JOIN workouts w ON ws.workout_id = w.id
LEFT JOIN exercise_logs el ON ws.id = el.session_id
WHERE ws.started_at >= NOW() - INTERVAL '7 days'
ORDER BY ws.started_at DESC, el.created_at DESC
LIMIT 20;
