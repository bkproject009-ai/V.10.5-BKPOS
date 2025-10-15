import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { distributeStock } from "@/lib/api"

interface DistributeDialogProps {
  isOpen: boolean
  onClose: () => void
  product: {
    id: string
    name: string
    storage_stock: number
  }
  cashiers: Array<{
    id: string
    name: string
  }>
  onSuccess?: () => void
}

export function DistributeDialog({
  isOpen,
  onClose,
  product,
  cashiers,
  onSuccess
}: DistributeDialogProps) {
  const [selectedCashier, setSelectedCashier] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleDistribute = async () => {
    if (!selectedCashier) {
      toast({
        title: "Error",
        description: "Pilih kasir terlebih dahulu",
        variant: "destructive"
      })
      return
    }

    if (!quantity || quantity <= 0 || quantity > product.storage_stock) {
      toast({
        title: "Error",
        description: "Jumlah distribusi tidak valid",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      await distributeStock(product.id, selectedCashier, quantity)
      
      toast({
        title: "Berhasil",
        description: "Barang berhasil didistribusikan"
      })
      
      onSuccess?.()
      onClose()
    } catch (error) {
      toast({
        title: "Gagal",
        description: error instanceof Error ? error.message : "Gagal mendistribusikan barang",
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
          <DialogTitle>Distribusi Barang: {product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Pilih Kasir</label>
            <Select value={selectedCashier} onValueChange={setSelectedCashier}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kasir" />
              </SelectTrigger>
              <SelectContent>
                {cashiers.map(cashier => (
                  <SelectItem key={cashier.id} value={cashier.id}>
                    {cashier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Jumlah</label>
            <Input
              type="number"
              min={1}
              max={product.storage_stock}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            />
            <p className="text-sm text-gray-500">
              Stok gudang: {product.storage_stock}
            </p>
          </div>

          <Button
            onClick={handleDistribute}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Memproses..." : "Distribusi Barang"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}