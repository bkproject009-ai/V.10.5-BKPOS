import { supabase } from './supabase';
import { Product } from '@/contexts/POSContext';

export interface StockAdjustment {
  id: string;
  product_id: string;
  quantity_change: number;
  reason: string;
  adjusted_by: string;
  adjusted_at: string;
  location_type: 'warehouse' | 'cashier';
  location_id: string;
}

export interface StockDistribution {
  id: string;
  product_id: string;
  quantity: number;
  cashier_id: string;
  distributed_by: string;
  distributed_at: string;
  notes?: string;
  product?: {
    name: string;
  };
  cashier?: {
    full_name: string;
    username: string;
  };
  distributor?: {
    full_name: string;
    username: string;
  };
}

interface StockAdjustmentResponse {
  success: boolean;
  previous_stock: number;
  new_stock: number;
  change: number;
  product?: any;
  error?: string;
}

// Storage functions with error handling and response validation
export const updateStorageStock = async (productId: string, quantity: number, reason: string) => {
  try {
    console.log('Updating storage stock:', { productId, quantity, reason });

    // Make sure productId is a valid UUID
    if (!productId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new Error('Invalid product ID format');
    }

    // Call the RPC function with explicit type casting
    const { data, error } = await supabase.rpc('update_warehouse_stock', {
      _product_id: productId as unknown as string,
      _quantity: quantity,
      _reason: reason
    });

    console.log('RPC response full data:', JSON.stringify({ data, error }, null, 2));

    if (error) {
      console.error('RPC error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    // Check response from the function
    const response = data as StockAdjustmentResponse;
    // Log the full response object for debugging
    console.log('Response object:', JSON.stringify(response, null, 2));
    
    // Handle case where data is null or undefined
    if (!data || !data.response) {
      throw new Error('Tidak ada respon dari server');
    }

    // Get the actual response object from the nested structure
    const actualResponse = data.response;
    
    // Handle case where response is not in expected format
    if (typeof actualResponse.success !== 'boolean') {
      console.error('Invalid response format:', actualResponse);
      throw new Error('Format respon dari server tidak valid');
    }

    // Handle failure case
    if (!actualResponse.success) {
      console.error('Stock adjustment failed:', actualResponse.error || 'Unknown error');
      return {
        success: false,
        previous_stock: actualResponse.previous_stock || 0,
        new_stock: actualResponse.new_stock || 0,
        change: 0,
        error: actualResponse.error || 'Gagal memperbarui stok gudang'
      };
    }

    // Return success response
    return {
      success: true,
      previous_stock: actualResponse.previous_stock,
      new_stock: actualResponse.new_stock,
      change: actualResponse.change,
      error: null
    };

    // Immediately fetch the latest product data to ensure UI is up-to-date
    const { data: updatedProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated product:', fetchError);
      throw new Error('Gagal memuat data produk terbaru');
    }

    return {
      success: true,
      previous_stock: response.previous_stock,
      new_stock: updatedProduct.storage_stock,
      change: quantity,
      product: updatedProduct
    };
  } catch (error) {
    console.error('Error updating storage stock:', error);
    throw error instanceof Error ? error : new Error('Gagal memperbarui stok gudang');
  }
};

// Enhanced distribute stock function with validation
export const distributeStock = async (
  productId: string, 
  cashierId: string, 
  quantity: number,
  distributedBy: string,
  notes?: string
) => {
  try {
    // Check current warehouse stock first
    const { data: currentStock, error: stockError } = await supabase
      .from('product_storage')
      .select('quantity')
      .eq('product_id', productId)
      .single();

    if (stockError) throw stockError;
    
    if (!currentStock || currentStock.quantity < quantity) {
      throw new Error('Stok di gudang tidak mencukupi untuk distribusi');
    }

    const { data, error } = await supabase.rpc('distribute_stock_to_cashier', {
      _product_id: productId,
      _cashier_id: cashierId,
      _quantity: quantity,
      _distributed_by: distributedBy,
      _notes: notes || ''
    });

    console.log('Distribution response:', JSON.stringify({ data, error }, null, 2));

    if (error) throw error;
    
    // Get the actual response object from the nested structure
    const response = data?.response;
    
    if (!response || !response.success) {
      throw new Error(response?.error || 'Gagal mendistribusikan stok: Respon tidak valid');
    }
    
    return response;
  } catch (error) {
    console.error('Error distributing stock:', error);
    throw error instanceof Error ? error : new Error('Gagal mendistribusikan stok');
  }
};

// Fetch products with complete stock information
export const fetchProducts = async () => {
  try {
    // First, get products with warehouse stock
    const { data: products, error } = await supabase
      .from('products')
      .select('*, product_storage(quantity)');

    if (error) throw error;

    // Then, get cashier stock for all products
    const { data: cashierStocks, error: cashierError } = await supabase
      .from('cashier_stock')
      .select('product_id, cashier_id, quantity');

    if (cashierError) throw cashierError;

    // Convert cashier stocks to a map for easier lookup
    const cashierStockMap = cashierStocks?.reduce((acc, cs) => {
      if (!acc[cs.product_id]) {
        acc[cs.product_id] = {};
      }
      acc[cs.product_id][cs.cashier_id] = cs.quantity;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    return products.map((product: any) => ({
      ...product,
      warehouse_stock: product.product_storage?.[0]?.quantity || 0,
      cashier_stock: cashierStockMap[product.id] || {}
    }));
  } catch (error) {
    console.error('Error fetching products:', error);
    throw new Error('Gagal mengambil data produk');
  }
};

// Enhanced stock distribution tracking
export const fetchStockDistributions = async (
  productId?: string,
  cashierId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<StockDistribution[]> => {
  try {
    let query = supabase
      .from('stock_distributions')
      .select(`
        *,
        products(name),
        auth.users!cashier_id(full_name, username),
        auth.users!distributed_by(full_name, username)
      `);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (cashierId) {
      query = query.eq('cashier_id', cashierId);
    }

    if (startDate) {
      query = query.gte('distributed_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('distributed_at', endDate.toISOString());
    }

    const { data, error } = await query.order('distributed_at', { ascending: false });

    if (error) throw error;
    return data as StockDistribution[];
  } catch (error) {
    console.error('Error fetching stock distributions:', error);
    throw new Error('Gagal mengambil data distribusi stok');
  }
};

// Stock adjustment functions
export const adjustStock = async (
  productId: string,
  quantity: number,
  reason: string,
  locationType: 'warehouse' | 'cashier',
  locationId: string,
  adjustedBy: string
): Promise<void> => {
  try {
    const { error } = await supabase.rpc('adjust_stock', {
      _product_id: productId,
      _quantity: quantity,
      _reason: reason,
      _location_type: locationType,
      _location_id: locationId,
      _adjusted_by: adjustedBy
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error adjusting stock:', error);
    throw new Error('Gagal menyesuaikan stok');
  }
};

// Fetch stock adjustments history
export const fetchStockAdjustments = async (
  productId?: string,
  locationType?: 'warehouse' | 'cashier',
  locationId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<StockAdjustment[]> => {
  try {
    let query = supabase
      .from('stock_adjustments')
      .select('*');

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (locationType) {
      query = query.eq('location_type', locationType);
    }

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    if (startDate) {
      query = query.gte('adjusted_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('adjusted_at', endDate.toISOString());
    }

    const { data, error } = await query.order('adjusted_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching stock adjustments:', error);
    throw new Error('Gagal mengambil riwayat penyesuaian stok');
  }
};

// Get low stock alerts
export const getLowStockAlerts = async (threshold: number = 10): Promise<{
  product_id: string;
  product_name: string;
  current_stock: number;
  location_type: 'warehouse' | 'cashier';
  location_id: string;
  threshold: number;
}[]> => {
  try {
    const { data, error } = await supabase.rpc('get_low_stock_alerts', {
      stock_threshold: threshold
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting low stock alerts:', error);
    throw new Error('Gagal mengambil data peringatan stok rendah');
  }
};

// Get current warehouse stock for a product
export const getWarehouseStock = async (productId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('product_storage')
      .select('quantity')
      .eq('product_id', productId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Record not found
        return 0;
      }
      throw error;
    }

    return data?.quantity || 0;
  } catch (error) {
    console.error('Error getting warehouse stock:', error);
    throw new Error('Gagal mengambil data stok gudang');
  }
};

// Get total stock for a product (warehouse + all cashiers)
export const getTotalProductStock = async (productId: string): Promise<{
  warehouse_stock: number;
  total_cashier_stock: number;
  total_stock: number;
}> => {
  try {
    const { data, error } = await supabase.rpc('get_total_product_stock', {
      _product_id: productId
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting total product stock:', error);
    throw new Error('Gagal mengambil total stok produk');
  }
};