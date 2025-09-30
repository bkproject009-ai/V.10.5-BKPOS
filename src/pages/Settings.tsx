import React, { useState, useEffect } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Percent, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import * as tax from '@/lib/tax';
import type { TaxType } from '@/lib/tax';

const Settings = () => {
  const { state } = usePOS();
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTaxTypes();
  }, []);

  const loadTaxTypes = async () => {
    setIsLoading(true);
    try {
      const { data: { session }} = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Please sign in to access settings",
          variant: "destructive"
        });
        return;
      }

      const types = await tax.fetchTaxTypes();
      if (Array.isArray(types)) {
        setTaxTypes(types);
        if (types.length > 0) {
          toast({
            description: `${types.length} tax type(s) loaded successfully`
          });
        } else {
          toast({
            title: "Warning",
            description: "No tax types found. Creating default tax types...",
            variant: "warning"
          });
        }
      }
    } catch (error: any) {
      console.error('Error loading tax types:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load tax settings. Please check the database connection.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaxToggle = async (id: string, enabled: boolean) => {
    try {
      await tax.updateTaxType(id, { enabled });
      setTaxTypes(prev => prev.map(t => 
        t.id === id ? { ...t, enabled } : t
      ));
      toast({
        title: "Sukses",
        description: `Pajak berhasil ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengubah status pajak",
        variant: "destructive"
      });
    }
  };

  const handleUpdateTax = async (id: string, updates: Partial<TaxType>) => {
    try {
      const updatedTax = await tax.updateTaxType(id, updates);
      setTaxTypes(prev => prev.map(t => 
        t.id === id ? { ...t, ...updatedTax } : t
      ));
      toast({
        title: "Sukses",
        description: "Data pajak berhasil diperbarui",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memperbarui data pajak",
        variant: "destructive"
      });
    }
  };

  const handleAddTax = async () => {
    const newTax = {
      code: '',
      name: 'Pajak Baru',
      description: '',
      rate: 0,
      enabled: false
    };

    try {
      const addedTax = await tax.addTaxType(newTax);
      setTaxTypes(prev => [...prev, addedTax]);
      toast({
        title: "Sukses",
        description: "Pajak baru berhasil ditambahkan",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menambahkan pajak baru",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTax = async (id: string) => {
    try {
      await tax.deleteTaxType(id);
      setTaxTypes(prev => prev.filter(t => t.id !== id));
      toast({
        title: "Sukses",
        description: "Pajak berhasil dihapus",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus pajak",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="bg-primary/10 p-3 rounded-full">
          <SettingsIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Configure your POS system preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Settings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Percent className="h-5 w-5 text-primary" />
              <span>Konfigurasi Pajak</span>
            </CardTitle>
            <Button size="sm" onClick={handleAddTax}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pajak
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {taxTypes.map((taxType) => (
              <div key={taxType.id} className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">
                      {taxType.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {taxType.description || 'Tidak ada deskripsi'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={taxType.enabled}
                      onCheckedChange={(checked) => handleTaxToggle(taxType.id, checked)}
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteTax(taxType.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`code-${taxType.id}`}>Kode Pajak</Label>
                    <Input
                      id={`code-${taxType.id}`}
                      value={taxType.code}
                      onChange={(e) => handleUpdateTax(taxType.id, { code: e.target.value })}
                      placeholder="cth: PPN"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`name-${taxType.id}`}>Nama Pajak</Label>
                    <Input
                      id={`name-${taxType.id}`}
                      value={taxType.name}
                      onChange={(e) => handleUpdateTax(taxType.id, { name: e.target.value })}
                      placeholder="cth: Pajak Pertambahan Nilai"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`rate-${taxType.id}`}>Persentase (%)</Label>
                  <div className="relative mt-1">
                    <Input
                      id={`rate-${taxType.id}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={taxType.rate}
                      onChange={(e) => handleUpdateTax(taxType.id, { rate: parseFloat(e.target.value) })}
                      placeholder="0.00"
                      className="pr-8"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor={`desc-${taxType.id}`}>Deskripsi</Label>
                  <Input
                    id={`desc-${taxType.id}`}
                    value={taxType.description || ''}
                    onChange={(e) => handleUpdateTax(taxType.id, { description: e.target.value })}
                    placeholder="Deskripsi optional"
                    className="mt-1"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Sistem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Total Produk:</span>
                <span className="font-medium">{state.products.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Total Penjualan:</span>
                <span className="font-medium">{state.sales.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Total Jenis Pajak:</span>
                <span className="font-medium">{taxTypes.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Pajak Aktif:</span>
                <span className="font-medium text-success">
                  {taxTypes.filter(t => t.enabled).length} dari {taxTypes.length}
                </span>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Ringkasan Pajak</h4>
              <div className="space-y-2 text-sm">
                {taxTypes.filter(t => t.enabled).map(tax => (
                  <div key={tax.id} className="flex justify-between">
                    <span>{tax.name}:</span>
                    <span className="font-medium">{tax.rate}%</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between text-sm">
                    <span>Contoh pada Rp100.000:</span>
                    <span className="font-medium">
                      Rp{(100000 * (1 + taxTypes.filter(t => t.enabled).reduce((sum, t) => sum + (t.rate / 100), 0))).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-accent/10 p-4 rounded-lg">
              <h4 className="font-medium text-accent mb-2">Statistik Cepat</h4>
              <div className="text-sm space-y-1">
                <p>Produk Stok Rendah: {state.products.filter(p => p.stock < 10).length}</p>
                <p>Habis Stok: {state.products.filter(p => p.stock === 0).length}</p>
                <p>Total Pendapatan: Rp{state.sales.reduce((sum, sale) => sum + sale.total, 0).toLocaleString('id-ID')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;