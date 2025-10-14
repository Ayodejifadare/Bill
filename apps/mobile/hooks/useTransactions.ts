import { useEffect, useState, useCallback } from 'react';
export type TransactionType = 'sent' | 'received' | 'split' | 'bill_split' | 'request';
export type TransactionStatus = 'completed' | 'pending' | 'failed';
import { apiClient } from '../utils/apiClient';

export interface TransactionUser { name: string; avatar?: string }
export interface Transaction { id: string; billSplitId?: string; type: TransactionType; amount: number; description: string; category?: string; user?: TransactionUser; recipient?: TransactionUser; sender?: TransactionUser; avatarFallback?: string; date: string; status: TransactionStatus }

interface Options {
  cursor?: string; limit?: number; page?: number; size?: number; startDate?: string; endDate?: string; type?: TransactionType; status?: TransactionStatus; category?: string; minAmount?: number; maxAmount?: number; keyword?: string;
}

interface Result { transactions: Transaction[]; loading: boolean; error: string | null; hasMore: boolean; nextCursor: string | null; total: number; pageCount: number; summary: { totalSent: number; totalReceived: number; netFlow: number }; refetch: (opts?: Options) => void }

export function useTransactions(initial: Options = {}): Result {
  const { cursor, limit, page, size, startDate, endDate, type, status, category, minAmount, maxAmount, keyword } = initial;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [summary, setSummary] = useState({ totalSent: 0, totalReceived: 0, netFlow: 0 });

  const fetchTransactions = useCallback(async (opts: Options = {}) => {
    const current = { cursor, limit, page, size, startDate, endDate, type, status, category, minAmount, maxAmount, keyword, ...opts };
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const effectiveLimit = current.limit ?? current.size ?? 20;
      const effectiveSize = current.size ?? current.limit ?? 20;
      if (current.cursor || (!current.page && !current.size)) {
        if (current.cursor) params.append('cursor', current.cursor);
        params.append('limit', String(effectiveLimit));
      } else {
        params.append('page', String(current.page ?? 1));
        params.append('size', String(effectiveSize));
      }
      if (current.startDate) params.append('startDate', current.startDate);
      if (current.endDate) params.append('endDate', current.endDate);
      if (current.type) params.append('type', current.type);
      if (current.status) params.append('status', current.status);
      if (current.category) params.append('category', current.category);
      if (current.minAmount !== undefined) params.append('minAmount', String(current.minAmount));
      if (current.maxAmount !== undefined) params.append('maxAmount', String(current.maxAmount));
      if (current.keyword) params.append('keyword', current.keyword);
      params.append('includeSummary', 'true');

      const data = await apiClient(`/transactions?${params.toString()}`);
      const fetched = Array.isArray(data?.transactions) ? data.transactions : [];
      setTransactions(fetched);
      setHasMore(Boolean(data?.hasMore));
      setNextCursor(data?.nextCursor ?? null);
      setTotal(data?.total ?? 0);
      setPageCount(data?.pageCount ?? 0);
      setSummary({ totalSent: data?.totalSent ?? 0, totalReceived: data?.totalReceived ?? 0, netFlow: data?.netFlow ?? 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      setTransactions([]);
      setHasMore(false);
      setNextCursor(null);
      setTotal(0);
      setPageCount(0);
      setSummary({ totalSent: 0, totalReceived: 0, netFlow: 0 });
    } finally {
      setLoading(false);
    }
  }, [cursor, limit, page, size, startDate, endDate, type, status, category, minAmount, maxAmount, keyword]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  return { transactions, loading, error, hasMore, nextCursor, total, pageCount, summary, refetch: fetchTransactions };
}
