import { useEffect, useState, useCallback } from 'react';

export interface BillParticipant {
  name: string;
  amount: number;
  paid: boolean;
}

export interface BillSplit {
  id: string;
  title: string;
  totalAmount: number;
  yourShare: number;
  status: 'pending' | 'completed' | string;
  participants: BillParticipant[];
  createdBy: string;
  date: string;
  groupId?: string;
}

interface UseBillSplitsResult {
  billSplits: BillSplit[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBillSplits(groupId?: string): UseBillSplitsResult {
  const [billSplits, setBillSplits] = useState<BillSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBillSplits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = groupId ? `/api/bill-splits?groupId=${groupId}` : '/api/bill-splits';
      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error('Failed to fetch bill splits');
      }
      const data = await res.json();
      setBillSplits(Array.isArray(data.billSplits) ? data.billSplits : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bill splits');
      setBillSplits([]);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchBillSplits();
  }, [fetchBillSplits]);

  return { billSplits, loading, error, refetch: fetchBillSplits };
}

