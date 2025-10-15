import { supabase } from './supabase'
import type { PaymentDetails, QRISPayment } from './types/payment'

export async function processPayment(
  saleId: string,
  details: PaymentDetails
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('total, status')
      .eq('id', saleId)
      .single()

    if (saleError) throw saleError

    if (sale.status === 'completed') {
      return { success: false, error: 'Transaksi sudah selesai' }
    }

    // Handle cash payment
    if (details.method === 'cash') {
      if (details.amount < sale.total) {
        return { success: false, error: 'Jumlah pembayaran kurang' }
      }

      const { error: updateError } = await supabase
        .from('sales')
        .update({
          payment_method: 'cash',
          payment_details: {
            amount: details.amount,
            change: details.amount - sale.total
          },
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', saleId)

      if (updateError) throw updateError

      return { success: true }
    }

    // Handle QRIS payment
    if (details.method === 'qris') {
      const { error: updateError } = await supabase
        .from('sales')
        .update({
          payment_method: 'qris',
          payment_details: {
            qris_id: details.qris_id,
            amount: details.amount,
            status: details.qris_status
          },
          status: details.qris_status === 'success' ? 'completed' : 'pending',
          completed_at: details.qris_status === 'success' ? new Date().toISOString() : null
        })
        .eq('id', saleId)

      if (updateError) throw updateError

      return { success: true }
    }

    return { success: false, error: 'Metode pembayaran tidak valid' }
  } catch (error: any) {
    console.error('Error processing payment:', error)
    return { success: false, error: error.message }
  }
}

export async function createQRISPayment(
  saleId: string,
  amount: number
): Promise<QRISPayment | null> {
  try {
    // Generate a unique external ID for this transaction
    const externalId = `SALE-${saleId}-${Date.now()}`

    // TODO: Replace with actual QRIS provider API call
    // This is just a mock implementation
    const qrisPayment: QRISPayment = {
      id: `QRIS-${Date.now()}`,
      amount: amount,
      external_id: externalId,
      qr_string: 'DUMMY-QR-STRING', // This would come from QRIS provider
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60000).toISOString() // 15 minutes expiry
    }

    // Store QRIS payment details in database
    const { error } = await supabase
      .from('qris_payments')
      .insert({
        id: qrisPayment.id,
        sale_id: saleId,
        external_id: qrisPayment.external_id,
        amount: qrisPayment.amount,
        qr_string: qrisPayment.qr_string,
        status: qrisPayment.status,
        expires_at: qrisPayment.expires_at
      })

    if (error) throw error

    return qrisPayment
  } catch (error) {
    console.error('Error creating QRIS payment:', error)
    return null
  }
}

export async function checkQRISStatus(qrisId: string): Promise<'pending' | 'success' | 'failed'> {
  try {
    const { data, error } = await supabase
      .from('qris_payments')
      .select('status')
      .eq('id', qrisId)
      .single()

    if (error) throw error

    return data.status
  } catch (error) {
    console.error('Error checking QRIS status:', error)
    return 'failed'
  }
}