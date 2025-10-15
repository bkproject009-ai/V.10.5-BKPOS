import { supabase } from './supabase'

export interface SaleItem {
  product_id: string
  quantity: number
  price: number
}

export interface SaleData {
  items: SaleItem[]
  paymentMethod: 'cash' | 'qris'
  subtotal: number
  taxes: number
  total: number
}

export async function completeSale(data: SaleData) {
  const { data: sale, error } = await supabase
    .from('sales')
    .insert([{
      items: data.items,
      payment_method: data.paymentMethod,
      subtotal: data.subtotal,
      tax_amount: data.taxes,
      total: data.total,
      status: 'completed',
      created_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) throw error
  return sale
}

export async function returnCashierStock(
  productId: string,
  cashierId: string,
  quantity: number,
  reason: string
) {
  const { error } = await supabase.rpc('return_cashier_stock', {
    p_product_id: productId,
    p_cashier_id: cashierId,
    p_quantity: quantity,
    p_reason: reason
  })

  if (error) throw error
  return { success: true }
}

export async function distributeStock(
  productId: string,
  cashierId: string,
  quantity: number
) {
  const { error } = await supabase.rpc('distribute_stock_to_cashier', {
    p_product_id: productId,
    p_cashier_id: cashierId,
    p_quantity: quantity
  })

  if (error) throw error
  return { success: true }
}

export async function getCashiers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'cashier')
    .order('name')

  if (error) throw error
  return data
}

export async function getCashierStock(cashierId: string) {
  const { data, error } = await supabase
    .from('cashier_stocks')
    .select(`
      quantity,
      product:products (
        id,
        name,
        price
      )
    `)
    .eq('cashier_id', cashierId)

  if (error) throw error
  return data
}
