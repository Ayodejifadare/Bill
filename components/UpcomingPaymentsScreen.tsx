import { ArrowLeft, Calendar, AlertCircle, Clock, CreditCard, DollarSign, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useUserProfile } from './UserProfileContext';

interface UpcomingPaymentsScreenProps {
  onNavigate: (tab: string, data?: any) => void;
}

const mockUpcomingPayments = [
  {
    id: '1',
    type: 'bill_split',
    title: 'Team Dinner at Tony\'s Pizza',
    amount: 28.50,
    dueDate: 'Today',
    status: 'due_soon',
    organizer: { name: 'Emily Davis', avatar: 'ED' },
    participants: 5,
    billSplitId: '1',
    paymentMethod: {
      type: 'bank',
      bankName: 'Access Bank',
      accountNumber: '0123456789',
      accountHolderName: 'Emily Davis',
      sortCode: '044'
    }
  },
  {
    id: '2',
    type: 'request',
    title: 'Netflix Subscription',
    amount: 15.99,
    dueDate: 'Tomorrow',
    status: 'pending',
    organizer: { name: 'Mike Chen', avatar: 'MC' },
    participants: 4,
    requestId: '2'
  },
  {
    id: '3',
    type: 'bill_split',
    title: 'Weekend Groceries',
    amount: 42.30,
    dueDate: 'Jan 20',
    status: 'upcoming',
    organizer: { name: 'Sarah Johnson', avatar: 'SJ' },
    participants: 3,
    billSplitId: '3',
    paymentMethod: {
      type: 'mobile_money',
      provider: 'Opay',
      phoneNumber: '+234 801 234 5678'
    }
  },
  {
    id: '4',
    type: 'bill_split',
    title: 'Monthly Rent Split',
    amount: 375.00,
    dueDate: 'Jan 22',
    status: 'upcoming',
    organizer: { name: 'Alex Rodriguez', avatar: 'AR' },
    participants: 2,
    billSplitId: '4',
    paymentMethod: {
      type: 'bank',
      bankName: 'GTBank',
      accountNumber: '0987654321',
      accountHolderName: 'Alex Rodriguez',
      sortCode: '058'
    }
  }
];

const overduePayments = [
  {
    id: '5',
    type: 'bill_split',
    title: 'Concert Tickets',
    amount: 85.00,
    dueDate: '2 days ago',
    status: 'overdue',
    organizer: { name: 'Jessica Lee', avatar: 'JL' },
    participants: 6,
    billSplitId: '5',
    paymentMethod: {
      type: 'bank',
      bankName: 'First Bank',
      accountNumber: '2134567890',
      accountHolderName: 'Jessica Lee',
      sortCode: '011'
    }
  }
];

export function UpcomingPaymentsScreen({ onNavigate }: UpcomingPaymentsScreenProps) {
  const { appSettings } = useUserProfile();
  const currencySymbol = appSettings.region === 'NG' ? '₦' : '$';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'due_soon':
        return 'bg-warning text-warning-foreground';
      case 'overdue':
        return 'bg-destructive text-destructive-foreground';
      case 'pending':
        return 'bg-primary text-primary-foreground';
      case 'upcoming':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'due_soon':
        return <AlertTriangle className="h-3 w-3" />;
      case 'overdue':
        return <AlertCircle className="h-3 w-3" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'upcoming':
        return <Calendar className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bill_split':
        return <Users className="h-4 w-4" />;
      case 'request':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const PaymentCard = ({ payment }: { payment: any }) => (
    <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
          onClick={() => {
            if (payment.type === 'bill_split' && payment.billSplitId) {
              onNavigate('bill-split-details', { billSplitId: payment.billSplitId });
            } else if (payment.type === 'request' && payment.requestId) {
              onNavigate('transaction-details', { transactionId: payment.requestId });
            }
          }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {payment.organizer.avatar}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              {getTypeIcon(payment.type)}
              <p className="font-medium truncate">{payment.title}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {payment.organizer.name} • {payment.participants} people
            </p>
            
            {/* Show payment method info if available */}
            {payment.paymentMethod && (
              <p className="text-xs text-muted-foreground mt-1">
                {payment.paymentMethod.type === 'bank' ? (
                  <>Pay via {payment.paymentMethod.bankName}</>
                ) : (
                  <>Pay via {payment.paymentMethod.provider}</>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="text-right space-y-2">
          <p className="font-medium">{currencySymbol}{payment.amount.toFixed(2)}</p>
          <Badge className={`${getStatusColor(payment.status)} text-xs flex items-center gap-1`}>
            {getStatusIcon(payment.status)}
            Due {payment.dueDate}
          </Badge>
          <Button 
            size="sm" 
            variant={payment.status === 'overdue' || payment.status === 'due_soon' ? 'default' : 'outline'}
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              if (payment.type === 'bill_split' && payment.billSplitId) {
                onNavigate('pay-bill', { billId: payment.billSplitId });
              } else {
                // For direct money requests, use the simplified payment flow
                onNavigate('payment-flow', {
                  paymentRequest: {
                    id: `upcoming-${payment.id}`,
                    amount: payment.amount,
                    description: payment.title,
                    recipient: payment.organizer.name,
                    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                  }
                });
              }
            }}
          >
            {payment.status === 'overdue' ? 'Pay Overdue' : payment.status === 'due_soon' ? 'Pay Now' : 'Pay'}
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('home')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2>Upcoming Payments</h2>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-center space-y-2">
            <p className="font-medium text-destructive">{currencySymbol}{(overduePayments.reduce((sum, p) => sum + p.amount, 0) + mockUpcomingPayments.filter(p => p.status === 'due_soon').reduce((sum, p) => sum + p.amount, 0)).toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Due Soon</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center space-y-2">
            <p className="font-medium">{currencySymbol}{mockUpcomingPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">This Month</p>
          </div>
        </Card>
      </div>

      {/* Payments List */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-4">
          <div className="space-y-3">
            {mockUpcomingPayments.filter(p => p.status === 'upcoming' || p.status === 'due_soon').map((payment) => (
              <PaymentCard key={payment.id} payment={payment} />
            ))}
            {mockUpcomingPayments.filter(p => p.status === 'upcoming' || p.status === 'due_soon').length === 0 && (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No upcoming payments</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="overdue" className="mt-4">
          <div className="space-y-3">
            {overduePayments.map((payment) => (
              <PaymentCard key={payment.id} payment={payment} />
            ))}
            {overduePayments.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No overdue payments</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="pending" className="mt-4">
          <div className="space-y-3">
            {mockUpcomingPayments.filter(p => p.status === 'pending').map((payment) => (
              <PaymentCard key={payment.id} payment={payment} />
            ))}
            {mockUpcomingPayments.filter(p => p.status === 'pending').length === 0 && (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No pending payments</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="space-y-3">
        
        <Button className="w-full" onClick={() => onNavigate('split')}>
          Create New Split
        </Button>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => onNavigate('split')}
        >
          Create Recurring Split
        </Button>
      </div>
    </div>
  );
}