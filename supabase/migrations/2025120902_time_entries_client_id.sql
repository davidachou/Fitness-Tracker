-- Add client reference to time_entries to capture client when no project is selected.

alter table public.time_entries
  add column if not exists client_id uuid references public.clients(id);

create index if not exists time_entries_client_idx on public.time_entries(client_id);

