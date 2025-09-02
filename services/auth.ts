import { apiClient } from '../utils/apiClient'
import { devAuthConfig } from '../utils/auth-dev-config'

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  const national = digits.replace(/^0+/, '')
  // If input already contains a leading +, assume it has country code
  if (input.startsWith('+')) return '+' + national
  // Fallback: assume already E.164-like
  return '+' + national
}

export const authService = {
  async sendOTP(phone: string, region?: string): Promise<{ success: boolean; otp?: string; error?: string }> {
    try {
      const normalized = normalizePhone(phone)
      devAuthConfig.log('sendOTP -> normalized', { phone, normalized, region })
      const data = await apiClient('/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized })
      })
      return { success: true, otp: (data && (data.otp as string | undefined)) }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to request OTP' }
    }
  },

  async verifyOTP(phone: string, otp: string, name?: string, isNewUser?: boolean): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
    try {
      const normalized = normalizePhone(phone)
      devAuthConfig.log('verifyOTP -> normalized', { phone, normalized, isNewUser, namePresent: Boolean(name) })
      const data = await apiClient('/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, otp })
      })
      return { success: true, token: data?.token, user: data?.user }
    } catch (e: any) {
      return { success: false, error: e?.message || 'OTP verification failed' }
    }
  }
}

