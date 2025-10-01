const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ddcmuhwpanbatixdfpla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkY211aHdwYW5iYXRpeGRmcGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3OTM5OTAsImV4cCI6MjA3NDM2OTk5MH0.LhFjSYP919XvFo2MzM7V4QquGOq3UhNuo6qfGy_fDCQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('products').select('count()', { count: 'exact' });
    
    if (error) {
      console.error('Error connecting to Supabase:', error);
    } else {
      console.log('Successfully connected to Supabase');
      console.log('Products count:', data[0].count);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testConnection();