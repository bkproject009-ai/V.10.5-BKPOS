import { supabase } from './src/lib/supabase.ts';

async function clearAllUsers() {
  try {
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
    
    // Delete auth users if admin access is available
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (!authError && authUsers) {
        for (const user of authUsers.users) {
          await supabase.auth.admin.deleteUser(user.id);
        }
        console.log('Successfully deleted all auth users');
      }
    } catch (adminError) {
      console.log('Note: Could not delete auth users - requires admin access');
    }

    console.log('Cleanup completed!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

clearAllUsers();