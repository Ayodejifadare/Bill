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
  cursor?: string;
  limit?: number;
  page?: number;
  size?: number;
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  status?: TransactionStatus;
}

interface UseTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor: string | null;
  refetch: (opts?: UseTransactionsOptions) => void;
}

export function useTransactions(initialOptions: UseTransactionsOptions = {}): UseTransactionsResult {
  const { page = 1, size = 20, cursor, limit, startDate, endDate, type, status } = initialOptions;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchTransactions = useCallback(
    async (opts: UseTransactionsOptions = {}) => {
      const current = {
        cursor,
        limit,
        page,
        size,
        startDate,
        endDate,
        type,
        status,
        ...opts,
      };

      setLoading(true);
      setError(null);
      try {
        const storedAuth = localStorage.getItem('biltip_auth');
        const token = storedAuth ? JSON.parse(storedAuth).token : null;

        if (!token) {
          throw new Error('Unauthorized: Please log in.');
        }

        const params = new URLSearchParams();
        if (current.cursor || (!current.page && !current.size)) {
          if (current.cursor) params.append('cursor', current.cursor);
          params.append('limit', String(current.limit ?? current.size ?? 20));
        } else {
          params.append('page', String(current.page ?? 1));
          params.append('size', String(current.size ?? current.limit ?? 20));
        }
        if (current.startDate) params.append('startDate', current.startDate);
        if (current.endDate) params.append('endDate', current.endDate);
        if (current.type) params.append('type', current.type);
        if (current.status) params.append('status', current.status);

        const res = await fetch(`/api/transactions?${params.toString()}`, {
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
        setHasMore(Boolean(data.hasMore));
        setNextCursor(data.nextCursor ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
        setTransactions([]);
        setHasMore(false);
        setNextCursor(null);
      } finally {
        setLoading(false);
      }
    },
    [cursor, limit, page, size, startDate, endDate, type, status]
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, loading, error, hasMore, nextCursor, refetch: fetchTransactions };
}

