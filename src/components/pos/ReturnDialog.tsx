import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { returnCashierStock } from "@/lib/api"

interface ReturnDialogProps {
  isOpen: boolean
  onClose: () => void
  product: {
    id: string
    name: string
    current_stock: number
  }
  cashierId: string
  onSuccess?: () => void
}

export function ReturnDialog({
  isOpen,
  onClose,
  product,
  cashierId,
  onSuccess
}: ReturnDialogProps) {
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleReturn = async () => {
    if (!quantity || quantity <= 0 || quantity > product.current_stock) {
      toast({
        title: "Error",
        description: "Jumlah return tidak valid",
        variant: "destructive"
      })
      return
    }

    if (!reason.trim()) {
      toast({
        title: "Error",
        description: "Alasan return harus diisi",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      await returnCashierStock(product.id, cashierId, quantity, reason)
      
      toast({
        title: "Berhasil",
        description: "Barang berhasil dikembalikan ke gudang"
      })
      
      onSuccess?.()
      onClose()
    } catch (error) {
      toast({
        title: "Gagal",
        description: error instanceof Error ? error.message : "Gagal mengembalikan barang",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return Barang: {product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Jumlah</label>
            <Input
              type="number"
              min={1}
              max={product.current_stock}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            />
            <p className="text-sm text-gray-500">
              Stok saat ini: {product.current_stock}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Alasan Return</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Masukkan alasan return"
              rows={3}
            />
          </div>

          <Button 
            onClick={handleReturn}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Memproses..." : "Return Barang"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}