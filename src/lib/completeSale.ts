import { supabase } from './supabase';
import { Cart, PaymentDetails, SaleItem, SaleTax } from './types';
import { SupabaseClient } from '@supabase/supabase-js';

export interface CompleteSaleParams {
  paymentMethod: string;
  status: 'pending' | 'completed' | 'cancelled';
  total: number;
  subtotal: number;
  taxAmount: number;
  cashierId: string;
  paymentDetails: PaymentDetails;
  cart: Cart;
  salesTaxes: SaleTax[];
}

export interface CompleteSaleResult {
  success: boolean;
  saleId?: string;
  error?: string;
  details?: any;
}

export async function completeSale({
  paymentMethod,
  status,
  total,
  subtotal,
  taxAmount,
  cashierId,
  paymentDetails,
  cart,
  salesTaxes
}: CompleteSaleParams): Promise<CompleteSaleResult> {
  try {
    console.log('Starting sale transaction...', {
      total,
      items: cart.length,
      cashierId
    });

    // Convert cart items to sale items format
    const saleItems = cart.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
      price_at_time: item.product.price
    }));

    // Format sales taxes
    const formattedTaxes = salesTaxes.map(tax => ({
      tax_id: tax.id,
      amount: tax.amount
    }));

    // Call the stored procedure
    const { data, error } = await supabase
      .rpc('complete_sale_transaction', {
        p_payment_method: paymentMethod,
        p_status: status,
        p_total: total,
        p_subtotal: subtotal,
        p_tax_amount: taxAmount,
        p_cashier_id: cashierId,
        p_payment_details: paymentDetails,
        p_sale_items: saleItems,
        p_sales_taxes: formattedTaxes
      });

    if (error) {
      console.error('Sale transaction failed:', error);
      return {
        success: false,
        error: error.message,
        details: error.details
      };
    }

    console.log('Sale completed successfully:', data[0]);
    return {
      success: true,
      saleId: data[0].id
    };

  } catch (error) {
    console.error('Unexpected error during sale:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error
    };
  }
}

// Helper function to verify stock availability before sale
export async function verifyStockAvailability(
  cart: Cart,
  cashierId: string
): Promise<{ available: boolean; insufficientItems?: Array<{ productId: string, available: number, requested: number }> }> {
  try {
    // Get current stock levels for all products in cart
    const { data: stockLevels, error } = await supabase
      .from('cashier_stock')
      .select('product_id, stock')
      .eq('cashier_id', cashierId)
      .in('product_id', cart.map(item => item.product.id));

    if (error) {
      throw error;
    }

    // Create a map of product_id to stock level
    const stockMap = new Map(
      stockLevels.map(item => [item.product_id, item.stock])
    );

    // Check each cart item against stock levels
    const insufficientItems = cart
      .filter(item => {
        const availableStock = stockMap.get(item.product.id) ?? 0;
        return availableStock < item.quantity;
      })
      .map(item => ({
        productId: item.product.id,
        available: stockMap.get(item.product.id) ?? 0,
        requested: item.quantity
      }));

    return {
      available: insufficientItems.length === 0,
      insufficientItems: insufficientItems.length > 0 ? insufficientItems : undefined
    };
  } catch (error) {
    console.error('Error verifying stock:', error);
    throw error;
  }
}
