-- Disable RLS temporarily to allow deletion
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Delete all user records from the users table
DELETE FROM public.users;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Reset the sequence if any
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;