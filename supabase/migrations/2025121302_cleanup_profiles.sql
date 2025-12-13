-- Migration to clean up profiles table for Fitness Tracker
-- Remove expertise and slack columns that aren't needed for this project

-- Remove expertise column (array field not needed for fitness tracking)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS expertise;

-- Remove slack column (not needed for fitness tracking)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS slack;
