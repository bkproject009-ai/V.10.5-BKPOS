import { supabase } from './supabase';

export async function ensureAdminRole(email: string) {
  try {
    // Get user data first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, email')
      .eq('email', email)
      .single();

    if (userError) {
      console.error('Error finding user:', userError);
      return { success: false, error: userError };
    }

    if (!userData) {
      return { success: false, error: 'User not found' };
    }

    // If user is already admin, return success
    if (userData.role === 'admin') {
      return { success: true, message: 'User is already an admin' };
    }

    // Update user role to admin
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', userData.id);

    if (updateError) {
      console.error('Error updating role:', updateError);
      return { success: false, error: updateError };
    }

    return { success: true, message: 'Successfully updated to admin role' };
  } catch (error) {
    console.error('Error in ensureAdminRole:', error);
    return { success: false, error };
  }
}