export interface CreateRequestPayload {
  amount: number;
  recipients: string[];
  paymentMethod: {
    id: string;
    type: 'bank' | 'mobile_money';
    [key: string]: any;
  };
}

export async function createRequest(payload: CreateRequestPayload): Promise<void> {
  const response = await fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = 'Failed to send request';
    try {
      const data = await response.json();
      if (data?.error) {
        message = data.error;
      }
    } catch (_) {
      // ignore json parse errors
    }
    throw new Error(message);
  }
}
