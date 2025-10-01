import type { CartItem, TaxType } from '@/contexts/POSContext';

export const calculateItemTotal = (price: number, quantity: number): number => {
  return Math.round(price * quantity); // Pembulatan ke integer terdekat
};

export const calculateSubtotal = (cart: CartItem[]): number => {
  return cart.reduce((sum, item) => {
    return sum + calculateItemTotal(item.product.price, item.quantity);
  }, 0);
};

export const calculateTaxAmount = (subtotal: number, taxTypes: TaxType[]): {
  taxes: Array<{ id: string; name: string; taxAmount: number }>;
  totalTax: number;
} => {
  const taxes = taxTypes.map(tax => ({
    id: tax.id,
    name: tax.name,
    taxAmount: Math.round((subtotal * tax.rate) / 100) // Pembulatan ke integer terdekat
  }));

  const totalTax = taxes.reduce((sum, tax) => sum + tax.taxAmount, 0);

  return { taxes, totalTax };
};

export const calculateTotal = (subtotal: number, totalTax: number): number => {
  return subtotal + totalTax;
};

export const formatToRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};