-- Initial database setup for Fitness Tracker
-- Consolidated migration including all core tables, policies, and functions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- CORE USER PROFILES
-- =============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  expertise TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  slack TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can view all profiles" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- TIME TRACKING SYSTEM
-- =============================================================================

-- Clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clients_name_unique UNIQUE (name)
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.time_tracker_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  billable BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT time_tracker_projects_client_name UNIQUE (client_id, name)
);

-- Project access table (membership)
CREATE TABLE IF NOT EXISTS public.project_access (
  project_id UUID NOT NULL REFERENCES public.time_tracker_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_access_pkey PRIMARY KEY (project_id, user_id)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.time_tracker_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.time_tracker_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT time_tracker_tasks_project_name UNIQUE (project_id, name)
);

-- Time entries table
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.time_tracker_projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.time_tracker_tasks(id) ON DELETE SET NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  billable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Active timers table
CREATE TABLE IF NOT EXISTS public.active_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.time_tracker_projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.time_tracker_tasks(id) ON DELETE SET NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT active_timers_user_unique UNIQUE (user_id)
);

-- Enable RLS on time tracking tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_tracker_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_tracker_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_timers ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS clients_name_idx ON public.clients(name);
CREATE INDEX IF NOT EXISTS time_tracker_projects_client_idx ON public.time_tracker_projects(client_id);
CREATE INDEX IF NOT EXISTS project_access_user_idx ON public.project_access(user_id);
CREATE INDEX IF NOT EXISTS project_access_project_idx ON public.project_access(project_id);
CREATE INDEX IF NOT EXISTS time_tracker_tasks_project_idx ON public.time_tracker_tasks(project_id);
CREATE INDEX IF NOT EXISTS time_entries_user_idx ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS time_entries_project_idx ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS time_entries_task_idx ON public.time_entries(task_id);
CREATE INDEX IF NOT EXISTS time_entries_start_time_idx ON public.time_entries(start_time);
CREATE INDEX IF NOT EXISTS active_timers_user_idx ON public.active_timers(user_id);
CREATE INDEX IF NOT EXISTS active_timers_project_idx ON public.active_timers(project_id);
CREATE INDEX IF NOT EXISTS active_timers_task_idx ON public.active_timers(task_id);

-- =============================================================================
-- ADDITIONAL FEATURE TABLES
-- =============================================================================

-- Team members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  expertise TEXT[] DEFAULT '{}',
  photo TEXT,
  slack TEXT,
  calendly TEXT,
  email TEXT,
  linkedin TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge assets table
CREATE TABLE IF NOT EXISTS public.knowledge_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  last_updated DATE DEFAULT now(),
  owner TEXT,
  link TEXT
);

-- Projects table (general projects, not time tracking)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client TEXT,
  name TEXT,
  partner TEXT,
  stage TEXT,
  next_milestone TEXT,
  next_date DATE,
  team JSONB DEFAULT '[]',
  drive TEXT
);

-- Wins/posts table
CREATE TABLE IF NOT EXISTS public.wins_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  author TEXT,
  date TIMESTAMPTZ DEFAULT now(),
  image TEXT,
  type TEXT NOT NULL DEFAULT 'internal',
  linkedin_url TEXT,
  excerpt TEXT,
  featured BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  CONSTRAINT wins_posts_type_check CHECK (type IN ('internal','linkedin')),
  CONSTRAINT wins_posts_content_requirement CHECK (
    (type = 'internal' AND content IS NOT NULL)
    OR (type = 'linkedin' AND linkedin_url IS NOT NULL)
  )
);

-- OOO events table
CREATE TABLE IF NOT EXISTS public.ooo_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person TEXT,
  type TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  notes TEXT
);

-- Quick links table
CREATE TABLE IF NOT EXISTS public.quick_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client feedback table
CREATE TABLE IF NOT EXISTS public.client_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  client_name TEXT,
  client_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Resource bookings table
CREATE TABLE IF NOT EXISTS public.resource_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT,
  start TIMESTAMPTZ,
  "end" TIMESTAMPTZ,
  booked_by TEXT
);

