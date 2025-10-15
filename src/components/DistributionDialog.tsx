import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { distributeStock } from '@/lib/distributeStock'

const distributionSchema = z.object({
  cashierId: z.string().min(1, 'Pilih kasir tujuan'),
  quantity: z.string().transform((val) => Number(val)),
})

interface DistributionDialogProps {
  isOpen: boolean
  onClose: () => void
  product: {
    id: string
    name: string
    sku: string
    storage_stock: number
  }
  onSuccess: () => void
}

export function DistributionDialog({
  isOpen,
  onClose,
  product,
  onSuccess
}: DistributionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cashiers, setCashiers] = useState<Array<{
    id: string
    email: string
    current_stock: number
  }>>([])

  const form = useForm({
    resolver: zodResolver(distributionSchema),
    defaultValues: {
      cashierId: '',
      quantity: '1',
    },
  })

  // Fetch cashiers when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchCashiers()
    }
  }, [isOpen])

  async function fetchCashiers() {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'cashier')

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal mengambil data kasir',
        variant: 'destructive',
      })
      return
    }

    // Get current stock for each cashier
    const cashiersWithStock = await Promise.all(
      users.map(async (user) => {
        const { data } = await supabase
          .from('cashier_stock')
          .select('quantity')
          .eq('product_id', product.id)
          .eq('cashier_id', user.id)
          .single()

        return {
          ...user,
          current_stock: data?.quantity || 0,
        }
      })
    )

    setCashiers(cashiersWithStock)
  }

  async function onSubmit(values: z.infer<typeof distributionSchema>) {
    try {
      setIsSubmitting(true)

      if (values.quantity > product.storage_stock) {
        toast({
          title: 'Error',
          description: 'Jumlah distribusi melebihi stok gudang',
          variant: 'destructive',
        })
        return
      }

      // Proses distribusi stok
      await distributeStock({
        productId: product.id,
        cashierId: values.cashierId,
        quantity: values.quantity,
      })

      toast({
        title: 'Sukses',
        description: 'Distribusi stok berhasil',
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memproses distribusi',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Distribusi Stok</DialogTitle>
          <DialogDescription>
            {product.name} ({product.sku})
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cashierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kasir Tujuan</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kasir" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cashiers.map((cashier) => (
                        <SelectItem
                          key={cashier.id}
                          value={cashier.id}
                        >
                          <div className="flex flex-col">
                            <span>{cashier.email}</span>
                            <span className="text-sm text-muted-foreground">
                              Stok: {cashier.current_stock}
                            </span>
                          </div>
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
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jumlah</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max={product.storage_stock}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    Stok gudang: {product.storage_stock}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Proses Distribusi
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}