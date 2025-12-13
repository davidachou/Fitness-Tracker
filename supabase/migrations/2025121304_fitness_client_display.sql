-- Update fitness client display names
-- Change sample client name to avoid confusion with profile names

-- Update sample fitness client name
UPDATE public.fitness_clients
SET name = 'Primary Client'
WHERE email = 'qrafzv0123@gmail.com' AND name = 'David C';
