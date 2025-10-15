import { supabase } from './supabase'

export interface CreateCategoryInput {
  code: string
  name: string
  description?: string
}

export interface UpdateCategoryInput {
  id: string
  name: string
  description?: string
}

/**
 * Add a new category
 */
export async function addCategory(input: CreateCategoryInput) {
  try {
    // Validate code format
    if (!/^[A-Z0-9]+$/.test(input.code)) {
      throw new Error('Kode kategori hanya boleh berisi huruf kapital dan angka')
    }

    if (input.code.length < 2 || input.code.length > 4) {
      throw new Error('Panjang kode kategori harus 2-4 karakter')
    }

    const { data, error } = await supabase
      .from('categories')
      .insert(input)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Kode kategori sudah digunakan')
      }
      throw error
    }

    return data
  } catch (error: any) {
    throw new Error(`Gagal menambah kategori: ${error.message}`)
  }
}

/**
 * Update a category
 */
export async function updateCategory(input: UpdateCategoryInput) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update({
        name: input.name,
        description: input.description
      })
      .eq('id', input.id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error: any) {
    throw new Error(`Gagal mengupdate kategori: ${error.message}`)
  }
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string) {
  try {
    // Check if category has any products
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)

    if (count && count > 0) {
      throw new Error('Tidak bisa menghapus kategori yang masih memiliki produk')
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error: any) {
    throw new Error(`Gagal menghapus kategori: ${error.message}`)
  }
}

/**
 * List all categories
 */
export async function listCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select(`
      *,
      products:products (id)
    `)
    .order('name')

  if (error) throw error

  // Count products for each category
  return data.map(category => ({
    ...category,
    product_count: category.products?.length || 0
  }))
}

/**
 * Get category by ID
 */
export async function getCategory(id: string) {
  const { data, error } = await supabase
    .from('categories')
    .select()
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}