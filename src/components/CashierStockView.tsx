import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ReturnDialog } from './pos/ReturnDialog';
import { usePOS } from '@/contexts/POSContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function CashierStockView() {
  const { state, fetchProducts } = usePOS();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isReturnOpen, setIsReturnOpen] = useState(false);

  if (!user) return null;

  // Filter products to only show ones where the cashier has stock
  const cashierProducts = state.products.filter(
    product => (product.cashier_stock[user.id] || 0) > 0
  );

  const handleStockReturn = async () => {
    await fetchProducts();
    toast({
      title: "Stok Diperbarui",
      description: "Data stok telah diperbarui"
    });
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold">Stok Kasir</h2>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produk</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Stok</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cashierProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell>{product.name}</TableCell>
              <TableCell>{product.sku}</TableCell>
              <TableCell className="text-right">
                {product.cashier_stock[user.id] || 0}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedProduct({
                      ...product,
                      current_stock: product.cashier_stock[user.id] || 0
                    });
                    setIsReturnOpen(true);
                  }}
                >
                  Return
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {cashierProducts.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                Tidak ada stok tersedia
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Return Dialog */}
      {selectedProduct && (
        <ReturnDialog
          isOpen={isReturnOpen}
          onClose={() => {
            setIsReturnOpen(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          cashierId={user.id}
          onSuccess={handleStockReturn}
        />
      )}
    </div>
  );
}