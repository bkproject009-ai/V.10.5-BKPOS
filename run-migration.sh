#!/bin/bash

# Export the database URL
export PGPASSWORD="postgres"

# Run the migration
psql -h "db.ddcmuhwpanbatixdfpla.supabase.co" \
     -p 5432 \
     -U postgres \
     -d postgres \
     -f "supabase/migrations/20251010_product_storage.sql"