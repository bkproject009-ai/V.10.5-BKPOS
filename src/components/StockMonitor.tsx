import { useRealtimeUpdates } from '@/hooks/use-realtime';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface StockMonitorProps {
  onStockUpdate?: () => void;
}

interface StockItem {
  id: string;
  product_name: string;
  storage_stock: number;
  cashier_stock: number;
  last_updated: string;
}

export function StockMonitor({ onStockUpdate }: StockMonitorProps) {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchStockData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name as product_name,
          storage_stock,
          cashier_stocks (stock)
        `)
        .order('name');

      if (error) throw error;

      const formattedData = data.map(item => ({
        id: item.id,
        product_name: item.product_name,
        storage_stock: item.storage_stock,
        cashier_stock: item.cashier_stocks?.[0]?.stock || 0,
        last_updated: new Date().toISOString()
      }));

      setStockItems(formattedData);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data stok',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Setup real-time updates
  useRealtimeUpdates({
    onStockUpdate: () => {
      fetchStockData();
      onStockUpdate?.();
    }
  });

  // Initial fetch
  useEffect(() => {
    fetchStockData();
  }, []);

  if (isLoading) {
    return <div className="p-4 text-center">Memuat data stok...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Monitor Stok Realtime</h2>
        <Button onClick={fetchStockData} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>Stok Gudang</TableHead>
              <TableHead>Stok Kasir</TableHead>
              <TableHead>Terakhir Update</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.product_name}</TableCell>
                <TableCell>{item.storage_stock}</TableCell>
                <TableCell>{item.cashier_stock}</TableCell>
                <TableCell>
                  {new Date(item.last_updated).toLocaleString('id-ID')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}