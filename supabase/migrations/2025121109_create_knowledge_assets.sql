-- Knowledge assets with admin/owner update/delete

CREATE TABLE IF NOT EXISTS public.knowledge_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  tags text[] DEFAULT '{}',
  link text NOT NULL,
  owner text,
  user_id uuid DEFAULT auth.uid(),
  last_updated timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_assets ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user
DROP POLICY IF EXISTS knowledge_assets_select ON public.knowledge_assets;
CREATE POLICY knowledge_assets_select ON public.knowledge_assets
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert: authenticated users
DROP POLICY IF EXISTS knowledge_assets_insert ON public.knowledge_assets;
CREATE POLICY knowledge_assets_insert ON public.knowledge_assets
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Update: owner or admin
DROP POLICY IF EXISTS knowledge_assets_update ON public.knowledge_assets;
CREATE POLICY knowledge_assets_update ON public.knowledge_assets
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  )
) WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  )
);

-- Delete: owner or admin
DROP POLICY IF EXISTS knowledge_assets_delete ON public.knowledge_assets;
CREATE POLICY knowledge_assets_delete ON public.knowledge_assets
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  )
);

