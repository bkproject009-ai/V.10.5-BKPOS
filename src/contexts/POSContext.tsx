import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import * as db from '@/lib/db';
import {
  calculateSubtotal,
  calculateTaxAmount,
  calculateTotal,
  formatToRupiah
} from '@/lib/calculations';
import * as stockManagement from '@/lib/stockManagement';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

export interface CashierStock {
  cashier_id: string;
  product_id: string;
  stock: number;
  created_at: string;
  updated_at: string;
}

export interface StockDistribution {
  id: string;
  product_id: string;
  cashier_id: string;
  quantity: number;
  distributed_by: string;
  distributed_at: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  storage_stock: number;
  category: string;
  sku: string;
  description?: string;
  image?: string;
  cashier_stock: Record<string, number>;
  total_stock?: number;
  stock?: number; // For compatibility with cart operations
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface TaxType {
  id: string;
  name: string;
  rate: number;
}

export interface SaleTax {
  id: string;
  saleId: string;
  taxTypeId: string;
  taxAmount: number;
  tax_types?: TaxType;
}

export interface TaxType {
  id: string;
  name: string;
  rate: number;
  enabled?: boolean;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
  product?: Product;
}

export interface Sale {
  id: string;
  created_at: string;
  total: number;
  subtotal: number;
  tax_amount: number;
  payment_method: 'cash' | 'card' | 'qris';
  cashier_id: string;
  status: 'completed' | 'cancelled' | 'pending';
  sale_items: SaleItem[];
  sales_taxes: SaleTax[];
}

export interface Cashier {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  role: string;
}

export interface TaxSettings {
  taxTypes: TaxType[];
}

interface POSState {
  products: Product[];
  cart: CartItem[];
  sales: Sale[];
  cashiers: Cashier[];
  taxSettings: TaxSettings;
  isLoading: boolean;
  error: string | null;
}

interface POSContextType {
  state: POSState;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  refreshProducts: () => Promise<Product[]>;
  deleteProduct: (id: string) => Promise<void>;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartItem: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  completeSale: (sale: Sale) => Promise<void>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  calculateTotals: () => { subtotal: number; taxes: SaleTax[]; total: number };
  updateProductStorage: (productId: string, quantity: number, reason: string) => Promise<{
    success: boolean;
    previous_stock: number;
    new_stock: number;
    change: number;
    product: Product;
  }>;
  distributeStock: (productId: string, cashierId: string, quantity: number) => Promise<void>;
}

type POSAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_PRODUCTS'; products: Product[] }
  | { type: 'SET_SALES'; sales: Sale[] }
  | { type: 'SET_CASHIERS'; cashiers: Cashier[] }
  | { type: 'SET_TAX_SETTINGS'; taxSettings: TaxSettings }
  | { type: 'ADD_PRODUCT'; product: Product }
  | { type: 'UPDATE_PRODUCT'; id: string; product: Partial<Product> }
  | { type: 'DELETE_PRODUCT'; id: string }
  | { type: 'ADD_TO_CART'; product: Product; quantity: number }
  | { type: 'UPDATE_CART_ITEM'; productId: string; quantity: number }
  | { type: 'REMOVE_FROM_CART'; productId: string }
  | { type: 'CLEAR_CART' }
  | { type: 'ADD_SALE'; sale: Sale }
  | { type: 'UPDATE_SALE'; id: string; sale: Partial<Sale> }
  | { type: 'DELETE_SALE'; id: string };

const initialState: POSState = {
  products: [],
  cart: [],
  sales: [],
  cashiers: [],
  taxSettings: {
    taxTypes: []
  },
  isLoading: true,
  error: null
};

const posReducer = (state: POSState, action: POSAction): POSState => {
  switch (action.type) {
    case 'SET_CASHIERS':
      return {
        ...state,
        cashiers: action.cashiers
      };

    case 'ADD_PRODUCT':
      return {
        ...state,
        products: [...state.products, action.product]
      };

    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p =>
          p.id === action.id 
            ? { 
                ...p, 
                ...action.product,
                // Preserve storage_stock if not explicitly updated
                storage_stock: action.product.storage_stock !== undefined 
                  ? action.product.storage_stock 
                  : p.storage_stock,
                // Update total_stock calculation
                total_stock: (action.product.storage_stock !== undefined 
                  ? action.product.storage_stock 
                  : p.storage_stock) + 
                  Object.values(p.cashier_stock || {}).reduce((sum, qty) => sum + qty, 0)
              } 
            : p
        )
      };

    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.id)
      };

    case 'ADD_TO_CART': {
      const existingItem = state.cart.find(item => item.product.id === action.product.id);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + action.quantity;
        if (newQuantity > (action.product.storage_stock || 0)) {
          toast({
            title: "Insufficient Stock",
            description: `Only ${action.product.stock} items available`,
            variant: "destructive"
          });
          return state;
        }
        
        return {
          ...state,
          cart: state.cart.map(item =>
            item.product.id === action.product.id
              ? { ...item, quantity: newQuantity }
              : item
          )
        };
      } else {
        if (action.quantity > action.product.stock) {
          toast({
            title: "Insufficient Stock",
            description: `Only ${action.product.stock} items available`,
            variant: "destructive"
          });
          return state;
        }
        
        return {
          ...state,
          cart: [...state.cart, { product: action.product, quantity: action.quantity }]
        };
      }
    }

    case 'UPDATE_CART_ITEM': {
      if (action.quantity <= 0) {
        return {
          ...state,
          cart: state.cart.filter(item => item.product.id !== action.productId)
        };
      }
      
      const product = state.products.find(p => p.id === action.productId);
      if (product && action.quantity > product.stock) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${product.stock} items available`,
          variant: "destructive"
        });
        return state;
      }
      
      return {
        ...state,
        cart: state.cart.map(item =>
          item.product.id === action.productId
            ? { ...item, quantity: action.quantity }
            : item
        )
      };
    }

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter(item => item.product.id !== action.productId)
      };

    case 'CLEAR_CART':
      return {
        ...state,
        cart: []
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.loading
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error
      };

    case 'SET_PRODUCTS':
      return {
        ...state,
        products: action.products
      };

    case 'SET_SALES':
      return {
        ...state,
        sales: action.sales
      };

    case 'SET_TAX_SETTINGS':
      return {
        ...state,
        taxSettings: action.taxSettings
      };

    case 'UPDATE_SALE':
      return {
        ...state,
        sales: state.sales.map(sale =>
          sale.id === action.id ? { ...sale, ...action.sale } : sale
        )
      };

    case 'DELETE_SALE':
      return {
        ...state,
        sales: state.sales.filter(sale => sale.id !== action.id)
      };

    default:
      return state;
  }
};

interface POSContextType {
  state: POSState;
  addProduct: (product: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addToCart: (product: Product, quantity: number) => void;
  updateCartItem: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  completeSale: (sale: Sale) => Promise<void>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  calculateTotals: () => { subtotal: number, taxes: SaleTax[], total: number };
  updateProductStorage: (productId: string, quantity: number) => Promise<void>;
  distributeStock: (productId: string, cashierId: string, quantity: number) => Promise<void>;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(posReducer, initialState);

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      dispatch({ type: 'SET_LOADING', loading: true });
      try {
        const [products, sales, cashiers, taxTypes] = await Promise.all([
          db.fetchProducts(),
          db.fetchSales(),
          db.fetchCashiers(),
          db.getTaxTypes()
        ]);

        dispatch({ type: 'SET_PRODUCTS', products });
        dispatch({ type: 'SET_SALES', sales });
        dispatch({ type: 'SET_CASHIERS', cashiers });
        dispatch({ 
          type: 'SET_TAX_SETTINGS', 
          taxSettings: { taxTypes } 
        });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', error: (error as Error).message });
        toast({
          title: "Gagal Memuat Data",
          description: `Terjadi kesalahan saat memuat data: ${(error as Error).message}. Silakan coba lagi atau hubungi administrator jika masalah berlanjut.`,
          variant: "destructive"
        });
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    };

    loadInitialData();
  }, []);

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      const newProduct = await db.addProduct(product);
      dispatch({ type: 'ADD_PRODUCT', product: newProduct });
      toast({
        title: "Produk Ditambahkan",
        description: "Produk baru berhasil ditambahkan",
      });
    } catch (error) {
      toast({
        title: "Gagal Menambahkan Produk",
        description: "Terjadi kesalahan saat menambahkan produk. Pastikan semua data telah diisi dengan benar dan tidak ada SKU yang duplikat.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateProduct = async (id: string, product: Partial<Product>) => {
    try {
      const updatedProduct = await db.updateProduct(id, product);
      dispatch({ type: 'UPDATE_PRODUCT', id, product: updatedProduct });
      toast({
        title: "Produk Diperbarui",
        description: "Perubahan berhasil disimpan",
      });
    } catch (error) {
      toast({
        title: "Gagal Memperbarui Produk",
        description: "Terjadi kesalahan saat memperbarui produk",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await db.deleteProduct(id);
      dispatch({ type: 'DELETE_PRODUCT', id });
    } catch (error) {
      toast({
        title: "Gagal Menghapus Produk",
        description: "Terjadi kesalahan saat menghapus produk",
        variant: "destructive"
      });
      throw error;
    }
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    dispatch({ type: 'ADD_TO_CART', product, quantity });
  };

  const updateCartItem = (product: Product, quantity: number) => {
    dispatch({ type: 'UPDATE_CART_ITEM', productId: product.id, quantity });
  };

  const removeFromCart = (productId: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', productId });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const calculateTotals = () => {
    const subtotal = calculateSubtotal(state.cart);
    const enabledTaxTypes = state.taxSettings.taxTypes.filter(tax => tax.enabled);
    const taxes = enabledTaxTypes.map(tax => ({
      id: crypto.randomUUID(),
      saleId: '',
      taxTypeId: tax.id,
      taxAmount: calculateTaxAmount(subtotal, tax),
      tax_types: tax
    }));
    const total = calculateTotal(subtotal, enabledTaxTypes);

    return { subtotal, taxes, total };
  };

  const completeSale = async (sale: Sale) => {
    try {
      const newSale = await db.createSale(
        state.cart,
        sale.subtotal,
        sale.sales_taxes,
        sale.total,
        sale.payment_method
      );
      
      dispatch({ type: 'ADD_SALE', sale: newSale });
      clearCart();
    } catch (error) {
      toast({
        title: "Gagal Menyimpan Transaksi",
        description: "Terjadi kesalahan saat menyimpan transaksi",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateSale = async (id: string, sale: Partial<Sale>) => {
    try {
      const updatedSale = await db.updateSale(id, sale);
      dispatch({ type: 'UPDATE_SALE', id, sale: updatedSale });
    } catch (error) {
      toast({
        title: "Gagal Memperbarui Transaksi",
        description: "Terjadi kesalahan saat memperbarui transaksi",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteSale = async (id: string) => {
    try {
      await db.deleteSale(id);
      dispatch({ type: 'DELETE_SALE', id });
    } catch (error) {
      toast({
        title: "Gagal Menghapus Transaksi",
        description: "Terjadi kesalahan saat menghapus transaksi",
        variant: "destructive"
      });
      throw error;
    }
  };

  const refreshProducts = async () => {
    try {
      const products = await db.fetchProducts();
      dispatch({ type: 'SET_PRODUCTS', products });
      return products;
    } catch (error) {
      console.error('Error refreshing products:', error);
      toast({
        title: "Gagal memperbarui data",
        description: "Terjadi kesalahan saat memuat ulang data produk",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateProductStorage = async (productId: string, quantity: number, reason: string) => {
    try {
      // Update stock and get the latest product data
      const result = await stockManagement.updateStorageStock(productId, quantity, reason);
      
      if (!result.success) {
        throw new Error(result.error || 'Gagal memperbarui stok');
      }

      // Get the updated product data
      const products = await refreshProducts();
      const updatedProduct = products.find(p => p.id === productId);
      
      if (!updatedProduct) {
        throw new Error('Produk tidak ditemukan setelah pembaruan');
      }

      // Show success message with stock details
      toast({
        title: "Stok Diperbarui",
        description: `Stok berhasil diubah dari ${result.previous_stock} menjadi ${result.new_stock} unit`,
      });

      return {
        ...result,
        product: updatedProduct
      };
    } catch (error) {
      console.error('Error in updateProductStorage:', error);
      toast({
        title: "Gagal Memperbarui Stok",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memperbarui stok",
        variant: "destructive"
      });
      throw error;
    }
  };

  const distributeStock = async (productId: string, cashierId: string, quantity: number) => {
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) throw new Error('No authenticated user');
      
      // Get current stock information before distribution
      const beforeStock = await stockManagement.getWarehouseStock(productId);
      
      // Distribute stock
      await stockManagement.distributeStock(productId, cashierId, quantity, currentUser.id);
      
      // Get updated stock information
      const products = await db.fetchProducts();
      const updatedProduct = products.find(p => p.id === productId);
      
      // Update state with new products data
      dispatch({ type: 'SET_PRODUCTS', products });
      
      // Show success message with stock details
      toast({
        title: "Stok Didistribusikan",
        description: `${quantity} unit berhasil didistribusikan. Sisa stok gudang: ${updatedProduct?.storage_stock || 0} unit`,
      });
    } catch (error) {
      toast({
        title: "Gagal Mendistribusikan Stok",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mendistribusikan stok",
        variant: "destructive"
      });
      throw error;
    }
  };

  const value: POSContextType = {
    state,
    addProduct: async (product: Omit<Product, 'id'>) => {
      const result = await addProduct(product);
      return result;
    },
    updateProduct,
    refreshProducts,
    deleteProduct,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    completeSale,
    updateSale,
    deleteSale,
    calculateTotals,
    updateProductStorage,
    distributeStock
  };

  return (
    <POSContext.Provider value={value}>
      {children}
    </POSContext.Provider>
  );
};

export function usePOS() {
  const context = useContext(POSContext);
  if (context === undefined) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
}