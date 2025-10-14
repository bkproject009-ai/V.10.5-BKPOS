import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";

interface MobileCartProps {
  cart: any[];
  subtotal: number;
  taxes: any[];
  total: number;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}

export const MobileCart = ({
  cart,
  subtotal,
  taxes,
  total,
  onQuantityChange,
  onRemoveItem,
  onClear,
  onCheckout,
}: MobileCartProps) => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Sheet>
        <SheetTrigger asChild>
          <Button 
            className="rounded-full w-16 h-16 shadow-lg bg-gradient-to-r from-primary to-primary/80"
            size="icon"
          >
            <div className="relative">
              <ShoppingCart className="h-6 w-6 text-white" />
              {cart.length > 0 && (
                <Badge 
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground"
                  variant="destructive"
                >
                  {cart.length}
                </Badge>
              )}
            </div>
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col h-full w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <span>Keranjang Belanja</span>
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col mt-4">
            {cart.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Keranjang kosong</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto space-y-3">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Rp{item.product.price.toLocaleString('id-ID')} / pcs
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onQuantityChange(item.product.id, item.quantity - 1)}
                        >
                          <Minus size={12} />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onQuantityChange(item.product.id, item.quantity + 1)}
                        >
                          <Plus size={12} />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveItem(item.product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="mt-4 space-y-3 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>Rp{subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  {taxes.map(tax => (
                    <div key={tax.taxTypeId} className="flex justify-between text-sm">
                      <span>Pajak</span>
                      <span>Rp{tax.taxAmount.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>Rp{total.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={onClear}
                    >
                      Kosongkan
                    </Button>
                    <Button 
                      className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                      onClick={onCheckout}
                    >
                      Bayar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};