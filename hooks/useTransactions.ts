import { useEffect, useState, useCallback } from 'react';
import type { TransactionType, TransactionStatus } from '../shared/transactions';
import { apiClient } from '../utils/apiClient';

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
  /** Filter by transaction category */
  category?: string;
  /** Minimum amount filter */
  minAmount?: number;
  /** Maximum amount filter */
  maxAmount?: number;
  /** Keyword search across description and participants */
  keyword?: string;
}

interface UseTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor: string | null;
  total: number;
  pageCount: number;
  refetch: (opts?: UseTransactionsOptions) => void;
}

export function useTransactions(initialOptions: UseTransactionsOptions = {}): UseTransactionsResult {
  const {
    page = 1,
    size = 20,
    cursor,
    limit,
    startDate,
    endDate,
    type,
    status,
    category,
    minAmount,
    maxAmount,
    keyword,
  } = initialOptions;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(0);

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
        category,
        minAmount,
        maxAmount,
        keyword,
        ...opts,
      };

      setLoading(true);
      setError(null);
      try {
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
        if (current.category) params.append('category', current.category);
        if (current.minAmount !== undefined) params.append('minAmount', String(current.minAmount));
        if (current.maxAmount !== undefined) params.append('maxAmount', String(current.maxAmount));
        if (current.keyword) params.append('keyword', current.keyword);

        const data = await apiClient(`/api/transactions?${params.toString()}`);
        const fetched = Array.isArray(data?.transactions) ? data.transactions : [];
        setTransactions(fetched);
        setHasMore(Boolean(data?.hasMore));
        setNextCursor(data?.nextCursor ?? null);
        setTotal(data?.total ?? 0);
        setPageCount(data?.pageCount ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
        setTransactions([]);
        setHasMore(false);
        setNextCursor(null);
        setTotal(0);
        setPageCount(0);
      } finally {
        setLoading(false);
      }
    },
    [
      cursor,
      limit,
      page,
      size,
      startDate,
      endDate,
      type,
      status,
      category,
      minAmount,
      maxAmount,
      keyword,
    ]
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, loading, error, hasMore, nextCursor, total, pageCount, refetch: fetchTransactions };
}

