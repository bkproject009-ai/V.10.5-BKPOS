import { supabase } from './lib/supabase';

async function clearAllUsers() {
  try {
    // First disable RLS temporarily
    const { error: rlsError } = await supabase.rpc('disable_rls');
    if (rlsError) throw rlsError;

    console.log('Starting user cleanup...');

    // Delete all users from the users table
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', ''); // Delete all records

    if (deleteError) {
      console.error('Error deleting users:', deleteError);
      throw deleteError;
    }

    console.log('Successfully deleted all users from the database');

    // Re-enable RLS
    const { error: enableRlsError } = await supabase.rpc('enable_rls');
    if (enableRlsError) throw enableRlsError;

    console.log('Cleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

clearAllUsers();