﻿import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../utils/apiClient";

export interface PaymentOrganizer {
  id?: string;
  name: string;
  avatar: string;
}

export interface UpcomingPayment {
  id: string;
  type: "bill_split" | "request";
  title: string;
  amount: number;
  dueDate: string;
  organizer: PaymentOrganizer;
  status: "overdue" | "pending" | "due_soon" | "upcoming";
  participants: number | any[];
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
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcomingPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient("/upcoming-payments");
      const payments = Array.isArray(data)
        ? data
        : Array.isArray(data.upcomingPayments)
          ? data.upcomingPayments
          : [];
      setUpcomingPayments(payments);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch upcoming payments",
      );
      setUpcomingPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const w = window as typeof window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions,
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const run = () => {
      if (cancelled) return;
      void fetchUpcomingPayments();
    };

    if (typeof w.requestIdleCallback === "function") {
      idleHandle = w.requestIdleCallback(
        () => {
          idleHandle = null;
          run();
        },
        { timeout: 900 },
      );
    } else {
      timeoutHandle = setTimeout(run, 300);
    }

    return () => {
      cancelled = true;
      if (idleHandle !== null && typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    };
  }, [fetchUpcomingPayments]);

  useEffect(() => {
    const onUpdate = () => fetchUpcomingPayments();
    window.addEventListener("upcomingPaymentsUpdated", onUpdate);
    return () =>
      window.removeEventListener("upcomingPaymentsUpdated", onUpdate);
  }, [fetchUpcomingPayments]);

  return { upcomingPayments, loading, error, refetch: fetchUpcomingPayments };
}
