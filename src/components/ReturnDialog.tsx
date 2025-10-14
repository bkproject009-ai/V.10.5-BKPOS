import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { returnCashierStock } from '@/lib/returnStock';
import { Product } from '@/lib/types';

interface ReturnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  cashierId: string;
  onSuccess: () => void;
  currentStock: number;
}

export const ReturnDialog = ({
  isOpen,
  onClose,
  product,
  cashierId,
  onSuccess,
  currentStock,
}: ReturnDialogProps) => {
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReturn = async () => {
    if (!quantity || quantity < 0) {
      toast({
        title: 'Invalid Quantity',
        description: 'Jumlah pengembalian tidak boleh negatif',
        variant: 'destructive',
      });
      return;
    }

    if (quantity > currentStock) {
      toast({
        title: 'Stock Error',
        description: 'Jumlah pengembalian melebihi stok yang tersedia',
        variant: 'destructive',
      });
      return;
    }

    if (!reason) {
      toast({
        title: 'Alasan Diperlukan',
        description: 'Mohon pilih alasan pengembalian',
        variant: 'destructive',
      });
      return;
    }

    // Jika user memilih mengembalikan semua stok (quantity = 0),
    // set quantity ke currentStock
    const returnQuantity = quantity === 0 ? currentStock : quantity;

    // Validate data before sending
    if (!product.id || !cashierId) {
      toast({
        title: 'Error',
        description: 'Missing product or cashier information',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Sending return request:', {
        productId: product.id,
        cashierId,
        quantity: returnQuantity,
        reason,
      });
      
      const result = await returnCashierStock(
        product.id,
        cashierId,
        returnQuantity,
        reason
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to return stock');
      }

      toast({
        title: 'Success',
        description: `Berhasil mengembalikan ${quantity} unit ${product.name} ke gudang`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to return stock',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setQuantity(0);
    setReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return Stock: {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Stok Saat Ini</Label>
            <Input
              type="text"
              value={currentStock}
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label>Jumlah Pengembalian</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                min={0}
                max={currentStock}
              />
              <button
                type="button"
                onClick={() => setQuantity(currentStock)}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Kembalikan Semua
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Stok saat ini: {currentStock} unit
            </p>
          </div>
          <div className="space-y-2">
            <Label>Alasan Pengembalian</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih alasan pengembalian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sisa Produk">Sisa Produk</SelectItem>
                <SelectItem value="Reject/Rusak">Reject/Rusak</SelectItem>
                <SelectItem value="Kadaluarsa">Kadaluarsa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleReturn} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Kembalikan Stok'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
