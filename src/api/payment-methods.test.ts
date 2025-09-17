import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchPaymentMethods,
  fetchUserPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  type PaymentMethod,
  type CreatePaymentMethodPayload
} from './payment-methods';
import { apiClient } from '../../utils/apiClient';

vi.mock('../../utils/apiClient', () => ({
  apiClient: vi.fn()
}));

const mockApiClient = vi.mocked(apiClient);

describe('payment methods API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchPaymentMethods', () => {
    it('returns payment methods when API responds with an array', async () => {
      const paymentMethods: PaymentMethod[] = [
        {
          id: 'pm-1',
          type: 'bank',
          bank: 'Bank One',
          accountNumber: '12345678',
          accountName: 'Alex Doe',
          sortCode: '00-11-22',
          routingNumber: '987654321',
          accountType: 'checking',
          isDefault: true
        }
      ];

      mockApiClient.mockResolvedValueOnce(paymentMethods);

      const result = await fetchPaymentMethods();

      expect(mockApiClient).toHaveBeenCalledWith('/api/payment-methods');
      expect(result).toEqual(paymentMethods);
    });

    it('returns payment methods when API responds with a paymentMethods payload', async () => {
      const paymentMethods: PaymentMethod[] = [
        {
          id: 'pm-2',
          type: 'mobile_money',
          provider: 'M-Pesa',
          phoneNumber: '+1234567890',
          isDefault: false
        }
      ];

      mockApiClient.mockResolvedValueOnce({ paymentMethods });

      const result = await fetchPaymentMethods();

      expect(mockApiClient).toHaveBeenCalledWith('/api/payment-methods');
      expect(result).toEqual(paymentMethods);
    });
  });

  describe('fetchUserPaymentMethods', () => {
    it('returns user payment methods when API responds with an array', async () => {
      const userId = 'user-123';
      const paymentMethods: PaymentMethod[] = [
        {
          id: 'pm-3',
          type: 'bank',
          bank: 'Bank Two',
          accountNumber: '87654321',
          accountName: 'Jamie Lee',
          sortCode: '33-44-55',
          routingNumber: '123456789',
          accountType: 'savings',
          isDefault: false
        }
      ];

      mockApiClient.mockResolvedValueOnce(paymentMethods);

      const result = await fetchUserPaymentMethods(userId);

      expect(mockApiClient).toHaveBeenCalledWith(`/api/users/${userId}/payment-methods`);
      expect(result).toEqual(paymentMethods);
    });

    it('returns user payment methods when API responds with a paymentMethods payload', async () => {
      const userId = 'user-456';
      const paymentMethods: PaymentMethod[] = [
        {
          id: 'pm-4',
          type: 'mobile_money',
          provider: 'Airtel Money',
          phoneNumber: '+1987654321',
          isDefault: true
        }
      ];

      mockApiClient.mockResolvedValueOnce({ paymentMethods });

      const result = await fetchUserPaymentMethods(userId);

      expect(mockApiClient).toHaveBeenCalledWith(`/api/users/${userId}/payment-methods`);
      expect(result).toEqual(paymentMethods);
    });
  });

  describe('createPaymentMethod', () => {
    it('sends a JSON payload with headers and returns the created method', async () => {
      const payload: CreatePaymentMethodPayload = {
        type: 'bank',
        bank: 'Bank Three',
        accountNumber: '11112222',
        accountName: 'Robin Smith',
        sortCode: '66-77-88',
        routingNumber: '321654987',
        accountType: 'checking',
        isDefault: true
      };

      const created: PaymentMethod = { ...payload, id: 'pm-5' };

      mockApiClient.mockResolvedValueOnce(created);

      const result = await createPaymentMethod(payload);

      expect(mockApiClient).toHaveBeenCalledWith('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      expect(result).toEqual(created);
    });
  });

  describe('updatePaymentMethod', () => {
    it('sends a JSON payload with headers and returns the updated method', async () => {
      const id = 'pm-6';
      const payload: Partial<PaymentMethod> = {
        accountName: 'Taylor Swift',
        isDefault: true
      };

      const updated: PaymentMethod = {
        id,
        type: 'bank',
        bank: 'Bank Four',
        accountNumber: '99990000',
        accountName: 'Taylor Swift',
        sortCode: '99-00-11',
        routingNumber: '456789123',
        accountType: 'savings',
        isDefault: true
      };

      mockApiClient.mockResolvedValueOnce(updated);

      const result = await updatePaymentMethod(id, payload);

      expect(mockApiClient).toHaveBeenCalledWith(`/api/payment-methods/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      expect(result).toEqual(updated);
    });
  });

  describe('deletePaymentMethod', () => {
    it('calls the DELETE endpoint and resolves to void', async () => {
      const id = 'pm-7';

      mockApiClient.mockResolvedValueOnce(undefined);

      const result = await deletePaymentMethod(id);

      expect(mockApiClient).toHaveBeenCalledWith(`/api/payment-methods/${id}`, {
        method: 'DELETE'
      });
      expect(result).toBeUndefined();
    });
  });
});
