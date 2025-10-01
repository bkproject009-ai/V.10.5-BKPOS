DELETE FROM auth.users;
DELETE FROM public.users;

-- Reset sequences if any exist
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;

-- Verify deletion
SELECT COUNT(*) FROM auth.users;
SELECT COUNT(*) FROM public.users;