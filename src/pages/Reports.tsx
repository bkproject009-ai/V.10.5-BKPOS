import { usePOS } from '@/contexts/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Download,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  Edit,
  Trash2,
  Eye,
  Plus
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

// Custom Report type
type CustomReport = {
  id: string;
  name: string;
  description: string;
};

// Initial custom reports state
const initialCustomReports: CustomReport[] = [];

const Reports = () => {
  // Fallback modal state
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const { state, updateSale, deleteSale } = usePOS();
  const [selectedSale, setSelectedSale] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Custom Reports CRUD state
  const [customReports, setCustomReports] = useState<CustomReport[]>(initialCustomReports);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<CustomReport | null>(null);
  const [reportForm, setReportForm] = useState({ name: '', description: '' });

  // Create or update report
  const handleSaveReport = () => {
    if (!reportForm.name.trim()) return toast({ title: 'Nama laporan wajib diisi', variant: 'destructive' });
    if (editingReport) {
      setCustomReports(reports => reports.map(r => r.id === editingReport.id ? { ...r, ...reportForm } : r));
      toast({ title: 'Laporan diperbarui', description: 'Laporan berhasil diperbarui.' });
    } else {
      setCustomReports(reports => [...reports, { id: Date.now().toString(), ...reportForm }]);
      toast({ title: 'Laporan ditambahkan', description: 'Laporan baru berhasil dibuat.' });
    }
    setIsReportDialogOpen(false);
    setEditingReport(null);
    setReportForm({ name: '', description: '' });
  };

  // Edit report
  const handleEditReport = (report: CustomReport) => {
    setEditingReport(report);
    setReportForm({ name: report.name, description: report.description });
    setIsReportDialogOpen(true);
  };

  // Delete report
  const handleDeleteReport = (id: string) => {
    setCustomReports(reports => reports.filter(r => r.id !== id));
    toast({ title: 'Laporan dihapus', description: 'Laporan berhasil dihapus.' });
  };

  // Calculate analytics
  const totalRevenue = state.sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalTransactions = state.sales.length;
  
  // Product sales analytics
  const productSales = new Map();
  let totalItemsSold = 0;
  
  state.sales.forEach(sale => {
    sale.items.forEach(item => {
      const current = productSales.get(item.product.id) || 0;
      productSales.set(item.product.id, current + item.quantity);
      totalItemsSold += item.quantity;
    });
  });

  // Sort products by sales
  const productSalesArray = state.products.map(product => ({
    ...product,
    quantitySold: productSales.get(product.id) || 0,
    revenue: (productSales.get(product.id) || 0) * product.price
  })).sort((a, b) => b.quantitySold - a.quantitySold);

  const bestSellingProducts = productSalesArray.slice(0, 5);
  const worstSellingProducts = productSalesArray.slice(-5).reverse();

  // Sales by payment method
  const cashSales = state.sales.filter(sale => sale.paymentMethod === 'cash');
  const qrisSales = state.sales.filter(sale => sale.paymentMethod === 'qris');
  const cardSales = state.sales.filter(sale => sale.paymentMethod === 'card');
  const cashRevenue = cashSales.reduce((sum, sale) => sum + sale.total, 0);
  const qrisRevenue = qrisSales.reduce((sum, sale) => sum + sale.total, 0);

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "Export Error",
        description: "No data available to export",
        variant: "destructive"
      });
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    try {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Export Successful",
        description: `${filename}.csv has been downloaded`,
      });
    } catch (err) {
      setCsvContent(csv);
      setCsvModalOpen(true);
      toast({
        title: "Download failed",
        description: "Copy the CSV manually from the modal.",
        variant: "destructive"
      });
    }
  {/* CSV Fallback Modal */}
  <Dialog open={csvModalOpen} onOpenChange={setCsvModalOpen}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Salin Data CSV Manual</DialogTitle>
      </DialogHeader>
      <div className="mb-2 text-sm text-muted-foreground">Download gagal. Salin data di bawah ini secara manual:</div>
      <textarea
        value={csvContent}
        readOnly
        className="w-full h-64 p-2 border rounded bg-muted text-xs font-mono"
        style={{ resize: 'vertical' }}
      />
      <div className="flex justify-end pt-2">
        <Button variant="outline" onClick={() => setCsvModalOpen(false)}>Tutup</Button>
      </div>
    </DialogContent>
  </Dialog>
  };

  const exportSalesReport = () => {
    const salesData = state.sales.map(sale => ({
      'ID Transaksi': sale.id,
      'Tanggal': sale.date.toLocaleDateString('id-ID'),
      'Waktu': sale.date.toLocaleTimeString('id-ID'),
      'Jumlah Item': sale.items.length,
      'Subtotal': sale.subtotal?.toLocaleString('id-ID') || (sale.total - (sale.taxAmount || 0)).toLocaleString('id-ID'),
      'Jumlah Pajak': sale.taxAmount?.toLocaleString('id-ID') || '0',
      'Total': sale.total.toLocaleString('id-ID'),
      'Tipe Transaksi': sale.paymentMethod === 'cash' ? 'Tunai' : sale.paymentMethod === 'qris' ? 'QRIS' : sale.paymentMethod,
      'Items': sale.items.map(item => `${item.product.name} (${item.quantity})`).join('; ')
    }));
    
    exportToCSV(salesData, 'sales_report');
  };

  const exportProductReport = () => {
    const productData = productSalesArray.map(product => ({
      'Product Name': product.name,
      'SKU': product.sku,
      'Category': product.category,
      'Price': product.price.toFixed(2),
      'Current Stock': product.stock,
      'Units Sold': product.quantitySold,
      'Revenue Generated': product.revenue.toFixed(2),
      'Stock Status': product.stock < 10 ? 'Low Stock' : 'In Stock'
    }));
    
    exportToCSV(productData, 'product_report');
  };

  const exportInventoryReport = () => {
    const inventoryData = state.products.map(product => ({
      'Product Name': product.name,
      'SKU': product.sku,
      'Category': product.category,
      'Current Stock': product.stock,
      'Stock Value': (product.stock * product.price).toFixed(2),
      'Status': product.stock < 10 ? 'Low Stock' : product.stock === 0 ? 'Out of Stock' : 'In Stock'
    }));
    
    exportToCSV(inventoryData, 'inventory_report');
  };

  const handleEditSale = (sale) => {
    setSelectedSale(sale);
    setEditDialogOpen(true);
  };

  const handleUpdateSale = (updatedSale) => {
    updateSale(updatedSale.id, updatedSale);
    setEditDialogOpen(false);
    setSelectedSale(null);
  };

  const handleDeleteSale = (saleId) => {
    deleteSale(saleId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Laporan & Analitik</h1>
          <p className="text-muted-foreground">Kinerja penjualan dan wawasan inventaris</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={exportSalesReport}
            disabled={state.sales.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Laporan Penjualan
          </Button>
          <Button
            variant="outline"
            onClick={exportProductReport}
            disabled={state.products.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Laporan Produk
          </Button>
          <Button
            variant="outline"
            onClick={exportInventoryReport}
            disabled={state.products.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Laporan Inventaris
          </Button>
        </div>
      </div>

      {/* Financial Reports Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Laporan Laba Rugi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-2">Ringkasan pendapatan dan beban usaha.</p>
            {/* Example: You can add more detailed breakdown here */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Pendapatan</span>
                <span>Rp{totalRevenue.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Beban Usaha</span>
                <span>Rp0</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Laba Bersih</span>
                <span>Rp{totalRevenue.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Laporan Arus Kas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-2">Ringkasan arus kas masuk dan keluar.</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Kas Masuk</span>
                <span>Rp{totalRevenue.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Kas Keluar</span>
                <span>Rp0</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Saldo Kas</span>
                <span>Rp{totalRevenue.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Laporan Neraca</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-2">Ringkasan aset, kewajiban, dan ekuitas.</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Aset</span>
                <span>Rp{totalRevenue.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Kewajiban</span>
                <span>Rp0</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Ekuitas</span>
                <span>Rp{totalRevenue.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pendapatan</p>
                <p className="text-2xl font-bold text-foreground">Rp{totalRevenue.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-success/10 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transaksi</p>
                <p className="text-2xl font-bold text-foreground">{totalTransactions}</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-full">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Produk Terjual</p>
                <p className="text-2xl font-bold text-foreground">{totalItemsSold}</p>
              </div>
              <div className="bg-warning/10 p-3 rounded-full">
                <Package className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rata-rata Nilai Pesanan</p>
                <p className="text-2xl font-bold text-foreground">
                  Rp{totalTransactions > 0 ? (totalRevenue / totalTransactions).toLocaleString('id-ID') : '0'}
                </p>
              </div>
              <div className="bg-accent/10 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Penjualan Berdasarkan Metode Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            {totalTransactions === 0 ? (
              <p className="text-muted-foreground text-center py-8">Data penjualan tidak tersedia</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Pembayaran Tunai</p>
                    <p className="text-sm text-muted-foreground">{cashSales.length} transaksi</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">Rp{cashRevenue.toLocaleString('id-ID')}</p>
                    <p className="text-sm text-muted-foreground">
                      {totalRevenue > 0 ? ((cashRevenue / totalRevenue) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Pembayaran QRIS</p>
                    <p className="text-sm text-muted-foreground">{qrisSales.length} transaksi</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">Rp{qrisRevenue.toLocaleString('id-ID')}</p>
                    <p className="text-sm text-muted-foreground">
                      {totalRevenue > 0 ? ((qrisRevenue / totalRevenue) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Best Selling Products */}
        <Card>
          <CardHeader>
            <CardTitle>Produk Terlaris</CardTitle>
          </CardHeader>
          <CardContent>
            {bestSellingProducts.length === 0 || bestSellingProducts[0].quantitySold === 0 ? (
              <p className="text-muted-foreground text-center py-8">Data penjualan tidak tersedia</p>
            ) : (
              <div className="space-y-3">
                {bestSellingProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{product.quantitySold} terjual</p>
                      <p className="text-sm text-muted-foreground">Rp{product.revenue.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Least Selling Products */}
      <Card>
        <CardHeader>
          <CardTitle>Produk Perlu Perhatian</CardTitle>
        </CardHeader>
        <CardContent>
          {worstSellingProducts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Tidak ada produk yang perlu perhatian</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {worstSellingProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.category} • {product.sku}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant={product.stock < 10 ? "destructive" : "secondary"}
                        className={product.stock < 10 ? "bg-warning text-warning-foreground" : ""}
                      >
                        {product.stock} stok
                      </Badge>
                      {product.quantitySold === 0 && (
                        <Badge variant="outline">Belum terjual</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{product.quantitySold} terjual</p>
                    <p className="font-semibold">Rp{product.revenue.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Management Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Manajemen Penjualan</span>
            <Badge variant="secondary">{state.sales.length} Total Transaksi</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state.sales.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Tidak ada data penjualan ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Transaksi</TableHead>
                    <TableHead>Tanggal & Waktu</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>Pajak</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pembayaran</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.sales.slice().reverse().map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-sm">#{sale.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{sale.date.toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">{sale.date.toLocaleTimeString()}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sale.items.length} produk</Badge>
                      </TableCell>
                      <TableCell>Rp{(sale.subtotal || (sale.total - (sale.taxAmount || 0)).toLocaleString('id-ID'))}</TableCell>
                      <TableCell>Rp{(sale.taxAmount || 0).toLocaleString('id-ID')}</TableCell>
                      <TableCell className="font-semibold">Rp{sale.total.toLocaleString('id-ID')}</TableCell>
                      <TableCell>
                        <Badge variant={sale.paymentMethod === 'cash' ? 'default' : 'secondary'}>
                          {sale.paymentMethod === 'cash' ? 'Tunai' : 'Kartu'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Detail Penjualan - #{sale.id}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="font-medium">Tanggal:</p>
                                    <p>{sale.date.toLocaleString('id-ID')}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Pembayaran:</p>
                                    <p className="capitalize">{sale.paymentMethod === 'cash' ? 'Tunai' : 'Kartu'}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="font-medium mb-2">Produk:</p>
                                  <div className="space-y-2">
                                    {sale.items.map((item, index) => (
                                      <div key={index} className="flex justify-between text-sm bg-muted/50 p-2 rounded">
                                        <span>{item.product.name} × {item.quantity}</span>
                                        <span>Rp{(item.product.price * item.quantity).toLocaleString('id-ID')}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="border-t pt-4 space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>Subtotal:</span>
                                    <span>Rp{(sale.subtotal || (sale.total - (sale.taxAmount || 0)).toLocaleString('id-ID'))}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Pajak:</span>
                                    <span>Rp{(sale.taxAmount || 0).toLocaleString('id-ID')}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold">
                                    <span>Total:</span>
                                    <span>Rp{sale.total.toLocaleString('id-ID')}</span>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSale(sale)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Penjualan</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus penjualan #{sale.id}? Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSale(sale.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Sale Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Penjualan - #{selectedSale?.id}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <EditSaleForm
              sale={selectedSale}
              onSave={handleUpdateSale}
              onCancel={() => setEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Edit Sale Form Component
const EditSaleForm = ({ sale, onSave, onCancel }) => {
  const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod);
  const [total, setTotal] = useState(sale.total.toString());

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedTotal = parseFloat(total);
    if (isNaN(updatedTotal) || updatedTotal < 0) {
      return;
    }

    onSave({
      ...sale,
      paymentMethod,
      total: updatedTotal,
      subtotal: sale.taxAmount ? updatedTotal - sale.taxAmount : updatedTotal,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
  <Label htmlFor="payment-method">Metode Pembayaran</Label>
        <select
          id="payment-method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full mt-1 p-2 border border-input rounded-md bg-background"
        >
          <option value="cash">Tunai</option>
          <option value="card">Kartu</option>
        </select>
      </div>
      
      <div>
  <Label htmlFor="total">Total (Rp)</Label>
        <Input
          id="total"
          type="number"
          min="0"
          step="0.01"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          className="mt-1"
        />
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit">
          Update Penjualan
        </Button>
      </div>
    </form>
  );
};

export default Reports;