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
import { ShoppingCart } from "lucide-react";

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

export function MobileCart({
  cart,
  subtotal,
  taxes,
  total,
  onQuantityChange,
  onRemoveItem,
  onClear,
  onCheckout,
}: MobileCartProps) {
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
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-auto space-y-3">
                  {cart.map(item => (
                    <div 
                      key={item.product.id} 
                      className="flex items-center justify-between p-4 border-b"
                    >
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
                          onClick={() => {
                            if (item.quantity > 1) {
                              onQuantityChange(item.product.id, item.quantity - 1);
                            } else {
                              onRemoveItem(item.product.id);
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center p-0"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const currentStock = item.product.cashier_stock ? 
                              Object.values(item.product.cashier_stock)[0] || 0 : 0;
                            if (item.quantity < currentStock) {
                              onQuantityChange(item.product.id, item.quantity + 1);
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center p-0"
                          disabled={item.quantity >= (item.product.cashier_stock ? 
                            Object.values(item.product.cashier_stock)[0] || 0 : 0)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-3 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>Rp {subtotal.toLocaleString()}</span>
                  </div>
                  {taxes.map((tax, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>Pajak</span>
                      <span>Rp {tax.taxAmount.toLocaleString()}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>Rp {total.toLocaleString()}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={onClear}
                    >
                      Hapus Semua
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={onCheckout}
                    >
                      Bayar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}