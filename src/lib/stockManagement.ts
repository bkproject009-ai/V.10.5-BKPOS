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

// Storage functions with error handling
export const updateStorageStock = async (productId: string, quantity: number) => {
  try {
    const { data, error } = await supabase.rpc('update_product_storage_stock', {
      _product_id: productId,
      _quantity: quantity
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating storage stock:', error);
    throw new Error('Gagal memperbarui stok gudang');
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
      _notes: notes
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error distributing stock:', error);
    throw error instanceof Error ? error : new Error('Gagal mendistribusikan stok');
  }
};

// Fetch products with complete stock information
export const fetchProducts = async () => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_storage(quantity),
        cashier_stock(cashier_id, quantity)
      `);

    if (error) throw error;

    return products.map((product: any) => ({
      ...product,
      warehouse_stock: product.product_storage?.[0]?.quantity || 0,
      cashier_stock: product.cashier_stock?.reduce((acc: Record<string, number>, cs: any) => {
        acc[cs.cashier_id] = cs.quantity;
        return acc;
      }, {}) || {}
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