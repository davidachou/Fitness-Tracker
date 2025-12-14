-- Comprehensive Table Recovery Migration for Fitness Tracker
-- This migration recreates ONLY the tables needed by the current Fitness Tracker app
-- Based on codebase analysis - only includes tables actually used by pages/components
-- Safe to run - uses IF NOT EXISTS clauses throughout

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION public.decrement_poll_option_vote(option_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.poll_options
  SET votes = GREATEST(COALESCE(votes, 0) - 1, 0)
  WHERE id = option_id_input;
END;
$$;

-- =============================================================================
-- TIME TRACKING SYSTEM (only tables actually used in tracker page)
-- =============================================================================

-- Clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT,
  notes TEXT,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clients_name_unique UNIQUE (name)
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.time_tracker_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  billable BOOLEAN NOT NULL DEFAULT true,
  archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT time_tracker_projects_client_name UNIQUE (client_id, name)
);

-- Time entries table
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.time_tracker_projects(id) ON DELETE SET NULL,
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
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT active_timers_user_unique UNIQUE (user_id)
);

-- Enable RLS on time tracking tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_tracker_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_timers ENABLE ROW LEVEL SECURITY;

-- Time tracking policies
DROP POLICY IF EXISTS clients_select ON public.clients;
CREATE POLICY clients_select ON public.clients
FOR SELECT USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR EXISTS (
    SELECT 1
    FROM public.time_tracker_projects p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id IN (
      SELECT project_id FROM public.time_entries
      WHERE user_id = auth.uid()
    )
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
    SELECT 1 FROM public.time_entries te
    WHERE te.user_id = auth.uid() AND te.project_id = id
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
    SELECT 1 FROM public.time_entries te
    WHERE te.user_id = auth.uid() AND te.project_id = id
  )
)
WITH CHECK (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.time_entries te
    WHERE te.user_id = auth.uid() AND te.project_id = id
  )
);

DROP POLICY IF EXISTS time_tracker_projects_delete ON public.time_tracker_projects;
CREATE POLICY time_tracker_projects_delete ON public.time_tracker_projects
FOR DELETE USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.time_entries te
    WHERE te.user_id = auth.uid() AND te.project_id = id
  )
);

