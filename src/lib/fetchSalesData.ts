import { supabase } from './supabase';

interface TaxType {
  name: string;
  rate: number;
}

interface SaleTax {
  tax_type_id: string;
  tax_amount: number;
  tax_types: TaxType;
}

interface ProductItem {
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  created_at: string;
  subtotal: number;
  total: number;
  payment_method: string;
  cashier_id: string;
  items: ProductItem[];
  sales_taxes: SaleTax[];
}

export async function fetchSalesData() {
  try {
    // Get current session
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error('Authentication failed');
    }
    if (!session) {
      console.error('No session found');
      throw new Error('Not authenticated');
    }

    // Set auth headers
    supabase.auth.setSession(session);

    console.log('Starting sales data fetch with session:', session.user?.id);

    // Fetch sales with proper join syntax and ordering
    // Fetch sales data with all related information
    // Fetch sales data with a simpler query first
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*), sales_taxes(*)')
      .order('created_at', { ascending: false });

    console.log('Sales query response:', { data, error }); // Add limit to prevent too much data

    if (error) {
      console.error('Error fetching sales:', error);
      throw error;
    }

    if (!data) {
      console.log('No sales data found');
      return [];
    }

    // Transform and validate the data structure
    const transformedData = data.map(sale => {
      console.log('Processing sale:', sale);
      
      const transformedSale: Sale = {
        id: sale.id,
        created_at: sale.created_at,
        subtotal: Number(sale.subtotal || 0),
        total: Number(sale.total || 0),
        payment_method: sale.payment_method || 'cash',
        cashier_id: sale.cashier_id,
        items: [],
        sales_taxes: []
      };

      // Add items if they exist
      if (Array.isArray(sale.sale_items)) {
        transformedSale.items = sale.sale_items.map(item => ({
          product: {
            id: item.product_id || '',
            name: item.product?.name || 'Unknown Product',
            price: Number(item.price_at_time || 0)
          },
          quantity: Number(item.quantity || 0),
          subtotal: Number(item.price_at_time || 0) * Number(item.quantity || 0)
        }));
      }

      // Add taxes if they exist
      if (Array.isArray(sale.sales_taxes)) {
        transformedSale.sales_taxes = sale.sales_taxes.map(tax => ({
          tax_type_id: tax.tax_type_id || '',
          tax_amount: Number(tax.tax_amount || 0),
          tax_types: {
            name: 'Tax',
            rate: 0
          }
        }));
      }

      console.log('Transformed sale:', transformedSale);
      return transformedSale;
    });

    return transformedData;
  } catch (err) {
    console.error('Error in fetchSalesData:', err);
    throw err;
  }
}