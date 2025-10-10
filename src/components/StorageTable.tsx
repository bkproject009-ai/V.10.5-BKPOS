import { useMemo, useState } from 'react';
import { Product, usePOS } from '@/contexts/POSContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Minus, Package, Search, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { toast } from '@/hooks/use-toast';

export function StorageTable() {
  // State declarations
  const { state, addProduct, updateProductStorage, refreshProducts } = usePOS();
  const [search, setSearch] = useState('');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [isLoading, setIsLoading] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '',
    sku: '',
    price: 0,
    category: '',
    description: '',
    initial_stock: 0
  });

  // Calculate detailed stock information for a product
  const getStockDetails = (productId: string) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return { warehouse: 0, cashier: 0, total: 0 };
    
    const warehouseStock = product.storage_stock || 0;
    const cashierStock = Object.values(product.cashier_stock || {}).reduce((sum, stock) => sum + (stock || 0), 0);
    
    return {
      warehouse: warehouseStock,
      cashier: cashierStock,
      total: warehouseStock + cashierStock
    };
  };

  const filteredProducts = useMemo(() => 
    state.products?.filter(product => 
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase())
    ) || [],
    [state.products, search]
  );

  const handleStockAdjustment = async () => {
    if (!selectedProduct || quantity <= 0) {
      toast({
        title: "Input tidak valid",
        description: "Masukkan jumlah yang valid",
        variant: "destructive"
      });
      return;
    }

    const currentStock = selectedProduct.storage_stock || 0;

    if (adjustmentType === 'subtract' && currentStock < quantity) {
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
      const result = await updateProductStorage(
        selectedProduct.id,
        finalQuantity,
        reason
      );

      await refreshProducts();
      
      setIsOpen(false);
      setQuantity(0);
      setSelectedProduct(null);
      setAdjustmentType('add');
      
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = async () => {
    try {
      setIsLoading(true);
      await addProduct(newProductData);
      setIsAddProductOpen(false);
      setNewProductData({
        name: '',
        sku: '',
        price: 0,
        category: '',
        description: '',
        initial_stock: 0
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
    } finally {
      setIsLoading(false);
    }
  };

  // Render function
  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Stok Gudang</h2>
            <Button
              onClick={() => setIsAddProductOpen(true)}
              className="ml-4"
              disabled={isLoading}
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
                  <Label htmlFor="initial_stock">Stok Awal Gudang</Label>
                  <Input
                    id="initial_stock"
                    type="number"
                    min="0"
                    value={newProductData.initial_stock}
                    onChange={(e) => setNewProductData(prev => ({ ...prev, initial_stock: parseInt(e.target.value) || 0 }))}
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
              <Button onClick={handleAddProduct} disabled={isLoading}>
                {isLoading ? 'Menambahkan...' : 'Tambah Produk'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stock Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Produk</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead>Detail Stok</TableHead>
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
                filteredProducts.map((product) => {
                  const { warehouse, cashier, total } = getStockDetails(product.id);
                  return (
                    <TableRow key={product.id}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell className="font-medium">{total}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <span className="text-sm text-muted-foreground">
                                  Gudang: {warehouse} | Kasir: {cashier}
                                </span>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Detail Stok:</p>
                              <p>Stok Gudang: {warehouse}</p>
                              <p>Stok Kasir: {cashier}</p>
                              <p>Total Stok: {total}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsOpen(true);
                            }}
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Stock Adjustment Dialog */}
        <Dialog open={isOpen && selectedProduct !== null} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setSelectedProduct(null);
            setQuantity(0);
            setAdjustmentType('add');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pengaturan Stok</DialogTitle>
              <DialogDescription>
                {adjustmentType === 'add' 
                  ? 'Masukkan jumlah stok yang akan ditambahkan ke gudang.'
                  : 'Masukkan jumlah stok yang akan dikurangi dari gudang.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Produk: {selectedProduct?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Stok gudang saat ini: {selectedProduct?.storage_stock || 0}
                </p>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant={adjustmentType === 'add' ? 'default' : 'outline'}
                  onClick={() => setAdjustmentType('add')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Stok
                </Button>
                <Button
                  variant={adjustmentType === 'subtract' ? 'default' : 'outline'}
                  onClick={() => setAdjustmentType('subtract')}
                >
                  <Minus className="h-4 w-4 mr-2" />
                  Kurangi Stok
                </Button>
              </div>

              <Input
                type="number"
                min={1}
                max={adjustmentType === 'subtract' ? (selectedProduct?.storage_stock || 0) : undefined}
                value={quantity || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 0) {
                    setQuantity(val);
                  }
                }}
                placeholder="Jumlah unit"
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setQuantity(0);
                  setAdjustmentType('add');
                }}
              >
                Batal
              </Button>
              <Button
                onClick={handleStockAdjustment}
                disabled={
                  isLoading ||
                  !quantity || 
                  quantity <= 0 || 
                  (adjustmentType === 'subtract' && quantity > (selectedProduct?.storage_stock || 0))
                }
              >
                {isLoading ? 'Memproses...' : adjustmentType === 'add' ? 'Tambah Stok' : 'Kurangi Stok'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}