import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { QRCode } from 'react-qr-code'
import { Loader2 } from 'lucide-react'
import { createQRISPayment, processPayment, checkQRISStatus } from '@/lib/payment'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { formatPrice } from '@/lib/utils'

const cashPaymentSchema = z.object({
  amount: z.string().transform((val) => Number(val)),
})

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  saleId: string
  onPaymentComplete: () => void
}

export function PaymentDialog({
  open,
  onOpenChange,
  total,
  saleId,
  onPaymentComplete
}: PaymentDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [qrisData, setQrisData] = useState<{
    qrString: string
    externalId: string
  } | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending')

  const form = useForm({
    resolver: zodResolver(cashPaymentSchema),
    defaultValues: {
      amount: '0',
    },
  })

  async function handleCashPayment(values: z.infer<typeof cashPaymentSchema>) {
    try {
      setIsProcessing(true)
      
      if (values.amount < total) {
        toast({
          title: 'Error',
          description: 'Jumlah pembayaran kurang dari total pembelian',
          variant: 'destructive',
        })
        return
      }

      const change = values.amount - total
      
      // Call the payment completion callback
      onPaymentComplete('cash', {
        amount_received: values.amount,
        change: change
      })

      toast({
        title: 'Pembayaran Berhasil',
        description: `Kembalian: ${formatPrice(change)}`,
      })
      
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memproses pembayaran',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleQRISPayment() {
    try {
      setIsProcessing(true)
      
      // Generate QRIS using the payment API
      const qrisPayment = await createQRISPayment(saleId, total)
      
      if (!qrisPayment) {
        throw new Error('Gagal membuat pembayaran QRIS')
      }
      
      setQrisData({
        qrString: qrisPayment.qr_string,
        externalId: qrisPayment.external_id,
      })
      setPaymentStatus('pending')

      // Start polling payment status
      const pollInterval = setInterval(async () => {
        const status = await checkQRISStatus(qrisPayment.id)
        
        if (status === 'success') {
          clearInterval(pollInterval)
          setPaymentStatus('success')
          
          // Update sale with payment details
          await processPayment(saleId, {
            method: 'qris',
            amount: total,
            qris_id: qrisPayment.id,
            qris_status: status
          })
          
          onPaymentComplete()
          onOpenChange(false)
        } else if (status === 'failed') {
          clearInterval(pollInterval)
          setPaymentStatus('failed')
        }
      }, 3000)

      // Cleanup on dialog close
      return () => clearInterval(pollInterval)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal generate QRIS',
        variant: 'destructive',
      })
      setPaymentStatus('failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
          <DialogDescription>
            Pilih metode pembayaran dan masukkan jumlah yang diterima
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <p className="text-lg font-semibold">Total: {formatPrice(total)}</p>
        </div>

        <Tabs defaultValue="cash">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cash">Tunai</TabsTrigger>
            <TabsTrigger value="qris">QRIS</TabsTrigger>
          </TabsList>

          <TabsContent value="cash">
            <Card>
              <CardHeader>
                <CardTitle>Pembayaran Tunai</CardTitle>
                <CardDescription>
                  Masukkan jumlah uang yang diterima
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCashPayment)}>
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jumlah Diterima</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={total}
                              step="1000"
                              value={field.value || ''}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full mt-4"
                      disabled={isProcessing}
                    >
                      {isProcessing && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Proses Pembayaran
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qris">
            <Card>
              <CardHeader>
                <CardTitle>Pembayaran QRIS</CardTitle>
                <CardDescription>
                  Scan kode QR menggunakan aplikasi e-wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {isProcessing ? (
                  <div className="flex flex-col items-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="mt-2">Generating QR Code...</p>
                  </div>
                ) : qrisData ? (
                  <>
                    <QRCode value={qrisData.qrString} />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Transaction ID: {qrisData.externalId}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <p className="text-sm">
                        {paymentStatus === 'pending' && 'Menunggu pembayaran...'}
                        {paymentStatus === 'success' && 'Pembayaran berhasil!'}
                        {paymentStatus === 'failed' && 'Pembayaran gagal'}
                      </p>
                    </div>
                  </>
                ) : (
                  <Button onClick={handleQRISPayment} className="w-full">
                    Generate QR Code
                  </Button>
                )}
              </CardContent>
              {qrisData && (
                <CardFooter>
                  <Button
                    variant="outline"
                    onClick={() => setQrisData(null)}
                    className="w-full"
                  >
                    Generate Ulang
                  </Button>
                </CardFooter>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}