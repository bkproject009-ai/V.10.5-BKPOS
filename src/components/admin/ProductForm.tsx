import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { usePOS } from '@/contexts/POSContext'
import { toast } from '@/hooks/use-toast'
import { addProduct, updateProduct } from '@/lib/productManagement'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const productSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi'),
  description: z.string().optional(),
  price: z.string().transform((val) => Number(val)),
  storage_stock: z.string().transform((val) => Number(val)),
  category_id: z.string().min(1, 'Kategori wajib dipilih'),
  sku: z.string().min(1, 'SKU wajib diisi'),
  image: z.string().optional()
})

type ProductFormValues = z.infer<typeof productSchema>

interface Category {
  id: string;
  code: string;
  name: string;
}

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: {
    id: string;
    name: string;
    description?: string;
    price: number;
    storage_stock: number;
    category_id?: string;
    sku: string;
    image?: string;
  };
}

export function ProductForm({ open, onOpenChange, editData }: ProductFormProps) {
  const { refreshProducts } = usePOS()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingCategories, setIsFetchingCategories] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [nextSku, setNextSku] = useState<string>('')

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: editData?.name || '',
      description: editData?.description || '',
      price: editData?.price?.toString() || '',
      storage_stock: editData?.storage_stock?.toString() || '0',
      category_id: editData?.category_id || '',
      sku: editData?.sku || '',
      image: editData?.image || ''
    }
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      console.log('Fetching categories...')
      setIsFetchingCategories(true)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error

      console.log('Categories fetched:', data)
      setCategories(data || [])

      if (editData?.category_id) {
        const category = data?.find(c => c.id === editData.category_id)
        if (category) {
          console.log('Setting initial category:', category)
          setSelectedCategory(category)
          form.setValue('category_id', category.id)
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast({
        title: 'Error',
        description: 'Gagal memuat data kategori',
        variant: 'destructive'
      })
    } finally {
      setIsFetchingCategories(false)
    }
  }

  const generateNextSku = async (categoryId: string) => {
    try {
      const category = categories.find(c => c.id === categoryId)
      if (!category) return

      const { data: products } = await supabase
        .from('products')
        .select('sku')
        .ilike('sku', `${category.code}%`)
        .order('sku', { ascending: false })
        .limit(1)

      let nextNumber = 1
      if (products && products.length > 0) {
        const lastSku = products[0].sku
        const lastNumber = parseInt(lastSku.replace(category.code, ''))
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1
        }
      }

      const newSku = `${category.code}${String(nextNumber).padStart(4, '0')}`
      setNextSku(newSku)
      form.setValue('sku', newSku)
    } catch (error) {
      console.error('Error generating SKU:', error)
    }
  }

  const handleCategoryChange = async (categoryId: string) => {
    console.log('Category changed:', categoryId, 'Available categories:', categories)
    const category = categories.find(c => c.id === categoryId)
    if (category) {
      console.log('Found category:', category)
      setSelectedCategory(category)
      form.setValue('category_id', categoryId)
      if (!editData) {
        await generateNextSku(categoryId)
      }
    }
  }

  const onSubmit = async (values: ProductFormValues) => {
    try {
      setIsLoading(true)

      // Check admin role first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userData?.role !== 'admin') {
        throw new Error('Unauthorized')
      }

      if (editData) {
        await updateProduct(editData.id, values)
      } else {
        await addProduct(values)
      }

      toast({
        title: 'Sukses',
        description: `Produk berhasil ${editData ? 'diperbarui' : 'ditambahkan'}`
      })

      refreshProducts()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving product:', error)
      toast({
        title: 'Error',
        description: 'Gagal menyimpan produk',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editData ? 'Edit Produk' : 'Tambah Produk Baru'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Produk</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => {
                console.log('Rendering category field:', { 
                  value: field.value,
                  categories: categories,
                  isFetching: isFetchingCategories 
                })
                return (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select
                      disabled={isFetchingCategories}
                      onValueChange={(value) => {
                        console.log('Category selected:', value)
                        field.onChange(value)
                        handleCategoryChange(value)
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue 
                            placeholder={
                              isFetchingCategories 
                                ? "Memuat kategori..." 
                                : categories.length === 0 
                                  ? "Tidak ada kategori" 
                                  : "Pilih kategori"
                            } 
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem 
                            key={category.id} 
                            value={category.id}
                          >
                            {category.name} ({category.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={!editData && !!selectedCategory}
                      placeholder={nextSku || 'Pilih kategori dahulu'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Harga</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="storage_stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stok Gudang</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading || isFetchingCategories}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editData ? 'Update Produk' : 'Tambah Produk'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}