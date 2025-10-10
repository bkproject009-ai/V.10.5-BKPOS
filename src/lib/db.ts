import { supabase } from './supabase';
import type { Product, Sale, CartItem } from '@/contexts/POSContext';
import type { TaxType, SaleTax } from './tax';

// Cashier type definition
export interface Cashier {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  role: string;
}

// Fetch cashiers
export async function fetchCashiers(): Promise<Cashier[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, username, full_name, role')
    .eq('role', 'cashier')
    .order('full_name', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

// Product Operations
export async function fetchProducts(): Promise<Product[]> {
  // Fetch products with their storage and cashier stocks
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_storage (
        quantity,
        updated_at
      ),
      cashier_stock (
        cashier_id,
        quantity,
        updated_at
      )
    `)
    .order('updated_at', { ascending: false });
  
  if (error) throw error;

  // Transform the data to include storage_stock and cashier_stock
  return (data || []).map(product => {
    const storage_stock = Number(product.storage_stock || product.product_storage?.[0]?.quantity || 0);
    const cashier_stocks = product.cashier_stock || [];
    const cashier_stock = cashier_stocks.reduce((acc: Record<string, number>, stock: { cashier_id: string, quantity: number }) => {
      acc[stock.cashier_id] = Number(stock.quantity || 0);
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate total stock
    const total_cashier_stock = Object.values(cashier_stock).reduce((sum: number, qty: number) => sum + qty, 0);
    
    const total_stock = storage_stock + Object.values(cashier_stock).reduce((sum: number, qty: number) => sum + qty, 0);

    return {
      ...product,
      storage_stock,
      cashier_stock,
      total_stock
    };
  });
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

    // Prepare product data by removing invalid columns
    const { cashier_stock, storage_stock, total_stock, initial_stock, ...validProductData } = product;

    // Begin transaction
    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert([validProductData])
      .select('*')
      .single();

    if (insertError) throw insertError;
    if (!newProduct) throw new Error('Gagal menambahkan produk: Tidak ada data yang dikembalikan');

    // Add initial stock to product_storage if provided
    if (initial_stock && initial_stock > 0) {
      const { error: storageError } = await supabase
        .from('product_storage')
        .insert({
          product_id: newProduct.id,
          quantity: initial_stock,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (storageError) throw storageError;

      // Record the initial stock addition
      const { error: adjustmentError } = await supabase
        .from('stock_adjustments')
        .insert({
          product_id: newProduct.id,
          quantity: initial_stock,
          type: 'addition',
          reason: 'Stok awal produk',
          location_type: 'warehouse',
          adjusted_by: session.user.id,
          adjusted_at: new Date().toISOString()
        });

      if (adjustmentError) throw adjustmentError;
    }

    // Get the complete product data with related information
    const { data: productData, error: selectError } = await supabase
      .from('products')
      .select(`
        *,
        product_storage (
          quantity,
          updated_at
        ),
        cashier_stock (
          cashier_id,
          quantity,
          updated_at
        )
      `)
      .eq('id', newProduct.id)
      .single();

    if (selectError) throw selectError;
    if (!productData) throw new Error('Gagal mendapatkan data produk setelah penambahan');

    return productData;
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
  
  if (error) throw error;
  if (!data) throw new Error('Product not found');
  
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
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError) throw new Error('Authentication error: ' + authError.message);
  if (!session) throw new Error('Anda harus login terlebih dahulu');

  // Start a transaction
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert([{
      subtotal,
      tax_amount: taxes.reduce((sum, tax) => sum + tax.taxAmount, 0),
      total,
      payment_method: paymentMethod,
      cashier_id: session.user.id,
    }])
    .select()
    .single();

  if (saleError) throw saleError;
  if (!sale) throw new Error('Failed to create sale');

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

  const { error: taxesError } = await supabase
    .from('sales_taxes')
    .insert(saleTaxes);

  if (taxesError) throw taxesError;

  return {
    ...sale,
    sale_items: saleItems,
    sales_taxes: saleTaxes
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
    sale_items: Array.isArray(sale.sale_items) ? sale.sale_items.map(item => ({
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
  if (!data) throw new Error('Sale not found');
  
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