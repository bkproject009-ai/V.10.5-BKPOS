import { supabase } from './supabase';

interface DistributeResult {
  success: boolean;
  error?: string;
  previous_stock?: number;
  new_stock?: number;
  previous_cashier_stock?: number;
  new_cashier_stock?: number;
}

export const distributeStockToCashier = async (
  productId: string,
  cashierId: string,
  quantity: number
): Promise<DistributeResult> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .rpc('distribute_to_cashier', {
        _product_id: productId,
        _cashier_id: cashierId,
        _quantity: quantity,
        _user_id: user.user.id
      });

    if (error) throw error;
    
    return data as DistributeResult;
  } catch (error) {
    console.error('Error distributing stock:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};