import { supabase } from './supabase';

export async function testSupabaseConnection() {
  try {
    // Try to list all products
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Connection error:', error.message);
      return false;
    }

    console.log('Successfully connected to Supabase');
    return true;
  } catch (err) {
    console.error('Connection test failed:', err);
    return false;
  }
}