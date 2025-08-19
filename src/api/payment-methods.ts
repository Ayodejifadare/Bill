export interface PaymentMethod {
  id: string;
  type: 'bank' | 'mobile_money';
  bank?: string;
  accountNumber?: string;
  accountName?: string;
  sortCode?: string;
  routingNumber?: string;
  accountType?: 'checking' | 'savings';
  provider?: string;
  phoneNumber?: string;
  isDefault: boolean;
}

const API_BASE = '/api/payment-methods';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = 'Payment method request failed';
    try {
      const data = await response.json();
      if (data?.error) {
        message = data.error;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return response.json();
}

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const res = await fetch(API_BASE);
  return handleResponse<PaymentMethod[]>(res);
}

export async function fetchUserPaymentMethods(
  userId: string
): Promise<PaymentMethod[]> {
  const res = await fetch(`/api/users/${userId}/payment-methods`);
  return handleResponse<PaymentMethod[]>(res);
}

export type CreatePaymentMethodPayload = Omit<PaymentMethod, 'id'>;

export async function createPaymentMethod(
  payload: CreatePaymentMethodPayload
): Promise<PaymentMethod> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<PaymentMethod>(res);
}

export async function updatePaymentMethod(
  id: string,
  payload: Partial<PaymentMethod>
): Promise<PaymentMethod> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<PaymentMethod>(res);
}

export async function deletePaymentMethod(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE'
  });
  await handleResponse(res);
}
