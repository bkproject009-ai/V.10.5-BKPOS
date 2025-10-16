import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface SubscriptionOptions {
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

export const subscribeToTable = (
  tableName: string,
  callback: (payload: any) => void,
  options: SubscriptionOptions = {}
): RealtimeChannel => {
  const { event = '*', filter } = options;

  let channel = supabase
    .channel(`${tableName}_changes`)
    .on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table: tableName,
        filter
      },
      (payload) => {
        console.log(`Real-time update from ${tableName}:`, payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log(`Subscription status for ${tableName}:`, status);
    });

  return channel;
};

export const unsubscribe = async (channel: RealtimeChannel) => {
  await supabase.removeChannel(channel);
};