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
  try {
    // First check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) throw new Error('Authentication error: ' + authError.message);
    if (!session) throw new Error('Anda harus login terlebih dahulu');

    // Check if user is admin first
    const { data: isAdmin, error: checkError } = await supabase
      .rpc('is_admin');
    
    if (checkError) {
      console.error('Error checking admin status:', checkError);
      throw new Error('Gagal memeriksa izin admin');
    }

    if (!isAdmin) {
      throw new Error('Anda tidak memiliki izin untuk menambah produk');
    }

    // Try to add the product
    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();
    
    if (insertError) {
      console.error('Error inserting product:', insertError);
      throw new Error('Gagal menambahkan produk');
    }

    if (!newProduct) {
      throw new Error('Gagal menambahkan produk: Tidak ada data yang dikembalikan');
    }

    return newProduct;
  } catch (error) {
    console.error('Error in addProduct:', error);
    throw error;
  }

  // Check JWT debug info
  const { data: jwtDebug } = await supabase
    .rpc('debug_jwt');
  console.log('JWT Debug:', jwtDebug);

  // Finally, try to add the product
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select()
    .single();
  
  if (error) {
    if (error.code === '23505') {
      throw new Error('SKU produk sudah digunakan. Mohon gunakan SKU yang berbeda.');
    }
    if (error.code === '42501') {
      throw new Error('Anda tidak memiliki izin untuk menambah produk');
    }
    throw error;
  }
  
  return data;
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<Product> {
  // First check if user is authenticated
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError) throw new Error('Authentication error: ' + authError.message);
  if (!session) throw new Error('Anda harus login terlebih dahulu');

  // Then check if user has admin role
  const { user } = session;
  const isAdmin = user?.user_metadata?.role === 'admin';
  if (!isAdmin) throw new Error('Hanya administrator yang dapat mengubah produk');

  // Finally, try to update the product
  const { data, error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    if (error.code === '23505') {
      throw new Error('SKU produk sudah digunakan. Mohon gunakan SKU yang berbeda.');
    }
    if (error.code === '42501') {
      throw new Error('Anda tidak memiliki izin untuk mengubah produk');
    }
    throw error;
  }
  
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  // Check if product has any sales records
  const { data: saleItems, error: checkError } = await supabase
    .from('sale_items')
    .select('id')
    .eq('product_id', id)
    .limit(1);
    
  if (checkError) throw checkError;
  
  if (saleItems && saleItems.length > 0) {
    throw {
      code: '23503',
      message: 'Product has associated sales records'
    };
  }

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
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('User must be logged in to create a sale');

  // First, create the sale record
  const { data: saleData, error: saleError } = await supabase
    .from('sales')
    .insert([{
      subtotal,
      tax_amount: taxes.reduce((sum, tax) => sum + tax.taxAmount, 0),
      total,
      payment_method: paymentMethod,
      cashier_id: user.id,
      status: 'completed'
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

  // Create sale items records
  const saleItems = items.map(item => ({
    sale_id: saleData.id,
    product_id: item.product.id,
    quantity: item.quantity,
    price_at_time: item.product.price
  }));

  const { error: itemsError } = await supabase
    .from('sale_items')
    .insert(saleItems);

  if (itemsError) throw itemsError;

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
    .select(`
      id,
      created_at,
      subtotal,
      total,
      payment_method,
      cashier_id,
      sale_items (
        quantity,
        price_at_time,
        product_id
      ),
      sales_taxes (
        tax_type_id,
        tax_amount
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sales:', error);
    throw error;
  }
  
  // Transform the data to match the Sale type
  const transformedData = (data || []).map(sale => ({
    id: sale.id,
    created_at: sale.created_at,
    subtotal: Number(sale.subtotal || 0),
    total: Number(sale.total || 0),
    payment_method: sale.payment_method,
    cashier_id: sale.cashier_id,
    items: Array.isArray(sale.sale_items) ? sale.sale_items.map(item => ({
      quantity: Number(item.quantity),
      price_at_time: Number(item.price_at_time),
      product_id: item.product_id
    })) : [],
    sales_taxes: Array.isArray(sale.sales_taxes) ? sale.sales_taxes.map(tax => ({
      tax_type_id: tax.tax_type_id,
      tax_amount: Number(tax.tax_amount)
    })) : []
  }));

  return transformedData;
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
