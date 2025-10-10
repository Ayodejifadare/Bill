import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  DollarSign,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { EmptyState } from "./ui/empty-state";
import { TransactionCard } from "./TransactionCard";
import { useUserProfile } from "./UserProfileContext";
import { formatCurrencyForRegion } from "../utils/regions";
import { useTransactions, Transaction } from "../hooks/useTransactions";
import type { TransactionType } from "../shared/transactions";

interface TransactionHistoryScreenProps {
  onNavigate: (tab: string, data?: any) => void;
  backTo?: string; // target tab for back navigation
}

// Filter options
const timeFilters = [
  "All Time",
  "This Week",
  "This Month",
  "Last 3 Months",
  "This Year",
];
const typeFilters = [
  "All Types",
  "Sent",
  "Received",
  "Bill Splits",
  "Requests",
];

export function TransactionHistoryScreen({
  onNavigate,
  backTo = "home",
}: TransactionHistoryScreenProps) {
  const { appSettings } = useUserProfile();
  const fmt = (n: number) => formatCurrencyForRegion(appSettings.region, n);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState("All Time");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("All Types");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const {
    transactions: fetchedTransactions,
    loading,
    hasMore,
    summary,
    refetch,
  } = useTransactions();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date | undefined;
    switch (selectedTimeFilter) {
      case "This Week":
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        break;
      case "This Month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "Last 3 Months":
        start = new Date(now);
        start.setMonth(now.getMonth() - 3);
        break;
      case "This Year":
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = undefined;
    }
    return {
      startDate: start ? start.toISOString() : undefined,
      endDate: start ? now.toISOString() : undefined,
    };
  }, [selectedTimeFilter]);

  const type: TransactionType | undefined = useMemo(() => {
    switch (selectedTypeFilter) {
      case "Sent":
        return "sent";
      case "Received":
        return "received";
      case "Bill Splits":
        return "bill_split";
      case "Requests":
        return "request";
      default:
        return undefined;
    }
  }, [selectedTypeFilter]);

  const category =
    selectedCategory !== "All Categories" ? selectedCategory : undefined;
  const keyword = searchQuery || undefined;

  const filterParams = useMemo(
    () => ({ startDate, endDate, type, category, keyword }),
    [startDate, endDate, type, category, keyword],
  );

  useEffect(() => {
    setPage(1);
    refetch({ page: 1, size: pageSize, ...filterParams });
  }, [filterParams, refetch]);

  useEffect(() => {
    if (page > 1) {
      refetch({ page, size: pageSize, ...filterParams });
    }
  }, [page, filterParams, refetch]);

  useEffect(() => {
    if (page === 1) {
      setTransactions(fetchedTransactions);
    } else {
      setTransactions((prev) => [...prev, ...fetchedTransactions]);
    }
  }, [fetchedTransactions, page]);

  const categories = useMemo(
    () => [
      "All Categories",
      ...Array.from(
        new Set(
          transactions.map((t) => t.category).filter(Boolean) as string[],
        ),
      ),
    ],
    [transactions],
  );

  const { totalSent, totalReceived, netFlow } = summary;

  const handleTransactionClick = (transactionId: string) => {
    onNavigate("transaction-details", { transactionId });
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All Categories");
    setSelectedTimeFilter("All Time");
    setSelectedTypeFilter("All Types");
  };

  const hasActiveFilters =
    searchQuery ||
    selectedCategory !== "All Categories" ||
    selectedTimeFilter !== "All Time" ||
    selectedTypeFilter !== "All Types";

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Sticky for better mobile navigation */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center space-x-3 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(backTo)}
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
              {fmt(totalReceived)}
            </p>
            <p className="text-xs text-muted-foreground">Received</p>
          </Card>

          <Card className="p-3 sm:p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-destructive mr-1" />
            </div>
            <p className="text-base sm:text-lg font-medium text-destructive">
              {fmt(totalSent)}
            </p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </Card>

          <Card className="p-3 sm:p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-1" />
            </div>
            <p
              className={`text-base sm:text-lg font-medium ${netFlow >= 0 ? "text-success" : "text-destructive"}`}
            >
              {netFlow >= 0 ? "+" : ""}
              {fmt(Math.abs(netFlow))}
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
            Transactions ({transactions.length})
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
                <Badge
                  variant="destructive"
                  className="ml-2 h-5 w-5 p-0 text-xs"
                >
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
                  <Select
                    value={selectedTimeFilter}
                    onValueChange={setSelectedTimeFilter}
                  >
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
                  <label className="text-sm font-medium">
                    Transaction Type
                  </label>
                  <Select
                    value={selectedTypeFilter}
                    onValueChange={setSelectedTypeFilter}
                  >
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
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
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
                  {selectedTimeFilter !== "All Time" && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedTimeFilter}
                    </Badge>
                  )}
                  {selectedTypeFilter !== "All Types" && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedTypeFilter}
                    </Badge>
                  )}
                  {selectedCategory !== "All Categories" && (
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
          onClick={() => onNavigate("spending-insights")}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          View Spending Insights
        </Button>

        {/* Transactions List */}
        <div className="space-y-4">
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((transaction, index) => (
                <div key={transaction.id}>
                  <TransactionCard
                    transaction={transaction}
                    onClick={() => handleTransactionClick(transaction.id)}
                  />
                  {index < transactions.length - 1 && (
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
                hasActiveFilters
                  ? "Try adjusting your search or filter criteria"
                  : "Your transaction history will appear here"
              }
              actionLabel={hasActiveFilters ? "Clear All Filters" : undefined}
              onAction={hasActiveFilters ? clearAllFilters : undefined}
            />
          )}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="text-center pt-4">
            <Button
              variant="ghost"
              className="h-10"
              onClick={handleLoadMore}
              disabled={loading}
            >
              Load More Transactions
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
