import { useState } from 'react';
import { Product, usePOS } from '@/contexts/POSContext';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, History, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface CashierStock {
  cashier_id: string;
  product_id: string;
  stock: number;
}

export function DistributionTable() {
  const { state, distributeStock } = usePOS();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCashier, setSelectedCashier] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Ensure state.cashiers exists and is an array
  const cashiers = state.cashiers || [];

  const handleDistribute = async () => {
    if (!selectedProduct || !selectedCashier || quantity <= 0) {
      toast({
        title: "Input tidak valid",
        description: "Pilih kasir dan masukkan jumlah yang valid.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProduct.storage_stock || quantity > selectedProduct.storage_stock) {
      toast({
        title: "Stok tidak cukup",
        description: "Jumlah distribusi melebihi stok gudang yang tersedia.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await distributeStock(selectedProduct.id, selectedCashier, quantity);
      
      if (!result.success) {
        throw new Error(result.error || 'Gagal mendistribusikan stok');
      }

      setIsOpen(false);
      setQuantity(0);
      setSelectedProduct(null);
      setSelectedCashier('');
      toast({
        title: "Distribusi berhasil",
        description: `${quantity} unit ${selectedProduct.name} telah didistribusikan ke kasir.`,
      });
    } catch (error) {
      console.error('Error distributing stock:', error);
      toast({
        title: "Gagal mendistribusikan stok",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mendistribusikan stok. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  };

  const filteredProducts = (state.products || []).filter(product => 
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.sku.toLowerCase().includes(search.toLowerCase())
  ).map(product => ({
    ...product,
    total_cashier_stock: Object.values(product.cashier_stock || {}).reduce((sum, qty) => sum + qty, 0),
  }));

  if (!Array.isArray(state.products) || !Array.isArray(cashiers)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Data tidak tersedia</h3>
          <p className="text-sm text-muted-foreground">
            Tidak dapat memuat data produk dan kasir. Silakan coba lagi nanti.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Distribusi Stok</h2>
        <Input
          type="search"
          placeholder="Cari produk..."
          className="max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama Produk</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Stok Gudang</TableHead>
            <TableHead>Stok di Kasir</TableHead>
            <TableHead>Total Stok</TableHead>
            <TableHead>Distribusi</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Package className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {search ? 'Tidak ada produk yang sesuai dengan pencarian' : 'Belum ada produk'}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell className="font-medium">{product.storage_stock || 0}</TableCell>
                <TableCell>{product.total_cashier_stock}</TableCell>
                <TableCell>{(product.storage_stock || 0) + product.total_cashier_stock}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {Object.entries(product.cashier_stock || {}).map(([cashierId, stock]) => {
                      const cashier = cashiers.find(c => c.id === cashierId);
                      return cashier ? (
                        <div key={cashierId} className="text-sm">
                          {cashier.full_name || cashier.username}: {stock}
                        </div>
                      ) : null;
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  <Dialog 
                    open={isOpen && selectedProduct?.id === product.id} 
                    onOpenChange={(open) => {
                      setIsOpen(open);
                      if (!open) {
                        setSelectedProduct(null);
                        setQuantity(0);
                        setSelectedCashier('');
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Distribusi
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Distribusi Stok ke Kasir</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Produk: {product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Stok gudang tersedia: {product.storage_stock || 0}
                          </p>
                        </div>
                        
                        {cashiers.length > 0 ? (
                          <Select
                            value={selectedCashier}
                            onValueChange={setSelectedCashier}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kasir" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {cashiers.map((cashier) => (
                                  <SelectItem key={cashier.id} value={cashier.id}>
                                    {cashier.full_name || cashier.username}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-center py-2 text-sm text-muted-foreground">
                            Tidak ada kasir yang tersedia
                          </div>
                        )}
                        
                        <Input
                          type="number"
                          min="1"
                          max={product.storage_stock || 0}
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                          placeholder="Jumlah unit"
                        />

                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={handleDistribute}
                            disabled={!selectedCashier || quantity <= 0 || quantity > (product.storage_stock || 0)}
                          >
                            Distribusi
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}