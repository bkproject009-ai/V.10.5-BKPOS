import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  created_at: string;
}

const UserManagement = () => {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<string, string>>({});
  const [savingRole, setSavingRole] = useState<Record<string, boolean>>({});

  // Redirect if not admin
  if (!authLoading && (!user || user.user_metadata?.role !== 'admin')) {
    return <Navigate to="/" />;
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal memuat data pengguna.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      // Don't allow changing own role
      if (userId === user?.id) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Anda tidak dapat mengubah role Anda sendiri.',
        });
        return;
      }

      // Call the secure function to update user role
      const { data, error } = await supabase
        .rpc('update_user_role', {
          target_user_id: userId,
          new_role: newRole
        });

      if (error) {
        console.error('Error updating role:', error);
        throw new Error('Gagal mengubah role pengguna: ' + error.message);
      }

      if (!data || !data.success) {
        toast({
          variant: 'destructive',
          title: 'Gagal',
          description: data?.message || 'Tidak dapat mengubah role pengguna',
        });
        return;
      }

      toast({
        title: 'Sukses',
        description: data.message || 'Role pengguna berhasil diperbarui.',
      });

      // Refresh user list
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal memperbarui role pengguna.',
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Don't allow deleting own account
      if (userId === user?.id) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Anda tidak dapat menghapus akun Anda sendiri.',
        });
        return;
      }

      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      toast({
        title: 'Sukses',
        description: 'Pengguna berhasil dihapus.',
      });

      // Refresh user list
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal menghapus pengguna.',
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Manajemen Pengguna</h1>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Tidak ada data pengguna
                </TableCell>
              </TableRow>
            ) : (
              users.map((userData) => (
                <TableRow key={userData.id}>
                  <TableCell>{userData.username}</TableCell>
                  <TableCell>{userData.full_name}</TableCell>
                  <TableCell>{userData.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={pendingRoleChanges[userData.id] || userData.role}
                        onValueChange={(value) => {
                          setPendingRoleChanges({
                            ...pendingRoleChanges,
                            [userData.id]: value
                          });
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="cashier">Kasir</SelectItem>
                        </SelectContent>
                      </Select>
                      {pendingRoleChanges[userData.id] !== undefined && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={savingRole[userData.id]}
                          onClick={async () => {
                            setSavingRole({ ...savingRole, [userData.id]: true });
                            await updateUserRole(userData.id, pendingRoleChanges[userData.id]);
                            setSavingRole({ ...savingRole, [userData.id]: false });
                            // Clear the pending change after successful update
                            const newPendingChanges = { ...pendingRoleChanges };
                            delete newPendingChanges[userData.id];
                            setPendingRoleChanges(newPendingChanges);
                          }}
                        >
                          {savingRole[userData.id] ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={userData.id === user?.id}
                        >
                          Hapus
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Konfirmasi Hapus Pengguna</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          <p>Apakah Anda yakin ingin menghapus pengguna ini?</p>
                          <p className="font-semibold">{userData.email}</p>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="destructive"
                            onClick={() => deleteUser(userData.id)}
                          >
                            Hapus
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UserManagement;