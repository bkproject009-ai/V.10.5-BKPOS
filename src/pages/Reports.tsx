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

const Reports = () => {
  const { state, updateSale, deleteSale } = usePOS();
  const [selectedSale, setSelectedSale] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
  const cardSales = state.sales.filter(sale => sale.paymentMethod === 'card');
  const cashRevenue = cashSales.reduce((sum, sale) => sum + sale.total, 0);
  const cardRevenue = cardSales.reduce((sum, sale) => sum + sale.total, 0);

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
    
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
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
  };

  const exportSalesReport = () => {
    const salesData = state.sales.map(sale => ({
      'Transaction ID': sale.id,
      'Date': sale.date.toLocaleDateString(),
      'Time': sale.date.toLocaleTimeString(),
      'Items Count': sale.items.length,
      'Subtotal': sale.subtotal?.toFixed(2) || (sale.total - (sale.taxAmount || 0)).toFixed(2),
      'Tax Amount': sale.taxAmount?.toFixed(2) || '0.00',
      'Total Amount': sale.total.toFixed(2),
      'Payment Method': sale.paymentMethod,
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
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Sales performance and inventory insights</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={exportSalesReport}
            disabled={state.sales.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Sales Report
          </Button>
          <Button
            variant="outline"
            onClick={exportProductReport}
            disabled={state.products.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Product Report
          </Button>
          <Button
            variant="outline"
            onClick={exportInventoryReport}
            disabled={state.products.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Inventory Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">${totalRevenue.toFixed(2)}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
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
                <p className="text-sm font-medium text-muted-foreground">Items Sold</p>
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
                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold text-foreground">
                  ${totalTransactions > 0 ? (totalRevenue / totalTransactions).toFixed(2) : '0.00'}
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
            <CardTitle>Sales by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            {totalTransactions === 0 ? (
              <p className="text-muted-foreground text-center py-8">No sales data available</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Cash Payments</p>
                    <p className="text-sm text-muted-foreground">{cashSales.length} transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${cashRevenue.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {totalRevenue > 0 ? ((cashRevenue / totalRevenue) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Card Payments</p>
                    <p className="text-sm text-muted-foreground">{cardSales.length} transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${cardRevenue.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {totalRevenue > 0 ? ((cardRevenue / totalRevenue) * 100).toFixed(1) : 0}%
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
            <CardTitle>Best Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            {bestSellingProducts.length === 0 || bestSellingProducts[0].quantitySold === 0 ? (
              <p className="text-muted-foreground text-center py-8">No sales data available</p>
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
                      <p className="font-semibold">{product.quantitySold} sold</p>
                      <p className="text-sm text-muted-foreground">${product.revenue.toFixed(2)}</p>
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
          <CardTitle>Products Needing Attention</CardTitle>
        </CardHeader>
        <CardContent>
          {worstSellingProducts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No products need attention</p>
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
                        {product.stock} in stock
                      </Badge>
                      {product.quantitySold === 0 && (
                        <Badge variant="outline">No sales</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{product.quantitySold} sold</p>
                    <p className="font-semibold">${product.revenue.toFixed(2)}</p>
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
            <span>Sales Management</span>
            <Badge variant="secondary">{state.sales.length} Total Sales</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state.sales.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No sales records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Actions</TableHead>
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
                        <Badge variant="outline">{sale.items.length} items</Badge>
                      </TableCell>
                      <TableCell>${(sale.subtotal || (sale.total - (sale.taxAmount || 0))).toFixed(2)}</TableCell>
                      <TableCell>${(sale.taxAmount || 0).toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">${sale.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={sale.paymentMethod === 'cash' ? 'default' : 'secondary'}>
                          {sale.paymentMethod.toUpperCase()}
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
                                <DialogTitle>Sale Details - #{sale.id}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="font-medium">Date:</p>
                                    <p>{sale.date.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Payment:</p>
                                    <p className="capitalize">{sale.paymentMethod}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="font-medium mb-2">Items:</p>
                                  <div className="space-y-2">
                                    {sale.items.map((item, index) => (
                                      <div key={index} className="flex justify-between text-sm bg-muted/50 p-2 rounded">
                                        <span>{item.product.name} × {item.quantity}</span>
                                        <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="border-t pt-4 space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>Subtotal:</span>
                                    <span>${(sale.subtotal || (sale.total - (sale.taxAmount || 0))).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Tax:</span>
                                    <span>${(sale.taxAmount || 0).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold">
                                    <span>Total:</span>
                                    <span>${sale.total.toFixed(2)}</span>
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
                                <AlertDialogTitle>Delete Sale</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete sale #{sale.id}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSale(sale.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
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
            <DialogTitle>Edit Sale - #{selectedSale?.id}</DialogTitle>
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
        <Label htmlFor="payment-method">Payment Method</Label>
        <select
          id="payment-method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full mt-1 p-2 border border-input rounded-md bg-background"
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
        </select>
      </div>
      
      <div>
        <Label htmlFor="total">Total Amount ($)</Label>
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
          Cancel
        </Button>
        <Button type="submit">
          Update Sale
        </Button>
      </div>
    </form>
  );
};

export default Reports;