-- Polls tables
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feedback entries table
CREATE TABLE IF NOT EXISTS public.feedback_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('client', 'employee')),
  message TEXT NOT NULL,
  client_org TEXT,
  client_person TEXT,
  submitter_name TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  user_id UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT feedback_client_org_required CHECK (
    (kind = 'client' AND client_org IS NOT NULL AND length(trim(client_org)) > 0)
    OR kind = 'employee'
  )
);

-- Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  user_id UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on additional tables
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wins_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ooo_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- POLICIES
-- =============================================================================

-- Time tracking policies (admin/service/postgres bypass)

-- Clients policies
DROP POLICY IF EXISTS clients_select ON public.clients;
CREATE POLICY clients_select ON public.clients
FOR SELECT USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR EXISTS (
    SELECT 1
    FROM public.time_tracker_projects p
    JOIN public.project_access pa ON pa.project_id = p.id
    WHERE p.client_id = clients.id
      AND pa.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS clients_insert ON public.clients;
CREATE POLICY clients_insert ON public.clients
FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
);

DROP POLICY IF EXISTS clients_update ON public.clients;
CREATE POLICY clients_update ON public.clients
FOR UPDATE USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
)
WITH CHECK (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
);

DROP POLICY IF EXISTS clients_delete ON public.clients;
CREATE POLICY clients_delete ON public.clients
FOR DELETE USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
);

-- Projects policies
DROP POLICY IF EXISTS time_tracker_projects_select ON public.time_tracker_projects;
CREATE POLICY time_tracker_projects_select ON public.time_tracker_projects
FOR SELECT USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR id = '00000000-0000-0000-0000-000000000002'
  OR EXISTS (
    SELECT 1 FROM public.project_access pa
    WHERE pa.project_id = id AND pa.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS time_tracker_projects_insert ON public.time_tracker_projects;
CREATE POLICY time_tracker_projects_insert ON public.time_tracker_projects
FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR auth.uid() = created_by
);

DROP POLICY IF EXISTS time_tracker_projects_update ON public.time_tracker_projects;
CREATE POLICY time_tracker_projects_update ON public.time_tracker_projects
FOR UPDATE USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.project_access pa
    WHERE pa.project_id = id AND pa.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.project_access pa
    WHERE pa.project_id = id AND pa.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS time_tracker_projects_delete ON public.time_tracker_projects;
CREATE POLICY time_tracker_projects_delete ON public.time_tracker_projects
FOR DELETE USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.project_access pa
    WHERE pa.project_id = id AND pa.user_id = auth.uid()
  )
);

-- Project access policies
DROP POLICY IF EXISTS project_access_select ON public.project_access;
CREATE POLICY project_access_select ON public.project_access
FOR SELECT USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS project_access_insert ON public.project_access;
CREATE POLICY project_access_insert ON public.project_access
FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS project_access_update ON public.project_access;
CREATE POLICY project_access_update ON public.project_access
FOR UPDATE USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR auth.uid() = user_id
)
WITH CHECK (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS project_access_delete ON public.project_access;
CREATE POLICY project_access_delete ON public.project_access
FOR DELETE USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR auth.uid() = user_id
);

-- Tasks policies
DROP POLICY IF EXISTS time_tracker_tasks_select ON public.time_tracker_tasks;
CREATE POLICY time_tracker_tasks_select ON public.time_tracker_tasks
FOR SELECT USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.project_access pa
    WHERE pa.project_id = project_id AND pa.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS time_tracker_tasks_insert ON public.time_tracker_tasks;
CREATE POLICY time_tracker_tasks_insert ON public.time_tracker_tasks
FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.project_access pa
    WHERE pa.project_id = project_id AND pa.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS time_tracker_tasks_update ON public.time_tracker_tasks;
CREATE POLICY time_tracker_tasks_update ON public.time_tracker_tasks
FOR UPDATE USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.project_access pa
    WHERE pa.project_id = project_id AND pa.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.project_access pa
    WHERE pa.project_id = project_id AND pa.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS time_tracker_tasks_delete ON public.time_tracker_tasks;
CREATE POLICY time_tracker_tasks_delete ON public.time_tracker_tasks
FOR DELETE USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.project_access pa
    WHERE pa.project_id = project_id AND pa.user_id = auth.uid()
  )
);

