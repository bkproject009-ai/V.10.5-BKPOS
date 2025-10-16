import { supabase } from './supabase'

export interface CreateProductInput {
  name: string
  price: number
  storage_stock: number
  category_id: string
  description?: string
  image?: string
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string
}

/**
 * Generate SKU based on category code
 */
async function generateSKU(categoryCode: string): Promise<string> {
  const { data, error } = await supabase
    .rpc('generate_sku', { p_category_code: categoryCode })
    
  if (error) throw error
  return data
}

/**
 * Add a new product
 */
export async function addProduct(input: CreateProductInput) {
  try {
    // Insert product with null SKU to trigger automatic generation
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...input,
        sku: null, // This will trigger the automatic SKU generation
        sku,
        category_code: category.code,
        stock: input.storage_stock, // Initial total stock equals storage stock
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error: any) {
    throw new Error(`Gagal menambah produk: ${error.message}`)
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(input: UpdateProductInput) {
  try {
    let updateData: any = { ...input }
    delete updateData.id // Remove id from update data

    // If category_id changes, update category_code
    if (input.category_id) {
      const { data: category } = await supabase
        .from('categories')
        .select('code')
        .eq('id', input.category_id)
        .single()

      if (!category) {
        throw new Error('Kategori tidak ditemukan')
      }

      updateData.category_code = category.code
    }

    // If storage_stock changes, update total stock
    if (typeof input.storage_stock === 'number') {
      const { data: currentProduct } = await supabase
        .from('products')
        .select('storage_stock, stock')
        .eq('id', input.id)
        .single()

      if (currentProduct) {
        const stockDiff = input.storage_stock - currentProduct.storage_stock
        updateData.stock = currentProduct.stock + stockDiff
      }
    }

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', input.id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error: any) {
    throw new Error(`Gagal mengupdate produk: ${error.message}`)
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string) {
  try {
    // Check if product has any sales
    const { count: salesCount } = await supabase
      .from('sale_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)

    if (salesCount && salesCount > 0) {
      throw new Error('Tidak bisa menghapus produk yang sudah memiliki transaksi')
    }

    // Check if product has any stock with cashiers
    const { count: stockCount } = await supabase
      .from('cashier_stock')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)

    if (stockCount && stockCount > 0) {
      throw new Error('Tidak bisa menghapus produk yang masih memiliki stok di kasir')
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error: any) {
    throw new Error(`Gagal menghapus produk: ${error.message}`)
  }
}

/**
 * Get product by ID
 */
export async function getProduct(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories (
        id,
        code,
        name
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * List all products with optional filters
 */
export async function listProducts(filters?: {
  categoryId?: string
  search?: string
  inStock?: boolean
}) {
  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories (
        id,
        code,
        name
      ),
      cashier_stock (
        cashier_id,
        stock
      )
    `)

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId)
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
  }

  if (filters?.inStock) {
    query = query.gt('stock', 0)
  }

  const { data, error } = await query.order('name')

  if (error) throw error
  return data
}