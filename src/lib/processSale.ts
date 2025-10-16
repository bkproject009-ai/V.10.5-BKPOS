import { supabase } from './supabase';
export interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
    category?: string;
  };
  quantity: number;
}

export interface ProcessSaleResult {
  success: boolean;
  saleId?: string;
  error?: string;
}

export async function processSale(
  cart: CartItem[],
  paymentMethod: 'cash' | 'qris',
  cashierId: string,
  subtotal: number,
  taxAmount: number,
  total: number
): Promise<ProcessSaleResult> {
  try {
    // Process sale with stock reduction
    const { data: saleData, error: saleError } = await supabase.rpc('process_sale', {
      _items: cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price
      })),
      _payment_method: paymentMethod,
      _cashier_id: cashierId
    });

    if (saleError) {
      console.error('Error processing sale:', saleError);
      return {
        success: false,
        error: saleError.message
      };
    }

    // Update sale details
    const { error: updateError } = await supabase
      .from('sales')
      .update({
        subtotal,
        tax_amount: taxAmount,
        total,
        status: 'completed',
        completed_at: new Date().toISOString(),
        payment_details: {
          method: paymentMethod,
          amount: total,
          timestamp: new Date().toISOString()
        }
      })
      .eq('id', saleData);

    if (updateError) {
      console.error('Error updating sale:', updateError);
      return {
        success: false,
        error: updateError.message
      };
    }

    return {
      success: true,
      saleId: saleData
    };
  } catch (error) {
    console.error('Unexpected error during sale:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}