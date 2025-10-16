#!/bin/bash

# Load environment variables
set -a
source .env
set +a

# Check if SUPABASE_URL and SUPABASE_SERVICE_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file"
    exit 1
fi

echo "Resetting database data..."
# Extract host and password from Supabase URL
SUPABASE_DB=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|.supabase.co||')
SUPABASE_HOST="db.${SUPABASE_DB}.supabase.co"
SUPABASE_DB_PASSWORD=$(echo $SUPABASE_SERVICE_KEY | cut -d'.' -f2 | base64 -d 2>/dev/null | jq -r '.password' 2>/dev/null)

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "Error: Could not extract database password from service key"
    exit 1
fi

psql "postgres://postgres:$SUPABASE_DB_PASSWORD@db.${SUPABASE_DB}.supabase.co:5432/postgres" -f reset_data.sql

if [ $? -eq 0 ]; then
    echo "Data reset successful!"
else
    echo "Error resetting data"
    exit 1
fi