import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ddcmuhwpanbatixdfpla.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkY211aHdwYW5iYXRpeGRmcGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3OTM5OTAsImV4cCI6MjA3NDM2OTk5MH0.LhFjSYP919XvFo2MzM7V4QquGOq3UhNuo6qfGy_fDCQ'
);

interface TestSale {
  subtotal: number;
  tax_amount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'qris';
  cashier_id: string | null;
}

let testSale: TestSale = {
  subtotal: 10000,
  tax_amount: 1000,
  total: 11000,
  payment_method: 'cash',
  cashier_id: null // Will be set after authentication
};

async function testSalesOperations() {
  console.log('🧪 Testing Sales Operations...');

  try {
    // 1. Sign up test user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `test_sales_${Date.now()}@test.com`,
      password: 'Test123!@#'
    });

    if (authError) {
      console.error('❌ Auth failed:', authError);
      return;
    }

    console.log('✅ Auth successful');

    // For testing, we'll create sale without cashier_id
    testSale.cashier_id = null;

    // 2. Create sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert([testSale])
      .select()
      .single();

    if (saleError) {
      console.error('❌ Sale creation failed:', saleError);
      return;
    }

    console.log('✅ Sale created:', sale);

    // 3. Create sale item
    const saleItem = {
      sale_id: sale.id,
      product_id: '00000000-0000-0000-0000-000000000000', // Replace with actual product ID
      quantity: 1,
      price_at_time: 10000
    };

    const { error: itemError } = await supabase
      .from('sale_items')
      .insert([saleItem]);

    if (itemError) {
      console.error('❌ Sale item creation failed:', itemError);
      return;
    }

    console.log('✅ Sale item created');

    // 4. Create sale tax
    const saleTax = {
      sale_id: sale.id,
      tax_type_id: '00000000-0000-0000-0000-000000000000', // Replace with actual tax type ID
      tax_amount: 1000
    };

    const { error: taxError } = await supabase
      .from('sales_taxes')
      .insert([saleTax]);

    if (taxError) {
      console.error('❌ Sale tax creation failed:', taxError);
      return;
    }

    console.log('✅ Sale tax created');

    // 5. Read sale
    const { data: readSale, error: readError } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (*),
        sales_taxes (*)
      `)
      .eq('id', sale.id)
      .single();

    if (readError) {
      console.error('❌ Sale read failed:', readError);
      return;
    }

    console.log('✅ Sale read successful:', readSale);

    // 6. Delete sale (should cascade)
    const { error: deleteError } = await supabase
      .from('sales')
      .delete()
      .eq('id', sale.id);

    if (deleteError) {
      console.error('❌ Sale deletion failed:', deleteError);
      return;
    }

    console.log('✅ Sale deleted');

    // Clean up - Sign out
    await supabase.auth.signOut();
    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
console.log('🚀 Starting Sales Integration Test...');
testSalesOperations();