-- Time entries policies
DROP POLICY IF EXISTS time_entries_select ON public.time_entries;
CREATE POLICY time_entries_select ON public.time_entries
FOR SELECT USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS time_entries_insert ON public.time_entries;
CREATE POLICY time_entries_insert ON public.time_entries
FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS time_entries_update ON public.time_entries;
CREATE POLICY time_entries_update ON public.time_entries
FOR UPDATE USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR user_id = auth.uid()
)
WITH CHECK (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS time_entries_delete ON public.time_entries;
CREATE POLICY time_entries_delete ON public.time_entries
FOR DELETE USING (
  auth.role() = 'service_role'
  OR current_user = 'postgres'
  OR coalesce(auth.jwt()->>'role','') = 'admin'
  OR user_id = auth.uid()
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

-- =============================================================================
-- CONTENT AND FEATURE TABLES (only tables actually used)
-- =============================================================================

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

-- Wins posts table
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

-- Knowledge assets table
CREATE TABLE IF NOT EXISTS public.knowledge_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  link TEXT NOT NULL,
  owner TEXT,
  user_id UUID DEFAULT auth.uid(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resource bookings table
CREATE TABLE IF NOT EXISTS public.resource_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT,
  start TIMESTAMPTZ,
  "end" TIMESTAMPTZ,
  booked_by TEXT
);

-- Enable RLS on content tables
ALTER TABLE public.quick_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wins_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_bookings ENABLE ROW LEVEL SECURITY;

-- Content policies
DROP POLICY IF EXISTS quick_links_read ON public.quick_links;
CREATE POLICY quick_links_read ON public.quick_links
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS quick_links_write ON public.quick_links;
CREATE POLICY quick_links_write ON public.quick_links
FOR ALL USING (
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

DROP POLICY IF EXISTS polls_read ON public.polls;
CREATE POLICY polls_read ON public.polls FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS polls_insert ON public.polls;
CREATE POLICY polls_insert ON public.polls FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS polls_delete ON public.polls;
CREATE POLICY polls_delete ON public.polls
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
    OR created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS poll_options_read ON public.poll_options;
CREATE POLICY poll_options_read ON public.poll_options FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS poll_options_write ON public.poll_options;
CREATE POLICY poll_options_write ON public.poll_options
FOR ALL USING (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM public.polls p2
      WHERE p2.id = poll_options.poll_id AND p2.created_by = auth.uid()
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
      SELECT 1 FROM public.polls p2
      WHERE p2.id = poll_options.poll_id AND p2.created_by = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS poll_votes_read ON public.poll_votes;
CREATE POLICY poll_votes_read ON public.poll_votes FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS poll_votes_insert ON public.poll_votes;
CREATE POLICY poll_votes_insert ON public.poll_votes
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS wins_read ON public.wins_posts;
CREATE POLICY wins_read ON public.wins_posts FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS wins_write ON public.wins_posts;
CREATE POLICY wins_write ON public.wins_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS wins_posts_update_admin ON public.wins_posts;
CREATE POLICY wins_posts_update_admin ON public.wins_posts
FOR UPDATE USING (
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

DROP POLICY IF EXISTS wins_posts_delete_admin ON public.wins_posts;
CREATE POLICY wins_posts_delete_admin ON public.wins_posts
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = TRUE
  )
);

DROP POLICY IF EXISTS feedback_entries_select ON public.feedback_entries;
CREATE POLICY feedback_entries_select ON public.feedback_entries
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS feedback_entries_insert ON public.feedback_entries;
CREATE POLICY feedback_entries_insert ON public.feedback_entries
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS feedback_entries_update ON public.feedback_entries;
CREATE POLICY feedback_entries_update ON public.feedback_entries
FOR UPDATE USING (
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

DROP POLICY IF EXISTS feedback_entries_delete ON public.feedback_entries;
CREATE POLICY feedback_entries_delete ON public.feedback_entries
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  )
);

DROP POLICY IF EXISTS knowledge_assets_select ON public.knowledge_assets;
CREATE POLICY knowledge_assets_select ON public.knowledge_assets
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS knowledge_assets_insert ON public.knowledge_assets;
CREATE POLICY knowledge_assets_insert ON public.knowledge_assets
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS knowledge_assets_update ON public.knowledge_assets;
CREATE POLICY knowledge_assets_update ON public.knowledge_assets
FOR UPDATE USING (
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

DROP POLICY IF EXISTS knowledge_assets_delete ON public.knowledge_assets;
CREATE POLICY knowledge_assets_delete ON public.knowledge_assets
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  )
);

CREATE POLICY resource_bookings_read ON public.resource_bookings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY resource_bookings_write ON public.resource_bookings FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Time tracking indexes
CREATE INDEX IF NOT EXISTS clients_name_idx ON public.clients(name);
CREATE INDEX IF NOT EXISTS time_tracker_projects_client_idx ON public.time_tracker_projects(client_id);
CREATE INDEX IF NOT EXISTS time_entries_user_idx ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS time_entries_project_idx ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS time_entries_start_time_idx ON public.time_entries(start_time);
CREATE INDEX IF NOT EXISTS active_timers_user_idx ON public.active_timers(user_id);
CREATE INDEX IF NOT EXISTS active_timers_project_idx ON public.active_timers(project_id);

-- Content indexes
CREATE INDEX IF NOT EXISTS poll_votes_poll_user_unique ON public.poll_votes(poll_id, user_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Time tracking triggers
DROP TRIGGER IF EXISTS clients_touch ON public.clients;
CREATE TRIGGER clients_touch BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS time_tracker_projects_touch ON public.time_tracker_projects;
CREATE TRIGGER time_tracker_projects_touch BEFORE UPDATE ON public.time_tracker_projects
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS time_entries_touch ON public.time_entries;
CREATE TRIGGER time_entries_touch BEFORE UPDATE ON public.time_entries
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS active_timers_touch ON public.active_timers;
CREATE TRIGGER active_timers_touch BEFORE UPDATE ON public.active_timers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Content triggers
DROP TRIGGER IF EXISTS quick_links_touch ON public.quick_links;
CREATE TRIGGER quick_links_touch BEFORE UPDATE ON public.quick_links
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS polls_touch ON public.polls;
CREATE TRIGGER polls_touch BEFORE UPDATE ON public.polls
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS poll_options_touch ON public.poll_options;
CREATE TRIGGER poll_options_touch BEFORE UPDATE ON public.poll_options
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

-- Basic quick links
INSERT INTO public.quick_links (id, label, description, icon, url)
VALUES
  ('ff111111-1111-1111-1111-111111111111', 'Time Tracking', 'Track your work hours', 'Clock', 'https://app.clockify.me/tracker'),
  ('ff222222-2222-2222-2222-222222222222', 'Expenses', 'Submit expenses', 'Receipt', 'https://example.com/expenses'),
  ('ff333333-3333-3333-3333-333333333333', 'Calendar', 'Team calendar', 'Calendar', 'https://calendar.google.com')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- REALTIME PUBLICATION
-- =============================================================================

DO $$
BEGIN
  -- Time tracking tables
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clients') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.clients';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'time_tracker_projects') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.time_tracker_projects';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'time_entries') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'active_timers') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.active_timers';
  END IF;

  -- Content tables
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'polls') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.polls';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'poll_options') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'poll_votes') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes';
  END IF;
END;
$$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';