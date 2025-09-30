import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Mail, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

export default function EmailConfirmation() {
  const navigate = useNavigate();
  const email = sessionStorage.getItem("pendingConfirmationEmail");

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
            <Button 
              variant="default" 
              className="w-full"
              onClick={() => {
                const emailDomain = email?.split('@')[1];
                if (emailDomain) {
                  window.open(`https://${emailDomain}`, '_blank');
                }
              }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Open Email Provider
            </Button>

            <Alert className="bg-muted">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Already verified your email? Click below to login
              </AlertDescription>
            </Alert>
            
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Return to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}