import { useState, useEffect } from 'react';
import { ArrowLeft, Building2, Copy, CheckCircle, ExternalLink, Smartphone, Users, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
// import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { useUserProfile } from './UserProfileContext';
import { getCurrencySymbol, formatCurrencyForRegion, requiresRoutingNumber, getBankIdentifierLabel, formatBankAccountForRegion } from '../utils/regions';
import { type PaymentMethod, fetchUserPaymentMethods } from '@/api/payment-methods';

interface PaymentFlowScreenProps {
  paymentRequest: {
    id: string;
    amount: number;
    description: string;
    recipient: string;
    groupId?: string;
    billSplitId?: string;
    dueDate?: string;
  } | null;
  onNavigate: (tab: string, data?: any) => void;
}

const recipientMethodCache = new Map<string, PaymentMethod | null>();

export function PaymentFlowScreen({ paymentRequest, onNavigate }: PaymentFlowScreenProps) {
  const { appSettings } = useUserProfile();
  
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'sent' | 'confirmed'>('pending');
  const [recipientPaymentMethod, setRecipientPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isMethodLoading, setIsMethodLoading] = useState(false);
  const [methodError, setMethodError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentRequest) return;

    const recipientId = paymentRequest.recipient;
    const cached = recipientMethodCache.get(recipientId);
    if (cached !== undefined) {
      setRecipientPaymentMethod(cached);
      return;
    }

    const loadMethod = async () => {
      setIsMethodLoading(true);
      setMethodError(null);
      try {
        const methods = await fetchUserPaymentMethods(recipientId);
        const method = methods[0] || null;
        recipientMethodCache.set(recipientId, method);
        setRecipientPaymentMethod(method);
      } catch (err: any) {
        setMethodError(err.message || 'Failed to load payment method');
        recipientMethodCache.set(recipientId, null);
        setRecipientPaymentMethod(null);
      } finally {
        setIsMethodLoading(false);
      }
    };

    loadMethod();
  }, [paymentRequest]);

  if (!paymentRequest) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onNavigate('home')}
            className="min-h-[44px] min-w-[44px] -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold">Payment</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No payment request found</p>
        </div>
      </div>
    );
  }

  const copyPaymentDetails = async () => {
    if (!recipientPaymentMethod) return;

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      toast.error('Clipboard not supported. Please copy manually.');
      return;
    }

    try {
      if (recipientPaymentMethod.type === 'bank') {
        const usesRouting = requiresRoutingNumber(appSettings.region);
        const label = getBankIdentifierLabel(appSettings.region);
        const idValue = usesRouting ? recipientPaymentMethod.routingNumber : recipientPaymentMethod.sortCode;
        const bankInfo = `${recipientPaymentMethod.bank}\nAccount Name: ${recipientPaymentMethod.accountName}\n${label}: ${idValue ?? ''}\nAccount Number: ${recipientPaymentMethod.accountNumber}`;
        await navigator.clipboard.writeText(bankInfo);
        toast.success('Bank account details copied to clipboard');
      } else {
        const mobileInfo = `${recipientPaymentMethod.provider}\nPhone Number: ${recipientPaymentMethod.phoneNumber}`;
        await navigator.clipboard.writeText(mobileInfo);
        toast.success('Mobile money details copied to clipboard');
      }
    } catch (error) {
      toast.error('Failed to copy details. Please copy manually.');
    }
  };

  const copyAmount = () => {
    navigator.clipboard.writeText(paymentRequest.amount.toFixed(2));
    toast.success('Amount copied to clipboard');
  };

  const copyReference = async () => {
    try {
      let reference: string | null = null;
      if ((paymentRequest as any)?.billSplitId) {
        const data = await apiClient(`/api/bill-splits/${(paymentRequest as any).billSplitId}/reference`, { method: 'POST' });
        reference = data?.reference || null;
      }
      const refToCopy = reference || `Biltip-${paymentRequest.id}-${Date.now()}`;
      await navigator.clipboard.writeText(refToCopy);
      toast.success('Payment reference copied to clipboard');
    } catch {
      const fallback = `Biltip-${paymentRequest.id}-${Date.now()}`;
      try {
        await navigator.clipboard.writeText(fallback);
        toast.success('Payment reference copied to clipboard');
      } catch {
        toast.error('Failed to copy reference. Please copy manually.');
      }
    }
  };

  const markAsSent = () => {
    setPaymentStatus('sent');
    toast.success('Payment marked as sent! The recipient will be notified.');
    
    // Navigate back to home screen after a short delay
    setTimeout(() => {
      onNavigate('home');
    }, 2000);
  };

  const formatAccountNumber = (accountNumber: string) =>
    formatBankAccountForRegion(appSettings.region, accountNumber);

  const getPaymentInstructions = () => {
    if (!recipientPaymentMethod) return 'Payment method information not available.';
    
    if (recipientPaymentMethod.type === 'bank') {
      return 'Use your banking app (mobile or web), or visit a branch to send this payment.';
    } else {
      return `Open your ${recipientPaymentMethod.provider} app and send money to the phone number above.`;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Sticky for better mobile navigation */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center space-x-3 px-4 py-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onNavigate('home')}
            className="min-h-[44px] min-w-[44px] -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">Send Payment</h2>
            <p className="text-sm text-muted-foreground truncate">{paymentRequest.description}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 pb-32">
        {/* Payment Status */}
        {paymentStatus === 'sent' && (
          <Card className="border-success bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 text-success">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">Payment Sent!</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your payment has been marked as sent. The recipient will be notified.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Overview - Enhanced mobile layout */}
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarFallback className="text-base">
                    {paymentRequest.recipient.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-base leading-tight">{paymentRequest.description}</h3>
                  <p className="text-sm text-muted-foreground mt-1">To {paymentRequest.recipient}</p>
                  {paymentRequest.dueDate && (
                    <div className="flex items-center space-x-1 mt-2">
                      <Clock className="h-3 w-3 text-warning flex-shrink-0" />
                      <span className="text-xs text-warning">
                        Due {formatDate(paymentRequest.dueDate)}
                      </span>
                    </div>
                  )}
                  {paymentRequest.groupId && (
                    <Badge variant="secondary" className="text-xs mt-2">
                      Group Payment
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Amount - Prominent display */}
              <div className="text-center py-4 bg-background/50 rounded-lg">
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                  {formatCurrencyForRegion(appSettings.region, paymentRequest.amount)}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyAmount}
                  className="min-h-[40px]"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Amount
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Destination */}
        {isMethodLoading ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-muted-foreground text-sm">Loading payment method...</div>
            </CardContent>
          </Card>
        ) : methodError ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-sm text-destructive">{methodError}</div>
            </CardContent>
          </Card>
        ) : recipientPaymentMethod ? (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                {recipientPaymentMethod.type === 'bank' ? (
                  <Building2 className="h-5 w-5" />
                ) : (
                  <Smartphone className="h-5 w-5" />
                )}
                Payment Destination
              </CardTitle>
              <CardDescription>
                Send your payment to {paymentRequest.recipient}'s account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-base mb-2">
                          {recipientPaymentMethod.type === 'bank'
                            ? recipientPaymentMethod.bank
                            : recipientPaymentMethod.provider}
                        </p>

                        {recipientPaymentMethod.type === 'bank' ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Account Name:</span>
                              <span className="font-medium">{recipientPaymentMethod.accountName}</span>
                            </div>
                            {(() => {
                              const label = getBankIdentifierLabel(appSettings.region);
                              const usesRouting = requiresRoutingNumber(appSettings.region);
                              const value = usesRouting ? recipientPaymentMethod.routingNumber : recipientPaymentMethod.sortCode;
                              return (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">{label}:</span>
                                    <span className="font-mono">{value}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Account Number:</span>
                                    <span className="font-mono">{formatAccountNumber(recipientPaymentMethod.accountNumber!)}</span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Phone Number:</span>
                              <span className="font-mono">{recipientPaymentMethod.phoneNumber}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyPaymentDetails}
                        className="min-h-[40px] min-w-[40px] ml-2"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                💡 {getPaymentInstructions()}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-3">
                <div className="text-muted-foreground text-sm">
                  ⚠️ Payment method information not available for {paymentRequest.recipient}.
                </div>
                <p className="text-sm">
                  Please contact them directly for payment details.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Reference */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Payment Reference</CardTitle>
            <CardDescription>
              Include this reference in your payment description
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <span className="font-mono text-sm min-w-0 flex-1 break-all">
                Biltip-{paymentRequest.id}-{paymentRequest.description.replace(/\s+/g, '').slice(0, 10)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyReference}
                className="min-h-[40px] min-w-[40px] flex-shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm leading-relaxed">{paymentRequest.description}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-1">Recipient</p>
              <p className="text-sm">{paymentRequest.recipient}</p>
            </div>

            {paymentRequest.dueDate && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Due Date</p>
                <p className="text-sm">{formatDate(paymentRequest.dueDate)}</p>
              </div>
            )}

            {paymentRequest.groupId && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Payment Type</p>
                <p className="text-sm">Group Payment</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Text */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Need Help?</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Make sure to include the payment reference</li>
              <li>• Double-check the account details before sending</li>
              <li>• Click "Mark as Sent" after completing the transfer</li>
              <li>• The recipient will be notified of your payment</li>
              {!recipientPaymentMethod && (
                <li>• Contact the recipient directly if payment details are missing</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Action Buttons at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="max-w-md mx-auto space-y-3">
          {paymentStatus === 'pending' && recipientPaymentMethod ? (
            <>
              <Button className="w-full h-12 text-base font-medium" onClick={markAsSent}>
                <CheckCircle className="h-5 w-5 mr-2" />
                Mark as Sent
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Banking App
                </Button>
                <Button 
                  variant="outline" 
                  className="h-12"
                  onClick={() => onNavigate('home')}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <Button 
              variant="outline" 
              className="w-full h-12"
              onClick={() => onNavigate('home')}
            >
              {paymentStatus === 'sent' ? 'Back to Home' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