-- Time entries policies
DROP POLICY IF EXISTS time_entries_select ON public.time_entries;
CREATE POLICY time_entries_select ON public.time_entries
FOR SELECT USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR (
    auth.uid() = user_id AND
    (
      time_entries.project_id = '00000000-0000-0000-0000-000000000002'
      OR EXISTS (
        SELECT 1 FROM public.project_access pa
        WHERE pa.user_id = auth.uid()
          AND pa.project_id = coalesce(time_entries.project_id,
            (SELECT t.project_id FROM public.time_tracker_tasks t WHERE t.id = time_entries.task_id)
          )
      )
    )
  )
);

DROP POLICY IF EXISTS time_entries_insert ON public.time_entries;
CREATE POLICY time_entries_insert ON public.time_entries
FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR (
    auth.uid() = user_id AND
    (
      time_entries.project_id = '00000000-0000-0000-0000-000000000002'
      OR EXISTS (
        SELECT 1 FROM public.project_access pa
        WHERE pa.user_id = auth.uid()
          AND pa.project_id = coalesce(time_entries.project_id,
            (SELECT t.project_id FROM public.time_tracker_tasks t WHERE t.id = time_entries.task_id)
          )
      )
    )
  )
);

DROP POLICY IF EXISTS time_entries_update ON public.time_entries;
CREATE POLICY time_entries_update ON public.time_entries
FOR UPDATE USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR (
    auth.uid() = user_id AND
    (
      time_entries.project_id = '00000000-0000-0000-0000-000000000002'
      OR EXISTS (
        SELECT 1 FROM public.project_access pa
        WHERE pa.user_id = auth.uid()
          AND pa.project_id = coalesce(time_entries.project_id,
            (SELECT t.project_id FROM public.time_tracker_tasks t WHERE t.id = time_entries.task_id)
          )
      )
    )
  )
)
WITH CHECK (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR (
    auth.uid() = user_id AND
    (
      time_entries.project_id = '00000000-0000-0000-0000-000000000002'
      OR EXISTS (
        SELECT 1 FROM public.project_access pa
        WHERE pa.user_id = auth.uid()
          AND pa.project_id = coalesce(time_entries.project_id,
            (SELECT t.project_id FROM public.time_tracker_tasks t WHERE t.id = time_entries.task_id)
          )
      )
    )
  )
);

DROP POLICY IF EXISTS time_entries_delete ON public.time_entries;
CREATE POLICY time_entries_delete ON public.time_entries
FOR DELETE USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR (
    auth.uid() = user_id AND
    (
      time_entries.project_id = '00000000-0000-0000-0000-000000000002'
      OR EXISTS (
        SELECT 1 FROM public.project_access pa
        WHERE pa.user_id = auth.uid()
          AND pa.project_id = coalesce(time_entries.project_id,
            (SELECT t.project_id FROM public.time_tracker_tasks t WHERE t.id = time_entries.task_id)
          )
      )
    )
  )
);

-- Active timers policies
DROP POLICY IF EXISTS active_timers_select ON public.active_timers;
CREATE POLICY active_timers_select ON public.active_timers
FOR SELECT USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS active_timers_insert ON public.active_timers;
CREATE POLICY active_timers_insert ON public.active_timers
FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS active_timers_update ON public.active_timers;
CREATE POLICY active_timers_update ON public.active_timers
FOR UPDATE USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR auth.uid() = user_id
)
WITH CHECK (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS active_timers_delete ON public.active_timers;
CREATE POLICY active_timers_delete ON public.active_timers
FOR DELETE USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR auth.uid() = user_id
);

-- Additional feature policies (simplified - authenticated users can read/write)
CREATE POLICY "team_members_read" ON public.team_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_members_write" ON public.team_members FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "knowledge_assets_read" ON public.knowledge_assets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "knowledge_assets_write" ON public.knowledge_assets FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "projects_read" ON public.projects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "projects_write" ON public.projects FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "projects_update" ON public.projects FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "wins_read" ON public.wins_posts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "wins_write" ON public.wins_posts FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "ooo_read" ON public.ooo_events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ooo_write" ON public.ooo_events FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "quick_links_read" ON public.quick_links FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "quick_links_write" ON public.quick_links FOR ALL USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = TRUE
  )
) WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = TRUE
  )
);

