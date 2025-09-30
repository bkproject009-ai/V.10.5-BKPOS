import { supabase } from './supabase';

export interface TaxType {
  id: string;
  code: string;
  name: string;
  description?: string;
  rate: number;
  enabled: boolean;
}

export interface SaleTax {
  id: string;
  saleId: string;
  taxTypeId: string;
  taxAmount: number;
}

export async function fetchTaxTypes(): Promise<TaxType[]> {
  try {
    const { data, error } = await supabase
      .from('tax_types')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tax types:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchTaxTypes:', error);
    throw error;
  }
}

export async function addTaxType(taxType: Omit<TaxType, 'id'>): Promise<TaxType> {
  const { data, error } = await supabase
    .from('tax_types')
    .insert([taxType])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTaxType(id: string, taxType: Partial<TaxType>): Promise<TaxType> {
  const { data, error } = await supabase
    .from('tax_types')
    .update(taxType)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTaxType(id: string): Promise<void> {
  const { error } = await supabase
    .from('tax_types')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function calculateTaxes(subtotal: number): Promise<{ taxes: SaleTax[], total: number }> {
  const { data: taxTypes, error } = await supabase
    .from('tax_types')
    .select('*')
    .eq('enabled', true);

  if (error) throw error;

  let total = subtotal;
  const taxes: SaleTax[] = [];

  taxTypes?.forEach(tax => {
    const taxAmount = (subtotal * tax.rate) / 100;
    total += taxAmount;
    taxes.push({
      id: '', // will be set by the database
      saleId: '', // will be set when saving
      taxTypeId: tax.id,
      taxAmount
    });
  });

  return { taxes, total };
}