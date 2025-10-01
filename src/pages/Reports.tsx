import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePOS } from '@/contexts/POSContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/ui/metric-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Download,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  CreditCard,
  Receipt,
  Users,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Sale } from '@/contexts/POSContext';

const Reports = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const init = async () => {
      try {
        if (!session) {
          throw new Error('No active session');
        }

        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !currentSession) {
          throw new Error('Invalid session');
        }

        await fetchSales();
      } catch (error) {
        console.error('Session/initialization error:', error);
        
        toast({
          title: "Authentication Error",
          description: error instanceof Error ? error.message : "Please login again to continue",
          variant: "destructive"
        });

        navigate('/login', { replace: true });
      }
    };

    init();
  }, [session, navigate]);

  const fetchSales = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sales_taxes(
            *,
            tax_types(*)
          ),
          sale_items(
            *,
            product:products(
              id,
              name,
              price,
              sku
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        switch (error.code) {
          case 'PGRST301':
          case '401':
            throw new Error('Sesi telah berakhir. Silakan login kembali.');
          case 'PGRST404':
            throw new Error('Data penjualan tidak ditemukan.');
          default:
            throw new Error(error.message);
        }
      }

      if (!data) {
        throw new Error('Tidak ada data yang diterima dari server');
      }

      setSales(data);
    } catch (error) {
      console.error('Error fetching sales:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Gagal mengambil data penjualan';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      if (
        error instanceof Error && 
        (error.message.includes('login') || error.message.includes('sesi'))
      ) {
        navigate('/login', { replace: true });
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary data
  const totalRevenue = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
  const totalTransactions = sales.length;
  const totalItemsSold = sales.reduce((sum, sale) => 
    sum + (Array.isArray(sale.sale_items) ? sale.sale_items.reduce((itemSum, item) => 
      itemSum + (Number(item.quantity) || 0), 0) : 0), 0);

  // Calculate payment method stats
  const paymentStats = sales.reduce((acc, sale) => {
    acc[sale.payment_method] = (acc[sale.payment_method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate today's stats
  const todayStats = sales
    .filter(sale => {
      const saleDate = new Date(sale.created_at);
      const today = new Date();
      return (
        saleDate.getDate() === today.getDate() &&
        saleDate.getMonth() === today.getMonth() &&
        saleDate.getFullYear() === today.getFullYear()
      );
    })
    .reduce(
      (acc, sale) => {
        acc.revenue += Number(sale.total) || 0;
        acc.transactions += 1;
        acc.items += (sale.sale_items || []).reduce(
          (sum, item) => sum + (Number(item.quantity) || 0),
          0
        );
        return acc;
      },
      { revenue: 0, transactions: 0, items: 0 }
    );

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate trends
  const getTrendPercentage = (current: number, total: number) => {
    if (total === 0 || current === 0) return 0;
    return ((current / total) * 100);
  };

  // Download functionality for summary report
  const downloadSummaryReport = () => {
    const csvContent = generateSummaryCSV(sales);
    downloadCSV(csvContent, 'laporan-per-transaksi');
  };

  // Download functionality for product report
  const downloadProductReport = () => {
    const csvContent = generateProductCSV(sales);
    downloadCSV(csvContent, 'ringkasan-per-produk');
  };

  const downloadCSV = (content: string, filePrefix: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filePrefix}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDateToLocale = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID');
  };

  const generateSummaryCSV = (sales: Sale[]) => {
    const headers = [
      'Tanggal',
      'No. Invoice',
      'Nama Produk',
      'Harga Satuan',
      'Jumlah',
      'Subtotal',
      'Pajak',
      'Total',
      'Pembayaran',
      'Kembalian'
    ].join(',');

    const rows = sales.flatMap(sale => {
      const taxes = (sale.sales_taxes || []).reduce((sum, tax) => sum + (Number(tax.tax_amount) || 0), 0);
      const totalItems = (sale.sale_items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      const taxPerItem = totalItems > 0 ? taxes / totalItems : 0; // Distribute tax evenly across items

      const payment = Number(sale.payment_amount) || 0;
      
      return (sale.sale_items || []).map(item => {
        if (!item.product) return null;
        
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price_at_time) || 0;
        const subtotal = price * quantity;
        const itemTax = taxPerItem * quantity;
        const total = subtotal + itemTax;

        // Escape product name if it contains commas
        const escapedName = item.product.name.includes(',') ? `"${item.product.name}"` : item.product.name;

        return [
          formatDateToLocale(sale.created_at),
          sale.invoice_number,
          escapedName,
          formatCurrency(price),
          quantity,
          formatCurrency(subtotal),
          formatCurrency(itemTax),
          formatCurrency(total),
          formatCurrency(payment),
          formatCurrency(payment - total)
        ].join(',');
      });
    }).filter(row => row !== null);

    return [headers, ...rows].join('\n');
  };

  const generateProductCSV = (sales: Sale[]) => {
    // Create a map to aggregate product sales
    const productMap = new Map<string, { 
      name: string;
      productId: string;
      quantity: number;
      revenue: number;
      price: number;
      sku: string | null;
      taxes: number;
      subtotal: number;
    }>();

    sales.forEach(sale => {
      const totalTax = (sale.sales_taxes || []).reduce((sum, tax) => sum + (Number(tax.tax_amount) || 0), 0);
      const totalItems = (sale.sale_items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      const taxPerItem = totalItems > 0 ? totalTax / totalItems : 0; // Distribute tax evenly across items

      (sale.sale_items || []).forEach(item => {
        if (!item.product_id || !item.product) return;
        
        const productId = item.product_id.toString();
        const existing = productMap.get(productId) || {
          name: item.product.name,
          productId,
          quantity: 0,
          revenue: 0,
          price: Number(item.price_at_time) || 0,
          sku: item.product.sku,
          taxes: 0,
          subtotal: 0
        };
        
        const quantity = Number(item.quantity) || 0;
        const itemSubtotal = (Number(item.price_at_time) || 0) * quantity;
        const itemTax = taxPerItem * quantity;

        existing.quantity += quantity;
        existing.subtotal += itemSubtotal;
        existing.taxes += itemTax;
        existing.revenue = existing.subtotal + existing.taxes;
        
        productMap.set(productId, existing);
      });
    });

    const headers = [
      'SKU',
      'Nama Produk',
      'Harga Satuan',
      'Jumlah Terjual',
      'Subtotal',
      'Pajak',
      'Total'
    ].join(',');

    const rows = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map(product => {
        // Escape komma in product name to prevent CSV format issues
        const escapedName = product.name.includes(',') ? `"${product.name}"` : product.name;
        
        return [
          product.sku || product.productId,
          escapedName,
          formatCurrency(product.price),
          product.quantity,
          formatCurrency(product.subtotal),
          formatCurrency(product.taxes),
          formatCurrency(product.revenue)
        ].join(',');
      });

    return [headers, ...rows].join('\n');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="text-sm text-gray-600">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Summary Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Ringkasan Laporan</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Revenue Card */}
          <MetricCard
            title="Total Pendapatan"
            value={formatCurrency(totalRevenue)}
            icon={<DollarSign />}
            subValue={`Hari ini: ${formatCurrency(todayStats.revenue)}`}
            trend={todayStats.revenue > 0 ? "up" : undefined}
            trendValue={`${getTrendPercentage(todayStats.revenue, totalRevenue).toFixed(1)}%`}
          />

          {/* Transactions Card */}
          <MetricCard
            title="Total Transaksi"
            value={totalTransactions}
            icon={<ShoppingCart />}
            subValue={`Hari ini: ${todayStats.transactions} transaksi`}
            trend={todayStats.transactions > 0 ? "up" : undefined}
            trendValue={`${getTrendPercentage(todayStats.transactions, totalTransactions).toFixed(1)}%`}
          />

          {/* Items Sold Card */}
          <MetricCard
            title="Total Item Terjual"
            value={totalItemsSold}
            icon={<Package />}
            subValue={`Hari ini: ${todayStats.items} item`}
            trend={todayStats.items > 0 ? "up" : undefined}
            trendValue={`${getTrendPercentage(todayStats.items, totalItemsSold).toFixed(1)}%`}
          />

          {/* Payment Methods Card */}
          <MetricCard
            title="Metode Pembayaran"
            value={`${paymentStats['cash'] || 0} Tunai`}
            icon={<CreditCard />}
            subValue={`${paymentStats['card'] || 0} Kartu • ${paymentStats['qris'] || 0} QRIS`}
          />
        </div>
      </div>

      {/* Header with Download Buttons */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Daftar Transaksi</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <Download className="h-4 w-4" />
              Download Laporan
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={downloadProductReport}>
              Ringkasan Per Produk
            </DropdownMenuItem>
            <DropdownMenuItem onClick={downloadSummaryReport}>
              Laporan Penjualan Per Transaksi
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sales Table */}
      <Card>
        <CardContent>
          {sales.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Tidak ada data penjualan</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Transaksi</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pembayaran</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="w-[100px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => {
                    const taxAmount = (sale.sales_taxes || [])
                      .reduce((sum, tax) => sum + (Number(tax.tax_amount) || 0), 0);

                    return (
                      <TableRow key={sale.id} className="group">
                        <TableCell className="font-medium">{sale.id}</TableCell>
                        <TableCell>
                          {new Date(sale.created_at).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(Number(sale.total) || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={sale.payment_method === 'cash' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {sale.payment_method === 'cash' ? 'Tunai' : 
                             sale.payment_method === 'qris' ? 'QRIS' : 'Kartu'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(sale.sale_items || []).length} items
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Detail Transaksi #{sale.id}</DialogTitle>
                                <DialogDescription>
                                  {new Date(sale.created_at).toLocaleString('id-ID')}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-sm font-medium mb-1">Total Transaksi</p>
                                      <p className="text-2xl font-bold">
                                        {formatCurrency(Number(sale.total) || 0)}
                                      </p>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-sm font-medium mb-1">Metode Pembayaran</p>
                                      <Badge 
                                        variant={sale.payment_method === 'cash' ? 'default' : 'secondary'}
                                        className="capitalize"
                                      >
                                        {sale.payment_method === 'cash' ? 'Tunai' : 
                                         sale.payment_method === 'qris' ? 'QRIS' : 'Kartu'}
                                      </Badge>
                                    </CardContent>
                                  </Card>
                                </div>
                                
                                <div>
                                  <h4 className="text-sm font-medium mb-3">Detail Produk</h4>
                                  <div className="space-y-2">
                                    {(sale.sale_items || []).map((item, index) => (
                                      <div key={index} className="flex justify-between items-center text-sm bg-muted/50 p-3 rounded">
                                        <div>
                                          <p className="font-medium">{item.product?.name || `Produk #${item.product_id}`}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {formatCurrency(Number(item.price_at_time))} × {item.quantity}
                                          </p>
                                        </div>
                                        <p className="font-medium">
                                          {formatCurrency(Number(item.price_at_time || 0) * Number(item.quantity || 0))}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {Array.isArray(sale.sales_taxes) && sale.sales_taxes.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-3">Rincian Pajak</h4>
                                    <div className="space-y-2">
                                      {sale.sales_taxes.map((tax, index) => (
                                        <div key={`tax-${index}`} className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                                          <span>{tax.tax_types?.name || 'Pajak'} ({tax.tax_types?.rate || 0}%)</span>
                                          <span className="font-medium">
                                            {formatCurrency(Number(tax.tax_amount || 0))}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="border-t pt-4 space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>{formatCurrency(Number(sale.subtotal || 0))}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Pajak</span>
                                    <span>{formatCurrency(taxAmount)}</span>
                                  </div>
                                  <div className="flex justify-between text-lg font-bold pt-2">
                                    <span>Total</span>
                                    <span>{formatCurrency(Number(sale.total) || 0)}</span>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;