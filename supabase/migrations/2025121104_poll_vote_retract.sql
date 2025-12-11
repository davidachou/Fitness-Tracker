-- Allow retracting a vote by decrementing option tally
create or replace function public.decrement_poll_option_vote(option_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.poll_options
  set votes = greatest(coalesce(votes, 0) - 1, 0)
  where id = option_id_input;
end;
$$;

notify pgrst, 'reload schema';

