import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { createQRISPayment, checkQRISStatus, processPayment } from '@/lib/payment'
import type { QRISPayment } from '@/lib/types/payment'

interface QRISPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  saleId: string
  onSuccess: () => void
}

export function QRISPaymentDialog({
  open,
  onOpenChange,
  total,
  saleId,
  onSuccess
}: QRISPaymentDialogProps) {
  const [qrisData, setQrisData] = useState<QRISPayment | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'waiting' | 'success' | 'failed'>('idle')
  const [timer, setTimer] = useState<number>(900) // 15 minutes in seconds

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (open && status === 'idle') {
      generateQR()
    }

    // Start timer when waiting for payment
    if (status === 'waiting' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [open, status, timer])

  useEffect(() => {
    let interval: NodeJS.Timeout

    // Check QRIS status every 5 seconds while waiting
    if (status === 'waiting' && qrisData) {
      interval = setInterval(async () => {
        const currentStatus = await checkQRISStatus(qrisData.id)
        
        if (currentStatus === 'success') {
          handlePaymentSuccess()
        } else if (currentStatus === 'failed') {
          setStatus('failed')
          toast({
            title: 'Pembayaran Gagal',
            description: 'Silakan coba lagi',
            variant: 'destructive'
          })
        }
      }, 5000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [status, qrisData])

  const generateQR = async () => {
    setStatus('loading')

    const qrisPayment = await createQRISPayment(saleId, total)

    if (qrisPayment) {
      setQrisData(qrisPayment)
      setStatus('waiting')
    } else {
      setStatus('failed')
      toast({
        title: 'Error',
        description: 'Gagal membuat QR Code',
        variant: 'destructive'
      })
    }
  }

  const handlePaymentSuccess = async () => {
    if (!qrisData) return

    const result = await processPayment(saleId, {
      method: 'qris',
      amount: total,
      qris_id: qrisData.id,
      qris_status: 'success'
    })

    if (result.success) {
      setStatus('success')
      toast({
        title: 'Sukses',
        description: 'Pembayaran berhasil'
      })
      onSuccess()
      onOpenChange(false)
    } else {
      setStatus('failed')
      toast({
        title: 'Error',
        description: result.error || 'Gagal memproses pembayaran',
        variant: 'destructive'
      })
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pembayaran QRIS</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Pembayaran</div>
            <div className="text-2xl font-bold">
              Rp {total.toLocaleString()}
            </div>
          </div>

          <div className="flex flex-col items-center space-y-4">
            {status === 'loading' && (
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Generating QR Code...</p>
              </div>
            )}

            {status === 'waiting' && qrisData && (
              <>
                <div className="relative w-64 h-64 border-2 border-dashed rounded-lg p-2">
                  {/* Replace this with actual QR code image */}
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    QR Code Here
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Scan QR code menggunakan aplikasi e-wallet Anda
                  </p>
                  <p className="text-sm font-medium">
                    Kode berlaku: {formatTime(timer)}
                  </p>
                </div>
              </>
            )}

            {status === 'failed' && (
              <div className="text-center space-y-2">
                <p className="text-red-500">Pembayaran gagal</p>
                <Button onClick={generateQR}>
                  Generate Ulang QR
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}