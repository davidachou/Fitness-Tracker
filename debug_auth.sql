-- Debug authentication and RLS issues

-- 1. Check current user authentication
SELECT
  auth.uid() as current_user_id,
  auth.jwt() ->> 'email' as user_email;

-- 2. Check if user exists in profiles table
SELECT
  id,
  email,
  full_name,
  is_admin
FROM profiles
WHERE id = auth.uid();

-- 3. Check fitness_clients access
SELECT
  fc.id,
  fc.name,
  fc.email,
  p.email as profile_email
FROM fitness_clients fc
LEFT JOIN profiles p ON fc.email = p.email
WHERE fc.email = (SELECT email FROM profiles WHERE id = auth.uid())
  AND fc.is_active = true;

-- 4. Check workout_templates access (new table)
SELECT
  wt.id,
  wt.name,
  wt.client_id,
  fc.name as client_name
FROM workout_templates wt
JOIN fitness_clients fc ON wt.client_id = fc.id
WHERE wt.client_id IN (
  SELECT fc2.id FROM fitness_clients fc2
  WHERE fc2.email = (SELECT email FROM profiles WHERE id = auth.uid())
);

-- 5. Temporarily disable RLS to test (run this if queries above fail)
-- ALTER TABLE fitness_clients DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE workout_templates DISABLE ROW LEVEL SECURITY;
