import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { CategoryForm } from './CategoryForm';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export function CategoryTable() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category>();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) {
        throw error;
      }

      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengambil data kategori. Silakan coba lagi.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Hapus kategori ${category.name}?`)) return;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Sukses',
        description: 'Kategori berhasil dihapus'
      });

      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghapus kategori. Pastikan tidak ada produk yang menggunakan kategori ini.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Daftar Kategori</h2>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus size={16} className="mr-2" />
          Tambah Kategori
        </Button>
      </div>

      <CategoryForm
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={fetchCategories}
      />

      {editCategory && (
        <CategoryForm
          open={true}
          onOpenChange={() => setEditCategory(undefined)}
          editData={editCategory}
          onSuccess={fetchCategories}
        />
      )}

      <div className="rounded-md border">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Memuat data kategori...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Belum ada kategori
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.code}</TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{category.description || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setEditCategory(category)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(category)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}