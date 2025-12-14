-- Fix blank exercise names in exercise_logs table
-- This updates existing logs that have empty exercise_name fields

UPDATE exercise_logs
SET exercise_name = e.name
FROM workout_exercises we
JOIN exercises e ON we.exercise_id = e.id
WHERE exercise_logs.workout_exercise_id = we.id
  AND (exercise_logs.exercise_name IS NULL OR exercise_logs.exercise_name = '');

-- Verify the fix worked
SELECT
  COUNT(*) as total_logs,
  COUNT(CASE WHEN exercise_name IS NULL OR exercise_name = '' THEN 1 END) as blank_names,
  COUNT(CASE WHEN exercise_name IS NOT NULL AND exercise_name != '' THEN 1 END) as fixed_names
FROM exercise_logs;
