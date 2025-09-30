import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ddcmuhwpanbatixdfpla.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkY211aHdwYW5iYXRpeGRmcGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3OTM5OTAsImV4cCI6MjA3NDM2OTk5MH0.LhFjSYP919XvFo2MzM7V4QquGOq3UhNuo6qfGy_fDCQ'
);

// Test helper function
const log = (name: string, success: boolean, details?: any) => {
  console.log(`\n${success ? '✅' : '❌'} ${name}`);
  if (details) console.log(details);
};

// Sample data
const sampleData = {
  products: [
    {
      name: 'Sample Product 1',
      price: 10000,
      stock: 100,
      category: 'Electronics',
      sku: 'ELEC001',
      description: 'Test product description'
    },
    {
      name: 'Sample Product 2',
      price: 15000,
      stock: 50,
      category: 'Accessories',
      sku: 'ACC001',
      description: 'Test accessory description'
    }
  ],
  tax_types: [
    {
      code: 'VAT',
      name: 'Value Added Tax',
      rate: 11.0,
      description: 'Standard VAT rate',
      enabled: true
    },
    {
      code: 'LUXURY',
      name: 'Luxury Tax',
      rate: 20.0,
      description: 'Tax for luxury items',
      enabled: true
    }
  ]
};

async function createTestUser(role: 'admin' | 'manager' | 'user') {
  const email = `test_${role}_${Date.now()}@test.com`;
  const password = 'Test123!@#';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: role // This will be stored in user metadata
      }
    }
  });

  return { data, error, email, password };
}

async function insertSampleData(client: SupabaseClient) {
  // Insert products
  const { error: productsError } = await client
    .from('products')
    .insert(sampleData.products);
  log('Insert Sample Products', !productsError, productsError || 'Products inserted successfully');

  // Only admin/manager can insert tax types
  const { error: taxError } = await client
    .from('tax_types')
    .insert(sampleData.tax_types);
  log('Insert Tax Types', !taxError, taxError || 'Tax types inserted successfully');
}

async function testUserRole(role: 'admin' | 'manager' | 'user') {
  console.log(`\n🧪 Testing ${role.toUpperCase()} Role Access...`);

  // Create test user with role
  const { email, password, error: createError } = await createTestUser(role);
  log(`Create ${role} User`, !createError, createError || `${role} user created`);

  // Sign in as the user
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  log(`${role} Sign In`, !signInError, signInError || 'Signed in successfully');

  if (!signInData?.session) return null;

  // Create authenticated client
  const authedClient = createClient(
    'https://ddcmuhwpanbatixdfpla.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkY211aHdwYW5iYXRpeGRmcGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3OTM5OTAsImV4cCI6MjA3NDM2OTk5MH0.LhFjSYP919XvFo2MzM7V4QquGOq3UhNuo6qfGy_fDCQ',
    {
      global: {
        headers: {
          Authorization: `Bearer ${signInData.session.access_token}`
        }
      }
    }
  );

  // Test access to different resources
  // 1. Products (all users should have access)
  const { error: productsError } = await authedClient
    .from('products')
    .select('*')
    .limit(1);
  log(`${role} Products Access`, !productsError, productsError || 'Can access products');

  // 2. Sales (all authenticated users should have access)
  const { error: salesError } = await authedClient
    .from('sales')
    .select('*')
    .limit(1);
  log(`${role} Sales Access`, !salesError, salesError || 'Can access sales');

  // 3. Tax Types (only admin and manager)
  const { error: taxError } = await authedClient
    .from('tax_types')
    .select('*')
    .limit(1);
  const shouldHaveTaxAccess = role === 'admin' || role === 'manager';
  log(`${role} Tax Types Access`, 
      shouldHaveTaxAccess ? !taxError : taxError !== null,
      `Tax types access ${shouldHaveTaxAccess ? 'granted' : 'restricted'} as expected`);

  // 4. Settings (all authenticated users)
  const { error: settingsError } = await authedClient
    .from('settings')
    .select('*')
    .limit(1);
  log(`${role} Settings Access`, !settingsError, settingsError || 'Can access settings');

  // If admin/manager, try to insert sample data
  if (role === 'admin' || role === 'manager') {
    await insertSampleData(authedClient);
  }

  // Sign out
  await supabase.auth.signOut();
  return true;
}

async function runRoleTests() {
  console.log('🚀 Starting Role-Based Access Tests...');

  try {
    // Test each role
    for (const role of ['admin', 'manager', 'user'] as const) {
      await testUserRole(role);
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run the tests
runRoleTests();