#!/bin/bash

# Export the database URL
export PGPASSWORD="postgres"

# Run the migration
psql -h "db.ddcmuhwpanbatixdfpla.supabase.co" \
     -p 5432 \
     -U postgres \
     -d postgres \
     -f "supabase/migrations/20251010_stock_triggers.sql" \
     -f "supabase/migrations/20251010_warehouse_stock_fix.sql" \
     -f "supabase/migrations/20251010_stock_sync_triggers.sql"