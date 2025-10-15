import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { processPayment } from '@/lib/payment'
import type { PaymentState } from '@/lib/types/payment'

interface CashPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  saleId: string
  onSuccess: () => void
}

export function CashPaymentDialog({
  open,
  onOpenChange,
  total,
  saleId,
  onSuccess
}: CashPaymentDialogProps) {
  const [amount, setAmount] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  const change = amount ? Number(amount) - total : 0
  const isValid = amount && Number(amount) >= total

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isValid) {
      toast({
        title: 'Error',
        description: 'Jumlah pembayaran kurang',
        variant: 'destructive'
      })
      return
    }

    setIsProcessing(true)

    try {
      const result = await processPayment(saleId, {
        method: 'cash',
        amount: Number(amount),
        change
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: 'Sukses',
        description: 'Pembayaran berhasil diproses'
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pembayaran Tunai</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Total Belanja</Label>
            <div className="text-2xl font-bold">
              Rp {total.toLocaleString()}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Jumlah Dibayar</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min={total}
              step="1000"
              disabled={isProcessing}
            />
          </div>

          {amount && (
            <div className="space-y-2">
              <Label>Kembalian</Label>
              <div className={`text-2xl font-bold ${change < 0 ? 'text-red-500' : ''}`}>
                Rp {change.toLocaleString()}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              disabled={isProcessing}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isProcessing}
            >
              {isProcessing ? 'Memproses...' : 'Bayar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}