import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Mail, AlertCircle, CheckCircle2, ArrowRight, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function EmailConfirmation() {
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const email = sessionStorage.getItem("pendingConfirmationEmail");

  const handleResendEmail = async () => {
    try {
      setIsResending(true);
      // Simulasi pengiriman ulang email (ganti dengan API call yang sebenarnya)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Email Verifikasi Terkirim",
        description: "Silakan periksa kotak masuk email Anda",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal Mengirim Email",
        description: "Terjadi kesalahan. Silakan coba lagi nanti.",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Verify Your Email
          </CardTitle>
          <CardDescription>
            Please check your email to complete registration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="default">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Email Verification Required</AlertTitle>
            <AlertDescription>
              Your account has been created, but needs to be verified before you can log in.
            </AlertDescription>
          </Alert>

          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Email Address</TableCell>
                <TableCell>{email}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Status</TableCell>
                <TableCell className="text-orange-500 font-medium">Pending Verification</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Next Steps</TableCell>
                <TableCell>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Check your email inbox</li>
                    <li>Click the verification link</li>
                    <li>Return here to log in</li>
                  </ol>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button 
                variant="default" 
                className="flex-1"
                onClick={() => {
                  const emailDomain = email?.split('@')[1];
                  if (emailDomain) {
                    window.open(`https://${emailDomain}`, '_blank');
                  }
                }}
              >
                <Mail className="mr-2 h-4 w-4" />
                Buka Email
              </Button>

              <Button
                variant="outline"
                disabled={isResending}
                onClick={handleResendEmail}
              >
                <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <Alert className="bg-muted border-primary/50">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Sudah memverifikasi email? Klik tombol di bawah untuk login
              </AlertDescription>
            </Alert>
            
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Kembali ke Login
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>Butuh bantuan? Hubungi support kami di</p>
              <a 
                href="mailto:support@bkpos.com" 
                className="text-primary hover:text-primary/80"
              >
                support@bkpos.com
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}