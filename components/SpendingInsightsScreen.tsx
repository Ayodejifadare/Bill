import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, DollarSign, PieChart, BarChart3, Target, Award } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart as RechartsPieChart, Cell, LineChart, Line } from 'recharts';
import { useUserProfile } from './UserProfileContext';

interface SpendingInsightsScreenProps {
  onNavigate: (tab: string) => void;
}


export function SpendingInsightsScreen({ onNavigate }: SpendingInsightsScreenProps) {
  const { appSettings } = useUserProfile();
  const currencySymbol = appSettings.region === 'NG' ? '₦' : '$';
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [spendingData, setSpendingData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const storedAuth = localStorage.getItem('biltip_auth');
        const token = storedAuth ? JSON.parse(storedAuth).token : null;
        if (!token) {
          throw new Error('Unauthorized: Please log in.');
        }
        const res = await fetch(`/api/spending-insights?period=${encodeURIComponent(selectedPeriod)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          throw new Error('Unauthorized: Please log in.');
        }
        if (!res.ok) {
          throw new Error('Failed to fetch spending insights');
        }
        const data = await res.json();
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
              onClick={() => onNavigate('profile')}
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
              <TrendingDown className="h-5 w-5 text-destructive" />
              <Badge variant="outline" className="text-destructive text-xs">
                -8%
              </Badge>
            </div>
            <div className="flex-1 flex flex-col justify-end">
              <p className="text-xl sm:text-2xl font-bold">
                {currencySymbol}{spendingData.currentMonth.total.toFixed(0)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Total Spent</p>
            </div>
          </Card>
          
          <Card className="p-4 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="h-5 w-5 text-success" />
              <Badge variant="outline" className="text-success text-xs">
                +12%
              </Badge>
            </div>
            <div className="flex-1 flex flex-col justify-end">
              <p className="text-xl sm:text-2xl font-bold">15</p>
              <p className="text-sm text-muted-foreground mt-1">Bill Splits</p>
            </div>
          </Card>
        </div>

        {/* Insights Cards */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Key Insights</h3>
          <div className="space-y-3">
            {spendingData.insights.map((insight, index) => {
              const IconComponent = insight.icon;
              return (
                <Card key={index} className={`p-4 min-h-[60px] ${getInsightBgColor(insight.type)}`}>
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${getInsightBgColor(insight.type)} flex-shrink-0`}>
                      <IconComponent className={`h-5 w-5 ${getInsightColor(insight.type)}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-base">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed mt-1">{insight.description}</p>
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
              <div className="space-y-4">
                {spendingData.currentMonth.categories.map((category, index) => (
                  <div key={index} className="space-y-3 min-h-[44px] flex flex-col justify-center">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-base">{category.name}</span>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <div className="font-medium text-base">
                          {currencySymbol}{category.amount.toFixed(2)}
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
                    />
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
                    />
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
              {spendingData.goals.map((goal, index) => {
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
                          <span>{currencySymbol}{goal.spent.toFixed(2)} spent</span>
                          <span>{currencySymbol}{goal.budget.toFixed(2)} budget</span>
                        </div>
                        <Progress 
                          value={Math.min(percentage, 100)} 
                          className={`h-3 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{percentage.toFixed(1)}% used</span>
                          <span>
                            {currencySymbol}{Math.max(goal.budget - goal.spent, 0).toFixed(2)} remaining
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