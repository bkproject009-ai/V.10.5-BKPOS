import { supabase } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';

interface SaleTax {
  tax_amount: number;
  tax_type_id: string;
}

interface TaxType {
  id: string;
  name: string;
  rate: number;
}

interface SaleItem {
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
  subtotal: number;
}

export interface SaleWithTaxes {
  id: string;
  date: string;
  subtotal: number;
  total: number;
  payment_method: string;
  cashier_id: string;
  items: SaleItem[];
  taxes: Array<{
    amount: number;
    type: TaxType;
  }>;
}

export async function getSalesWithTaxes(): Promise<SaleWithTaxes[]> {
  try {
    // First check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Fetch sales with their related tax information
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select(`
        id,
        date,
        items,
        subtotal,
        total,
        payment_method,
        cashier_id,
        sales_taxes!inner(
          tax_amount,
          tax_types!inner(*)
        )
      `)
      .order('date', { ascending: false });

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      throw salesError;
    }

    // Transform the data to match our interface
    const formattedSales: SaleWithTaxes[] = salesData?.map((sale: any) => ({
      id: sale.id,
      date: sale.date,
      items: sale.items || [],
      subtotal: sale.subtotal,
      total: sale.total,
      payment_method: sale.payment_method,
      cashier_id: sale.cashier_id,
      taxes: sale.sales_taxes.map((tax: any) => ({
        amount: tax.tax_amount,
        type: {
          id: tax.tax_types.id,
          name: tax.tax_types.name,
          rate: tax.tax_types.rate
        }
      }))
    })) || [];

    return formattedSales;
  } catch (err) {
    console.error('Error in getSalesWithTaxes:', err);
    throw err;
  }
}