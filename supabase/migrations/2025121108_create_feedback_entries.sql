-- Feedback entries: client and employee streams with owner/admin update/delete

CREATE TABLE IF NOT EXISTS public.feedback_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('client', 'employee')),
  message text NOT NULL,
  client_org text,
  client_person text,
  submitter_name text,
  is_anonymous boolean DEFAULT false,
  user_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_client_org_required CHECK (
    (kind = 'client' AND client_org IS NOT NULL AND length(trim(client_org)) > 0)
    OR kind = 'employee'
  )
);

ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user
DROP POLICY IF EXISTS feedback_entries_select ON public.feedback_entries;
CREATE POLICY feedback_entries_select ON public.feedback_entries
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert: authenticated users
DROP POLICY IF EXISTS feedback_entries_insert ON public.feedback_entries;
CREATE POLICY feedback_entries_insert ON public.feedback_entries
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Update: owner or admin
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

-- Delete: owner or admin
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

