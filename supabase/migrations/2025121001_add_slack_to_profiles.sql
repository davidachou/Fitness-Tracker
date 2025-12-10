-- Add slack URL and other team directory fields to profiles table
alter table public.profiles 
add column if not exists slack text;

alter table public.profiles 
add column if not exists linkedin text;

alter table public.profiles 
add column if not exists bio text;

