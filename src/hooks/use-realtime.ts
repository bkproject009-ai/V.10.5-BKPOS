import { useEffect, useState } from 'react';
import { subscribeToStock, subscribeToDistributions, subscribeToSales } from '@/lib/realtimeSubscriptions';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface RealtimeUpdatesProps {
  onStockUpdate?: () => void;
  onDistributionUpdate?: () => void;
  onSaleUpdate?: () => void;
}

export function useRealtimeUpdates({
  onStockUpdate,
  onDistributionUpdate,
  onSaleUpdate
}: RealtimeUpdatesProps) {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<RealtimeChannel[]>([]);

  useEffect(() => {
    // Subscribe to stock changes
    const stockChannel = subscribeToStock(async (payload) => {
      console.log('Stock update:', payload);
      if (payload.eventType === 'UPDATE') {
        toast({
          title: 'Perubahan Stok',
          description: 'Stok produk telah diperbarui'
        });
        onStockUpdate?.();
      }
    });

    // Subscribe to distribution changes
    const distributionsChannel = subscribeToDistributions(async (payload) => {
      console.log('Distribution update:', payload);
      if (payload.eventType === 'INSERT') {
        const { data: newDistribution } = await supabase
          .from('stock_distributions')
          .select('*, products(*)')
          .eq('id', payload.new.id)
          .single();

        if (newDistribution) {
          toast({
            title: 'Distribusi Stok Baru',
            description: `${newDistribution.quantity} ${newDistribution.products.name} telah didistribusikan`
          });
          onDistributionUpdate?.();
        }
      }
    });

    // Subscribe to sales changes
    const salesChannel = subscribeToSales(async (payload) => {
      console.log('Sales update:', payload);
      if (payload.eventType === 'INSERT' && payload.table === 'sales') {
        const { data: newSale } = await supabase
          .from('sales')
          .select('*, sale_items(*, products(*))')
          .eq('id', payload.new.id)
          .single();

        if (newSale) {
          toast({
            title: 'Penjualan Baru',
            description: `Transaksi baru senilai Rp ${newSale.total.toLocaleString()}`
          });
          onSaleUpdate?.();
        }
      }
    });

    setSubscriptions([stockChannel, distributionsChannel, salesChannel]);

    // Cleanup function
    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, []); // Empty dependency array means this runs once when component mounts

  return null;
}