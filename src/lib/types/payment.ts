export type PaymentMethod = 'cash' | 'qris' | 'card'

export interface PaymentDetails {
  method: PaymentMethod
  amount: number
  change?: number
  qris_id?: string
  qris_status?: 'pending' | 'success' | 'failed'
  transaction_id?: string
}

export interface QRISPayment {
  id: string
  amount: number
  external_id: string
  qr_string: string
  status: 'pending' | 'success' | 'failed'
  created_at: string
  expires_at: string
}

export interface PaymentState {
  status: 'idle' | 'processing' | 'success' | 'failed'
  method?: PaymentMethod
  amount?: number
  change?: number
  qris_data?: QRISPayment
  error?: string
}