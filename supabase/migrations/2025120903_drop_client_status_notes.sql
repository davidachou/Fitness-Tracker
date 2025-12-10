-- Remove unused client fields (status, notes)

alter table public.clients
  drop column if exists status,
  drop column if exists notes;

