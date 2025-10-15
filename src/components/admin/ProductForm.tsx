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
import { supabase } from '@/lib/supabase'

// Form validation schema
const productSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi'),
  description: z.string().optional(),
  price: z.string().transform((val) => Number(val)),
  storage_stock: z.string().transform((val) => Number(val)),
  category_id: z.string().min(1, 'Kategori wajib dipilih'),
  image: z.string().optional()
})

type ProductFormValues = z.infer<typeof productSchema>

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: {
    id: string
    name: string
    description?: string
    price: number
    storage_stock: number
    category_code: string // Keep for backward compatibility
    category_id?: string
    image?: string
  }
}

export function ProductForm({ open, onOpenChange, editData }: ProductFormProps) {
  const { refreshProducts } = usePOS()
  const [categories, setCategories] = useState<Array<{ id: string, code: string, name: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: editData?.name || '',
      description: editData?.description || '',
      price: editData?.price?.toString() || '',
      storage_stock: editData?.storage_stock?.toString() || '0',
      category_id: editData?.category_code || '', // Using old field for compatibility
      image: editData?.image || ''
    }
  })

  useEffect(() => {
    // Fetch categories on component mount
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, code, name')
        .order('name')
      
      if (error) {
        toast({
          title: 'Error',
          description: 'Gagal mengambil data kategori',
          variant: 'destructive'
        })
        return
      }

      setCategories(data || [])
    }

    fetchCategories()
  }, [])

  async function onSubmit(values: ProductFormValues) {
    try {
      setIsLoading(true)

      if (editData) {
        // Update existing product
        await updateProduct({
          id: editData.id,
          name: values.name,
          description: values.description,
          price: values.price,
          storage_stock: values.storage_stock,
          category_id: values.category_id,
          image: values.image
        })
        toast({
          title: 'Sukses',
          description: 'Produk berhasil diperbarui'
        })
      } else {
        // Add new product
        await addProduct({
          name: values.name,
          description: values.description,
          price: values.price,
          storage_stock: values.storage_stock,
          category_id: values.category_id,
          image: values.image
        })
        toast({
          title: 'Sukses',
          description: 'Produk berhasil ditambahkan'
        })
      }

      await refreshProducts()
      onOpenChange(false)
      form.reset()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan produk',
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="100"
                        {...field}
                      />
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
                      <Input
                        type="number"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Gambar</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}