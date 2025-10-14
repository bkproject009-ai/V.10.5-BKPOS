import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Show success message if redirected from signup
  const message = location.state?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error.message?.includes('Email not confirmed')) {
        sessionStorage.setItem("pendingConfirmationEmail", email);
        toast({
          title: "Verifikasi Diperlukan",
          description: "Email Anda perlu diverifikasi. Mengalihkan ke halaman verifikasi.",
        });
        navigate('/email-confirmation');
      } else if (error.message?.includes('Invalid login credentials')) {
        toast({
          variant: "destructive",
          title: "Login Gagal",
          description: "Mohon periksa email dan password Anda.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Terjadi kesalahan. Silakan coba lagi nanti.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[400px]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-center">Selamat Datang</CardTitle>
          <CardDescription className="text-center">
            Login ke akun Anda untuk melanjutkan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert className="mb-4">
              <InfoCircledIcon className="h-4 w-4" />
              <AlertTitle>Info</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email atau Nama Pengguna</Label>
              <Input
                id="email"
                placeholder="Email atau nama pengguna"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  placeholder="Masukkan password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Masuk...' : 'Masuk'}
            </Button>
            <div className="flex flex-col space-y-2 mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/signup')}
                className="w-full"
              >
                Belum punya akun? Daftar di sini
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}