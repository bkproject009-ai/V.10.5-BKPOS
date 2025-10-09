import { useRef, useState } from 'react';
import { format } from "date-fns";
import { createRoot } from 'react-dom/client';
import { DashboardPDF } from '@/components/ui/dashboard-pdf';
import { usePOS } from '@/contexts/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  ShoppingCart,
  Download,
  Calendar as CalendarIcon,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

const Dashboard = () => {
  const { state } = usePOS();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Filter sales by date range
  const filteredSales = Array.isArray(state.sales) ? state.sales.filter(sale => {
    const saleDate = new Date(sale.created_at);
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    startDateTime.setHours(0, 0, 0, 0);
    endDateTime.setHours(23, 59, 59, 999);
    return saleDate >= startDateTime && saleDate <= endDateTime;
  }) : [];

  // Calculate analytics for current period
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
  const totalSales = filteredSales.length;
  const averageTransactionValue = totalSales > 0 ? totalRevenue / totalSales : 0;
  const totalItemsSold = filteredSales.reduce((sum, sale) => sum + (sale.items?.length || 0), 0);

  // Calculate previous period for comparison
  const previousStartDate = new Date(startDate);
  previousStartDate.setDate(previousStartDate.getDate() - 30);
  const previousEndDate = new Date(endDate);
  previousEndDate.setDate(previousEndDate.getDate() - 30);

  const previousPeriodSales = Array.isArray(state.sales) ? state.sales.filter(sale => {
    const saleDate = new Date(sale.created_at);
    const startDateTime = new Date(previousStartDate);
    const endDateTime = new Date(previousEndDate);
    startDateTime.setHours(0, 0, 0, 0);
    endDateTime.setHours(23, 59, 59, 999);
    return saleDate >= startDateTime && saleDate <= endDateTime;
  }) : [];

  // Calculate previous period analytics
  const prevTotalRevenue = previousPeriodSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
  const prevTotalSales = previousPeriodSales.length;
  const prevTotalItemsSold = previousPeriodSales.reduce((sum, sale) => sum + (sale.items?.length || 0), 0);
  const prevAvgTransactionValue = prevTotalSales > 0 ? prevTotalRevenue / prevTotalSales : 0;

  // Calculate change percentages
  const calculateChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const totalRevenueChangePercent = calculateChangePercent(totalRevenue, prevTotalRevenue);
  const totalSalesChangePercent = calculateChangePercent(totalSales, prevTotalSales);
  const avgTransactionChangePercent = calculateChangePercent(averageTransactionValue, prevAvgTransactionValue);
  const totalItemsSoldChangePercent = calculateChangePercent(totalItemsSold, prevTotalItemsSold);

  const stats = [
    {
      title: "Total Pendapatan",
      value: `Rp${totalRevenue.toLocaleString('id-ID')}`,
      icon: DollarSign,
      trendUp: totalRevenueChangePercent > 0,
      trend: `${Math.abs(totalRevenueChangePercent).toFixed(1)}%`
    },
    {
      title: "Total Transaksi",
      value: totalSales,
      icon: ShoppingCart,
      trendUp: totalSalesChangePercent > 0,
      trend: `${Math.abs(totalSalesChangePercent).toFixed(1)}%`
    },
    {
      title: "Rata-rata Transaksi",
      value: `Rp${averageTransactionValue.toLocaleString('id-ID')}`,
      icon: TrendingUp,
      trendUp: avgTransactionChangePercent > 0,
      trend: `${Math.abs(avgTransactionChangePercent).toFixed(1)}%`
    },
    {
      title: "Total Produk Terjual",
      value: totalItemsSold,
      icon: Package,
      trendUp: totalItemsSoldChangePercent > 0,
      trend: `${Math.abs(totalItemsSoldChangePercent).toFixed(1)}%`
    },
  ];

  // Calculate per-cashier statistics for filtered sales
  // Calculate product stats for filtered sales
  const cashierStats = filteredSales.reduce((acc, sale) => {
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
  }>);

  // Calculate product stats for filtered sales
  const productStats = new Map();
  
  filteredSales.forEach(sale => {
    if (Array.isArray(sale.sale_items)) {
      sale.sale_items.forEach(item => {
        if (item?.product_id) {
          const current = productStats.get(item.product_id) || { 
            quantity: 0, 
            revenue: 0,
            averagePrice: 0,
            lastSold: null,
            firstSold: null
          };
          
          const quantity = Number(item.quantity) || 0;
          const revenue = quantity * (Number(item.price_at_time) || 0);
          const saleDate = new Date(sale.created_at);
          
          productStats.set(item.product_id, {
            quantity: current.quantity + quantity,
            revenue: current.revenue + revenue,
            averagePrice: (current.revenue + revenue) / (current.quantity + quantity),
            lastSold: current.lastSold ? (saleDate > current.lastSold ? saleDate : current.lastSold) : saleDate,
            firstSold: current.firstSold ? (saleDate < current.firstSold ? saleDate : current.firstSold) : saleDate
          });
        }
      });
    }
  });

  // Get best and worst selling products
  let bestSellingProduct = null;
  let worstSellingProduct = null;

  if (state.products.length > 0) {
    const productsWithStats = state.products.map(product => ({
      ...product,
      stats: productStats.get(product.id) || { quantity: 0, revenue: 0, averagePrice: 0 }
    })).filter(product => product.stats.quantity > 0);

    if (productsWithStats.length > 0) {
      bestSellingProduct = productsWithStats.reduce((best, current) => 
        current.stats.quantity > best.stats.quantity ? current : best
      , productsWithStats[0]);

      worstSellingProduct = productsWithStats.reduce((worst, current) => 
        current.stats.quantity < worst.stats.quantity ? current : worst
      , productsWithStats[0]);
    } else {
      bestSellingProduct = {
        ...state.products[0],
        stats: { quantity: 0, revenue: 0, averagePrice: 0 }
      };
      worstSellingProduct = bestSellingProduct;
    }
  }

  // Low stock products
  const lowStockProducts = Array.isArray(state.products) ? 
    state.products
      .filter(product => (Number(product.stock) || 0) <= (Number(product.min_stock) || 10))
      .map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        stock: Number(product.stock) || 0
      }))
      .sort((a, b) => a.stock - b.stock) : [];

  // Stats array is already defined above

  const downloadAsPDF = async () => {
    setIsPrinting(true);
    const pdfContent = document.createElement('div');
    pdfContent.style.width = '297mm';
    pdfContent.style.padding = '15mm';
    
    const root = document.createElement('div');
    root.style.width = '100%';
    root.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    
    root.innerHTML = `<div id="pdf-content"></div>`;
    pdfContent.appendChild(root);
    document.body.appendChild(pdfContent);

    const container = document.getElementById('pdf-content');
    if (container) {
      const element = <DashboardPDF sales={state.sales} products={state.products} />;
      const root = createRoot(container);
      await root.render(element);

      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
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
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                <span>Kinerja Produk</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Dari Tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Sampai Tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="p-3 sm:p-4 bg-success/10 rounded-lg">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Terlaris</p>
                    <p className="font-semibold text-foreground truncate">{bestSellingProduct?.name}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs sm:text-sm text-success">
                        {bestSellingProduct?.stats?.quantity || 0} unit terjual
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Total: Rp{(bestSellingProduct?.stats?.revenue || 0).toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Rata-rata: Rp{(bestSellingProduct?.stats?.averagePrice || 0).toLocaleString('id-ID')}/unit
                      </p>
                      {bestSellingProduct?.stats?.lastSold && (
                        <>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Terakhir terjual: {format(new Date(bestSellingProduct.stats.lastSold), "dd MMM yyyy")}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Pertama terjual: {format(new Date(bestSellingProduct.stats.firstSold), "dd MMM yyyy")}
                          </p>
                        </>
                      )}
                    </div>
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
                    <div className="mt-2 space-y-1">
                      <p className="text-xs sm:text-sm text-warning">
                        {worstSellingProduct?.stats?.quantity || 0} unit terjual
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Total: Rp{(worstSellingProduct?.stats?.revenue || 0).toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Rata-rata: Rp{(worstSellingProduct?.stats?.averagePrice || 0).toLocaleString('id-ID')}/unit
                      </p>
                      {worstSellingProduct?.stats?.lastSold && (
                        <>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Terakhir terjual: {format(new Date(worstSellingProduct.stats.lastSold), "dd MMM yyyy")}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Pertama terjual: {format(new Date(worstSellingProduct.stats.firstSold), "dd MMM yyyy")}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-warning text-warning-foreground whitespace-nowrap">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Rendah
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

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
      </div>
    </div>
  );
};

export default Dashboard;
