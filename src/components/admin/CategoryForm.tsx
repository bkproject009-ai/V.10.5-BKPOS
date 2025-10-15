import { useState } from 'react'
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

// Form validation schema
const categorySchema = z.object({
  code: z.string().min(2, 'Kode minimal 2 karakter').max(50, 'Kode maksimal 50 karakter')
    .regex(/^[A-Z0-9]+$/, 'Kode harus huruf kapital dan angka'),
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

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: editData?.code || '',
      name: editData?.name || '',
      description: editData?.description || ''
    }
  })

  async function onSubmit(values: CategoryFormValues) {
    try {
      setIsLoading(true)

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

      if (error) throw error

      toast({
        title: 'Sukses',
        description: `Kategori berhasil ${editData ? 'diperbarui' : 'ditambahkan'}`
      })

      onOpenChange(false)
      form.reset()
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
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
            {editData ? 'Edit Kategori' : 'Tambah Kategori Baru'}
          </DialogTitle>
          {!editData && (
            <DialogDescription>
              Kode kategori akan digunakan untuk generate SKU produk secara otomatis
            </DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kode Kategori</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={!!editData}
                      placeholder="Contoh: FNB, ELC, FSH"
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
                  <FormLabel>Nama Kategori</FormLabel>
                  <FormControl>
                    <Input {...field} />
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