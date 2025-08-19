import { useEffect, useState, useCallback } from 'react';

export interface TransactionUser {
  name: string;
  avatar?: string;
}

export interface Transaction {
  id: string;
  type: 'sent' | 'received' | 'split' | 'bill_split' | 'request';
  amount: number;
  description: string;
  user?: TransactionUser;
  recipient?: TransactionUser;
  sender?: TransactionUser;
  avatarFallback?: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

interface UseTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTransactions(): UseTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/transactions');
      if (!res.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await res.json();
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, loading, error, refetch: fetchTransactions };
}

