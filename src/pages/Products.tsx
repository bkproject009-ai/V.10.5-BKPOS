import { useState } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Search, ArrowLeft } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReturnDialog } from '@/components/ReturnDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StorageTable } from '@/components/StorageTable';
import { DistributionTable } from '@/components/DistributionTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR'
  }).format(price);
};

const Products = () => {
  const { state, fetchProducts } = usePOS();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  const isAdmin = user?.user_metadata?.role === 'admin';

  const categories = ['all', ...Array.from(new Set(state.products.map(p => p.category)))];

  const getTotalStock = (productId: string) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return 0;
    const warehouseStock = product.storage_stock || 0;
    const cashierStock = Object.values(product.cashier_stock || {}).reduce((sum, stock) => sum + stock, 0);
    return warehouseStock + cashierStock;
  };

  const getCurrentCashierStock = (product: any) => {
    if (!user) return 0;
    return product.cashier_stock[user.id] || 0;
  };

  const handleReturnClick = (product: any) => {
    setSelectedProduct(product);
    setReturnDialogOpen(true);
  };

  const handleReturnSuccess = () => {
    setReturnDialogOpen(false);
    setSelectedProduct(null);
    fetchProducts();
  };

  const filteredProducts = state.products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'all' || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manajemen Produk</h1>
            <p className="text-muted-foreground">Kelola inventaris dan katalog produk Anda</p>
          </div>
        </div>

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products">Produk</TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="storage">Gudang</TabsTrigger>
                <TabsTrigger value="distribution">Distribusi</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {/* Return Dialog */}
            {selectedProduct && (
              <ReturnDialog
                isOpen={returnDialogOpen}
                onClose={() => {
                  setReturnDialogOpen(false);
                  setSelectedProduct(null);
                }}
                product={selectedProduct}
                cashierId={user?.id || ''}
                onSuccess={handleReturnSuccess}
                currentStock={getCurrentCashierStock(selectedProduct)}
              />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari produk..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category === 'all' ? 'Semua Kategori' : category}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Produk</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                      {isAdmin ? (
                        <>
                          <TableHead className="text-center">Stok Gudang</TableHead>
                          <TableHead className="text-center">Stok Kasir</TableHead>
                          <TableHead className="text-center">Total Stok</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-center">Stok Saya</TableHead>
                          <TableHead className="text-center">Aksi</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 7 : 5} className="text-center py-10">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Package size={32} className="text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              {searchTerm || selectedCategory !== 'all'
                                ? 'Tidak ada produk yang sesuai dengan pencarian'
                                : 'Belum ada produk'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.sku}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatPrice(product.price)}</TableCell>
                          {isAdmin ? (
                            <>
                              <TableCell className="text-center">{product.storage_stock || 0}</TableCell>
                              <TableCell className="text-center">
                                {Object.values(product.cashier_stock || {}).reduce((sum, stock) => sum + stock, 0)}
                              </TableCell>
                              <TableCell className="text-center">{getTotalStock(product.id)}</TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-center">
                                {getCurrentCashierStock(product)}
                              </TableCell>
                              <TableCell className="text-center">
                                {getCurrentCashierStock(product) > 0 && (
                                  <button
                                    onClick={() => handleReturnClick(product)}
                                    className="inline-flex items-center px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                                  >
                                    <ArrowLeft className="w-4 h-4 mr-1" />
                                    Return
                                  </button>
                                )}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="storage">
                <StorageTable />
              </TabsContent>

              <TabsContent value="distribution">
                <DistributionTable />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Products;