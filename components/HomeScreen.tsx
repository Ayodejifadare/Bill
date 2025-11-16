import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { TransactionCard } from "./TransactionCard";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { EmptyState } from "./ui/empty-state";
import { Send, Users, Receipt, Plus, DollarSign } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { useUserProfile } from "./UserProfileContext";
import { getCurrencySymbol, formatCurrencyForRegion } from "../utils/regions";
import { TransactionSkeleton, ListSkeleton } from "./ui/loading";
import { useTransactions } from "../hooks/useTransactions";
import type { Transaction } from "../hooks/useTransactions";
import { NotificationBell } from "./ui/notification-bell";
import { apiClient } from "../utils/apiClient";

const UpcomingPaymentsSection = lazy(() =>
  import("./UpcomingPayments").then((m) => ({
    default: m.UpcomingPayments,
  })),
);

const quickActions = [
  { id: "send", icon: Send, label: "Pay", color: "bg-blue-500" },
  { id: "request", icon: Plus, label: "Request", color: "bg-green-500" },
  { id: "split", icon: Users, label: "Split", color: "bg-purple-500" },
  { id: "bills", icon: Receipt, label: "Bills", color: "bg-orange-500" },
];

const dedupeByBillSplit = (list: Transaction[]): Transaction[] => {
  const seen = new Set<string>();
  const result: Transaction[] = [];
  for (const tx of list) {
    const key = tx.billSplitId || tx.id;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tx);
  }
  return result;
};

