import { supabase } from './supabase'

interface SaleItem {
  product_id: string
  quantity: number
  price_at_time: number
}

interface SaleTax {
  tax_id: string
  amount: number
}

interface CompleteSaleParams {
  payment_method: 'cash' | 'qris'
  status: 'pending' | 'completed'
  total: number
  subtotal: number
  tax_amount: number
  cashier_id: string
  payment_details: Record<string, any>
  sale_items: SaleItem[]
  sales_taxes: SaleTax[]
}

export async function completeSale(params: CompleteSaleParams) {
  try {
    // Call the stored procedure that handles the entire transaction
    const { data: sale, error } = await supabase.rpc('complete_sale_transaction', {
      p_payment_method: params.payment_method,
      p_status: params.status,
      p_total: params.total,
      p_subtotal: params.subtotal,
      p_tax_amount: params.tax_amount,
      p_cashier_id: params.cashier_id,
      p_payment_details: params.payment_details,
      p_sale_items: params.sale_items,
      p_sales_taxes: params.sales_taxes
    })

    if (error) {
      console.error('Error completing sale:', error)
      throw error
    }

    // The stored procedure returns an array with one row
    return sale[0]
  } catch (error) {
    console.error('Error in completeSale:', error)
    throw error
  }
}
}
