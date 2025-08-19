import { useState } from 'react';
import { ArrowLeft, Search, Filter, TrendingUp, TrendingDown, ArrowUpDown, Calendar, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { EmptyState } from './ui/empty-state';
import { TransactionCard } from './TransactionCard';
import { useUserProfile } from './UserProfileContext';
import { formatDate } from '../utils/formatDate';

interface TransactionHistoryScreenProps {
  onNavigate: (tab: string, data?: any) => void;
}

interface Transaction {
  id: string;
  type: 'sent' | 'received' | 'bill_split' | 'request';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  recipient?: {
    name: string;
    avatar: string;
  };
  sender?: {
    name: string;
    avatar: string;
  };
  category?: string;
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'sent',
    amount: 45.00,
    description: 'Coffee and lunch',
    date: '2025-01-15T14:30:00Z',
    status: 'completed',
    recipient: { name: 'Sarah Johnson', avatar: 'SJ' },
    category: 'Food & Dining'
  },
  {
    id: '2',
    type: 'received',
    amount: 120.00,
    description: 'Split dinner bill',
    date: '2025-01-14T19:45:00Z',
    status: 'completed',
    sender: { name: 'Mike Chen', avatar: 'MC' },
    category: 'Food & Dining'
  },
  {
    id: '3',
    type: 'bill_split',
    amount: 28.50,
    description: 'Team Dinner at Tony\'s Pizza',
    date: '2025-01-13T20:15:00Z',
    status: 'pending',
    category: 'Food & Dining'
  },
  {
    id: '4',
    type: 'sent',
    amount: 85.00,
    description: 'Uber ride share',
    date: '2025-01-12T16:20:00Z',
    status: 'completed',
    recipient: { name: 'Alex Rodriguez', avatar: 'AR' },
    category: 'Transportation'
  },
  {
    id: '5',
    type: 'received',
    amount: 200.00,
    description: 'Rent contribution',
    date: '2025-01-10T09:00:00Z',
    status: 'completed',
    sender: { name: 'Emily Davis', avatar: 'ED' },
    category: 'Housing'
  },
  {
    id: '6',
    type: 'request',
    amount: 30.00,
    description: 'Movie tickets',
    date: '2025-01-08T21:30:00Z',
    status: 'pending',
    recipient: { name: 'John Doe', avatar: 'JD' },
    category: 'Entertainment'
  },
  {
    id: '7',
    type: 'sent',
    amount: 15.50,
    description: 'Coffee',
    date: '2025-01-07T08:15:00Z',
    status: 'completed',
    recipient: { name: 'Sarah Johnson', avatar: 'SJ' },
    category: 'Food & Dining'
  },
  {
    id: '8',
    type: 'bill_split',
    amount: 67.25,
    description: 'Grocery shopping',
    date: '2025-01-05T15:45:00Z',
    status: 'completed',
    category: 'Shopping'
  }
];

const categories = ['All Categories', 'Food & Dining', 'Transportation', 'Housing', 'Entertainment', 'Shopping', 'Other'];
const timeFilters = ['All Time', 'This Week', 'This Month', 'Last 3 Months', 'This Year'];
const typeFilters = ['All Types', 'Sent', 'Received', 'Bill Splits', 'Requests'];

