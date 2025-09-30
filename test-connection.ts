import { testSupabaseConnection } from './src/lib/testConnection';

async function runTest() {
  const isConnected = await testSupabaseConnection();
  console.log('Connection test result:', isConnected);
}

runTest();