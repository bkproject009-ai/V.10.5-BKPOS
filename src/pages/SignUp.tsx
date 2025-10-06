import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Progress } from '../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { InfoCircledIcon } from '@radix-ui/react-icons';



export default function SignUp() {
  const navigate = useNavigate();
  const { signUp, validatePassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: '',
    address: '',
    role: 'cashier',
    acceptTerms: false,
  });
  const [passwordScore, setPasswordScore] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);

  // Password strength indicator color
  const getScoreColor = (score: number) => {
    if (score <= 1) return 'bg-red-500';
    if (score <= 2) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Update password validation on change
  useEffect(() => {
    if (formData.password) {
      const validation = validatePassword(formData.password);
      setPasswordScore(validation.score);
      setPasswordFeedback(validation.feedback);
    } else {
      setPasswordScore(0);
      setPasswordFeedback([]);
    }
  }, [formData.password, validatePassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signUp(formData);
      navigate('/login', {
        state: {
          message: 'Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.'
        }
      });
    } catch (error: any) {
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[500px]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-center">
            Daftar Akun Baru
          </CardTitle>
          <CardDescription className="text-center">
            Lengkapi data diri Anda untuk mendaftar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                placeholder="Masukkan nama lengkap"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Nama Pengguna</Label>
              <Input
                id="username"
                placeholder="Masukkan nama pengguna untuk login"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Nomor Handphone</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="Contoh: 08123456789"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Input
                id="address"
                placeholder="Masukkan alamat lengkap"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contoh@gmail.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
              {formData.password && (
                <>
                  <Progress
                    value={(passwordScore / 2) * 100}
                    className={`h-2 ${getScoreColor(passwordScore)}`}
                  />
                  {passwordFeedback.length > 0 && (
                    <Alert>
                      <InfoCircledIcon className="h-4 w-4" />
                      <AlertTitle>Persyaratan Password</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc pl-4">
                          {passwordFeedback.map((feedback, index) => (
                            <li key={index}>{feedback}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
              />
              {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Password dan konfirmasi password tidak sama
                  </AlertDescription>
                </Alert>
              )}
            </div>



            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={formData.acceptTerms}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, acceptTerms: checked as boolean })
                }
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Saya menyetujui syarat dan ketentuan yang berlaku
              </label>
            </div>

          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? 'Mendaftar...' : 'Daftar'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => navigate('/login')}
          >
            Sudah punya akun? Login di sini
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}