import { supabase } from './supabase';
import type { Product, Sale, CartItem } from '@/contexts/POSContext';
import type { TaxType, SaleTax } from './tax';

// Product Operations
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

// Sales Operations
export async function createSale(
  items: CartItem[], 
  subtotal: number, 
  taxes: SaleTax[],
  total: number,
  paymentMethod: string
): Promise<Sale> {
  // Start a transaction
  const { data: saleData, error: saleError } = await supabase
    .from('sales')
    .insert([{
      items,
      subtotal,
      total,
      payment_method: paymentMethod,
      date: new Date().toISOString()
    }])
    .select()
    .single();

  if (saleError) throw saleError;

  // Update product stocks
  for (const item of items) {
    // Get current stock
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.product.id)
      .single();

    if (fetchError) throw fetchError;

    const newStock = currentProduct.stock - item.quantity;
    if (newStock < 0) {
      throw new Error(`Insufficient stock for product ${item.product.name}`);
    }

    // Update stock
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', item.product.id);

    if (updateError) throw updateError;
  }

  // Create tax records if there are any
  if (taxes.length > 0) {
    const taxRecords = taxes.map(tax => ({
      sale_id: saleData.id,
      tax_type_id: tax.taxTypeId,
      tax_amount: tax.taxAmount
    }));

    const { error: taxError } = await supabase
      .from('sales_taxes')
      .insert(taxRecords);

    if (taxError) throw taxError;
  }

  return {
    ...saleData,
    taxes,
    items
  };
}

export async function fetchSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('*, sales_taxes(tax_type_id, tax_amount)')
    .order('date', { ascending: false });

  if (error) throw error;
  
  // Transform the data to match the Sale type
  const transformedData = data?.map(sale => ({
    ...sale,
    taxes: sale.sales_taxes || [],
    items: sale.items || [],
    date: new Date(sale.date)
  }));

  return transformedData || [];
}

export async function updateSale(id: string, sale: Partial<Sale>): Promise<Sale> {
  const { data, error } = await supabase
    .from('sales')
    .update(sale)
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

// Tax Operations
export async function getTaxTypes(): Promise<TaxType[]> {
  const { data, error } = await supabase
    .from('tax_types')
    .select('*');

  if (error) throw error;
  return data || [];
}
