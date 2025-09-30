import { createClient } from '@supabase/supabase-js';

const config = {
  supabaseUrl: 'https://ddcmuhwpanbatixdfpla.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkY211aHdwYW5iYXRpeGRmcGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3OTM5OTAsImV4cCI6MjA3NDM2OTk5MH0.LhFjSYP919XvFo2MzM7V4QquGOq3UhNuo6qfGy_fDCQ',
  users: {
    admin: {
      email: `admin_${Date.now()}@test.com`,
      password: 'Admin123!@#',
      role: 'admin'
    },
    manager: {
      email: `manager_${Date.now()}@test.com`,
      password: 'Manager123!@#',
      role: 'manager'
    },
    user: {
      email: `user_${Date.now()}@test.com`,
      password: 'User123!@#',
      role: 'authenticated'
    }
  }
};

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

const log = {
  test: (name: string, success: boolean, details?: any) => {
    console.log(`\n${success ? '✅' : '❌'} ${name}`);
    if (details) console.log(details);
  },
  section: (name: string) => {
    console.log(`\n🔍 Testing ${name}...`);
  }
};

async function testUserAccess(userType: 'admin' | 'manager' | 'user') {
  const userData = config.users[userType];
  log.section(`Testing ${userType.toUpperCase()} Access`);

  try {
    // Sign up user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(userData);
    log.test(`${userType} Sign Up`, !signUpError, signUpError || 'User created successfully');

    if (signUpError) return null;

    // Sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword(userData);
    log.test(`${userType} Sign In`, !signInError, signInError || 'Signed in successfully');

    if (signInError) return null;

    // Test access to different resources
    const tables = ['products', 'sales', 'tax_types', 'settings'];
    for (const table of tables) {
      const { error } = await supabase.from(table).select('count(*)', { count: 'exact', head: true });
      log.test(`${userType} - ${table} access`, !error, error || 'Access granted');
    }

    // Sign out
    await supabase.auth.signOut();
    return signInData.user?.id;
  } catch (error) {
    console.error(`Error testing ${userType}:`, error);
    return null;
  }
}

async function runAccessTests() {
  console.log('🚀 Starting Access Control Tests...');

  try {
    // Test anonymous access to products
    const { error: anonError } = await supabase
      .from('products')
      .select('count(*)', { count: 'exact', head: true });
    log.test('Anonymous Products Access', !anonError, anonError || 'Public can read products');

    // Test different user roles
    for (const userType of ['admin', 'manager', 'user'] as const) {
      await testUserAccess(userType);
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run the tests
runAccessTests();