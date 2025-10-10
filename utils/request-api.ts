export interface CreateRequestPayload {
  amount: number;
  recipients: string[];
  // Can be an ID or a PaymentMethod-like object; we will send the ID to the server
  paymentMethod: { id: string } | string;
  isRecurring?: boolean;
  recurringFrequency?: string;
  recurringDay?: number;
  recurringDayOfWeek?: number;
  message?: string;
}

import { apiClient } from "./apiClient";

export async function createRequest(
  payload: CreateRequestPayload,
): Promise<void> {
  const body = {
    amount: payload.amount,
    recipients: payload.recipients,
    paymentMethod:
      typeof payload.paymentMethod === "string"
        ? payload.paymentMethod
        : payload.paymentMethod.id,
    message: payload.message,
    // Optional recurring fields (server validates types)
    isRecurring: payload.isRecurring,
    recurringFrequency: payload.recurringFrequency,
    recurringDay: payload.recurringDay,
    recurringDayOfWeek: payload.recurringDayOfWeek,
  };
  await apiClient("/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event("upcomingPaymentsUpdated"));
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch {
      // no-op
    }
  }
}
