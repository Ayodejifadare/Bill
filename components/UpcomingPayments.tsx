import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Clock, AlertTriangle, Calendar, Users, CreditCard } from 'lucide-react';
import { useUserProfile } from './UserProfileContext';
import { ListSkeleton } from './ui/loading';
import { Alert, AlertDescription } from './ui/alert';
import { useUpcomingPayments } from '../hooks/useUpcomingPayments';

interface UpcomingPaymentsProps {
  onNavigate: (tab: string, data?: any) => void;
}

export function UpcomingPayments({ onNavigate }: UpcomingPaymentsProps) {
  const { appSettings } = useUserProfile();
  const currencySymbol = appSettings.region === 'NG' ? '₦' : '$';
  const { upcomingPayments, loading, error } = useUpcomingPayments();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'due_soon':
        return <AlertTriangle className="h-3 w-3" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'upcoming':
        return <Calendar className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'due_soon':
        return 'bg-warning text-warning-foreground';
      case 'pending':
        return 'bg-primary text-primary-foreground';
      case 'upcoming':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
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

  if (loading) {
    return <ListSkeleton count={2} />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (upcomingPayments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3>Upcoming Payments</h3>
        <Button variant="ghost" size="sm" onClick={() => onNavigate('upcoming-payments')}>
          See All
        </Button>
      </div>

      <div className="space-y-3">
        {upcomingPayments.slice(0, 2).map((payment) => (
          <Card key={payment.id} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer" 
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
                  variant={payment.status === 'due_soon' ? 'default' : 'outline'}
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
                  {payment.status === 'due_soon' ? 'Pay Now' : 'Pay'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
