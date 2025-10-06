import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, DollarSign, PieChart, BarChart3, Target, Award } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart as RechartsPieChart, Cell, LineChart, Line, Tooltip } from 'recharts';
import { useUserProfile } from './UserProfileContext';
import { formatCurrencyForRegion, getCurrencyCode, getLocaleForRegion } from '../utils/regions';
import { apiClient } from '../utils/apiClient';

interface SpendingInsightsScreenProps {
  onNavigate: (tab: string, data?: any) => void;
  backTo?: string;
}

interface SpendingCategory {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface SpendingGoal {
  category: string;
  spent: number;
  budget: number;
  target: string;
}

interface SpendingInsightItem {
  type: 'positive' | 'warning' | 'neutral';
  message?: string;
  title?: string;
  description?: string;
}

interface SpendingMonthlyTrend {
  month: string;
  sent: number;
  received: number;
  splits: number;
}

interface WeeklyActivityItem {
  day: string;
  amount: number;
}

interface SpendingData {
  currentMonth: { total: number; categories: SpendingCategory[] };
  monthlyTrends: SpendingMonthlyTrend[];
  weeklyActivity: WeeklyActivityItem[];
  goals: SpendingGoal[];
  insights: SpendingInsightItem[];
  overview?: {
    totalSpentDeltaPct: number;
    splitsCount: number;
    splitsDeltaPct: number;
  }
}

export function SpendingInsightsScreen({ onNavigate, backTo = 'home' }: SpendingInsightsScreenProps) {
  const { appSettings } = useUserProfile();
  const fmt = (n: number) => formatCurrencyForRegion(appSettings.region, n);
  const fmtAxis = (n: number) => {
    const locale = getLocaleForRegion(appSettings.region);
    const currency = getCurrencyCode(appSettings.region);
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(Number(n) || 0);
    } catch {
      return fmt(Number(n) || 0);
    }
  };
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [spendingData, setSpendingData] = useState<SpendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delta helpers for dynamic coloring/icons
  const spentDelta = spendingData?.overview?.totalSpentDeltaPct ?? 0;
  const splitsDelta = spendingData?.overview?.splitsDeltaPct ?? 0;
  const neutralThreshold = 1; // +/-1% considered neutral
  const warningThreshold = 5; // within 5% uses warning color

  const formatDelta = (n: number) => `${n > 0 ? '+' : ''}${Math.round(n)}%`;

  // Lower spending is good; increases are bad (warning/red)
  const spentIsNeutral = Math.abs(spentDelta) < neutralThreshold;
  const spentIsDown = spentDelta <= -neutralThreshold;
  const spentIsSmallUp = spentDelta >= neutralThreshold && spentDelta <= warningThreshold;
  const spentBadgeClass = spentIsNeutral
    ? 'text-muted-foreground'
    : spentIsDown
    ? 'text-success'
    : spentIsSmallUp
    ? 'text-warning'
    : 'text-destructive';

  // More splits is generally good for engagement
  const splitsIsNeutral = Math.abs(splitsDelta) < neutralThreshold;
  const splitsIsUp = splitsDelta >= neutralThreshold;
  const splitsIsSmallDown = splitsDelta <= -neutralThreshold && splitsDelta >= -warningThreshold;
  const splitsBadgeClass = splitsIsNeutral
    ? 'text-muted-foreground'
    : splitsIsUp
    ? 'text-success'
    : splitsIsSmallDown
    ? 'text-warning'
    : 'text-destructive';