export function TransactionHistoryScreen({ onNavigate }: TransactionHistoryScreenProps) {
  const { appSettings } = useUserProfile();
  const currencySymbol = appSettings.region === 'NG' ? '₦' : '$';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('All Time');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All Types');
  const [showFilters, setShowFilters] = useState(false);

  const filteredTransactions = mockTransactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.recipient?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.sender?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         formatDate(transaction.date).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All Categories' || transaction.category === selectedCategory;
    
    const matchesType = selectedTypeFilter === 'All Types' || 
                       (selectedTypeFilter === 'Sent' && transaction.type === 'sent') ||
                       (selectedTypeFilter === 'Received' && transaction.type === 'received') ||
                       (selectedTypeFilter === 'Bill Splits' && transaction.type === 'bill_split') ||
                       (selectedTypeFilter === 'Requests' && transaction.type === 'request');

    return matchesSearch && matchesCategory && matchesType;
  });

  const totalSent = mockTransactions
    .filter(t => t.type === 'sent' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalReceived = mockTransactions
    .filter(t => t.type === 'received' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const netFlow = totalReceived - totalSent;


  const handleTransactionClick = (transactionId: string) => {
    onNavigate('transaction-details', { transactionId });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All Categories');
    setSelectedTimeFilter('All Time');
    setSelectedTypeFilter('All Types');
  };

  const hasActiveFilters = searchQuery || 
                          selectedCategory !== 'All Categories' || 
                          selectedTimeFilter !== 'All Time' || 
                          selectedTypeFilter !== 'All Types';

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Sticky for better mobile navigation */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center space-x-3 px-4 py-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onNavigate('profile')}
            className="min-h-[44px] min-w-[44px] -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold">Transaction History</h2>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 pb-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 sm:p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success mr-1" />
            </div>
            <p className="text-base sm:text-lg font-medium text-success">
              {currencySymbol}{totalReceived.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">Received</p>
          </Card>
          
          <Card className="p-3 sm:p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-destructive mr-1" />
            </div>
            <p className="text-base sm:text-lg font-medium text-destructive">
              {currencySymbol}{totalSent.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </Card>
          
          <Card className="p-3 sm:p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-1" />
            </div>
            <p className={`text-base sm:text-lg font-medium ${netFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
              {netFlow >= 0 ? '+' : ''}{currencySymbol}{Math.abs(netFlow).toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">Net Flow</p>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Filter Toggle Button (Mobile) */}
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-lg">
            Transactions ({filteredTransactions.length})
          </h3>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="text-xs px-2 py-1 h-8"
              >
                Clear
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
              className="min-h-[40px] px-3"
            >
              <Filter className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                  !
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Filters - Collapsible on mobile */}
        {showFilters && (
          <Card className="p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time Period</label>
                  <Select value={selectedTimeFilter} onValueChange={setSelectedTimeFilter}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeFilters.map((filter) => (
                        <SelectItem key={filter} value={filter}>
                          {filter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Transaction Type</label>
                  <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeFilters.map((filter) => (
                        <SelectItem key={filter} value={filter}>
                          {filter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {searchQuery && (
                    <Badge variant="secondary" className="text-xs">
                      Search: "{searchQuery}"
                    </Badge>
                  )}
                  {selectedTimeFilter !== 'All Time' && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedTimeFilter}
                    </Badge>
                  )}
                  {selectedTypeFilter !== 'All Types' && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedTypeFilter}
                    </Badge>
                  )}
                  {selectedCategory !== 'All Categories' && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedCategory}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Insights Button */}
        <Button 
          variant="outline" 
          className="w-full h-12" 
          onClick={() => onNavigate('spending-insights')}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          View Spending Insights
        </Button>

        {/* Transactions List */}
        <div className="space-y-4">
          {filteredTransactions.length > 0 ? (
            <div className="space-y-3">
              {filteredTransactions.map((transaction, index) => (
                <div key={transaction.id}>
                  <TransactionCard
                    transaction={transaction}
                    onClick={() => handleTransactionClick(transaction.id)}
                    currencySymbol={currencySymbol}
                  />
                  {index < filteredTransactions.length - 1 && (
                    <Separator className="my-3" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={DollarSign}
              title="No transactions found"
              description={
                hasActiveFilters ? 
                  "Try adjusting your search or filter criteria" :
                  "Your transaction history will appear here"
              }
              actionLabel={hasActiveFilters ? "Clear All Filters" : undefined}
              onAction={hasActiveFilters ? clearAllFilters : undefined}
            />
          )}
        </div>

        {/* Load More Button (for pagination in real implementation) */}
        {filteredTransactions.length > 0 && (
          <div className="text-center pt-4">
            <Button variant="ghost" className="h-10">
              Load More Transactions
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}