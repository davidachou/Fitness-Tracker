-- Create wins_posts base table to support internal posts and LinkedIn embeds
CREATE TABLE IF NOT EXISTS public.wins_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  author text,
  date timestamptz DEFAULT now(),
  image text,
  type text NOT NULL DEFAULT 'internal',
  linkedin_url text,
  excerpt text,
  featured boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  CONSTRAINT wins_posts_type_check CHECK (type IN ('internal','linkedin')),
  CONSTRAINT wins_posts_content_requirement CHECK (
    (type = 'internal' AND content IS NOT NULL)
    OR (type = 'linkedin' AND linkedin_url IS NOT NULL)
  )
);

ALTER TABLE public.wins_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wins_read" ON public.wins_posts;
CREATE POLICY "wins_read" ON public.wins_posts FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "wins_write" ON public.wins_posts;
CREATE POLICY "wins_write" ON public.wins_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

