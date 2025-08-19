import { useEffect, useState, useCallback } from 'react';
import type { TransactionType, TransactionStatus } from '../shared/transactions';

export interface TransactionUser {
  name: string;
  avatar?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  user?: TransactionUser;
  recipient?: TransactionUser;
  sender?: TransactionUser;
  avatarFallback?: string;
  date: string;
  status: TransactionStatus;
}

interface UseTransactionsOptions {
  page?: number;
  limit?: number;
}

interface UseTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  refetch: (opts?: UseTransactionsOptions) => void;
}

export function useTransactions({ page = 1, limit = 20 }: UseTransactionsOptions = {}): UseTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchTransactions = useCallback(async (opts: UseTransactionsOptions = {}) => {
    const currentPage = opts.page ?? page;
    const currentLimit = opts.limit ?? limit;
    setLoading(true);
    setError(null);
    try {
      const storedAuth = localStorage.getItem('biltip_auth');
      const token = storedAuth ? JSON.parse(storedAuth).token : null;

      if (!token) {
        throw new Error('Unauthorized: Please log in.');
      }

      const res = await fetch(`/api/transactions?page=${currentPage}&limit=${currentLimit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        throw new Error('Unauthorized: Please log in.');
      }

      if (!res.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await res.json();
      const fetched = Array.isArray(data.transactions) ? data.transactions : [];
      setTransactions(fetched);
      setHasMore(fetched.length === currentLimit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      setTransactions([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchTransactions({ page, limit });
  }, [fetchTransactions, page, limit]);

  return { transactions, loading, error, hasMore, refetch: fetchTransactions };
}

