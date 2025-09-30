import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ddcmuhwpanbatixdfpla.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkY211aHdwYW5iYXRpeGRmcGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3OTM5OTAsImV4cCI6MjA3NDM2OTk5MH0.LhFjSYP919XvFo2MzM7V4QquGOq3UhNuo6qfGy_fDCQ'
);

// Test helper function
const log = (name: string, success: boolean, details?: any) => {
  console.log(`\n${success ? '✅' : '❌'} ${name}`);
  if (details) console.log(details);
};

async function createTestUser(role: 'admin' | 'manager' | 'user' = 'user') {
  const email = `test_${role}_${Date.now()}@test.com`;
  const password = 'Test123!@#';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: role
      }
    }
  });

  return { data, error, email, password };
}

async function testAuthentication() {
  console.log('\n🔑 Testing Authentication...');

  // Create and test regular user
  const { email, password, error: signUpError } = await createTestUser();
  log('User Registration', !signUpError, signUpError || 'User registered successfully');

  // Test Sign In
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  log('User Sign In', !signInError, signInError || 'User signed in successfully');

  // Test session is valid
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  log('Session Valid', session !== null, sessionError || 'Session is valid');

  return signInData?.session;
}

async function testTableAccess(session: any) {
  console.log('\n📋 Testing Table Access...');

  // Test Products (Public Access)
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .limit(1);
  log('Public Products Access', !productsError, productsError || 'Products accessible');

  // Authenticate client
  const authedClient = createClient(
    'https://ddcmuhwpanbatixdfpla.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkY211aHdwYW5iYXRpeGRmcGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3OTM5OTAsImV4cCI6MjA3NDM2OTk5MH0.LhFjSYP919XvFo2MzM7V4QquGOq3UhNuo6qfGy_fDCQ',
    {
      global: {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      }
    }
  );

  // Test Sales (Authenticated Access)
  const { data: sales, error: salesError } = await authedClient
    .from('sales')
    .select('*')
    .limit(1);
  log('Authenticated Sales Access', !salesError, salesError || 'Sales accessible');

  // Test Settings (Authenticated Access)
  const { data: settings, error: settingsError } = await authedClient
    .from('settings')
    .select('*')
    .limit(1);
    
  // Test Tax Types (should be restricted)
  const { data: taxes, error: taxesError } = await authedClient
    .from('tax_types')
    .select('*')
    .limit(1);
  log('Tax Types Access (Should be restricted)', taxesError !== null, 
      taxesError ? 'Properly restricted' : 'WARNING: Regular user can access tax types!');
  log('Authenticated Settings Access', !settingsError, settingsError || 'Settings accessible');

  return true;
}

async function runTests() {
  console.log('🚀 Starting Supabase Integration Tests...');

  try {
    // Test Authentication
    const session = await testAuthentication();
    if (!session) {
      throw new Error('Authentication failed - stopping tests');
    }

    // Test Table Access
    await testTableAccess(session);

    // Clean up - Sign Out
    const { error: signOutError } = await supabase.auth.signOut();
    log('Sign Out', !signOutError, signOutError || 'Signed out successfully');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run all tests
runTests();