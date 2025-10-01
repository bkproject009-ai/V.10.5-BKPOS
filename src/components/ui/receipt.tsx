import { CartItem } from "@/contexts/POSContext";
import { format } from "date-fns";
import { calculateItemTotal, formatToRupiah } from "@/lib/calculations";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { Printer } from "lucide-react";

interface ReceiptProps {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'qris';
  date: Date;
  receiptNumber?: string;
}

export function Receipt({ 
  items, 
  subtotal, 
  tax, 
  total, 
  paymentMethod, 
  date,
  receiptNumber = '-'
}: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    window.print();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Receipt</CardTitle>
        <Button 
          variant="outline" 
          size="icon"
          onClick={handlePrint}
          className="print-button"
        >
          <Printer className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div ref={receiptRef} className="receipt-content space-y-4 p-4 min-w-[300px]">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="font-bold text-xl">BK POS</h2>
            <p className="text-sm text-muted-foreground">
              Receipt #{receiptNumber}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(date, 'dd/MM/yyyy HH:mm')}
            </p>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="text-sm">
                <div className="flex justify-between">
                  <span>{item.product.name}</span>
                  <span>
                    {formatToRupiah(calculateItemTotal(item.product.price, item.quantity))}
                  </span>
                </div>
                <div className="text-muted-foreground text-xs">
                  {item.quantity} x @{formatToRupiah(item.product.price)}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatToRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pajak</span>
              <span>{formatToRupiah(tax)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{formatToRupiah(total)}</span>
            </div>
          </div>

          <Separator />

          {/* Payment Info */}
          <div className="text-sm">
            <div className="flex justify-between">
              <span>Payment Method</span>
              <span className="uppercase">{paymentMethod}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>Thank you for your purchase!</p>
            <p className="text-xs">Please keep this receipt for any returns</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}