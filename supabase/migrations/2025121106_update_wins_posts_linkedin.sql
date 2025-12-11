-- Add support for LinkedIn embeds and featured/tag metadata on wins_posts
ALTER TABLE public.wins_posts
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS excerpt text,
  ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Allow LinkedIn entries without rich text content
ALTER TABLE public.wins_posts
  ALTER COLUMN content DROP NOT NULL;

-- Ensure existing rows are marked as internal
UPDATE public.wins_posts SET type = 'internal' WHERE type IS NULL;

-- Data integrity: require content for internal posts or a LinkedIn URL for embeds
ALTER TABLE public.wins_posts
  DROP CONSTRAINT IF EXISTS wins_posts_content_requirement,
  ADD CONSTRAINT wins_posts_content_requirement
  CHECK (
    (type = 'internal' AND content IS NOT NULL)
    OR
    (type = 'linkedin' AND linkedin_url IS NOT NULL)
  );

-- Normalize type values
ALTER TABLE public.wins_posts
  DROP CONSTRAINT IF EXISTS wins_posts_type_check,
  ADD CONSTRAINT wins_posts_type_check CHECK (type IN ('internal', 'linkedin'));
-- Add support for LinkedIn embeds and featured/tag metadata on wins_posts
ALTER TABLE public.wins_posts
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS excerpt text,
  ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Allow LinkedIn entries without rich text content
ALTER TABLE public.wins_posts
  ALTER COLUMN content DROP NOT NULL;

-- Ensure existing rows are marked as internal
UPDATE public.wins_posts SET type = 'internal' WHERE type IS NULL;

-- Data integrity: require content for internal posts or a LinkedIn URL for embeds
ALTER TABLE public.wins_posts
  DROP CONSTRAINT IF EXISTS wins_posts_content_requirement,
  ADD CONSTRAINT wins_posts_content_requirement
  CHECK (
    (type = 'internal' AND content IS NOT NULL)
    OR
    (type = 'linkedin' AND linkedin_url IS NOT NULL)
  );

-- Normalize type values
ALTER TABLE public.wins_posts
  DROP CONSTRAINT IF EXISTS wins_posts_type_check,
  ADD CONSTRAINT wins_posts_type_check CHECK (type IN ('internal', 'linkedin'));

