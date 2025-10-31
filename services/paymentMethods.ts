import { apiClient } from "../utils/apiClient";
import type { PaymentMethod } from "../components/PaymentMethodSelector";

let paymentMethodsCache: PaymentMethod[] | null = null;
let inflight: Promise<PaymentMethod[]> | null = null;

function normalizePaymentMethods(data: any): PaymentMethod[] {
  const list = Array.isArray(data?.paymentMethods) ? data.paymentMethods : data;
  if (!Array.isArray(list)) return [];
  return list.map((method: any) => ({
    id: String(method.id),
    type: method.type,
    bankName: method.bank || method.bankName,
    bank: method.bank,
    accountNumber: method.accountNumber,
    accountHolderName: method.accountName || method.accountHolderName,
    accountName: method.accountName,
    sortCode: method.sortCode,
    routingNumber: method.routingNumber,
    accountType: method.accountType,
    provider: method.provider,
    phoneNumber: method.phoneNumber,
    isDefault: Boolean(method.isDefault),
  }));
}

export function getCachedPaymentMethods(): PaymentMethod[] | null {
  return paymentMethodsCache ? [...paymentMethodsCache] : null;
}

export async function loadPaymentMethods(
  options: { force?: boolean } = {},
): Promise<PaymentMethod[]> {
  const { force = false } = options;
  if (!force && paymentMethodsCache) {
    return paymentMethodsCache;
  }
  if (!force && inflight) {
    return inflight;
  }

  const request = apiClient("/payment-methods")
    .then((data) => {
      const methods = normalizePaymentMethods(data);
      paymentMethodsCache = methods;
      return methods;
    })
    .finally(() => {
      inflight = null;
    });

  if (!force) {
    inflight = request;
  }

  return request;
}

export function invalidatePaymentMethodsCache() {
  paymentMethodsCache = null;
}
