import { usePOS } from '@/contexts/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download,
  TrendingUp,
  DollarSign,
  Package,
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Reports = () => {
  const { state } = usePOS();

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
    </div>
  );
};

export default Reports;