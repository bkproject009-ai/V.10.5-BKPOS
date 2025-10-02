import { createClient } from '@supabase/supabase-js';

describe('Products', () => {
  const supabase = createClient(
    'https://ddcmuhwpanbatixdfpla.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkY211aHdwYW5iYXRpeGRmcGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3OTM5OTAsImV4cCI6MjA3NDM2OTk5MH0.LhFjSYP919XvFo2MzM7V4QquGOq3UhNuo6qfGy_fDCQ'
  );

  const timestamp = Date.now();
  const testUser = {
    email: `test_${timestamp}@test.com`,
    password: 'Test123!@#'
  };

  const testProduct = {
    name: `Test Product ${timestamp}`,
    description: 'Test Description',
    price: 9.99,
    stock: 100,
    category: 'test',
    sku: `TEST-${timestamp}`
  };

  let productId: string;
  let session: any;

  beforeAll(async () => {
    // Sign up and sign in as test user
    await supabase.auth.signUp(testUser);
    const { data } = await supabase.auth.signInWithPassword(testUser);
    session = data.session;
    // Wait for auth to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });

  describe('Product Operations', () => {
    it('should create a product', async () => {
      const { data: created, error: createError } = await supabase
        .from('products')
        .insert([testProduct])
        .select()
        .single();

      expect(createError).toBeNull();
      expect(created).toBeDefined();
      expect(created.name).toBe(testProduct.name);
      productId = created.id;
    });

    it('should read the created product', async () => {
      const { data: read, error: readError } = await supabase
        .from('products')
        .select()
        .eq('id', productId)
        .single();

      expect(readError).toBeNull();
      expect(read).toBeDefined();
      expect(read.name).toBe(testProduct.name);
    });

    it('should update the product', async () => {
      const newName = `Updated Product ${Date.now()}`;
      const { error: updateError } = await supabase
        .from('products')
        .update({ name: newName })
        .eq('id', productId);

      expect(updateError).toBeNull();

      // Verify update
      const { data: updated } = await supabase
        .from('products')
        .select()
        .eq('id', productId)
        .single();

      expect(updated.name).toBe(newName);
    });

    it('should delete the product', async () => {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      expect(deleteError).toBeNull();

      // Verify deletion
      const { data: deleted } = await supabase
        .from('products')
        .select()
        .eq('id', productId)
        .maybeSingle();

      expect(deleted).toBeNull();
    });
  });
});