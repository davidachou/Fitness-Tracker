-- Debug script to check feedback_entries constraints and data
-- Run this in Supabase SQL Editor

-- 1. Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'feedback_entries' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check constraints
SELECT
    conname as constraint_name,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.feedback_entries'::regclass;

-- 3. Check recent feedback entries
SELECT id, kind, message, client_org, submitter_name, is_anonymous, created_at
FROM feedback_entries
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check if constraint allows NULL client_org for client feedback
SELECT 'Testing constraint logic' as test,
       CASE
           WHEN (kind = 'client' AND (client_org IS NULL OR length(trim(client_org)) > 0)) THEN 'ALLOWED'
           ELSE 'NOT ALLOWED'
       END as client_constraint_result
FROM (SELECT 'client'::text as kind, NULL::text as client_org) as test_data;

-- Test with empty string
SELECT 'Testing with empty string' as test,
       CASE
           WHEN (kind = 'client' AND (client_org IS NULL OR length(trim(client_org)) > 0)) THEN 'ALLOWED'
           ELSE 'NOT ALLOWED'
       END as client_constraint_result
FROM (SELECT 'client'::text as kind, ''::text as client_org) as test_data;

-- Test with valid string
SELECT 'Testing with valid string' as test,
       CASE
           WHEN (kind = 'client' AND (client_org IS NULL OR length(trim(client_org)) > 0)) THEN 'ALLOWED'
           ELSE 'NOT ALLOWED'
       END as client_constraint_result
FROM (SELECT 'client'::text as kind, 'General Client'::text as client_org) as test_data;