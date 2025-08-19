import { useEffect, useState, useCallback } from 'react';

export interface PaymentOrganizer {
  name: string;
  avatar: string;
}

export interface UpcomingPayment {
  id: string;
  type: 'bill_split' | 'request';
  title: string;
  amount: number;
  dueDate: string;
  organizer: PaymentOrganizer;
  status: string;
  participants: number;
  billSplitId?: string;
  requestId?: string;
  paymentMethod?: Record<string, any>;
}

interface UseUpcomingPaymentsResult {
  upcomingPayments: UpcomingPayment[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUpcomingPayments(): UseUpcomingPaymentsResult {
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcomingPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/upcoming-payments');
      if (!res.ok) {
        throw new Error('Failed to fetch upcoming payments');
      }
      const data = await res.json();
      setUpcomingPayments(Array.isArray(data.upcomingPayments) ? data.upcomingPayments : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch upcoming payments');
      setUpcomingPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpcomingPayments();
  }, [fetchUpcomingPayments]);

  return { upcomingPayments, loading, error, refetch: fetchUpcomingPayments };
}

