import { useState } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Search,
  CreditCard,
  Banknote,
  ShoppingCart
} from 'lucide-react';

const POS = () => {
  const { state, addToCart, updateCartItem, removeFromCart, clearCart, completeSale, calculateTotals } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Filter products
  const filteredProducts = state.products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory && product.stock > 0;
  });

  // Get unique categories
  const categories = ['all', ...new Set(state.products.map(p => p.category))];

  // Calculate totals using the context method
  const { subtotal, taxAmount, total } = calculateTotals();

  const handleAddToCart = (productId: string) => {
    const product = state.products.find(p => p.id === productId);
    if (product) {
      addToCart(product, 1);
    }
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      updateCartItem(productId, newQuantity);
    }
  };

  const handleCheckout = (paymentMethod: 'cash' | 'card') => {
  if (state.cart.length === 0) return;
  completeSale(paymentMethod);
  setIsCheckoutOpen(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* Products Section */}
      <div className="lg:col-span-2 flex flex-col space-y-4">
        <div>
    <h1 className="text-3xl font-bold text-foreground">Kasir</h1>
    <p className="text-muted-foreground">Pilih produk untuk ditambahkan ke keranjang</p>
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
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleAddToCart(product.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{product.sku}</p>
                    </div>
                    <Badge variant="secondary">{product.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-foreground">
                        Rp{product.price.toLocaleString('id-ID')}
                      </span>
                    <Badge variant="outline">
                      {product.stock} stok
                    </Badge>
                  </div>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Tidak ada produk tersedia</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Coba ubah pencarian atau filter' 
                  : 'Tidak ada produk di stok'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="flex flex-col space-y-4">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Keranjang Belanja</span>
              </CardTitle>
              {state.cart.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Kosongkan
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {state.cart.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Keranjang kosong</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto space-y-3">
                {state.cart.map(item => (
                  <div key={item.product.id} className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Rp{item.product.price.toLocaleString('id-ID')} / pcs
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Summary */}
        {state.cart.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>Rp{subtotal.toLocaleString('id-ID')}</span>
              </div>
              {state.taxSettings.enabled && (
                <div className="flex justify-between text-sm">
                  <span>{state.taxSettings.name} ({state.taxSettings.rate}%)</span>
                  <span>Rp{taxAmount.toLocaleString('id-ID')}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>Rp{total.toLocaleString('id-ID')}</span>
              </div>
              <Button 
                className="w-full bg-gradient-to-r from-primary to-primary/80"
                onClick={() => setIsCheckoutOpen(true)}
              >
                Bayar
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selesaikan Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>Rp{subtotal.toLocaleString('id-ID')}</span>
              </div>
              {state.taxSettings.enabled && (
                <div className="flex justify-between mb-2">
                  <span>{state.taxSettings.name}:</span>
                  <span>Rp{taxAmount.toLocaleString('id-ID')}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>Rp{total.toLocaleString('id-ID')}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Pilih metode pembayaran untuk menyelesaikan transaksi.
            </p>
          </div>
          <DialogFooter className="space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsCheckoutOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCheckout('cash')}
              className="flex items-center space-x-2"
            >
              <Banknote className="h-4 w-4" />
              <span>Tunai</span>
            </Button>
            <Button
              onClick={() => handleCheckout('qris')}
              className="flex items-center space-x-2 bg-gradient-to-r from-primary to-primary/80"
            >
              <CreditCard className="h-4 w-4" />
              <span>QRIS</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POS;