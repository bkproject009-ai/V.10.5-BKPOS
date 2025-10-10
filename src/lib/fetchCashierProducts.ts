import { supabase } from './supabase';
import type { Product } from '@/contexts/POSContext';

interface CashierProductResult {
    id: string;
    name: string;
    description: string | null;
    price: number;
    category: string;
    sku: string;
    cashier_stock: number;
    total_stock: number;
    last_distributed: string;
    distributed_by: string;
}

export async function fetchCashierProducts(): Promise<Product[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Tidak ada user yang login');

        const { data, error } = await supabase
            .rpc('get_cashier_products') as { data: CashierProductResult[] | null, error: any };

        if (error) throw error;

        // Transform the data to match the Product interface
        return (data || []).map(product => ({
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: Number(product.price),
            category: product.category,
            sku: product.sku,
            cashier_stock: { [user.id]: product.cashier_stock },
            total_stock: product.total_stock,
            storage_stock: 0, // Not relevant for cashier view
            last_distributed: product.last_distributed,
            distributed_by: product.distributed_by
        }));
    } catch (error) {
        console.error('Error fetching cashier products:', error);
        throw error;
    }
}