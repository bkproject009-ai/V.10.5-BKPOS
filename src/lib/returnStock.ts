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
    // Begin transaction
    const { data: currentStock, error: stockError } = await supabase
      .from('cashier_stock')
      .select('stock')
      .eq('product_id', productId)
      .eq('cashier_id', cashierId)
      .single();

    if (stockError) throw stockError;

    const currentStockQty = currentStock?.stock || 0;
    if (currentStockQty < quantity) {
      throw new Error(`Stok tidak mencukupi. Tersedia: ${currentStockQty}, Diminta: ${quantity}`);
    }

    // Update cashier stock
    const { error: updateError } = await supabase
      .from('cashier_stock')
      .update({
        stock: currentStockQty - quantity,
        updated_at: new Date().toISOString()
      })
      .eq('product_id', productId)
      .eq('cashier_id', cashierId);

    if (updateError) throw updateError;

    // Update storage stock
    const { data: storage, error: storageError } = await supabase
      .from('products')
      .select('storage_stock')
      .eq('id', productId)
      .single();

    if (storageError) throw storageError;

    const { error: updateStorageError } = await supabase
      .from('products')
      .update({
        storage_stock: (storage?.storage_stock || 0) + quantity
      })
      .eq('id', productId);

    if (updateStorageError) throw updateStorageError;

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
