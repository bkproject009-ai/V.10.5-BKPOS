import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ddcmuhwpanbatixdfpla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkY211aHdwYW5iYXRpeGRmcGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3OTM5OTAsImV4cCI6MjA3NDM2OTk5MH0.LhFjSYP919XvFo2MzM7V4QquGOq3UhNuo6qfGy_fDCQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test table existence
    console.log('Testing database connection...');
    
    // Test products table
    const { data: products, error: productsError } = await supabase.from('products').select('id').limit(1);
    console.log('\nProducts table:', productsError ? 'Error' : 'OK');
    if (productsError) console.error(productsError);
    
    // Test sales table
    const { data: sales, error: salesError } = await supabase.from('sales').select('id').limit(1);
    console.log('Sales table:', salesError ? 'Error' : 'OK');
    if (salesError) console.error(salesError);
    
    // Test tax_types table
    const { data: taxTypes, error: taxError } = await supabase.from('tax_types').select('id').limit(1);
    console.log('Tax types table:', taxError ? 'Error' : 'OK');
    if (taxError) console.error(taxError);
    
    // Test users
    const { data: users, error: usersError } = await supabase.auth.getUser();
    console.log('Auth system:', usersError ? 'Error' : 'OK');
    if (usersError) console.error(usersError);
    
  } catch (err) {
    console.error('Error:', err);
  }
}

testConnection();