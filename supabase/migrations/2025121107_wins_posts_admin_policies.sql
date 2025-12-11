-- Allow admins (profiles.is_admin = true) to update and delete wins_posts

-- Update policy for admins
DROP POLICY IF EXISTS wins_posts_update_admin ON public.wins_posts;
CREATE POLICY wins_posts_update_admin ON public.wins_posts
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
) WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
);

-- Delete policy for admins
DROP POLICY IF EXISTS wins_posts_delete_admin ON public.wins_posts;
CREATE POLICY wins_posts_delete_admin ON public.wins_posts
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
);

