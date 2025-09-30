import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cashier');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Handle sign up
        try {
          await signUp(email, password, role);
          sessionStorage.setItem("pendingConfirmationEmail", email);
          toast({
            title: "Account Created",
            description: "Please check your email to verify your account.",
            variant: "default",
          });
          navigate('/email-confirmation');
        } catch (error: any) {
          if (error.message?.includes('already registered')) {
            toast({
              variant: "destructive",
              title: "Registration Failed",
              description: "This email is already registered. Please try logging in instead.",
            });
          } else {
            throw error;
          }
        }
      } else {
        // Handle sign in
        try {
          await signIn(email, password);
          navigate('/');
        } catch (error: any) {
          console.error('Sign in error:', error);
          if (error.message?.includes('Email not confirmed')) {
            sessionStorage.setItem("pendingConfirmationEmail", email);
            toast({
              title: "Verification Required",
              description: "Your email needs to be verified. Redirecting to verification page.",
            });
            navigate('/email-confirmation');
          } else if (error.message?.includes('Invalid login credentials')) {
            toast({
              variant: "destructive",
              title: "Login Failed",
              description: "Please check your email and password.",
            });
          } else {
            throw error;
          }
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Create Account' : 'Welcome Back'}</CardTitle>
          <CardDescription>
            {isSignUp ? 'Sign up for a new account' : 'Sign in to your account to continue'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {isSignUp && (
              <div className="space-y-2">
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading 
                ? (isSignUp ? 'Creating account...' : 'Signing in...') 
                : (isSignUp ? 'Create Account' : 'Sign In')}
            </Button>
            <div className="text-center">
              <Button 
                variant="link" 
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setEmail('');
                  setPassword('');
                }}
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : 'Need an account? Sign up'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}