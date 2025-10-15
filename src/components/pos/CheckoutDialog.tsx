import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { completeSale } from "@/lib/api"
import { useState } from "react"

interface CheckoutDialogProps {
  isOpen: boolean
  onClose: () => void
  cart: any[]
  totals: {
    subtotal: number
    taxes: number
    total: number
  }
  onSuccess: (sale: any) => void
}

export function CheckoutDialog({ 
  isOpen, 
  onClose, 
  cart,
  totals,
  onSuccess 
}: CheckoutDialogProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePayment = async (method: 'cash' | 'qris') => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Keranjang kosong",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    try {
      const sale = await completeSale({
        items: cart,
        paymentMethod: method,
        subtotal: totals.subtotal,
        taxes: totals.taxes,
        total: totals.total
      })

      if (sale) {
        toast({
          title: "Pembayaran Berhasil",
          description: `Transaksi dengan ${method === 'cash' ? 'Tunai' : 'QRIS'} selesai`
        })
        onSuccess(sale)
        onClose()
      }
    } catch (error) {
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat memproses pembayaran",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pilih Metode Pembayaran</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4">
          <Button 
            size="lg"
            onClick={() => handlePayment('cash')}
            disabled={isProcessing}
          >
            Tunai
          </Button>
          <Button
            size="lg" 
            onClick={() => handlePayment('qris')}
            disabled={isProcessing}
          >
            QRIS
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}