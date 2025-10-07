#!/bin/bash

# Ensure the script stops on first error
set -e

echo "Starting database cleanup and migration..."

# Connect to Supabase using psql
echo "Running cleanup and fix for infinite recursion..."

# Create temporary SQL file
cat << 'EOF' > /tmp/cleanup.sql
-- First disable RLS on all tables
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tax_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales_taxes DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Drop potentially problematic functions
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_manager() CASCADE;
DROP FUNCTION IF EXISTS public.is_cashier() CASCADE;
DROP FUNCTION IF EXISTS public.check_user_role(text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_first_user_admin() CASCADE;
DROP FUNCTION IF EXISTS public.set_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.check_is_admin() CASCADE;

-- Drop all triggers on users table
DROP TRIGGER IF EXISTS set_user_role ON users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS refresh_user_roles_trigger ON public.users;

EOF

# Add the fix from the migration file
cat supabase/migrations/20251006_fix_infinite_recursion.sql >> /tmp/cleanup.sql

echo "Running migrations..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/cleanup.sql

echo "Cleaning up..."
rm /tmp/cleanup.sql

echo "Migration completed successfully!"