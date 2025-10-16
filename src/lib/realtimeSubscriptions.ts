import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabase';

type SubscriptionCallback = (payload: RealtimePostgresChangesPayload<any>) => void;

interface SubscriptionOptions {
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

export const subscribeToStock = (callback: SubscriptionCallback) => {
  return supabase
    .channel('stock_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cashier_stocks',
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'storage_stock',
      },
      callback
    )
    .subscribe();
};

export const subscribeToDistributions = (callback: SubscriptionCallback) => {
  return supabase
    .channel('distribution_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'stock_distributions',
      },
      callback
    )
    .subscribe();
};

export const subscribeToSales = (callback: SubscriptionCallback) => {
  return supabase
    .channel('sales_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sales',
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sale_items',
      },
      callback
    )
    .subscribe();
};

export const unsubscribeAll = async (channels: Array<ReturnType<typeof supabase.channel>>) => {
  await Promise.all(channels.map(channel => supabase.removeChannel(channel)));
};