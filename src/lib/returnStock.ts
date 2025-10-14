import { supabase } from './supabase';

interface ReturnResult {
  success: boolean;
  error?: string;
  previous_stock?: number;
  new_stock?: number;
  returned_quantity?: number;
}

export const returnCashierStock = async (
  productId: string,
  cashierId: string,
  quantity: number,
  reason: string
): Promise<ReturnResult> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId) || !uuidRegex.test(cashierId) || !uuidRegex.test(user.user.id)) {
      throw new Error('Invalid UUID format');
    }

    // Validate quantity
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    // Validate reason
    if (!reason || !['Sisa Produk', 'Reject/Rusak', 'Kadaluarsa'].includes(reason)) {
      throw new Error('Invalid reason');
    }

    const { data, error } = await supabase
      .rpc('return_cashier_stock', {
        _product_id: productId,
        _cashier_id: cashierId,
        _quantity: quantity,
        _reason: reason,
        _user_id: user.user.id
      });

    if (error) {
      console.error('Supabase RPC Error:', error);
      throw new Error(error.message || 'Failed to return stock');
    }
    
    return data as ReturnResult;
  } catch (error) {
    console.error('Error returning stock:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
