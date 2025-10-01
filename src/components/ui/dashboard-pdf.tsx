import { Card } from './card';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Package,
  ShoppingCart,
} from 'lucide-react';
import type { Product, Sale } from '@/contexts/POSContext';

interface DashboardPDFProps {
  sales: Sale[];
  products: Product[];
}

export const DashboardPDF = ({ sales, products }: DashboardPDFProps) => {
  // Calculate analytics
  const totalRevenue = Array.isArray(sales) ? sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0) : 0;
  const totalTransactions = Array.isArray(sales) ? sales.length : 0;
  const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  
  // Low stock products (stock < 10)
  const lowStockProducts = Array.isArray(products) ? products.filter(product => (Number(product.stock) || 0) < 10) : [];
  
  // Best selling products
  const productSales = new Map();
  if (Array.isArray(sales)) {
    sales.forEach(sale => {
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

  if (products.length > 0) {
    bestSellingProduct = products.reduce((best, product) => {
      const sales = productSales.get(product.id) || 0;
      const bestSales = productSales.get(best.id) || 0;
      return sales > bestSales ? product : best;
    }, products[0]);

    worstSellingProduct = products.reduce((worst, product) => {
      const sales = productSales.get(product.id) || 0;
      const worstSales = productSales.get(worst.id) || Infinity;
      return sales < worstSales ? product : worst;
    }, products[0]);
  }

  const stats = [
    {
      title: 'Total Pendapatan',
      value: `Rp${totalRevenue.toLocaleString('id-ID')}`,
      icon: DollarSign
    },
    {
      title: 'Total Transaksi',
      value: totalTransactions.toString(),
      icon: ShoppingCart
    },
    {
      title: 'Rata-rata Nilai Pesanan',
      value: `Rp${averageOrderValue.toLocaleString('id-ID')}`,
      icon: TrendingUp
    },
    {
      title: 'Total Produk',
      value: products.length.toString(),
      icon: Package
    }
  ];

  return (
    <div className="p-4 bg-white h-[277mm] w-[210mm] max-h-[277mm] overflow-hidden">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-1">Laporan Ringkasan Toko</h1>
        <p className="text-sm text-gray-500">Per Tanggal: {new Date().toLocaleDateString('id-ID')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{stat.title}</p>
                  <p className="text-lg font-bold mt-0.5">{stat.value}</p>
                </div>
                <div className="p-2 rounded-full bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Stock Warnings */}
        <div>
          <h2 className="text-base font-bold mb-2 flex items-center">
            <AlertTriangle className="h-4 w-4 text-warning mr-1" />
            Peringatan Stok Rendah
          </h2>
          {lowStockProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {lowStockProducts.slice(0, 5).map(product => (
                <div key={product.id} className="p-2 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-warning font-bold">{product.stock} tersisa</p>
                      <p className="text-sm text-gray-500">Rp{product.price.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </div>
              ))}
              {lowStockProducts.length > 5 && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  +{lowStockProducts.length - 5} produk lainnya dengan stok rendah
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Tidak ada produk dengan stok rendah</p>
          )}
        </div>

        {/* Best/Worst Selling Products */}
        <div>
          {bestSellingProduct && worstSellingProduct && (
            <>
              <h2 className="text-base font-bold mb-2">Performa Produk</h2>
              <div className="grid grid-cols-1 gap-2">
                <Card className="border p-3">
                  <h3 className="text-sm font-semibold mb-1">Produk Terlaris</h3>
                  <div>
                    <p className="font-medium">{bestSellingProduct.name}</p>
                    <p className="text-sm text-gray-500">SKU: {bestSellingProduct.sku}</p>
                    <p className="mt-2">Terjual: {productSales.get(bestSellingProduct.id) || 0} unit</p>
                  </div>
                </Card>
                <Card className="border p-3">
                  <h3 className="text-sm font-semibold mb-1">Produk Terendah</h3>
                  <div>
                    <p className="text-sm font-medium">{worstSellingProduct.name}</p>
                    <p className="text-xs text-gray-500">SKU: {worstSellingProduct.sku}</p>
                    <p className="mt-1 text-sm">Terjual: {productSales.get(worstSellingProduct.id) || 0} unit</p>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
