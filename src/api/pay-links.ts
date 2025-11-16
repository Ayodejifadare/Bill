import { apiClient } from "../../utils/apiClient";

export type PayLinkStatus = "ACTIVE" | "REVOKED" | "FULFILLED" | "EXPIRED";

export interface PayLink {
  id: string;
  slug: string;
  token: string;
  title?: string | null;
  message?: string | null;
  amount: number;
  currency: string;
  status: PayLinkStatus;
  expiresAt?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  paymentMethodId: string;
  paymentRequestId?: string | null;
}

export interface CreatePayLinkPayload {
  amount: number;
  paymentMethodId: string;
  currency?: string;
  title?: string;
  message?: string;
  expiresAt?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  slug?: string;
  paymentRequestId?: string;
  paymentRequest?: {
    receiverId: string;
    description?: string;
    message?: string;
  };
}

const API_BASE = "/api/pay-links";

export async function createPayLink(
  payload: CreatePayLinkPayload,
): Promise<PayLink> {
  const data = await apiClient(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data?.payLink ?? data;
}

export async function fetchPayLink(id: string): Promise<PayLink> {
  const data = await apiClient(`${API_BASE}/${id}`);
  return data?.payLink ?? data;
}