CREATE POLICY "feedback_read" ON public.client_feedback FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "feedback_write" ON public.client_feedback FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "bookings_read" ON public.resource_bookings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "bookings_write" ON public.resource_bookings FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Polls policies
CREATE POLICY "polls_read" ON public.polls FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "polls_insert" ON public.polls FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "polls_delete" ON public.polls FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
    OR created_by = auth.uid()
  )
);

CREATE POLICY "poll_options_read" ON public.poll_options FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "poll_options_write" ON public.poll_options FOR ALL USING (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_options.poll_id AND p.created_by = auth.uid()
    )
  )
) WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_options.poll_id AND p.created_by = auth.uid()
    )
  )
);

CREATE POLICY "poll_votes_read" ON public.poll_votes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "poll_votes_insert" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Feedback entries policies
CREATE POLICY "feedback_entries_select" ON public.feedback_entries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "feedback_entries_insert" ON public.feedback_entries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "feedback_entries_update" ON public.feedback_entries FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  )
) WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  )
);
CREATE POLICY "feedback_entries_delete" ON public.feedback_entries FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  )
);

-- Announcements policies
CREATE POLICY "announcements_select" ON public.announcements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "announcements_insert" ON public.announcements FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
);
CREATE POLICY "announcements_update" ON public.announcements FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
);
CREATE POLICY "announcements_delete" ON public.announcements FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated at trigger for profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Poll vote increment function
CREATE OR REPLACE FUNCTION public.increment_poll_option_vote(option_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.poll_options
  SET votes = COALESCE(votes, 0) + 1
  WHERE id = option_id_input;
END;
$$;

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS profiles_touch ON public.profiles;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS clients_touch ON public.clients;
CREATE TRIGGER clients_touch BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS time_tracker_projects_touch ON public.time_tracker_projects;
CREATE TRIGGER time_tracker_projects_touch BEFORE UPDATE ON public.time_tracker_projects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS time_tracker_tasks_touch ON public.time_tracker_tasks;
CREATE TRIGGER time_tracker_tasks_touch BEFORE UPDATE ON public.time_tracker_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS time_entries_touch ON public.time_entries;
CREATE TRIGGER time_entries_touch BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS active_timers_touch ON public.active_timers;
CREATE TRIGGER active_timers_touch BEFORE UPDATE ON public.active_timers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS polls_touch ON public.polls;
CREATE TRIGGER polls_touch BEFORE UPDATE ON public.polls
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS poll_options_touch ON public.poll_options;
CREATE TRIGGER poll_options_touch BEFORE UPDATE ON public.poll_options
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS quick_links_touch ON public.quick_links;
CREATE TRIGGER quick_links_touch BEFORE UPDATE ON public.quick_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =============================================================================
-- BASIC SEED DATA
-- =============================================================================

-- Create unassigned client and project for time tracking
INSERT INTO public.clients (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Unassigned')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.time_tracker_projects (id, client_id, name, billable)
SELECT '00000000-0000-0000-0000-000000000002', c.id, 'Unassigned', true
FROM public.clients c
WHERE c.name = 'Unassigned'
ON CONFLICT (client_id, name) DO NOTHING;

INSERT INTO public.time_tracker_tasks (id, project_id, name)
SELECT '00000000-0000-0000-0000-000000000003', p.id, 'Unassigned'
FROM public.time_tracker_projects p
WHERE p.name = 'Unassigned'
ON CONFLICT (project_id, name) DO NOTHING;

-- Basic quick links (placeholder URLs)
INSERT INTO public.quick_links (id, label, description, icon, url)
VALUES
  ('ff111111-1111-1111-1111-111111111111', 'Time Tracking', 'Track your work hours', 'Clock', 'https://example.com/time-tracking'),
  ('ff222222-2222-2222-2222-222222222222', 'Expenses', 'Submit expenses', 'Receipt', 'https://example.com/expenses'),
  ('ff333333-3333-3333-3333-333333333333', 'Calendar', 'Team calendar', 'Calendar', 'https://example.com/calendar')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- REALTIME PUBLICATION
-- =============================================================================

-- Add tables to realtime publication
DO $$
BEGIN
  -- Time tracking tables
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clients') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.clients';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'time_tracker_projects') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.time_tracker_projects';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_access') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.project_access';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'time_tracker_tasks') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.time_tracker_tasks';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'time_entries') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'active_timers') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.active_timers';
  END IF;
END;
$$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
