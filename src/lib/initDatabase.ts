import { supabase } from './supabase';

export async function initializeDatabase() {
  // Check if tax_types table is empty
  const { data: existingTaxes, error: checkError } = await supabase
    .from('tax_types')
    .select('id')
    .limit(1);

  if (checkError) {
    console.error('Error checking tax_types:', checkError);
    return;
  }

  // If no tax types exist, create default ones
  if (!existingTaxes || existingTaxes.length === 0) {
    const { error: insertError } = await supabase
      .from('tax_types')
      .insert([
        {
          code: 'PPN',
          name: 'Pajak Pertambahan Nilai',
          description: 'PPN Indonesia',
          rate: 11.00,
          enabled: true
        }
      ]);

    if (insertError) {
      console.error('Error inserting default tax types:', insertError);
    } else {
      console.log('Successfully initialized default tax types');
    }
  }
}