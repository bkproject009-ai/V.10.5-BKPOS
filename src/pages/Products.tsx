import { useState } from 'react';
import { usePOS, Product } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Package,
  Search,
  AlertTriangle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Products = () => {
  const { state, addProduct, updateProduct, deleteProduct } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    category: '',
    sku: '',
    description: ''
  });

  // Filter products
  const filteredProducts = state.products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...new Set(state.products.map(p => p.category))];

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      stock: '',
      category: '',
      sku: '',
      description: ''
    });
    setEditingProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
      const validationErrors = [];
      if (!formData.name) validationErrors.push('Nama Produk');
      if (!formData.price) validationErrors.push('Harga');
      if (!formData.stock) validationErrors.push('Stok');
      if (!formData.category) validationErrors.push('Kategori');
      if (!formData.sku) validationErrors.push('SKU');

      if (validationErrors.length > 0) {
        toast({
          title: "Data Tidak Lengkap",
          description: `Mohon lengkapi field berikut: ${validationErrors.join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      if (parseFloat(formData.price) <= 0) {
        toast({
          title: "Harga Tidak Valid",
          description: "Harga produk harus lebih besar dari 0",
          variant: "destructive"
        });
        return;
      }

      if (parseInt(formData.stock) < 0) {
        toast({
          title: "Stok Tidak Valid",
          description: "Stok tidak boleh bernilai negatif",
          variant: "destructive"
        });
        return;
      }    const productData = {
      name: formData.name,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      category: formData.category,
      sku: formData.sku,
      description: formData.description
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
      toast({
        title: "Product Updated",
        description: `${formData.name} has been updated successfully`,
      });
    } else {
      addProduct(productData);
      toast({
        title: "Product Added",
        description: `${formData.name} has been added to inventory`,
      });
    }

    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category,
      sku: product.sku,
      description: product.description || ''
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (product: Product) => {
    try {
      await deleteProduct(product.id);
      toast({
        title: "Produk Dihapus",
        description: `${product.name} telah dihapus dari inventaris`,
      });
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        toast({
          title: "Produk Tidak Dapat Dihapus",
          description: `Produk '${product.name}' tidak dapat dihapus karena masih memiliki riwayat transaksi penjualan. Pertimbangkan untuk mengarsipkan produk ini sebagai gantinya.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Terjadi kesalahan saat menghapus produk",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manajemen Produk</h1>
          <p className="text-muted-foreground">Kelola inventaris dan katalog produk Anda</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-to-r from-primary to-primary/80">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Produk
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nama Produk *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Masukkan nama produk"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    placeholder="Masukkan SKU"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Harga *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Jumlah Stok *</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    placeholder="0"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="category">Kategori *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  placeholder="Masukkan kategori"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Deskripsi</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Deskripsi produk (opsional)"
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-primary to-primary/80">
                  {editingProduct ? 'Update Produk' : 'Tambah Produk'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Cari produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'Semua Kategori' : category}
            </option>
          ))}
        </select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map(product => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{product.sku}</p>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Penghapusan Produk</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>Anda akan menghapus produk berikut:</p>
                          <div className="font-medium">
                            <p>Nama: {product.name}</p>
                            <p>SKU: {product.sku}</p>
                            <p>Stok: {product.stock} unit</p>
                          </div>
                          <p className="text-red-500">
                            PERHATIAN: Produk yang memiliki riwayat transaksi penjualan tidak dapat dihapus 
                            untuk menjaga integritas data laporan penjualan.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(product)}>Hapus</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-foreground">
                    Rp{product.price.toLocaleString('id-ID')}
                  </span>
                  <Badge variant="secondary">{product.category}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Stok:</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {product.stock < 10 && (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <span className="text-xs text-warning">Stok Menipis</span>
                      </div>
                    )}
                    <Badge 
                      variant={product.stock < 10 ? "destructive" : "default"}
                      className={product.stock < 10 ? "bg-warning text-warning-foreground" : ""}
                    >
                      {product.stock === 0 ? "Stok Habis" : `${product.stock} unit tersisa`}
                    </Badge>
                  </div>
                </div>
                
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Produk tidak ditemukan</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Coba ubah pencarian atau filter' 
              : 'Tambahkan produk pertama Anda untuk memulai'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Products;