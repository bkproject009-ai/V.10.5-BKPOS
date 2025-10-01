import { usePOS } from '@/contexts/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Package,
  ShoppingCart
} from 'lucide-react';

const Dashboard = () => {
  const { state } = usePOS();

  // Calculate analytics
  const totalRevenue = Array.isArray(state.sales) ? state.sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0) : 0;
  const totalTransactions = Array.isArray(state.sales) ? state.sales.length : 0;
  const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  
  // Low stock products (stock < 10)
  const lowStockProducts = Array.isArray(state.products) ? state.products.filter(product => (Number(product.stock) || 0) < 10) : [];
  
  // Best selling products
  const productSales = new Map();
  if (Array.isArray(state.sales)) {
    state.sales.forEach(sale => {
      if (Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          if (item?.product_id) {
            const current = productSales.get(item.product_id) || 0;
            const quantity = Number(item.quantity) || 0;
            productSales.set(item.product_id, current + quantity);
          }
        });
      }
    });
  }
  
  let bestSellingProduct = null;
  let worstSellingProduct = null;

  if (state.products.length > 0) {
    bestSellingProduct = state.products.reduce((best, product) => {
      const sales = productSales.get(product.id) || 0;
      const bestSales = productSales.get(best.id) || 0;
      return sales > bestSales ? product : best;
    }, state.products[0]);

    worstSellingProduct = state.products.reduce((worst, product) => {
      const sales = productSales.get(product.id) || 0;
      const worstSales = productSales.get(worst.id) || Infinity;
      return sales < worstSales ? product : worst;
    }, state.products[0]);
  }

  const stats = [
    {
      title: 'Total Pendapatan',
      value: `Rp${totalRevenue.toLocaleString('id-ID')}`,
      icon: DollarSign,
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'Transaksi',
      value: totalTransactions.toString(),
      icon: ShoppingCart,
      trend: '+5%',
      trendUp: true
    },
    {
      title: 'Rata-rata Nilai Pesanan',
      value: `Rp${averageOrderValue.toLocaleString('id-ID')}`,
      icon: TrendingUp,
      trend: '+8%',
      trendUp: true
    },
    {
      title: 'Produk',
      value: state.products.length.toString(),
      icon: Package,
      trend: '+2',
      trendUp: true
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 md:p-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dasbor</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Ringkasan operasional toko Anda</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{stat.value}</p>
                  </div>
                  <div className="bg-primary/10 p-2 sm:p-3 rounded-full shrink-0">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                </div>
                <div className="mt-3 md:mt-4 flex items-center text-xs sm:text-sm">
                  {stat.trendUp ? (
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive mr-1" />
                  )}
                  <span className={`${stat.trendUp ? 'text-success' : 'text-destructive'}`}>
                    {stat.trend}
                  </span>
                  <span className="text-muted-foreground ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Best/Worst Selling Products */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              <span>Kinerja Produk</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="p-3 sm:p-4 bg-success/10 rounded-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Terlaris</p>
                  <p className="font-semibold text-foreground truncate">{bestSellingProduct?.name}</p>
                  <p className="text-xs sm:text-sm text-success">
                    {productSales.get(bestSellingProduct?.id) || 0} unit terjual
                  </p>
                </div>
                <Badge variant="secondary" className="bg-success text-success-foreground whitespace-nowrap">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Teratas
                </Badge>
              </div>
            </div>
            
            <div className="p-3 sm:p-4 bg-warning/10 rounded-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Perlu Perhatian</p>
                  <p className="font-semibold text-foreground truncate">{worstSellingProduct?.name}</p>
                  <p className="text-xs sm:text-sm text-warning">
                    {productSales.get(worstSellingProduct?.id) || 0} unit terjual
                  </p>
                </div>
                <Badge variant="secondary" className="bg-warning text-warning-foreground whitespace-nowrap">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Rendah
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              <span>Stok Rendah</span>
              {lowStockProducts.length > 0 && (
                <Badge variant="secondary" className="bg-warning text-warning-foreground">
                  {lowStockProducts.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 sm:py-8">
                Semua produk tersedia dengan baik! 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map(product => (
                  <div key={product.id} className="flex items-center justify-between gap-4 p-3 bg-warning/10 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{product.sku}</p>
                    </div>
                    <Badge variant="outline" className="border-warning text-warning whitespace-nowrap shrink-0">
                      {product.stock} sisa
                    </Badge>
                  </div>
                ))}
                {lowStockProducts.length > 5 && (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center">
                    +{lowStockProducts.length - 5} produk lagi perlu restock
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Transaksi Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {state.sales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 sm:py-8">
              Belum ada transaksi. Mulai penjualan untuk melihat aktivitas terbaru!
            </p>
          ) : (
            <div className="space-y-3">
              {state.sales.slice(-5).reverse().map(sale => (
                <div key={sale.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 border border-border rounded-lg">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between sm:justify-start gap-2">
                      <p className="font-medium text-sm sm:text-base text-foreground truncate">
                        Transaksi #{sale.id.slice(-6)}
                      </p>
                      <Badge variant="outline" className="capitalize text-xs shrink-0 sm:hidden">
                        {sale.payment_method}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {new Date(sale.created_at).toLocaleDateString('id-ID')} • {sale.items.length} produk
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:text-right gap-2">
                    <p className="font-semibold text-foreground text-sm sm:text-base sm:order-2">
                      Rp{sale.total.toLocaleString('id-ID')}
                    </p>
                    <Badge variant="outline" className="capitalize text-xs shrink-0 hidden sm:inline-flex sm:order-1">
                      {sale.payment_method}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;