#!/bin/bash

# API endpoint
API_URL="https://ddcmuhwpanbatixdfpla.supabase.co/rest/v1/users"

# Your anon key from supabase.ts
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkY211aHdwYW5iYXRpeGRmcGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3OTM5OTAsImV4cCI6MjA3NDM2OTk5MH0.LhFjSYP919XvFo2MzM7V4QquGOq3UhNuo6qfGy_fDCQ"

# Your JWT token (get this from localStorage after logging in)
JWT_TOKEN="your_jwt_token_here"

# Make the request
curl "$API_URL?select=id,email,role,status" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"