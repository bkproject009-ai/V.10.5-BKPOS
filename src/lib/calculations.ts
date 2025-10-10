import type { CartItem, TaxType } from '@/contexts/POSContext';

export const calculateItemTotal = (price: number, quantity: number): number => {
  return Math.round(price * quantity); // Pembulatan ke integer terdekat
};

export const calculateSubtotal = (cart: CartItem[]): number => {
  return cart.reduce((sum, item) => {
    return sum + calculateItemTotal(item.product.price, item.quantity);
  }, 0);
};

export const calculateTaxAmount = (subtotal: number, taxType: TaxType): number => {
  return Math.round((subtotal * taxType.rate) / 100); // Pembulatan ke integer terdekat
};

export const calculateTotalTax = (subtotal: number, taxTypes: TaxType[]): number => {
  return taxTypes.reduce((sum, tax) => sum + calculateTaxAmount(subtotal, tax), 0);
};

export const calculateTotal = (subtotal: number, taxTypes: TaxType[]): number => {
  const totalTax = calculateTotalTax(subtotal, taxTypes);
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