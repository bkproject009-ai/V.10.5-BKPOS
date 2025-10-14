import React from 'react';
import { Button } from '@/components/ui/button';
import { Product } from '@/lib/types';
import { ReturnDialog } from './ReturnDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface StockReturnButtonProps {
  product: Product;
  onSuccess: () => void;
}

export function StockReturnButton({ product, onSuccess }: StockReturnButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();

  if (!user) return null;

  // Get current cashier's stock for this product
  const currentStock = product.cashier_stock[user.id] || 0;

  const handleClick = () => {
    setIsDialogOpen(true);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={currentStock <= 0}
      >
        Return Stock
      </Button>

      <ReturnDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        product={product}
        cashierId={user.id}
        onSuccess={onSuccess}
        currentStock={currentStock}
      />
    </>
  );
}