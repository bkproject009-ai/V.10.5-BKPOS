import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

interface DistributionHistory {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  cashier_id: string
  cashier_email: string
  quantity: number
  created_at: string
  created_by: string
  created_by_email: string
}

export function DistributionHistory() {
  const [history, setHistory] = useState<DistributionHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState({
    cashier: 'all',
    product: '',
    startDate: '',
    endDate: '',
  })
  const [cashiers, setCashiers] = useState<Array<{
    id: string
    email: string
  }>>([])

  useEffect(() => {
    fetchCashiers()
    fetchHistory()
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [filter])

  async function fetchCashiers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'cashier')

    if (!error && data) {
      setCashiers(data)
    }
  }

  async function fetchHistory() {
    try {
      setIsLoading(true)

      let query = supabase
        .from('stock_distribution')
        .select(`
          id,
          product_id,
          products (name, sku),
          cashier_id,
          users!cashier_id (email),
          quantity,
          created_at,
          created_by,
          created_by_users:users!created_by (email)
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filter.cashier !== 'all') {
        query = query.eq('cashier_id', filter.cashier)
      }

      if (filter.product) {
        query = query.textSearch('products.name', filter.product)
      }

      if (filter.startDate) {
        query = query.gte('created_at', filter.startDate)
      }

      if (filter.endDate) {
        query = query.lte('created_at', filter.endDate)
      }

      const { data, error } = await query

      if (error) throw error

      const formattedHistory = data.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.products.name,
        product_sku: item.products.sku,
        cashier_id: item.cashier_id,
        cashier_email: item.users.email,
        quantity: item.quantity,
        created_at: item.created_at,
        created_by: item.created_by,
        created_by_email: item.created_by_users.email,
      }))

      setHistory(formattedHistory)
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleFilterChange(key: keyof typeof filter, value: string) {
    setFilter(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Select
          value={filter.cashier}
          onValueChange={(value) => handleFilterChange('cashier', value)}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Pilih kasir" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kasir</SelectItem>
            {cashiers.map((cashier) => (
              <SelectItem key={cashier.id} value={cashier.id}>
                {cashier.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Cari produk..."
          value={filter.product}
          onChange={(e) => handleFilterChange('product', e.target.value)}
          className="w-full sm:w-[200px]"
        />

        <Input
          type="date"
          value={filter.startDate}
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
          className="w-full sm:w-[150px]"
        />

        <Input
          type="date"
          value={filter.endDate}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
          className="w-full sm:w-[150px]"
        />

        <Button
          variant="outline"
          onClick={() => {
            setFilter({
              cashier: 'all',
              product: '',
              startDate: '',
              endDate: '',
            })
          }}
        >
          Reset Filter
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Kasir</TableHead>
              <TableHead className="text-center">Jumlah</TableHead>
              <TableHead>Oleh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  Loading...
                </TableCell>
              </TableRow>
            ) : history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  Tidak ada data distribusi
                </TableCell>
              </TableRow>
            ) : (
              history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {format(new Date(item.created_at), 'dd MMMM yyyy HH:mm', { locale: id })}
                  </TableCell>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell>{item.product_sku}</TableCell>
                  <TableCell>{item.cashier_email}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell>{item.created_by_email}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}