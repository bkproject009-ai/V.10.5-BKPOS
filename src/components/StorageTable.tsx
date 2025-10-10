import { useMemo, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Plus, Minus, Package, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

export function StorageTable() {
  const { state, addProduct, updateProductStorage, refreshProducts } = usePOS();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [isLoading, setIsLoading] = useState(false);

  // Calculate total stock for a product including both storage and all cashier stocks
  const getTotalStock = (productId: string) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return 0;
    
    const storageStock = product.storage_stock || 0;
    const cashierStocksTotal = Object.values(product.cashier_stock || {}).reduce((sum, stock) => sum + (stock || 0), 0);
    
    return storageStock + cashierStocksTotal;
  };
  const [search, setSearch] = useState('');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProductData, setNewProductData] = useState<Omit<Product, 'id' | 'storage_stock' | 'cashier_stock' | 'total_stock'>>({
    name: '',
    sku: '',
    price: 0,
    category: '',
    description: '',
    category: '',
    description: '',
    storage_stock: 0,
    cashier_stock: {},
  });

  const filteredProducts = state.products?.filter(product => 
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.sku.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleStockAdjustment = async () => {
    if (!selectedProduct || quantity <= 0) {
      toast({
        title: "Input tidak valid",
        description: "Masukkan jumlah yang valid",
        variant: "destructive"
      });
      return;
    }

    if (adjustmentType === 'subtract' && (selectedProduct.storage_stock || 0) < quantity) {
      toast({
        title: "Stok tidak mencukupi",
        description: "Jumlah pengurangan melebihi stok yang tersedia",
        variant: "destructive"
      });
      return;
    }

    const finalQuantity = adjustmentType === 'add' ? quantity : -quantity;
    const reason = adjustmentType === 'add' 
      ? `Penambahan stok gudang: ${quantity} unit` 
      : `Pengurangan stok gudang: ${quantity} unit`;

    try {
      setIsLoading(true);
      console.log('Memulai penyesuaian stok:', {
        productId: selectedProduct.id,
        currentStock: selectedProduct.storage_stock,
        adjustment: finalQuantity,
        reason
      });

      const result = await updateProductStorage(
        selectedProduct.id,
        finalQuantity,
        reason
      );

      // Refresh products list to update the UI
      await refreshProducts();

      console.log('Stok setelah penyesuaian:', {
        productId: selectedProduct.id,
        newStock: result.new_stock
      });
      
      setIsOpen(false);
      setQuantity(0);
      setSelectedProduct(null);
      
      toast({
        title: "Stok Berhasil Diperbarui",
        description: `Stok ${selectedProduct.name} sekarang: ${result.new_stock} unit`,
      });
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast({
        title: "Gagal mengubah stok",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengubah stok",
        variant: "destructive"
      });
    }
  };

  const handleAddProduct = async () => {
    try {
      await addProduct(newProductData);
      setIsAddProductOpen(false);
      setNewProductData({
        name: '',
        sku: '',
        price: 0,
        category: '',
        description: ''
      });
      toast({
        title: 'Berhasil',
        description: 'Produk baru telah ditambahkan',
      });
    } catch (error) {
      toast({
        title: 'Gagal menambah produk',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Stok Gudang</h2>
          <Button
            onClick={() => setIsAddProductOpen(true)}
            className="ml-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Produk
          </Button>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari produk..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Produk Baru</DialogTitle>
            <DialogDescription>
              Masukkan informasi produk yang akan ditambahkan ke gudang.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nama Produk</Label>
                <Input
                  id="name"
                  value={newProductData.name}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={newProductData.sku}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, sku: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Harga</Label>
                <Input
                  id="price"
                  type="number"
                  value={newProductData.price}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Kategori</Label>
                <Input
                  id="category"
                  value={newProductData.category}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Input
                  id="description"
                  value={newProductData.description}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddProduct}>
              Tambah Produk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama Produk</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Stok Gudang</TableHead>
            <TableHead>Stok Total</TableHead>
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
              <TableCell>{product.warehouse_stock || 0}</TableCell>
              <TableCell>{getTotalStock(product.id)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Dialog open={isOpen && selectedProduct?.id === product.id} onOpenChange={(open) => {
                      setIsOpen(open);
                      if (!open) {
                        setSelectedProduct(null);
                        setQuantity(0);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedProduct(product);
                            setAdjustmentType('add');
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {adjustmentType === 'add' ? 'Tambah' : 'Kurangi'} Stok Gudang
                          </DialogTitle>
                          <DialogDescription>
                            Masukkan jumlah stok yang akan {adjustmentType === 'add' ? 'ditambahkan ke' : 'dikurangi dari'} gudang.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Produk: {product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Stok gudang saat ini: {product.storage_stock || 0}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant={adjustmentType === 'add' ? 'default' : 'outline'}
                              onClick={() => setAdjustmentType('add')}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Tambah
                            </Button>
                            <Button
                              variant={adjustmentType === 'subtract' ? 'default' : 'outline'}
                              onClick={() => setAdjustmentType('subtract')}
                            >
                              <Minus className="h-4 w-4 mr-2" />
                              Kurangi
                            </Button>
                          </div>

                          <Input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                            placeholder="Jumlah unit"
                          />
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={handleStockAdjustment}
                            disabled={
                              quantity <= 0 || 
                              (adjustmentType === 'subtract' && (selectedProduct?.warehouse_stock || 0) < quantity)
                            }
                          >
                            {adjustmentType === 'add' ? 'Tambah' : 'Kurangi'} Stok
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedProduct(product);
                            setAdjustmentType('subtract');
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Kurangi Stok Gudang</DialogTitle>
                          <DialogDescription>
                            Masukkan jumlah stok yang akan dikurangi dari gudang.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Produk: {product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Stok gudang saat ini: {product.storage_stock || 0}
                            </p>
                          </div>

                          <Input
                            type="number"
                            min="1"
                            max={product.storage_stock || 0}
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                            placeholder="Jumlah unit"
                          />
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={handleStockAdjustment}
                            disabled={quantity <= 0 || quantity > (product.storage_stock || 0)}
                          >
                            Kurangi Stok
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}