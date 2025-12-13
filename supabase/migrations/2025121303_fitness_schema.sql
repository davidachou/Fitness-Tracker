-- Fitness Tracking System Migration
-- Adds complete fitness tracking schema alongside existing time tracking

-- =============================================================================
-- FITNESS TRACKING SYSTEM
-- =============================================================================

-- Fitness clients table (separate from time tracking clients)
CREATE TABLE IF NOT EXISTS public.fitness_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Exercises library
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('strength', 'cardio', 'flexibility', 'sports')),
  muscle_groups TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  instructions TEXT,
  video_url TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Workout plans
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.fitness_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Planned exercises in workouts
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  sets INTEGER DEFAULT 3,
  reps INTEGER DEFAULT 10,
  weight NUMERIC,
  rest_seconds INTEGER DEFAULT 60,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout sessions (when workouts are performed)
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.fitness_clients(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- Exercise logs (actual performance during sessions)
CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  workout_exercise_id UUID NOT NULL REFERENCES public.workout_exercises(id),
  sets_completed INTEGER DEFAULT 0,
  reps_completed INTEGER DEFAULT 0,
  weight_used NUMERIC,
  rest_time_seconds INTEGER,
  notes TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on fitness tables
ALTER TABLE public.fitness_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- FITNESS POLICIES
-- =============================================================================

-- Fitness clients policies
CREATE POLICY "Admins can manage fitness clients" ON public.fitness_clients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can view their own fitness client profile" ON public.fitness_clients
  FOR SELECT USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- Exercises policies
CREATE POLICY "Admins can manage exercises" ON public.exercises
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can view exercises in their workouts" ON public.exercises
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.workout_exercises we
      JOIN public.workouts w ON w.id = we.workout_id
      WHERE we.exercise_id = exercises.id
        AND w.client_id IN (
          SELECT fc.id FROM public.fitness_clients fc
          WHERE fc.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        )
    )
  );

-- Workouts policies
CREATE POLICY "Admins can manage workouts" ON public.workouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can view their assigned workouts" ON public.workouts
  FOR SELECT USING (
    client_id IN (
      SELECT fc.id FROM public.fitness_clients fc
      WHERE fc.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Workout exercises policies
CREATE POLICY "Admins can manage workout exercises" ON public.workout_exercises
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can view exercises in their workouts" ON public.workout_exercises
  FOR SELECT USING (
    workout_id IN (
      SELECT w.id FROM public.workouts w
      WHERE w.client_id IN (
        SELECT fc.id FROM public.fitness_clients fc
        WHERE fc.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

-- Workout sessions policies
CREATE POLICY "Admins can manage workout sessions" ON public.workout_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can manage their workout sessions" ON public.workout_sessions
  FOR ALL USING (
    client_id IN (
      SELECT fc.id FROM public.fitness_clients fc
      WHERE fc.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Exercise logs policies
CREATE POLICY "Admins can manage exercise logs" ON public.exercise_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can manage their exercise logs" ON public.exercise_logs
  FOR ALL USING (
    session_id IN (
      SELECT ws.id FROM public.workout_sessions ws
      WHERE ws.client_id IN (
        SELECT fc.id FROM public.fitness_clients fc
        WHERE fc.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS fitness_clients_email_idx ON public.fitness_clients(email);
CREATE INDEX IF NOT EXISTS exercises_category_idx ON public.exercises(category);
CREATE INDEX IF NOT EXISTS exercises_difficulty_idx ON public.exercises(difficulty);
CREATE INDEX IF NOT EXISTS workouts_client_id_idx ON public.workouts(client_id);
CREATE INDEX IF NOT EXISTS workout_exercises_workout_id_idx ON public.workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS workout_sessions_client_id_idx ON public.workout_sessions(client_id);
CREATE INDEX IF NOT EXISTS workout_sessions_workout_id_idx ON public.workout_sessions(workout_id);
CREATE INDEX IF NOT EXISTS exercise_logs_session_id_idx ON public.exercise_logs(session_id);

-- =============================================================================
-- SAMPLE DATA
-- =============================================================================

-- Sample fitness client
INSERT INTO public.fitness_clients (id, name, email, notes)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'David C', 'qrafzv0123@gmail.com', 'Primary fitness client')
ON CONFLICT (name) DO NOTHING;

-- Sample exercises
INSERT INTO public.exercises (id, name, category, muscle_groups, equipment, instructions, difficulty)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Barbell Squat', 'strength', ARRAY['quads', 'glutes', 'hamstrings'], ARRAY['barbell', 'squat rack'], 'Stand with feet shoulder-width apart, lower until thighs are parallel to ground, then drive up through heels.', 'intermediate'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Bench Press', 'strength', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['barbell', 'bench'], 'Lie on bench, grip bar slightly wider than shoulders, lower to chest, then press up explosively.', 'intermediate'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Deadlift', 'strength', ARRAY['hamstrings', 'glutes', 'back'], ARRAY['barbell'], 'Stand with feet hip-width apart, hinge at hips to grip bar, keep back straight, drive through heels to stand up.', 'advanced')
ON CONFLICT (id) DO NOTHING;

-- Sample workout
INSERT INTO public.workouts (id, client_id, name, description)
VALUES ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Full Body Strength', 'Complete strength workout hitting all major muscle groups')
ON CONFLICT (id) DO NOTHING;

-- Sample workout exercises
INSERT INTO public.workout_exercises (id, workout_id, exercise_id, sets, reps, weight, rest_seconds, sort_order)
VALUES
  ('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 3, 8, 225.0, 120, 1),
  ('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 3, 10, 185.0, 90, 2),
  ('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 3, 5, 315.0, 180, 3)
ON CONFLICT (id) DO NOTHING;
