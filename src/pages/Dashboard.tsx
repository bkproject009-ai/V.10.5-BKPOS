import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DashboardPDF } from '@/components/ui/dashboard-pdf';
import { usePOS } from '@/contexts/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Package,
  ShoppingCart,
  Download
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

const Dashboard = () => {
  const { state } = usePOS();
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [isPrinting, setIsPrinting] = useState(false);

  const downloadAsPDF = async () => {
    setIsPrinting(true);
    const pdfContent = document.createElement('div');
    pdfContent.style.width = '297mm'; // A4 width in landscape
    pdfContent.style.padding = '15mm';
    
    const root = document.createElement('div');
    root.style.width = '100%';
    root.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    
    // Render the PDF component
    root.innerHTML = `<div id="pdf-content"></div>`;
    pdfContent.appendChild(root);
    document.body.appendChild(pdfContent);

    // Use React to render the PDF content
    const container = document.getElementById('pdf-content');
    if (container) {
      const element = <DashboardPDF sales={state.sales} products={state.products} />;
      const root = createRoot(container);
      await root.render(element);

      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number], // top, right, bottom, left
        filename: `laporan-toko-${new Date().toLocaleDateString('id-ID')}.pdf`,
        image: { type: 'jpeg' as const, quality: 1 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'landscape' as const,
          compress: true,
          hotfixes: ['px_scaling']
        }
      };

      try {
        await html2pdf().set(opt).from(pdfContent).save();
      } catch (error) {
        console.error('Error generating PDF:', error);
      } finally {
        document.body.removeChild(pdfContent);
        setIsPrinting(false);
      }
    }
  };

  // Calculate analytics
  const totalRevenue = Array.isArray(state.sales) ? state.sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0) : 0;
  const totalTransactions = Array.isArray(state.sales) ? state.sales.length : 0;
  const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Calculate per-cashier statistics
  const cashierStats = Array.isArray(state.sales) ? state.sales.reduce((acc, sale) => {
    if (!sale.cashier) return acc;
    
    const cashierId = sale.cashier.id;
    if (!acc[cashierId]) {
      acc[cashierId] = {
        id: cashierId,
        name: sale.cashier.full_name || sale.cashier.username,
        totalSales: 0,
        totalRevenue: 0,
        totalItems: 0
      };
    }

    acc[cashierId].totalSales++;
    acc[cashierId].totalRevenue += Number(sale.total) || 0;
    acc[cashierId].totalItems += (sale.sale_items || []).reduce(
      (sum, item) => sum + (Number(item.quantity) || 0), 0
    );

    return acc;
  }, {} as Record<string, {
    id: string;
    name: string;
    totalSales: number;
    totalRevenue: number;
    totalItems: number;
  }>) : {};
  
  // Low stock products (stock < 10)
  const lowStockProducts = Array.isArray(state.products) ? state.products.filter(product => (Number(product.stock) || 0) < 10) : [];
  
  // Best selling products
  const productSales = new Map();
  if (Array.isArray(state.sales)) {
    state.sales.forEach(sale => {
      if (Array.isArray(sale.sale_items)) {
        sale.sale_items.forEach(item => {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dasbor</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Ringkasan operasional toko Anda</p>
        </div>
        <Button onClick={downloadAsPDF} className="gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>
      <div className="space-y-6" ref={dashboardRef}>
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

      {/* Cashier Performance Section */}
      <Card className="col-span-full">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Kinerja Kasir</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(cashierStats).map((cashier) => (
              <div key={cashier.id} className="bg-muted/20 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">{cashier.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Transaksi:</span>
                    <span>{cashier.totalSales}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Pendapatan:</span>
                    <span>Rp{cashier.totalRevenue.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Item:</span>
                    <span>{cashier.totalItems}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
              {(state.sales || []).slice(-5).reverse().map(sale => (
                <div key={sale?.id || 'unknown'} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 border border-border rounded-lg">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between sm:justify-start gap-2">
                      <p className="font-medium text-sm sm:text-base text-foreground truncate">
                        Transaksi #{(sale?.id || '').slice(-6)}
                      </p>
                      <Badge variant="outline" className="capitalize text-xs shrink-0 sm:hidden">
                        {sale?.payment_method}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                                            {new Date(sale?.created_at || '').toLocaleDateString('id-ID')} • {(sale?.sale_items || []).length} produk
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
    </div>
  );
};

export default Dashboard;