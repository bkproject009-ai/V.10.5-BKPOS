// utils/calculatePrice.ts
export const calculateItemTotal = (price: number | string, quantity: number | string): number => {
  const numPrice = Number(price) || 0;
  const numQuantity = Number(quantity) || 0;
  return Math.round(numPrice * numQuantity); // Round to nearest integer
};

export const calculateTax = (amount: number, rate: number): number => {
  return Math.round((amount * (Number(rate) || 0)) / 100); // Round to nearest integer
};

export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('id-ID').format(amount);
};