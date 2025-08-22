export interface CreateRequestPayload {
  amount: number;
  recipients: string[];
  paymentMethod: {
    id: string;
    type: 'bank' | 'mobile_money';
    [key: string]: any;
  };
  message?: string;
}

import { apiClient } from './apiClient';

export async function createRequest(payload: CreateRequestPayload): Promise<void> {
  await apiClient('/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
