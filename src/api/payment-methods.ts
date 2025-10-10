import { apiClient } from "../../utils/apiClient";

export interface PaymentMethod {
  id: string;
  type: "bank" | "mobile_money";
  bank?: string;
  accountNumber?: string;
  accountName?: string;
  sortCode?: string;
  routingNumber?: string;
  accountType?: "checking" | "savings";
  provider?: string;
  phoneNumber?: string;
  isDefault: boolean;
}

const API_BASE = "/api/payment-methods";

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const data = await apiClient(API_BASE);
  return Array.isArray(data) ? data : data.paymentMethods;
}

export async function fetchUserPaymentMethods(
  userId: string,
): Promise<PaymentMethod[]> {
  const data = await apiClient(`/api/users/${userId}/payment-methods`);
  return Array.isArray(data) ? data : data.paymentMethods;
}

export type CreatePaymentMethodPayload = Omit<PaymentMethod, "id">;

export async function createPaymentMethod(
  payload: CreatePaymentMethodPayload,
): Promise<PaymentMethod> {
  return apiClient(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updatePaymentMethod(
  id: string,
  payload: Partial<PaymentMethod>,
): Promise<PaymentMethod> {
  return apiClient(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await apiClient(`${API_BASE}/${id}`, {
    method: "DELETE",
  });
}
