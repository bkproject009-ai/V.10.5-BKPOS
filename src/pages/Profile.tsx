import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserIcon, Mail, Shield } from "lucide-react";

interface ProfileProps {
  hideTitle?: boolean;
}

export default function Profile({ hideTitle = false }: ProfileProps) {
  const { user } = useAuth();
  
  // Fungsi untuk mengambil data user dari API menggunakan Supabase client
  const getUserData = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching user data:', error);
        return;
      }
      
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
    <div className={!hideTitle ? "container mx-auto py-8" : ""}>
      <div className={!hideTitle ? "max-w-2xl mx-auto" : ""}>
        {!hideTitle && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Profil</h2>
            <p className="text-sm text-muted-foreground">
              Informasi akun dan peran Anda
            </p>
          </div>
        )}
        
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
                <UserIcon className="mr-2 h-4 w-4" />
                Account ID
              </TableCell>
              <TableCell className="font-mono text-sm">
                {user.id}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}