interface HomeScreenProps {
  onNavigate: (tab: string, data?: any) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { appSettings, userProfile } = useUserProfile();
  const currencySymbol = getCurrencySymbol(appSettings.region);
  const displayName = userProfile?.name?.trim() || "there";
  const initials = userProfile?.name
    ? userProfile.name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";
  const [activityFilter, setActivityFilter] = useState<
    "all" | "sent" | "received"
  >("all");
  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
  } = useTransactions();
  const [counts, setCounts] = useState<{
    all: number;
    sent: number;
    received: number;
  }>({ all: 0, sent: 0, received: 0 });
  const [balanceSummary, setBalanceSummary] = useState<{
    owedToUser: number;
    userOwes: number;
  }>({ owedToUser: 0, userOwes: 0 });
  const metricsRequestRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );
  const refreshMetrics = useCallback(() => {
    if (!metricsRequestRef.current) {
      metricsRequestRef.current = (async () => {
        const [countsResult, summaryResult] = await Promise.allSettled([
          apiClient("/transactions/counts"),
          apiClient("/friends/summary"),
        ]);
        if (!isMountedRef.current) {
          metricsRequestRef.current = null;
          return;
        }
        if (countsResult.status === "fulfilled") {
          const data = countsResult.value;
          setCounts({
            all: data?.total ?? 0,
            sent: data?.sent ?? 0,
            received: data?.received ?? 0,
          });
        }
        if (summaryResult.status === "fulfilled") {
          const data = summaryResult.value;
          setBalanceSummary({
            owedToUser: data?.owedToUser ?? 0,
            userOwes: data?.userOwes ?? 0,
          });
        }
        metricsRequestRef.current = null;
      })().catch(() => {
        metricsRequestRef.current = null;
      });
    }
    return metricsRequestRef.current;
  }, []);

  useEffect(() => {
    void refreshMetrics();

    const onTxUpdated = () => {
      void refreshMetrics();
    };
    const onUpcomingUpdated = () => {
      void refreshMetrics();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshMetrics();
      }
    };
    try {
      window.addEventListener("transactionsUpdated", onTxUpdated);
      window.addEventListener("upcomingPaymentsUpdated", onUpcomingUpdated);
      document.addEventListener("visibilitychange", onVisibility);
    } catch {
      // non-browser environments
    }

    return () => {
      try {
        window.removeEventListener("transactionsUpdated", onTxUpdated);
        window.removeEventListener("upcomingPaymentsUpdated", onUpcomingUpdated);
        document.removeEventListener("visibilitychange", onVisibility);
      } catch {
        // noop
      }
    };
  }, [refreshMetrics]);

  useEffect(() => {
    void import("./UpcomingPayments");
  }, []);


  const getTransactionCount = (filterType: "all" | "sent" | "received") => {
    if (filterType === "all") return counts.all;
    if (filterType === "sent") return counts.sent;
    if (filterType === "received") return counts.received;
    return 0;
  };
  const selectedCount = getTransactionCount(activityFilter);
  const filterLabel = (activityFilter === "all"
    ? "All"
    : activityFilter === "sent"
      ? "Sent"
      : "Received");

  // Collapse multiple transaction rows for the same bill split into a single
  // recent-activity item so group splits don’t appear once per participant.
  const filteredTransactions = useMemo(() => {
    if (activityFilter === "all") {
      return transactions;
    }
    return transactions.filter(
      (transaction) => transaction.type === activityFilter,
    );
  }, [activityFilter, transactions]);

  // Collapse multiple transaction rows for the same bill split into a single
  // recent-activity item so group splits don't appear once per participant.
  const recentTransactions = useMemo(
    () => dedupeByBillSplit(filteredTransactions),
    [filteredTransactions],
  );

  const completedRecentTransactions = useMemo(
    () => recentTransactions.filter((transaction) => transaction.status === "completed"),
    [recentTransactions],
  );

  return (
    <div>
      {/* Header */}
      {/* Static Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 py-3 mb-6">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile?.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Hi,</p>
              <p className="font-medium">{displayName}</p>
            </div>
          </div>
          <NotificationBell onClick={() => onNavigate("notifications")} />
        </div>
      </div>

      {/* Content Container */}
      <div className="px-4 space-y-6">
        {/* Balance Card - always visible */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">Your Balance</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-medium text-success">
                {formatCurrencyForRegion(appSettings.region, balanceSummary.owedToUser)}
              </p>
              <p className="text-sm text-muted-foreground">You are owed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-medium text-destructive">
                {formatCurrencyForRegion(appSettings.region, balanceSummary.userOwes)}
              </p>
              <p className="text-sm text-muted-foreground">You owe</p>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div>
          <h3 className="mb-4">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    if (action.id === "send") onNavigate("send");
                    if (action.id === "request") onNavigate("request");
                    if (action.id === "split") onNavigate("split");
                    if (action.id === "bills") onNavigate("bills");
                  }}
                  className="flex flex-col items-center space-y-2 p-4 rounded-xl hover:bg-muted transition-colors"
                >
                  <div
                    className={`${action.color} p-3 rounded-full text-white`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming Payments */}
        <Suspense fallback={<ListSkeleton count={2} />}>
          <UpcomingPaymentsSection onNavigate={onNavigate} />
        </Suspense>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3>Recent Activity</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onNavigate("transaction-history", { from: "home" })
              }
            >
              See All
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="flex space-x-1 bg-muted p-1 rounded-lg mb-4">
            {[
              { id: "all", label: "All" },
              { id: "sent", label: "Sent" },
              { id: "received", label: "Received" },
            ].map((filter) => {
              const count = getTransactionCount(
                filter.id as "all" | "sent" | "received",
              );
              return (
                <button
                  key={filter.id}
                  onClick={() =>
                    setActivityFilter(filter.id as "all" | "sent" | "received")
                  }
                  className={`flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
                    activityFilter === filter.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{filter.label}</span>
                  <span className="ml-1 text-xs opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
          {/* Content */}
          <div className="space-y-3">
            {/* Loading state */}
            {transactionsLoading && (
              <>
                <TransactionSkeleton />
                <TransactionSkeleton />
                <TransactionSkeleton />
              </>
            )}

            {/* Error state */}
            {transactionsError && (
              <Alert variant="destructive">
                <AlertDescription>{transactionsError}</AlertDescription>
              </Alert>
            )}

            {/* Empty state when selected tab has zero count, even if others have data */}
            {!transactionsLoading && !transactionsError && selectedCount === 0 && (
              <EmptyState
                icon={DollarSign}
                title={`No ${filterLabel} transactions yet`}
                description={undefined}
                className="py-8"
              />
            )}

            {/* Completed Transactions List (only when we have any count for the tab) */}
            {!transactionsLoading &&
              !transactionsError &&
              selectedCount > 0 && (
                (() => {
                  if (completedRecentTransactions.length === 0) {
                    return (
                      <EmptyState
                        icon={DollarSign}
                        title="No completed transactions yet"
                        description="Completed activity will appear here"
                        className="py-8"
                      />
                    );
                  }
                  return (
                    <>
                      {completedRecentTransactions.slice(0, 4).map((transaction) => (
                        <TransactionCard
                          key={transaction.id}
                          transaction={transaction}
                          onNavigate={onNavigate}
                          currencySymbol={currencySymbol}
                        />
                      ))}
                      {completedRecentTransactions.length > 4 && (
                        <div className="text-center mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onNavigate("transaction-history", { from: "home" })
                            }
                          >
                            Load More
                          </Button>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
