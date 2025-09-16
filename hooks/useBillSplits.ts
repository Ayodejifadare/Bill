import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';

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
  groupName?: string;
}

interface UseBillSplitsOptions {
  groupId?: string;
  /** Filter bill splits by category */
  category?: string;
  /** Minimum total amount */
  minAmount?: number;
  /** Maximum total amount */
  maxAmount?: number;
  /** Keyword search across title, description and participants */
  keyword?: string;
  /** Page number for pagination */
  page?: number;
  /** Page size for pagination */
  size?: number;
}

interface UseBillSplitsResult {
  billSplits: BillSplit[];
  loading: boolean;
  error: string | null;
  total: number;
  pageCount: number;
  refetch: (opts?: UseBillSplitsOptions) => void;
}

export function useBillSplits(initialOptions: UseBillSplitsOptions = {}): UseBillSplitsResult {
  const {
    groupId,
    category,
    minAmount,
    maxAmount,
    keyword,
    page = 1,
    size = 20,
  } = initialOptions;

  const [billSplits, setBillSplits] = useState<BillSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(0);

  const fetchBillSplits = useCallback(
    async (opts: UseBillSplitsOptions = {}) => {
      setLoading(true);
      setError(null);
      try {
        const current = {
          groupId,
          category,
          minAmount,
          maxAmount,
          keyword,
          page,
          size,
          ...opts,
        };

        const params = new URLSearchParams();
        if (current.groupId) params.append('groupId', current.groupId);
        if (current.category) params.append('category', current.category);
        if (current.minAmount !== undefined) params.append('minAmount', String(current.minAmount));
        if (current.maxAmount !== undefined) params.append('maxAmount', String(current.maxAmount));
        if (current.keyword) params.append('keyword', current.keyword);
        if (current.page) params.append('page', String(current.page));
        if (current.size) params.append('size', String(current.size));

        const endpoint = `/bill-splits?${params.toString()}`;
        const data = await apiClient(endpoint);
        const raw: any[] = Array.isArray(data.billSplits) ? data.billSplits : [];
        const mapped = raw.map((b: any) => {
          const participantsRaw: any[] = Array.isArray(b.participants) ? b.participants : [];
          const participants: BillParticipant[] = participantsRaw.map((p: any) => ({
            name: typeof p?.name === 'string' ? p.name : (p?.user?.name || 'Unknown'),
            amount: typeof p?.amount === 'number' ? p.amount : Number(p?.amount || 0),
            paid: typeof p?.paid === 'boolean' ? p.paid : Boolean(p?.isPaid)
          }));
          return {
            id: String(b.id),
            title: b.title ?? '',
            totalAmount: typeof b.totalAmount === 'number' ? b.totalAmount : Number(b.totalAmount || 0),
            yourShare: typeof b.yourShare === 'number' ? b.yourShare : Number(b.yourShare || 0),
            status: (b.status as any) || 'pending',
            participants,
            createdBy: typeof b.createdBy === 'string' ? b.createdBy : (b.createdBy?.name || 'Unknown'),
            date: typeof b.date === 'string' ? b.date : (b.createdAt || new Date().toISOString()),
            groupId: b.groupId,
            groupName: b.groupName,
          } as BillSplit;
        });
        setBillSplits(mapped);
        setTotal(data.total ?? 0);
        setPageCount(data.pageCount ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch bill splits');
        setBillSplits([]);
        setTotal(0);
        setPageCount(0);
      } finally {
        setLoading(false);
      }
    },
    [groupId, category, minAmount, maxAmount, keyword, page, size]
  );

  useEffect(() => {
    fetchBillSplits();
  }, [fetchBillSplits]);

  return { billSplits, loading, error, total, pageCount, refetch: fetchBillSplits };
}
