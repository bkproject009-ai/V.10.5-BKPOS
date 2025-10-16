import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { isUserAdmin } from '@/lib/authUtils'

// Form validation schema
const categorySchema = z.object({
  code: z.string()
    .min(2, 'Kode minimal 2 karakter')
    .max(4, 'Kode maksimal 4 karakter')
    .regex(/^[A-Z0-9]+$/, 'Kode harus huruf kapital dan angka')
    .transform(val => val.toUpperCase()),
  name: z.string().min(1, 'Nama kategori wajib diisi'),
  description: z.string().optional()
})

type CategoryFormValues = z.infer<typeof categorySchema>

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: {
    code: string
    name: string
    description?: string
  }
  onSuccess?: () => void
}

export function CategoryForm({ open, onOpenChange, editData, onSuccess }: CategoryFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: editData?.code || '',
      name: editData?.name || '',
      description: editData?.description || ''
    }
  })

  useEffect(() => {
    const checkAdmin = async () => {
      const { isAdmin, error } = await isUserAdmin();
      
      console.log('Admin check result:', { isAdmin, error });
      
      if (!isAdmin) {
        toast({
          title: "Error",
          description: error || "Anda tidak memiliki akses admin",
          variant: "destructive"
        });
        onOpenChange(false);
      }
      setAdminChecked(true);
    };

    if (open && !adminChecked) {
      checkAdmin();
    }
  }, [open, adminChecked, onOpenChange]);

  async function onSubmit(values: CategoryFormValues) {
    try {
      setIsLoading(true)

      // Verify admin role first
      const { isAdmin, error: adminError } = await isUserAdmin();
      if (!isAdmin) {
        toast({
          title: "Error",
          description: adminError || "Hanya admin yang dapat menambah atau mengubah kategori",
          variant: "destructive"
        });
        return;
      }

      // Check if code already exists for new category
      if (!editData) {
        const { data: existingCategory, error: checkError } = await supabase
          .from('categories')
          .select('code')
          .eq('code', values.code)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking category:', checkError);
          toast({
            title: 'Error',
            description: 'Gagal memeriksa kode kategori',
            variant: 'destructive'
          })
          return
        }

        if (existingCategory) {
          toast({
            title: 'Error',
            description: `Kode kategori ${values.code} sudah digunakan`,
            variant: 'destructive'
          })
          return
        }
      }

      const { error } = editData
        ? await supabase
            .from('categories')
            .update({
              name: values.name,
              description: values.description
            })
            .eq('code', editData.code)
        : await supabase
            .from('categories')
            .insert({
              code: values.code,
              name: values.name,
              description: values.description
            })

      if (error) {
        console.error('Error saving category:', error);
        toast({
          title: 'Error',
          description: `Gagal menyimpan kategori: ${error.message}`,
          variant: 'destructive'
        })
        return
      }

      toast({
        title: 'Success',
        description: `Kategori berhasil ${editData ? 'diupdate' : 'ditambahkan'}`
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error in onSubmit:', error)
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat menyimpan kategori',
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
          <DialogTitle>{editData ? 'Edit' : 'Tambah'} Kategori</DialogTitle>
          <DialogDescription>
            {editData
              ? 'Edit detail kategori yang sudah ada.'
              : 'Tambahkan kategori baru untuk produk.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kode</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Masukkan kode kategori"
                      {...field}
                      disabled={!!editData || isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Masukkan nama kategori"
                      {...field}
                      disabled={isLoading}
                    />
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
                    <Textarea
                      placeholder="Masukkan deskripsi kategori (opsional)"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : editData ? 'Update' : 'Simpan'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}