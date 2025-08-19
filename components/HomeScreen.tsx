import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { TransactionCard } from './TransactionCard';
import { UpcomingPayments } from './UpcomingPayments';
import { Avatar, AvatarFallback } from './ui/avatar';
import { EmptyState } from './ui/empty-state';
import { Send, Users, Receipt, Plus, Bell, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { useUserProfile } from './UserProfileContext';
import { TransactionSkeleton } from './ui/loading';
import { useTransactions } from '../hooks/useTransactions';

const quickActions = [
  { id: 'send', icon: Send, label: 'Send', color: 'bg-blue-500' },
  { id: 'request', icon: Plus, label: 'Request', color: 'bg-green-500' },
  { id: 'split', icon: Users, label: 'Split', color: 'bg-purple-500' },
  { id: 'bills', icon: Receipt, label: 'Bills', color: 'bg-orange-500' },
];

interface HomeScreenProps {
  onNavigate: (tab: string) => void;
export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { appSettings } = useUserProfile();
  const currencySymbol = appSettings.region === 'NG' ? '₦' : '$';
  const [activityFilter, setActivityFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [unreadNotifications] = useState(3); // Mock unread count
  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
  } = useTransactions();

  // Calculate total amounts owed and owing from transactions
  const totalOwed = transactions
    .filter(t => t.type === 'received' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOwes = transactions
    .filter(t => (t.type === 'split' || t.type === 'sent') && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredTransactions = transactions.filter(transaction => {
    if (activityFilter === 'all') return true;
    if (activityFilter === 'sent') return transaction.type === 'sent';
    if (activityFilter === 'received') return transaction.type === 'received' || transaction.type === 'split';
    return true;
  });

  const getTransactionCount = (filterType: 'all' | 'sent' | 'received') => {
    if (filterType === 'all') return transactions.length;
    if (filterType === 'sent') return transactions.filter(t => t.type === 'sent').length;
    if (filterType === 'received') return transactions.filter(t => t.type === 'received' || t.type === 'split').length;
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
              <AvatarFallback className="bg-primary text-primary-foreground">
                JD
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Hi,</p>
              <p className="font-medium">John Doe</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onNavigate('notifications')}
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Content Container */}
      <div className="px-4 space-y-6">
        {/* Balance Card */}
        {(totalOwed > 0 || totalOwes > 0) && (
          <Card className="p-4">
            <h3 className="font-medium mb-3">Your Balance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-medium text-success">
                  {currencySymbol}{totalOwed.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">You are owed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-medium text-destructive">
                  {currencySymbol}{totalOwes.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">You owe</p>
              </div>
            </div>
          </Card>
        )}

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
            onClick={() => onNavigate('transaction-history')}
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
            filteredTransactions.slice(0, 4).map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} onNavigate={onNavigate} />
            ))}
        </div>

        {!transactionsLoading && !transactionsError && filteredTransactions.length === 0 && (
          <EmptyState
            icon={DollarSign}
            title="No transactions found"
            description={`No ${activityFilter !== 'all' ? activityFilter : ''} transactions found`}
            className="py-8"
          />
        )}

        {!transactionsLoading && !transactionsError && filteredTransactions.length > 4 && (
          <div className="text-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('transaction-history')}
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
