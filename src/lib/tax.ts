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
  try {
    const { data, error } = await supabase
      .from('tax_types')
      .insert([taxType])
      .select()
      .single();

    if (error) {
      console.error('Error adding tax type:', error);
      throw new Error(`Failed to add tax type: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to create tax type or permission denied');
    }

    return data;
  } catch (error) {
    console.error('Error in addTaxType:', error);
    throw error;
  }
}

export async function updateTaxType(id: string, taxType: Partial<TaxType>): Promise<TaxType> {
  try {
    const { data, error } = await supabase
      .from('tax_types')
      .update(taxType)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tax type:', error);
      throw new Error(`Failed to update tax type: ${error.message}`);
    }

    if (!data) {
      throw new Error('Tax type not found or permission denied');
    }

    return data;
  } catch (error) {
    console.error('Error in updateTaxType:', error);
    throw error;
  }
}

export async function deleteTaxType(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('tax_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tax type:', error);
      throw new Error(`Failed to delete tax type: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteTaxType:', error);
    throw error;
  }
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