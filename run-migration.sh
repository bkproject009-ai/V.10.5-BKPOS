#!/bin/bash

# Export the database URL and credentials
export PGPASSWORD="postgres"

# Database connection details
DB_HOST="db.ddcmuhwpanbatixdfpla.supabase.co"
DB_PORT=5432
DB_USER=postgres
DB_NAME=postgres

# Common psql command prefix
PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

echo "Running migrations..."

# Initial stock setup
echo "1. Setting up stock tables and triggers..."
$PSQL_CMD -f "supabase/migrations/20251010_stock_distributions_table.sql"
$PSQL_CMD -f "supabase/migrations/20251010_stock_triggers.sql"
$PSQL_CMD -f "supabase/migrations/20251010_warehouse_stock_fix.sql"
$PSQL_CMD -f "supabase/migrations/20251010_stock_sync_triggers.sql"
$PSQL_CMD -f "supabase/migrations/20251010_distribution_function.sql"

# Transaction handling and logging
echo "2. Setting up transaction handling and logging..."
$PSQL_CMD -f "supabase/migrations/20251015000011_add_transaction_logging.sql"

echo "All migrations completed successfully"