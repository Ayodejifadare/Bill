import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Share, Download, ArrowRight, Receipt, Users, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { ShareSheet } from './ui/share-sheet';
import { useUserProfile } from './UserProfileContext';

interface PaymentConfirmationScreenProps {
  paymentRequest: {
    id: string;
    amount: number;
    description: string;
    recipient: string;
    groupId?: string;
    billSplitId?: string;
  } | null;
  method: {
    name: string;
    fees: number;
  } | null;
  status: 'success' | 'failed' | 'pending';
  onNavigate: (tab: string, data?: any) => void;
}

interface PaymentResult {
  transactionId: string;
  timestamp: string;
  confirmationNumber: string;
  estimatedArrival?: string;
  virtualAccountId?: string;
}

export function PaymentConfirmationScreen({ 
  paymentRequest, 
  method, 
  status, 
  onNavigate 
}: PaymentConfirmationScreenProps) {
  const { appSettings } = useUserProfile();
  const currencySymbol = appSettings.region === 'NG' ? '₦' : '$';

  const [paymentResult] = useState<PaymentResult>({
    transactionId: `TXN${Date.now()}`,
    timestamp: new Date().toISOString(),
    confirmationNumber: `BLT${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    estimatedArrival: status === 'success' ? 'Instant' : undefined,
    virtualAccountId: paymentRequest?.groupId ? `VA${Math.random().toString(36).substr(2, 6)}` : undefined
  });

  const [showDetails, setShowDetails] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);

  useEffect(() => {
    if (status === 'success') {
      // Show success toast with haptic feedback simulation
      toast.success('Payment sent successfully!');
    } else if (status === 'failed') {
      toast.error('Payment failed. Please try again.');
    }
  }, [status]);

  if (!paymentRequest || !method) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Payment information not found</p>
        </div>
      </div>
    );
  }

  const totalAmount = paymentRequest.amount + method.fees;

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-success',
          bgColor: 'bg-success/10',
          title: 'Payment Sent!',
          subtitle: 'Your payment has been processed successfully',
          borderColor: 'border-success'
        };
      case 'failed':
        return {
          icon: XCircle,
          iconColor: 'text-destructive',
          bgColor: 'bg-destructive/10',
          title: 'Payment Failed',
          subtitle: 'We couldn\'t process your payment',
          borderColor: 'border-destructive'
        };
      case 'pending':
        return {
          icon: Clock,
          iconColor: 'text-warning',
          bgColor: 'bg-warning/10',
          title: 'Payment Pending',
          subtitle: 'Your payment is being processed',
          borderColor: 'border-warning'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const handleShare = () => {
    setShowShareSheet(true);
  };

  const handleDownloadReceipt = () => {
    toast.success('Receipt downloaded');
    // In a real app, this would generate and download a PDF receipt
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card className={`p-6 ${statusConfig.bgColor} ${statusConfig.borderColor} border-2`}>
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <StatusIcon className={`h-16 w-16 ${statusConfig.iconColor}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{statusConfig.title}</h2>
            <p className="text-sm text-muted-foreground">{statusConfig.subtitle}</p>
          </div>
          {status === 'success' && (
            <Badge variant="outline" className="border-success text-success">
              Transaction #{paymentResult.confirmationNumber}
            </Badge>
          )}
        </div>
      </Card>

      {/* Payment Details */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {paymentRequest.recipient.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{paymentRequest.description}</p>
              <p className="text-sm text-muted-foreground">To {paymentRequest.recipient}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(paymentResult.timestamp)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{currencySymbol}{paymentRequest.amount.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">via {method.name}</p>
            </div>
          </div>

          {/* Virtual Account Info for Group Payments */}
          {paymentRequest.groupId && status === 'success' && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Group Payment</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Funds have been securely deposited into the group's virtual account 
                (ID: {paymentResult.virtualAccountId}). The host can distribute funds once all members have paid.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Transaction Details */}
      <Card className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-between"
          onClick={() => setShowDetails(!showDetails)}
        >
          <span className="font-medium">Transaction Details</span>
          <ArrowRight className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
        </Button>
        
        {showDetails && (
          <div className="mt-4 space-y-3">
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-mono">{paymentResult.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confirmation Number</span>
                <span className="font-mono">{paymentResult.confirmationNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Amount</span>
                <span>{currencySymbol}{paymentRequest.amount.toFixed(2)}</span>
              </div>
              {method.fees > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processing Fee</span>
                  <span>{currencySymbol}{method.fees.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span>Total Charged</span>
                <span>{currencySymbol}{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span>{method.name}</span>
              </div>
              {paymentResult.estimatedArrival && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Arrival Time</span>
                  <span>{paymentResult.estimatedArrival}</span>
                </div>
              )}
              {paymentResult.virtualAccountId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Virtual Account</span>
                  <span className="font-mono">{paymentResult.virtualAccountId}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Action Buttons */}
      {status === 'success' && (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="w-full" onClick={handleShare}>
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" className="w-full" onClick={handleDownloadReceipt}>
            <Download className="h-4 w-4 mr-2" />
            Receipt
          </Button>
        </div>
      )}

      {/* Navigation Options */}
      <div className="space-y-3">
        {status === 'success' && (
          <>
            {paymentRequest.groupId && (
              <Button 
                className="w-full" 
                onClick={() => onNavigate('group-details', { groupId: paymentRequest.groupId })}
              >
                <Users className="h-4 w-4 mr-2" />
                View Group
              </Button>
            )}
            
            {paymentRequest.billSplitId && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onNavigate('bill-split-details', { billSplitId: paymentRequest.billSplitId })}
              >
                <Receipt className="h-4 w-4 mr-2" />
                View Bill Details
              </Button>
            )}
          </>
        )}

        {status === 'failed' && (
          <Button 
            className="w-full"
            onClick={() => onNavigate('payment-flow', { paymentRequest })}
          >
            Try Again
          </Button>
        )}

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => onNavigate('home')}
        >
          <Home className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>

      {/* Support Info */}
      {status === 'failed' && (
        <Card className="p-4 bg-muted/50">
          <h4 className="font-medium mb-2">Need Help?</h4>
          <p className="text-sm text-muted-foreground mb-3">
            If you continue to experience issues, our support team is here to help.
          </p>
          <Button variant="link" className="text-sm p-0 h-auto">
            Contact Support
          </Button>
        </Card>
      )}

      {/* Additional Info for Group Payments */}
      {paymentRequest.groupId && status === 'success' && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <h4 className="font-medium mb-2">What happens next?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Your payment is held securely in the group's virtual account</li>
            <li>• You'll be notified when all members have paid</li>
            <li>• The host can then distribute funds to complete the settlement</li>
          </ul>
        </Card>
      )}
      {/* Share Sheet */}
      {showShareSheet && (
        <ShareSheet
          isOpen={showShareSheet}
          onClose={() => setShowShareSheet(false)}
          title="Share Payment Receipt"
          shareText={`*Payment Sent Successfully!*\n\n💰 Amount: ${currencySymbol}${paymentRequest.amount.toFixed(2)}\n👤 To: ${paymentRequest.recipient}\n📋 For: ${paymentRequest.description}\n🧾 Reference: ${paymentResult.confirmationNumber}\n💳 Method: ${method.name}\n\n_Paid via Biltip 🚀_`}
          documentData={{
            title: `Payment to ${paymentRequest.recipient}`,
            content: { paymentRequest, paymentResult, method },
            type: 'receipt'
          }}
        />
      )}
    </div>
  );
}