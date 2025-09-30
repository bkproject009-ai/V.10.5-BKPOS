import { testSupabaseConnection } from './src/lib/testConnection';

async function runTest() {
  console.log('Testing Supabase connection...');
  const isConnected = await testSupabaseConnection();
  if (isConnected) {
    console.log('✅ Supabase connection test passed');
  } else {
    console.log('❌ Supabase connection test failed');
  }
}

runTest().catch(console.error);