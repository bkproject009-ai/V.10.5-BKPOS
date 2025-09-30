import { supabase } from './supabase';
import type { Product, Sale, CartItem } from '@/contexts/POSContext';
import type { TaxType } from './tax';

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*');
  
  if (error) throw error;
  return data || [];
}

export async function addProduct(product: Omit<Product, 'id'>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

import { SaleTax } from './tax';

export async function createSale(
  items: CartItem[], 
  subtotal: number, 
  taxes: SaleTax[], 
  total: number, 
  paymentMethod: 'cash' | 'card' | 'qris'
): Promise<Sale> {
  const totalTax = taxes.reduce((sum, tax) => sum + tax.taxAmount, 0);
  
  // Get current session to ensure we have an authenticated user
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error('No authenticated user found');

  // First verify that the user exists in public.users
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', session.user.id)
    .single();

  if (userError) {
    console.error('User verification failed:', userError);
    // Try to create user if doesn't exist
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: session.user.id,
        email: session.user.email,
        role: session.user.user_metadata.role || 'cashier'
      });
    if (insertError) {
      console.error('Failed to create user:', insertError);
      throw new Error('Failed to verify user access');
    }
  }
  
  const cashierId = session.user.id;

  // Start a Supabase transaction
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert([{
      subtotal,
      tax_amount: totalTax,
      total,
      payment_method: paymentMethod,
      cashier_id: cashierId
    }])
    .select()
    .single();

  if (saleError) throw saleError;

  // Insert sale items
  const saleItems = items.map(item => ({
    sale_id: sale.id,
    product_id: item.product.id,
    quantity: item.quantity,
    price_at_time: item.product.price
  }));

  const { error: itemsError } = await supabase
    .from('sale_items')
    .insert(saleItems);

  if (itemsError) throw itemsError;

  // Insert sale taxes
  const saleTaxes = taxes.map(tax => ({
    sale_id: sale.id,
    tax_type_id: tax.taxTypeId,
    tax_amount: tax.taxAmount
  }));

  const { error: taxError } = await supabase
    .from('sales_taxes')
    .insert(saleTaxes);

  if (taxError) throw taxError;

  // Update product stock levels
  for (const item of items) {
    const { error: stockError } = await supabase
      .from('products')
      .update({ stock: item.product.stock - item.quantity })
      .eq('id', item.product.id);

    if (stockError) throw stockError;
  }

  return {
    id: sale.id,
    items,
    subtotal,
    taxAmount: totalTax,
    total,
    date: new Date(sale.created_at),
    paymentMethod
  };
}

export async function fetchSales(): Promise<Sale[]> {
  const { data: salesData, error: salesError } = await supabase
    .from('sales')
    .select(`
      *,
      sale_items (
        *,
        products (*)
      )
    `)
    .order('created_at', { ascending: false });

  if (salesError) throw salesError;
  if (!salesData) return [];

  return salesData.map(sale => ({
    id: sale.id,
    items: sale.sale_items.map(item => ({
      product: item.products,
      quantity: item.quantity
    })),
    subtotal: sale.subtotal,
    taxAmount: sale.tax_amount,
    total: sale.total,
    date: new Date(sale.created_at),
    paymentMethod: sale.payment_method
  }));
}

export async function updateSale(id: string, saleData: Partial<Sale>): Promise<Sale> {
  const { data, error } = await supabase
    .from('sales')
    .update({
      subtotal: saleData.subtotal,
      tax_amount: saleData.taxAmount,
      total: saleData.total,
      payment_method: saleData.paymentMethod
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteSale(id: string): Promise<void> {
  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

export async function getTaxTypes(): Promise<TaxType[]> {
  const { data, error } = await supabase
    .from('tax_types')
    .select('*')
    .order('created_at');
  
  if (error) throw error;
  return data || [];
}

