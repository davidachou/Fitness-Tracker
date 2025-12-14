-- Remove client_org constraint and column since client_org is no longer needed
-- All feedback is now just from clients, no organization distinction

-- Drop the constraint that requires client_org for client feedback
ALTER TABLE public.feedback_entries
DROP CONSTRAINT IF EXISTS feedback_client_org_required;

-- Remove the client_org column since it's no longer needed
ALTER TABLE public.feedback_entries
DROP COLUMN IF EXISTS client_org;

-- Also remove client_person column if it exists (not used)
ALTER TABLE public.feedback_entries
DROP COLUMN IF EXISTS client_person;