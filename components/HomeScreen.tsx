import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { TransactionCard } from './TransactionCard';
import { UpcomingPayments } from './UpcomingPayments';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { EmptyState } from './ui/empty-state';
import { Send, Users, Receipt, Plus, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { useUserProfile } from './UserProfileContext';
import { getCurrencySymbol, formatCurrencyForRegion } from '../utils/regions';
import { TransactionSkeleton } from './ui/loading';
import { useTransactions } from '../hooks/useTransactions';
import { NotificationBell } from './ui/notification-bell';

const quickActions = [
  { id: 'send', icon: Send, label: 'Send', color: 'bg-blue-500' },
  { id: 'request', icon: Plus, label: 'Request', color: 'bg-green-500' },
  { id: 'split', icon: Users, label: 'Split', color: 'bg-purple-500' },
  { id: 'bills', icon: Receipt, label: 'Bills', color: 'bg-orange-500' },
];

interface HomeScreenProps {
  onNavigate: (tab: string) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { appSettings, userProfile } = useUserProfile();
  const currencySymbol = getCurrencySymbol(appSettings.region);
  const displayName = userProfile?.name?.trim() || 'there';
  const initials = userProfile?.name
    ? userProfile.name
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';
  const [activityFilter, setActivityFilter] = useState<'all' | 'sent' | 'received'>('all');
  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
    summary,
    refetch,
  } = useTransactions();
  const [counts, setCounts] = useState<{ all: number; sent: number; received: number }>({ all: 0, sent: 0, received: 0 });
  useEffect(() => {
    // Defer non-critical counts fetch to idle time to speed up first paint
    const run = () => {
      (async () => {
        try {
          const data = await apiClient('/api/transactions/counts');
          setCounts({ all: data?.total ?? 0, sent: data?.sent ?? 0, received: data?.received ?? 0 });
        } catch {
          // Keep counts at 0 on failure
        }
      })();
    };
    const w = window as any;
    const idleId = w.requestIdleCallback
      ? w.requestIdleCallback(run, { timeout: 800 })
      : setTimeout(run, 250);
    return () => {
      if (w.cancelIdleCallback && idleId) w.cancelIdleCallback(idleId);
      else clearTimeout(idleId);
    };
  }, []);

  useEffect(() => {
    const type = activityFilter === 'all' ? undefined : activityFilter;
    refetch({ type });
  }, [activityFilter, refetch]);

  const getTransactionCount = (filterType: 'all' | 'sent' | 'received') => {
    if (filterType === 'all') return counts.all;
    if (filterType === 'sent') return counts.sent;
    if (filterType === 'received') return counts.received;
    return 0;
  };

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
          <NotificationBell onClick={() => onNavigate('notifications')} />
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
                {formatCurrencyForRegion(appSettings.region, summary.totalReceived)}
              </p>
              <p className="text-sm text-muted-foreground">You are owed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-medium text-destructive">
                {formatCurrencyForRegion(appSettings.region, summary.totalSent)}
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
                    if (action.id === 'send') onNavigate('send');
                    if (action.id === 'request') onNavigate('request');
                    if (action.id === 'split') onNavigate('split');
                    if (action.id === 'bills') onNavigate('bills');
                  }}
                  className="flex flex-col items-center space-y-2 p-4 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className={`${action.color} p-3 rounded-full text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming Payments */}
        <UpcomingPayments onNavigate={onNavigate} />

        {/* Recent Activity */}
        <div>
        <div className="flex items-center justify-between mb-4">
          <h3>Recent Activity</h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onNavigate('transaction-history', { from: 'home' })}
          >
            See All
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg mb-4">
          {[
            { id: 'all', label: 'All' },
            { id: 'sent', label: 'Sent' },
            { id: 'received', label: 'Received' },
          ].map((filter) => {
            const count = getTransactionCount(filter.id as 'all' | 'sent' | 'received');
            return (
              <button
                key={filter.id}
                onClick={() => setActivityFilter(filter.id as 'all' | 'sent' | 'received')}
                className={`flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
                  activityFilter === filter.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{filter.label}</span>
                <span className="ml-1 text-xs opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Transactions List */}
        <div className="space-y-3">
          {transactionsLoading && (
            <>
              <TransactionSkeleton />
              <TransactionSkeleton />
              <TransactionSkeleton />
            </>
          )}
          {transactionsError && (
            <Alert variant="destructive">
              <AlertDescription>{transactionsError}</AlertDescription>
            </Alert>
          )}
          {!transactionsLoading && !transactionsError &&
            transactions.slice(0, 4).map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onNavigate={onNavigate}
                currencySymbol={currencySymbol}
              />
            ))}
        </div>

        {!transactionsLoading && !transactionsError && transactions.length === 0 && (
          <EmptyState
            icon={DollarSign}
            title="No transactions found"
            description={`No ${activityFilter !== 'all' ? activityFilter : ''} transactions found`}
            className="py-8"
          />
        )}

        {!transactionsLoading && !transactionsError && transactions.length > 4 && (
          <div className="text-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('transaction-history', { from: 'home' })}
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
