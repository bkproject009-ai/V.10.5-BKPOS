import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";

interface DesktopCartProps {
  cart: any[];
  subtotal: number;
  taxes: any[];
  total: number;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}

export const DesktopCart = ({
  cart,
  subtotal,
  taxes,
  total,
  onQuantityChange,
  onRemoveItem,
  onClear,
  onCheckout,
}: DesktopCartProps) => {
  return (
    <div className="hidden lg:flex flex-col space-y-4">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <span>Keranjang Belanja</span>
            </CardTitle>
            {cart.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClear}
              >
                Kosongkan
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
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
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onQuantityChange(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="h-3 w-3" />
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
                <Button 
                  className="w-full bg-gradient-to-r from-primary to-primary/80"
                  onClick={onCheckout}
                >
                  Bayar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};