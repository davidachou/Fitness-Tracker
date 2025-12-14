-- Verification script for Template vs Instance Pattern migration
-- Run this after applying the migration to ensure everything worked

-- 1. Check that new tables were created and populated
SELECT
  'Migration Verification' as check_type,
  (SELECT COUNT(*) FROM public.workout_templates) as templates_created,
  (SELECT COUNT(*) FROM public.template_exercises) as template_exercises_created,
  (SELECT COUNT(*) FROM public.workout_sessions WHERE template_id IS NOT NULL) as sessions_with_templates,
  (SELECT COUNT(*) FROM public.exercise_logs WHERE template_exercise_id IS NOT NULL) as logs_with_template_refs,
  (SELECT COUNT(*) FROM public.workout_sessions WHERE template_snapshot IS NOT NULL) as sessions_with_snapshots;

-- 2. Check that workout_sessions have template references
SELECT
  ws.id,
  ws.template_id,
  ws.template_name,
  ws.template_snapshot->>'name' as snapshot_name,
  ws.template_snapshot->>'exercise_count' as exercise_count
FROM public.workout_sessions ws
WHERE ws.template_id IS NOT NULL
LIMIT 5;

-- 3. Verify exercise_logs have template references
SELECT
  el.id,
  el.workout_exercise_id,
  el.template_exercise_id,
  te.exercise_id as template_exercise_id_valid,
  el.exercise_name
FROM public.exercise_logs el
LEFT JOIN public.template_exercises te ON el.template_exercise_id = te.id
WHERE el.template_exercise_id IS NOT NULL
LIMIT 5;

-- 4. Check template data integrity
SELECT
  wt.name as template_name,
  COUNT(te.id) as exercises_in_template,
  COUNT(ws.id) as sessions_using_template
FROM public.workout_templates wt
LEFT JOIN public.template_exercises te ON wt.id = te.template_id
LEFT JOIN public.workout_sessions ws ON wt.id = ws.template_id
GROUP BY wt.id, wt.name
ORDER BY sessions_using_template DESC
LIMIT 10;

-- 5. Verify no orphaned data (should be minimal/none)
SELECT
  'Data Integrity Check' as check_type,
  (SELECT COUNT(*) FROM public.workout_sessions WHERE template_id IS NULL) as sessions_without_templates,
  (SELECT COUNT(*) FROM public.exercise_logs WHERE exercise_name IS NULL OR exercise_name = '') as logs_without_names,
  (SELECT COUNT(*) FROM public.exercise_logs WHERE template_exercise_id IS NULL) as logs_without_template_refs;

-- 6. Test that analytics queries still work
SELECT
  'Analytics Compatibility' as check_type,
  (SELECT COUNT(*) FROM public.exercise_logs WHERE planned_sets IS NOT NULL) as logs_with_planned_data,
  (SELECT COUNT(DISTINCT ws.client_id) FROM public.workout_sessions ws) as active_clients;
