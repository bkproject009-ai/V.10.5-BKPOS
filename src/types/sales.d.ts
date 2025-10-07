export interface Sale {
  id: string;
  created_at: string;
  total: number;
  subtotal: number;
  tax_amount: number;
  payment_method: string;
  cashier_id: string;
  cashier?: {
    id: string;
    username: string;
    full_name: string;
  };
  sale_items: Array<{
    id: string;
    quantity: number;
    price_at_time: number;
    product: {
      id: string;
      name: string;
      sku: string;
    };
  }>;
  sales_taxes: Array<{
    tax_amount: number;
    tax_types: {
      name: string;
      rate: number;
      enabled: boolean;
    };
  }>;
}