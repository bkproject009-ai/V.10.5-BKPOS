import { useState, useRef, useEffect } from 'react'
import { usePOS } from '@/contexts/POSContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Receipt } from '@/components/ui/receipt'
import { MobileCart } from '@/components/ui/mobile-cart'
import { DesktopCart } from '@/components/ui/desktop-cart'
import { PaymentDialog } from '@/components/pos/PaymentDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Search,
  CreditCard,
  Banknote,
  ShoppingCart,
  LayoutGrid,
  List,
  Package,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const POS = () => {
  const { state, addToCart, updateCartItem, removeFromCart, clearCart, completeSale, calculateTotals } = usePOS()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastSaleId, setLastSaleId] = useState<string | null>(null)
  const [lastPaymentMethod, setLastPaymentMethod] = useState<'cash' | 'qris' | null>(null)
  const [lastSaleTotal, setLastSaleTotal] = useState<{
    subtotal: number
    tax: number
    total: number
  } | null>(null)
  
  const receiptRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  // Filter products
  const filteredProducts = state.products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category_code === selectedCategory
    const hasCashierStock = product.cashier_stock && 
      Object.values(product.cashier_stock).some(stock => stock > 0)
    return matchesSearch && matchesCategory && hasCashierStock
  })

  // Get unique categories from products
  const categories = Array.from(new Set(['all', ...state.products.map(p => p.category_code)]))

  // Calculate totals using the context method
  const { subtotal, taxes, total } = calculateTotals();
  console.log('Current cart state:', {
    items: state.cart.length,
    subtotal,
    taxes,
    total
  });

  const handleAddToCart = (productId: string) => {
    const product = state.products.find(p => p.id === productId)
    if (product) {
      const currentQty = state.cart.find(item => item.product.id === productId)?.quantity || 0
      const cashierStock = product.cashier_stock ? 
        Object.values(product.cashier_stock)[0] || 0 : 0

      if (currentQty >= cashierStock) {
        toast({
          title: "Stok Tidak Mencukupi",
          description: `Stok tersedia: ${cashierStock} item`,
          variant: "destructive"
        })
        return
      }

      addToCart(product, 1)
    }
  }

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    try {
      if (newQuantity <= 0) {
        removeFromCart(productId)
        return
      }

      const product = state.products.find(p => p.id === productId)
      if (!product) {
        throw new Error('Product not found')
      }
      
      // Get current cashier stock from context/state
      const cashierStock = product.cashier_stock ? 
        Object.values(product.cashier_stock)[0] || 0 : 0

      if (newQuantity > cashierStock) {
        toast({
          title: "Stok Tidak Mencukupi",
          description: `Stok tersedia: ${cashierStock} item`,
          variant: "destructive"
        })
        return
      }

      const cartItem = state.cart.find(item => item.product.id === productId)
      if (cartItem) {
        updateCartItem(cartItem.product, newQuantity)
      }
    } catch (error) {
      console.error('Error updating quantity:', error)
      toast({
        title: "Gagal Mengubah Jumlah",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengubah jumlah item",
        variant: "destructive"
      })
    }
  }

  const handlePaymentSuccess = async (paymentMethod: 'cash' | 'qris', paymentDetails?: any) => {
    try {
      if (!state.user?.id) {
        throw new Error('Cashier ID not found')
      }
      
      const { subtotal, taxes, total } = calculateTotals()
      
      const result = await completeSale({
        payment_method: paymentMethod,
        status: 'completed',
        total: total,
        subtotal: subtotal,
        tax_amount: taxes.reduce((sum, tax) => sum + tax.taxAmount, 0),
        cashier_id: state.user.id,
        created_at: new Date().toISOString(),
        payment_details: paymentDetails || {},
        id: '', // Will be generated by DB
        sale_items: state.cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price_at_time: item.product.price
        })),
        sales_taxes: taxes.map(tax => ({
          tax_id: tax.taxTypeId,
          amount: tax.taxAmount
        }))
      })
      
      if (result) {
        setLastSaleId(result.id)
        setLastPaymentMethod(paymentMethod)
        setIsCheckoutOpen(false)
        setShowReceipt(true)
        setLastSaleTotal({
          subtotal,
          tax: taxes.reduce((sum, tax) => sum + tax.taxAmount, 0),
          total
        })
        
        clearCart()
        toast({
          title: "Transaksi Berhasil",
          description: "Pembayaran telah berhasil diproses"
        })
      }
    } catch (error) {
      console.error('Failed to complete sale:', error)
      toast({
        title: "Gagal Memproses Pembayaran",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memproses pembayaran",
        variant: "destructive"
      })
    }
  }

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
        <div className="relative flex-1 -mx-6">
          <div className="absolute inset-0 overflow-y-auto px-6">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {searchTerm || selectedCategory !== 'all'
                    ? 'Tidak ada produk yang sesuai dengan pencarian'
                    : 'Belum ada produk yang tersedia'}
                </p>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  : "space-y-4"
              }>
                {filteredProducts.map(product => (
                  <Card 
                    key={product.id}
                    className={viewMode === 'grid' ? '' : 'flex'}
                  >
                    <CardHeader className={viewMode === 'grid' ? '' : 'w-1/3'}>
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className={viewMode === 'grid' ? '' : 'w-2/3 flex flex-col justify-between'}>
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{product.sku}</p>
                        <Badge variant="outline">
                          {categories.find(c => c === product.category_code)}
                        </Badge>
                      </div>
                      <div className="mt-4 space-y-2">
                        <p className="font-semibold text-lg">
                          Rp{product.price.toLocaleString('id-ID')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Stok: {product.cashier_stock ? Object.values(product.cashier_stock)[0] || 0 : 0}
                        </p>
                        <Button
                          onClick={() => handleAddToCart(product.id)}
                          className="w-full"
                          disabled={!product.cashier_stock || Object.values(product.cashier_stock)[0] <= 0}
                        >
                          Tambah ke Keranjang
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="lg:col-span-1">
        {isMobile ? (
          <MobileCart
            cart={state.cart}
            onQuantityChange={handleQuantityChange}
            onRemoveItem={removeFromCart}
            onClear={clearCart}
            subtotal={subtotal}
            taxes={taxes}
            total={total}
            onCheckout={() => setIsCheckoutOpen(true)}
          />
        ) : (
          <DesktopCart
            cart={state.cart}
            onQuantityChange={handleQuantityChange}
            onRemove={removeFromCart}
            subtotal={subtotal}
            taxes={taxes}
            total={total}
            onCheckout={() => setIsCheckoutOpen(true)}
          />
        )}
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        total={total}
        saleId={state.currentSaleId || ''}
        onPaymentComplete={async (paymentMethod) => {
          if (!state.user?.id) {
            toast({
              title: "Error",
              description: "ID Kasir tidak ditemukan",
              variant: "destructive"
            })
            return
          }

          try {
            const { subtotal, taxes, total } = calculateTotals()
            
            // Verify stock before proceeding
            const stockCheck = await verifyStockAvailability(state.cart, state.user.id)
            if (!stockCheck.available) {
              toast({
                title: "Stok Tidak Mencukupi",
                description: "Beberapa item tidak memiliki stok yang cukup",
                variant: "destructive"
              })
              return
            }

            const result = await completeSale({
              paymentMethod,
              status: 'completed',
              total,
              subtotal,
              taxAmount: taxes.reduce((sum, tax) => sum + tax.taxAmount, 0),
              cashierId: state.user.id,
              paymentDetails: {
                method: paymentMethod,
                amount: total,
                timestamp: new Date().toISOString()
              },
              cart: state.cart,
              salesTaxes: taxes.map(tax => ({
                id: tax.id,
                rate: tax.tax_types?.rate || 0,
                amount: tax.taxAmount
              }))
            })
            
            if (result.success) {
              setLastSaleId(result.saleId || '')
              setLastPaymentMethod(paymentMethod)
              setLastSaleTotal({
                subtotal,
                tax: taxes.reduce((sum, tax) => sum + tax.taxAmount, 0),
                total
              })
              setIsCheckoutOpen(false)
              setShowReceipt(true)
              
              // Clear cart and refresh products to update stock
              clearCart()
              await refreshProducts()
              
              toast({
                title: "Transaksi Berhasil",
                description: "Pembayaran telah berhasil diproses"
              })
            }
          } catch (error) {
            console.error('Failed to complete sale:', error)
            toast({
              title: "Error",
              description: "Gagal memproses transaksi",
              variant: "destructive"
            })
          }
        }}
      />

      {/* Receipt Dialog */}
      <Dialog 
        open={showReceipt} 
        onOpenChange={(open) => {
          setShowReceipt(open)
          if (!open) {
            clearCart() // Clear the cart when closing the receipt
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
              saleId={lastSaleId}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowReceipt(false)}
            >
              Tutup
            </Button>
            <Button 
              onClick={() => {
                if (receiptRef.current) {
                  window.print()
                  setTimeout(() => setShowReceipt(false), 500)
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
  )
}

export default POS