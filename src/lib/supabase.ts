import { createClient } from '@supabase/supabase-js';

// Try to get from environment variables first, fall back to hardcoded values for testing
const supabaseUrl = typeof import.meta !== 'undefined' ? 
  import.meta.env?.VITE_SUPABASE_URL : 
  'https://ddcmuhwpanbatixdfpla.supabase.co';

const supabaseKey = typeof import.meta !== 'undefined' ? 
  import.meta.env?.VITE_SUPABASE_ANON_KEY : 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkY211aHdwYW5iYXRpeGRmcGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3OTM5OTAsImV4cCI6MjA3NDM2OTk5MH0.LhFjSYP919XvFo2MzM7V4QquGOq3UhNuo6qfGy_fDCQ';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration');
}

export const supabase = createClient(supabaseUrl, supabaseKey);