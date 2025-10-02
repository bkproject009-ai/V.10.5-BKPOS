import { createClient } from '@supabase/supabase-js';

describe('Authentication Tests', () => {
  const supabase = createClient(
    'https://ddcmuhwpanbatixdfpla.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkY211aHdwYW5iYXRpeGRmcGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3OTM5OTAsImV4cCI6MjA3NDM2OTk5MH0.LhFjSYP919XvFo2MzM7V4QquGOq3UhNuo6qfGy_fDCQ'
  );

  const timestamp = Date.now();
  const adminUser = {
    email: `admin_test_${timestamp}@test.com`,
    password: 'Admin123!@#',
    data: {
      role: 'admin'
    }
  };

  const regularUser = {
    email: `user_test_${timestamp}@test.com`,
    password: 'User123!@#',
    data: {
      role: 'user'
    }
  };

  describe('User Registration', () => {
    it('should register an admin user', async () => {
      const { data, error } = await supabase.auth.signUp(adminUser);
      
      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(adminUser.email);
      
      // Wait for registration to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    it('should register a regular user', async () => {
      const { data, error } = await supabase.auth.signUp(regularUser);
      
      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(regularUser.email);
      
      // Wait for registration to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    });
  });

  describe('User Authentication', () => {
    it('should login an admin user', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminUser.email,
        password: adminUser.password
      });
      
      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.session).toBeDefined();
      
      // Wait for auth to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    it('should login a regular user', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: regularUser.email,
        password: regularUser.password
      });
      
      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.session).toBeDefined();
      
      // Wait for auth to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    it('should sign out successfully', async () => {
      const { error } = await supabase.auth.signOut();
      expect(error).toBeNull();
      
      // Wait for sign out to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    });
  });
});