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
  const totalRevenue = state.sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalTransactions = state.sales.length;
  const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  
  // Low stock products (stock < 10)
  const lowStockProducts = state.products.filter(product => product.stock < 10);
  
  // Best selling products
  const productSales = new Map();
  state.sales.forEach(sale => {
    sale.items.forEach(item => {
      const current = productSales.get(item.product.id) || 0;
      productSales.set(item.product.id, current + item.quantity);
    });
  });
  
  const bestSellingProduct = state.products.reduce((best, product) => {
    const sales = productSales.get(product.id) || 0;
    const bestSales = productSales.get(best.id) || 0;
    return sales > bestSales ? product : best;
  }, state.products[0]);

  const worstSellingProduct = state.products.reduce((worst, product) => {
    const sales = productSales.get(product.id) || 0;
    const worstSales = productSales.get(worst.id) || Infinity;
    return sales < worstSales ? product : worst;
  }, state.products[0]);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dasbor</h1>
        <p className="text-muted-foreground">Ringkasan operasional toko Anda</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  {stat.trendUp ? (
                    <TrendingUp className="h-4 w-4 text-success mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive mr-1" />
                  )}
                  <span className={`text-sm ${stat.trendUp ? 'text-success' : 'text-destructive'}`}>
                    {stat.trend}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best/Worst Selling Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <span>Kinerja Produk</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-success/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Terlaris</p>
                  <p className="font-semibold text-foreground">{bestSellingProduct?.name}</p>
                  <p className="text-sm text-success">
                    {productSales.get(bestSellingProduct?.id) || 0} unit terjual
                  </p>
                </div>
                <Badge variant="secondary" className="bg-success text-success-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Teratas
                </Badge>
              </div>
            </div>
            
            <div className="p-4 bg-warning/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Perlu Perhatian</p>
                  <p className="font-semibold text-foreground">{worstSellingProduct?.name}</p>
                  <p className="text-sm text-warning">
                    {productSales.get(worstSellingProduct?.id) || 0} unit terjual
                  </p>
                </div>
                <Badge variant="secondary" className="bg-warning text-warning-foreground">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Rendah
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span>Stok Rendah</span>
              {lowStockProducts.length > 0 && (
                <Badge variant="secondary" className="bg-warning text-warning-foreground">
                  {lowStockProducts.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Semua produk tersedia dengan baik! 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map(product => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.sku}</p>
                    </div>
                    <Badge variant="outline" className="border-warning text-warning">
                      {product.stock} sisa
                    </Badge>
                  </div>
                ))}
                {lowStockProducts.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
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
        <CardHeader>
          <CardTitle>Transaksi Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {state.sales.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Belum ada transaksi. Mulai penjualan untuk melihat aktivitas terbaru!
            </p>
          ) : (
            <div className="space-y-3">
              {state.sales.slice(-5).reverse().map(sale => (
                <div key={sale.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">
                      Transaksi #{sale.id.slice(-6)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {sale.date.toLocaleDateString('id-ID')} • {sale.items.length} produk
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">Rp{sale.total.toLocaleString('id-ID')}</p>
                    <Badge variant="outline" className="capitalize">
                      {sale.paymentMethod}
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