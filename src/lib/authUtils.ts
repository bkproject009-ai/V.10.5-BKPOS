import { supabase } from './supabase';

export const isUserAdmin = async (): Promise<{ isAdmin: boolean; error?: string }> => {
  try {
    // Get current session and user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return { isAdmin: false, error: 'Error getting session' };
    }

    if (!session) {
      return { isAdmin: false, error: 'No active session' };
    }

    // Get user data with detailed error logging
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', session.user.id)
      .maybeSingle();

    console.log('Auth check response:', {
      session: {
        id: session.user.id,
        email: session.user.email
      },
      userData,
      dbError
    });

    if (dbError) {
      console.error('Database error details:', {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      });
      return { isAdmin: false, error: `Database error: ${dbError.message}` };
    }

    if (!userData) {
      console.error('No user data found for ID:', session.user.id);
      return { isAdmin: false, error: 'User data not found in database' };
    }

    const isAdmin = userData.role === 'admin';
    console.log('Admin check result:', {
      email: userData.email,
      role: userData.role,
      isAdmin
    });

    return { 
      isAdmin,
      error: isAdmin ? undefined : 'User is not an admin'
    };
  } catch (error) {
    console.error('Unexpected error in isUserAdmin:', error);
    return { 
      isAdmin: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};