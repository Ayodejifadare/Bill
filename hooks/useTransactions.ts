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
      const storedAuth = localStorage.getItem('biltip_auth');
      const token = storedAuth ? JSON.parse(storedAuth).token : null;

      if (!token) {
        throw new Error('Unauthorized: Please log in.');
      }

      const res = await fetch('/api/transactions', {
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

