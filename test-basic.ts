import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Test Configuration
const supabaseUrl = 'https://ddcmuhwpanbatixdfpla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkY211aHdwYW5iYXRpeGRmcGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3OTM5OTAsImV4cCI6MjA3NDM2OTk5MH0.LhFjSYP919XvFo2MzM7V4QquGOq3UhNuo6qfGy_fDCQ';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test helper
const log = (name: string, success: boolean, details?: any) => {
  console.log(`\n${success ? '✅' : '❌'} ${name}`);
  if (details) console.log(details);
};

async function runTests() {
  console.log('🚀 Starting Basic Supabase Connection Test...');

  try {
    // 1. Test Products Table
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('count(*)', { count: 'exact', head: true });
    
    log('Products Table Access', !productsError, productsError || 'Products table is accessible');

    // 2. Test Authentication
    const testUser = {
      email: `test${Date.now()}@example.com`,
      password: 'Test123!@#'
    };

    const { error: signUpError } = await supabase.auth.signUp(testUser);
    log('User Registration', !signUpError, signUpError || 'User registration works');

    const { error: signInError } = await supabase.auth.signInWithPassword(testUser);
    log('User Authentication', !signInError, signInError || 'User authentication works');

    // 3. Test Sales Table
    const { error: salesError } = await supabase
      .from('sales')
      .select('count(*)', { count: 'exact', head: true });
    
    log('Sales Table Access', !salesError, salesError || 'Sales table is accessible');

    // 4. Test Tax Types
    const { error: taxError } = await supabase
      .from('tax_types')
      .select('count(*)', { count: 'exact', head: true });
    
    log('Tax Types Table Access', !taxError, taxError || 'Tax types table is accessible');

    // Cleanup - Sign Out
    const { error: signOutError } = await supabase.auth.signOut();
    log('Sign Out', !signOutError, signOutError || 'Signed out successfully');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run tests
runTests();