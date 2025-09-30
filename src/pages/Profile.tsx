import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Shield } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  
  // Fungsi untuk mengambil data user dari API
  const getUserData = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(
        `https://ddcmuhwpanbatixdfpla.supabase.co/rest/v1/users?select=*&id=eq.${user.id}`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      console.log('User Data:', data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Panggil fungsi saat komponen dimount
  useEffect(() => {
    getUserData();
  }, [user]);
  
  // Get user initials for avatar
  const getInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  // Function to format role text
  const formatRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Get role color based on user role
  const getRoleBadgeVariant = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'cashier':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!user) {
    return null;
  }

  const role = user.user_metadata?.role || 'user';

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Profile</CardTitle>
          <CardDescription>
            Your account information and current role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl">
                {getInitials(user.email || '')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{user.email?.split('@')[0]}</h2>
              <Badge variant={getRoleBadgeVariant(role)}>
                {formatRole(role)}
              </Badge>
            </div>
          </div>

          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium flex items-center">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </TableCell>
                <TableCell>{user.email}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium flex items-center">
                  <Shield className="mr-2 h-4 w-4" />
                  Role
                </TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(role)}>
                    {formatRole(role)}
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Account ID
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {user.id}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}