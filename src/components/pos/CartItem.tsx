import { Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CartItemProps {
  item: {
    product: {
      id: string
      name: string
      price: number
    }
    quantity: number
  }
  onQuantityChange: (id: string, quantity: number) => void
  onRemove: (id: string) => void
}

export function CartItem({
  item,
  onQuantityChange,
  onRemove
}: CartItemProps) {
  const handleQuantityChange = (change: number) => {
    const newQuantity = item.quantity + change
    if (newQuantity <= 0) {
      onRemove(item.product.id)
      return
    }
    onQuantityChange(item.product.id, newQuantity)
  }

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex-1">
        <h3 className="font-medium">{item.product.name}</h3>
        <p className="text-sm text-gray-500">
          Rp {item.product.price.toLocaleString()}
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuantityChange(-1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        
        <span className="w-8 text-center">{item.quantity}</span>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuantityChange(1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}