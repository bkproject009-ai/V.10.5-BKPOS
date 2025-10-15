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
}

export interface StockReturn {
  id: string;
  product_id: string;
  cashier_id: string;
  quantity: number;
  reason: string;
  returned_at: string;
  created_by: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type Cart = CartItem[];

export interface PaymentDetails {
  amount: number;
  change?: number;
  method: 'cash' | 'qris';
  reference?: string;
}

export interface Sale {
  id: string;
  created_at: string;
  total: number;
  subtotal: number;
  tax_amount: number;
  payment_method: 'cash' | 'qris';
  cashier_id: string;
  status: 'completed' | 'cancelled' | 'pending';
  payment_details?: PaymentDetails;
  completed_at?: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
  product?: Product;
}

export interface TaxType {
  id: string;
  name: string;
  rate: number;
  enabled?: boolean;
}

export interface SaleTax {
  id: string;
  rate: number;
  amount: number;
}

export interface StockMovement {
  id: string;
  product_id: string;
  quantity: number;
  type: 'in' | 'out' | 'adjustment';
  reference?: string;
  notes?: string;
  created_at: string;
}

export interface CashierStock {
  cashier_id: string;
  product_id: string;
  stock: number;
  updated_at: string;
}