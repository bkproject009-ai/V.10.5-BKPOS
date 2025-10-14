import { useState, useRef, useEffect } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Receipt } from '@/components/ui/receipt';
import { MobileCart } from '@/components/ui/mobile-cart';
import { DesktopCart } from '@/components/ui/desktop-cart';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Search,
  CreditCard,
  Banknote,
  ShoppingCart,
  LayoutGrid,
  List,
} from 'lucide-react';

const POS = () => {
  const { state, addToCart, updateCartItem, removeFromCart, clearCart, completeSale, calculateTotals } = usePOS();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Filter products
  const filteredProducts = state.products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const hasCashierStock = product.cashier_stock && 
      Object.values(product.cashier_stock).some(stock => stock > 0);
    return matchesSearch && matchesCategory && hasCashierStock;
  });

  // Get unique categories
  const categories = ['all', ...new Set(state.products.map(p => p.category))];

  // Calculate totals using the context method
  const { subtotal, taxes, total } = calculateTotals();

  const handleAddToCart = (productId: string) => {
    const product = state.products.find(p => p.id === productId);
    if (product) {
      addToCart(product, 1);
    }
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    try {
      if (newQuantity <= 0) {
        removeFromCart(productId);
      } else {
        const product = state.products.find(p => p.id === productId);
        if (!product) {
          throw new Error('Product not found');
        }
        
        // Get current cashier stock
        const cashierStock = product.cashier_stock ? 
          Object.values(product.cashier_stock)[0] || 0 : 0;

        if (newQuantity > cashierStock) {
          toast({
            title: "Stok Tidak Mencukupi",
            description: `Stok tersedia: ${cashierStock} item`,
            variant: "destructive"
          });
          return;
        }

        updateCartItem(productId, newQuantity);
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: "Gagal Mengubah Jumlah",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengubah jumlah item",
        variant: "destructive"
      });
    }
  };

  const [lastPaymentMethod, setLastPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [lastSaleTotal, setLastSaleTotal] = useState<{
    subtotal: number;
    tax: number;
    total: number;
  } | null>(null);

  const handleCheckout = async (paymentMethod: 'cash' | 'qris') => {
    if (state.cart.length === 0) {
      toast({
        title: "Keranjang Kosong",
        description: "Tambahkan produk ke keranjang terlebih dahulu",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const sale = await completeSale(paymentMethod);
      
      if (sale) {
        setLastPaymentMethod(paymentMethod);
        setIsCheckoutOpen(false);
        setShowReceipt(true);
        setLastSaleTotal({
          subtotal: sale.subtotal,
          tax: sale.tax_amount,
          total: sale.total
        });
        
        toast({
          title: "Transaksi Berhasil",
          description: "Pembayaran telah berhasil diproses"
        });
      }
    } catch (error) {
      console.error('Failed to complete sale:', error);
      toast({
        title: "Gagal Memproses Pembayaran",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memproses pembayaran",
        variant: "destructive"
      });
    }
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
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap"
              >
                {category === 'all' ? 'Semua' : category}
              </Button>
            ))}
          </div>
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
                      Stok: {Object.values(product.cashier_stock || {})[0] || 0}
                    </Badge>
                  </div>
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
      <div className="lg:col-span-1">
        {isMobile ? (
          <MobileCart
            cart={state.cart}
            subtotal={subtotal}
            taxes={taxes}
            total={total}
            onQuantityChange={(productId, quantity) => {
              const product = state.products.find(p => p.id === productId);
              if (product) {
                handleQuantityChange(productId, quantity);
              }
            }}
            onRemoveItem={removeFromCart}
            onClear={clearCart}
            onCheckout={() => setIsCheckoutOpen(true)}
          />
        ) : (
          <DesktopCart
            cart={state.cart}
            subtotal={subtotal}
            taxes={taxes}
            total={total}
            onQuantityChange={(productId, quantity) => {
              const product = state.products.find(p => p.id === productId);
              if (product) {
                handleQuantityChange(productId, quantity);
              }
            }}
            onRemoveItem={removeFromCart}
            onClear={clearCart}
            onCheckout={() => setIsCheckoutOpen(true)}
          />
        )}
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selesaikan Pembayaran</DialogTitle>
            <DialogDescription>Pilih metode pembayaran untuk menyelesaikan transaksi ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>Rp{subtotal.toLocaleString('id-ID')}</span>
              </div>
              {taxes.map(tax => (
                <div key={tax.taxTypeId} className="flex justify-between mb-2">
                  <span>Pajak:</span>
                  <span>Rp{tax.taxAmount.toLocaleString('id-ID')}</span>
                </div>
              ))}
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

      {/* Receipt Dialog */}
      <Dialog 
        open={showReceipt} 
        onOpenChange={(open) => {
          setShowReceipt(open);
          if (!open) {
            clearCart(); // Clear the cart when closing the receipt
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Struk Pembayaran</DialogTitle>
            <DialogDescription>Detail transaksi dan bukti pembayaran.</DialogDescription>
          </DialogHeader>
          <div ref={receiptRef}>
            <Receipt 
              items={state.cart} 
              subtotal={lastSaleTotal?.subtotal || 0}
              tax={lastSaleTotal?.tax || 0}
              total={lastSaleTotal?.total || 0}
              paymentMethod={lastPaymentMethod}
              date={new Date()}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowReceipt(false);
                clearCart(); // Clear the cart when closing manually
              }}
            >
              Tutup
            </Button>
            <Button 
              onClick={() => {
                if (receiptRef.current) {
                  window.print();
                  // Close receipt dialog after printing
                  setTimeout(() => {
                    setShowReceipt(false);
                    clearCart(); // Clear the cart after printing
                  }, 500);
                }
              }}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              Cetak Struk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POS;