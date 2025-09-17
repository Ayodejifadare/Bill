import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./apiClient', () => ({
  apiClient: vi.fn(),
}));

import { createRequest, type CreateRequestPayload } from './request-api';
import { apiClient } from './apiClient';

const mockApiClient = vi.mocked(apiClient);

describe('createRequest', () => {
  beforeEach(() => {
    mockApiClient.mockReset();
  });

  it('converts paymentMethod objects to ids and serializes the expected body', async () => {
    const payload: CreateRequestPayload = {
      amount: 1200,
      recipients: ['alice@example.com', 'bob@example.com'],
      paymentMethod: { id: 'pm_object_123' },
      message: 'Dinner bill',
      isRecurring: true,
      recurringFrequency: 'monthly',
      recurringDay: 15,
      recurringDayOfWeek: 3,
    };

    mockApiClient.mockResolvedValueOnce(undefined);

    await createRequest(payload);

    expect(mockApiClient).toHaveBeenCalledTimes(1);
    const [path, options] = mockApiClient.mock.calls[0];
    expect(path).toBe('/requests');
    expect(options).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(options?.body).toBeTypeOf('string');

    const parsedBody = JSON.parse(options!.body as string);
    expect(parsedBody).toEqual({
      amount: payload.amount,
      recipients: payload.recipients,
      paymentMethod: payload.paymentMethod.id,
      message: payload.message,
      isRecurring: payload.isRecurring,
      recurringFrequency: payload.recurringFrequency,
      recurringDay: payload.recurringDay,
      recurringDayOfWeek: payload.recurringDayOfWeek,
    });
  });

  it('omits optional fields when they are undefined', async () => {
    const payload: CreateRequestPayload = {
      amount: 2500,
      recipients: ['charlie@example.com'],
      paymentMethod: 'pm_string_456',
    };

    mockApiClient.mockResolvedValueOnce(undefined);

    await createRequest(payload);

    expect(mockApiClient).toHaveBeenCalledTimes(1);
    const [, options] = mockApiClient.mock.calls[0];
    const parsedBody = JSON.parse(options!.body as string);

    expect(parsedBody).toEqual({
      amount: payload.amount,
      recipients: payload.recipients,
      paymentMethod: payload.paymentMethod,
    });
    expect(parsedBody).not.toHaveProperty('message');
    expect(parsedBody).not.toHaveProperty('isRecurring');
    expect(parsedBody).not.toHaveProperty('recurringFrequency');
    expect(parsedBody).not.toHaveProperty('recurringDay');
    expect(parsedBody).not.toHaveProperty('recurringDayOfWeek');
  });

  it('awaits the apiClient call before resolving', async () => {
    let resolveClient: (() => void) | undefined;
    const clientPromise = new Promise<void>((resolve) => {
      resolveClient = resolve;
    });

    mockApiClient.mockReturnValueOnce(clientPromise);

    const payload: CreateRequestPayload = {
      amount: 3100,
      recipients: ['pending@example.com'],
      paymentMethod: 'pm_pending_789',
    };

    const requestPromise = createRequest(payload);
    const onResolved = vi.fn();
    requestPromise.then(onResolved);

    await Promise.resolve();
    expect(onResolved).not.toHaveBeenCalled();

    resolveClient?.();

    await expect(requestPromise).resolves.toBeUndefined();
    expect(onResolved).toHaveBeenCalledTimes(1);
  });

  it('propagates rejections from apiClient', async () => {
    const error = new Error('network failure');
    mockApiClient.mockRejectedValueOnce(error);

    const payload: CreateRequestPayload = {
      amount: 1800,
      recipients: ['error@example.com'],
      paymentMethod: 'pm_error_000',
    };

    await expect(createRequest(payload)).rejects.toBe(error);
  });
});
