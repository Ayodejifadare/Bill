import { useState } from 'react';
import { ArrowLeft, Plus, Calendar, Clock, Edit, Trash2, Pause, Play, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Switch } from './ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';
import { useUserProfile } from './UserProfileContext';

interface RecurringPaymentsScreenProps {
  onNavigate: (tab: string, data?: any) => void;
}

interface RecurringPayment {
  id: string;
  title: string;
  recipient: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextPayment: string;
  status: 'active' | 'paused' | 'completed';
  category: string;
  paymentMethod: string;
  startDate: string;
  endDate?: string;
  totalPayments?: number;
  completedPayments: number;
  type: 'bill_split' | 'direct_payment' | 'subscription';
  billSplitId?: string;
}

const mockRecurringPayments: RecurringPayment[] = [
  {
    id: '1',
    title: 'Monthly Rent Split',
    recipient: 'Alex Rodriguez',
    amount: 375.00,
    frequency: 'monthly',
    nextPayment: '2025-02-01',
    status: 'active',
    category: 'Housing',
    paymentMethod: 'Access Bank',
    startDate: '2024-12-01',
    totalPayments: 12,
    completedPayments: 2,
    type: 'bill_split',
    billSplitId: 'rent-split-1'
  },
  {
    id: '2',
    title: 'Netflix Subscription Split',
    recipient: 'Sarah Johnson',
    amount: 4.99,
    frequency: 'monthly',
    nextPayment: '2025-02-15',
    status: 'active',
    category: 'Entertainment',
    paymentMethod: 'Opay',
    startDate: '2024-11-15',
    completedPayments: 3,
    type: 'subscription'
  },
  {
    id: '3',
    title: 'Weekly Grocery Split',
    recipient: 'Mike Chen',
    amount: 45.30,
    frequency: 'weekly',
    nextPayment: '2025-01-20',
    status: 'active',
    category: 'Food & Groceries',
    paymentMethod: 'GTBank',
    startDate: '2025-01-01',
    completedPayments: 2,
    type: 'bill_split',
    billSplitId: 'grocery-split-1'
  },
  {
    id: '4',
    title: 'Gym Membership Split',
    recipient: 'Emily Davis',
    amount: 25.00,
    frequency: 'monthly',
    nextPayment: '2025-01-25',
    status: 'paused',
    category: 'Health & Fitness',
    paymentMethod: 'Access Bank',
    startDate: '2024-10-25',
    endDate: '2025-10-25',
    totalPayments: 12,
    completedPayments: 3,
    type: 'bill_split'
  }
];

export function RecurringPaymentsScreen({ onNavigate }: RecurringPaymentsScreenProps) {
  const { appSettings } = useUserProfile();
  const currencySymbol = appSettings.region === 'NG' ? '₦' : '$';
  const [recurringPayments, setRecurringPayments] = useState(mockRecurringPayments);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success text-success-foreground';
      case 'paused':
        return 'bg-warning text-warning-foreground';
      case 'completed':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'quarterly':
        return 'Quarterly';
      case 'yearly':
        return 'Yearly';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const togglePaymentStatus = (paymentId: string) => {
    setRecurringPayments(payments => 
      payments.map(payment => {
        if (payment.id === paymentId) {
          const newStatus = payment.status === 'active' ? 'paused' : 'active';
          toast.success(`Recurring payment ${newStatus === 'active' ? 'resumed' : 'paused'}`);
          return { ...payment, status: newStatus };
        }
        return payment;
      })
    );
  };

  const deletePayment = () => {
    if (selectedPayment) {
      setRecurringPayments(payments => 
        payments.filter(payment => payment.id !== selectedPayment)
      );
      toast.success('Recurring payment deleted');
      setShowDeleteDialog(false);
      setSelectedPayment(null);
    }
  };

  const activePayments = recurringPayments.filter(p => p.status === 'active');
  const pausedPayments = recurringPayments.filter(p => p.status === 'paused');
  const completedPayments = recurringPayments.filter(p => p.status === 'completed');

  const totalMonthlyAmount = activePayments
    .filter(p => p.frequency === 'monthly')
    .reduce((sum, p) => sum + p.amount, 0) +
    activePayments
      .filter(p => p.frequency === 'weekly')
      .reduce((sum, p) => sum + (p.amount * 4.33), 0); // Approximate monthly

  const RecurringPaymentCard = ({ payment }: { payment: RecurringPayment }) => (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {payment.recipient.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium truncate">{payment.title}</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => onNavigate('setup-recurring-payment', { 
                        paymentId: payment.id,
                        editMode: true
                      })}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Payment
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => togglePaymentStatus(payment.id)}>
                      {payment.status === 'active' ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause Payment
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Resume Payment
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => {
                        setSelectedPayment(payment.id);
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Payment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-sm text-muted-foreground">
                To {payment.recipient} • {getFrequencyLabel(payment.frequency)}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={getStatusColor(payment.status)}>
                  {payment.status}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {payment.category}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Next: {formatDate(payment.nextPayment)}
                </div>
                <div className="text-right">
                  <p className="font-medium">{currencySymbol}{payment.amount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    {payment.completedPayments} of {payment.totalPayments || '∞'} payments
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('home')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2>Recurring Payments</h2>
            <p className="text-sm text-muted-foreground">Manage your automatic payments</p>
          </div>
        </div>
        <Button onClick={() => onNavigate('setup-recurring-payment')}>
          <Plus className="h-4 w-4 mr-2" />
          New
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {currencySymbol}{totalMonthlyAmount.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">Monthly Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{activePayments.length}</p>
            <p className="text-sm text-muted-foreground">Active Payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">
            Active ({activePayments.length})
          </TabsTrigger>
          <TabsTrigger value="paused">
            Paused ({pausedPayments.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedPayments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <div className="space-y-3">
            {activePayments.length > 0 ? (
              activePayments.map((payment) => (
                <RecurringPaymentCard key={payment.id} payment={payment} />
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No Active Recurring Payments</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set up recurring payments to automate your regular bills and subscriptions.
                  </p>
                  <Button onClick={() => onNavigate('setup-recurring-payment')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Recurring Payment
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="paused" className="mt-4">
          <div className="space-y-3">
            {pausedPayments.length > 0 ? (
              pausedPayments.map((payment) => (
                <RecurringPaymentCard key={payment.id} payment={payment} />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No paused payments</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <div className="space-y-3">
            {completedPayments.length > 0 ? (
              completedPayments.map((payment) => (
                <RecurringPaymentCard key={payment.id} payment={payment} />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No completed payments</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => onNavigate('setup-recurring-payment')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Set Up New Recurring Payment
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => onNavigate('upcoming-payments')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            View Upcoming Payments
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recurring payment? This action cannot be undone and will stop all future automatic payments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletePayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}