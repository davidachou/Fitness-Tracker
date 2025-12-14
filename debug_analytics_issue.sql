-- Diagnostic queries for analytics page issue

-- 1. Check if user has a fitness client profile
SELECT
  'User fitness client' as check_type,
  fc.id as client_id,
  fc.name as client_name,
  fc.email,
  fc.is_active
FROM fitness_clients fc
WHERE fc.email = 'qrafzv0123@gmail.com' AND fc.is_active = true;

-- 2. Check workout sessions for this client
SELECT
  'Workout sessions' as check_type,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_sessions,
  MIN(started_at) as earliest_session,
  MAX(started_at) as latest_session
FROM workout_sessions ws
WHERE ws.client_id IN (
  SELECT fc.id FROM fitness_clients fc
  WHERE fc.email = 'qrafzv0123@gmail.com' AND fc.is_active = true
);

-- 3. Check recent workout sessions (last 30 days)
SELECT
  'Recent sessions (30 days)' as check_type,
  ws.id,
  ws.started_at,
  ws.completed_at,
  ws.status,
  ws.template_name,
  ws.duration_seconds
FROM workout_sessions ws
WHERE ws.client_id IN (
  SELECT fc.id FROM fitness_clients fc
  WHERE fc.email = 'qrafzv0123@gmail.com' AND fc.is_active = true
)
AND ws.started_at >= NOW() - INTERVAL '30 days'
ORDER BY ws.started_at DESC
LIMIT 10;

-- 4. Check exercise logs for this client's sessions
SELECT
  'Exercise logs' as check_type,
  COUNT(*) as total_exercise_logs,
  COUNT(DISTINCT el.session_id) as sessions_with_logs,
  MIN(el.completed_at) as earliest_log,
  MAX(el.completed_at) as latest_log
FROM exercise_logs el
WHERE el.session_id IN (
  SELECT ws.id FROM workout_sessions ws
  WHERE ws.client_id IN (
    SELECT fc.id FROM fitness_clients fc
    WHERE fc.email = 'qrafzv0123@gmail.com' AND fc.is_active = true
  )
);

-- 5. Check recent exercise logs (last 30 days)
SELECT
  'Recent exercise logs (30 days)' as check_type,
  el.id,
  el.session_id,
  el.exercise_name,
  el.sets_completed,
  el.reps_completed,
  el.weight_used,
  el.completed_at,
  ws.template_name,
  ws.started_at as session_started
FROM exercise_logs el
JOIN workout_sessions ws ON el.session_id = ws.id
WHERE ws.client_id IN (
  SELECT fc.id FROM fitness_clients fc
  WHERE fc.email = 'qrafzv0123@gmail.com' AND fc.is_active = true
)
AND el.completed_at >= NOW() - INTERVAL '30 days'
ORDER BY el.completed_at DESC
LIMIT 20;

-- 6. Check if there are any sessions without exercise logs
SELECT
  'Sessions without logs' as check_type,
  COUNT(*) as sessions_without_logs
FROM workout_sessions ws
WHERE ws.client_id IN (
  SELECT fc.id FROM fitness_clients fc
  WHERE fc.email = 'qrafzv0123@gmail.com' AND fc.is_active = true
)
AND ws.status = 'completed'
AND ws.id NOT IN (
  SELECT DISTINCT el.session_id FROM exercise_logs el
);

-- 7. Check exercise name distribution
SELECT
  'Exercise frequency' as check_type,
  el.exercise_name,
  COUNT(*) as count,
  MAX(el.completed_at) as last_used
FROM exercise_logs el
WHERE el.session_id IN (
  SELECT ws.id FROM workout_sessions ws
  WHERE ws.client_id IN (
    SELECT fc.id FROM fitness_clients fc
    WHERE fc.email = 'qrafzv0123@gmail.com' AND fc.is_active = true
  )
)
AND el.exercise_name IS NOT NULL
AND el.exercise_name != ''
GROUP BY el.exercise_name
ORDER BY count DESC
LIMIT 10;