  const periods = ['This Week', 'This Month', 'Last 3 Months', 'This Year'];

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive': return 'text-success';
      case 'warning': return 'text-warning';
      default: return 'text-primary';
    }
  };

  const getInsightBgColor = (type: string) => {
    switch (type) {
      case 'positive': return 'bg-success/10';
      case 'warning': return 'bg-warning/10';
      default: return 'bg-primary/10';
    }
  };

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient(`/spending-insights?period=${encodeURIComponent(selectedPeriod)}`);
        setSpendingData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch spending insights');
        setSpendingData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [selectedPeriod]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-screen">Error: {error}</div>;
  }

  if (!spendingData) {
    return <div className="flex items-center justify-center min-h-screen">No data</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Sticky for better mobile navigation */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onNavigate(backTo)}
              className="-ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-semibold">Spending Insights</h2>
          </div>
          
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32 sm:w-36 min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period} value={period}>
                  {period}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 pb-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              {spentIsNeutral ? (
                <DollarSign className={`h-5 w-5 ${spentBadgeClass}`} />
              ) : spentIsDown ? (
                <TrendingDown className={`h-5 w-5 ${spentBadgeClass}`} />
              ) : (
                <TrendingUp className={`h-5 w-5 ${spentBadgeClass}`} />
              )}
              <Badge variant="outline" className={`${spentBadgeClass} text-xs`}>
                {formatDelta(spentDelta)}
              </Badge>
            </div>
            <div className="flex-1 flex flex-col justify-end">
              <p className="text-xl sm:text-2xl font-bold">
                {fmt(spendingData.currentMonth.total)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Total Spent</p>
            </div>
          </Card>
          
          <Card className="p-4 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              {splitsIsNeutral ? (
                <DollarSign className={`h-5 w-5 ${splitsBadgeClass}`} />
              ) : splitsIsUp ? (
                <TrendingUp className={`h-5 w-5 ${splitsBadgeClass}`} />
              ) : (
                <TrendingDown className={`h-5 w-5 ${splitsBadgeClass}`} />
              )}
              <Badge variant="outline" className={`${splitsBadgeClass} text-xs`}>
                {formatDelta(splitsDelta)}
              </Badge>
            </div>
            <div className="flex-1 flex flex-col justify-end">
              <p className="text-xl sm:text-2xl font-bold">{spendingData.overview?.splitsCount ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-1">Bill Splits</p>
            </div>
          </Card>
        </div>

        {/* Insights Cards */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Key Insights</h3>
          <div className="space-y-3">
            {spendingData.insights.map((insight: any, index: number) => {
              // Backend returns { type: 'positive'|'warning'|'neutral', message: string }
              // Provide safe fallbacks for icon/title/description expected by UI
              const IconComponent = insight.type === 'positive'
                ? Award
                : insight.type === 'warning'
                  ? TrendingDown
                  : DollarSign;
              const title = insight.title || 'Spending Insight';
              const description = insight.description || insight.message || '';
              return (
                <Card key={index} className={`p-4 min-h-[60px] ${getInsightBgColor(insight.type)}`}>
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${getInsightBgColor(insight.type)} flex-shrink-0`}>
                      <IconComponent className={`h-5 w-5 ${getInsightColor(insight.type)}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-base">{title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed mt-1">{description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-3 min-h-[48px]">
            <TabsTrigger value="categories" className="text-sm min-h-[44px]">Categories</TabsTrigger>
            <TabsTrigger value="trends" className="text-sm min-h-[44px]">Trends</TabsTrigger>
            <TabsTrigger value="goals" className="text-sm min-h-[44px]">Goals</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-6 mt-6">
            {/* Category Breakdown */}
            <Card className="p-4 sm:p-6">
              <h3 className="font-medium mb-4 text-lg">Spending by Category</h3>
              {spendingData.currentMonth.categories.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6">No category data for this period.</div>
              ) : (
                <div className="space-y-4">
                  {spendingData.currentMonth.categories.map((category, index) => (
                    <div key={index} className="space-y-3 min-h-[44px] flex flex-col justify-center">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-base">{category.name}</span>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <div className="font-medium text-base">
                            {fmt(category.amount)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {category.percentage}%
                          </div>
                        </div>
                      </div>
                      <Progress 
                        value={category.percentage} 
                        className="h-3"
                        style={{ 
                          '--progress-background': category.color 
                        } as React.CSSProperties}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Weekly Activity */}
            <Card className="p-4 sm:p-6">
              <h3 className="font-medium mb-4 text-lg">This Week's Activity</h3>
              <div className="w-full h-[30vh] min-h-[200px] max-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={spendingData.weeklyActivity}
                    margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={fmtAxis}
                    />
                    <Tooltip formatter={(value: number) => fmt(Number(value))} />
                    <Bar 
                      dataKey="amount" 
                      fill="#000000" 
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6 mt-6">
            {/* Monthly Trends */}
            <Card className="p-4 sm:p-6">
              <h3 className="font-medium mb-4 text-lg">6-Month Spending Trend</h3>
              <div className="w-full h-[35vh] min-h-[250px] max-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={spendingData.monthlyTrends}
                    margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={fmtAxis}
                    />
                    <Tooltip formatter={(value: number) => fmt(Number(value))} />
                    <Line 
                      type="monotone" 
                      dataKey="sent" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Sent"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="received" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Received"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center space-x-6 mt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-destructive rounded-full"></div>
                  <span className="text-sm">Sent</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                  <span className="text-sm">Received</span>
                </div>
              </div>
            </Card>

            {/* Bill Splits Trend */}
            <Card className="p-4 sm:p-6">
              <h3 className="font-medium mb-4 text-lg">Bill Splits Activity</h3>
              <div className="w-full h-[25vh] min-h-[180px] max-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={spendingData.monthlyTrends}
                    margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip formatter={(value: number) => `${Number(value) || 0} splits`} />
                    <Bar 
                      dataKey="splits" 
                      fill="#3b82f6" 
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6 mt-6">
            {/* Budget Goals */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Budget Goals</h3>
              {spendingData.goals.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6">No goals yet for this period.</div>
              ) : spendingData.goals.map((goal, index) => {
                const percentage = (goal.spent / goal.budget) * 100;
                const isOverBudget = percentage > 100;
                
                return (
                  <Card key={index} className={`p-4 min-h-[120px] ${isOverBudget ? 'border-destructive' : ''}`}>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-base">{goal.category}</h4>
                        <Badge variant={isOverBudget ? "destructive" : "secondary"} className="text-xs">
                          {goal.target}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>{fmt(goal.spent)} spent</span>
                          <span>{fmt(goal.budget)} budget</span>
                        </div>
                        <Progress 
                          value={Math.min(percentage, 100)} 
                          className={`h-3 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{percentage.toFixed(1)}% used</span>
                          <span>
                            {fmt(Math.max(goal.budget - goal.spent, 0))} remaining
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Set New Goal Button */}
            <Button variant="outline" className="w-full min-h-[48px]">
              <Target className="h-4 w-4 mr-2" />
              Set New Budget Goal
            </Button>
          </TabsContent>
        </Tabs>

        {/* Export Button */}
        <Button variant="outline" className="w-full min-h-[48px]">
          <BarChart3 className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>
    </div>
  );
}
