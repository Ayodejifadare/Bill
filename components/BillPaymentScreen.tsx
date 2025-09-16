import { useState, useEffect } from 'react';
import { ArrowLeft, Building2, Copy, CheckCircle, ExternalLink, Smartphone, Users, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { useUserProfile } from './UserProfileContext';
import { getCurrencySymbol, requiresRoutingNumber, getBankIdentifierLabel, formatBankAccountForRegion, formatCurrencyForRegion } from '../utils/regions';
import { apiClient } from '../utils/apiClient';

interface BillPaymentScreenProps {
  billId: string | null;
  onNavigate: (tab: string, data?: any) => void;
}

interface PaymentMethod {
  id: string;
  type: 'bank' | 'mobile_money';
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  sortCode?: string;
  routingNumber?: string;
  accountType?: 'checking' | 'savings';
  provider?: string;
  phoneNumber?: string;
}

interface BillSplit {
  id: string;
  title: string;
  totalAmount: number;
  yourShare: number;
  status: string;
  participants: Array<{
    name: string;
    amount: number;
    paid: boolean;
  }>;
  createdBy: string;
  date: string;
  paymentMethod: PaymentMethod;
  location?: string;
  note?: string;
}

export function BillPaymentScreen({ billId, onNavigate }: BillPaymentScreenProps) {
  const { appSettings } = useUserProfile();
  const currencySymbol = getCurrencySymbol(appSettings.region);
  
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'sent' | 'confirmed'>('pending');
  const [bill, setBill] = useState<BillSplit | null>(null);

  useEffect(() => {
    if (!billId) return;
    const loadBill = async () => {
      try {
        const data = await apiClient(`/bill-splits/${billId}`);
        if (data?.billSplit) {
          setBill(data.billSplit);
        }
      } catch (error) {
        console.error('Failed to load bill split', error);
      }
    };
    loadBill();
  }, [billId]);

  if (!bill) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onNavigate('bills')}
            className="min-h-[44px] min-w-[44px] -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold">Bill Payment</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Bill not found</p>
        </div>
      </div>
    );
  }

  const copyPaymentDetails = async () => {
    const { paymentMethod } = bill;

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      toast.error('Clipboard not supported. Please copy manually.');
      return;
    }

    try {
      if (paymentMethod.type === 'bank') {
        const usesRouting = requiresRoutingNumber(appSettings.region);
        const label = getBankIdentifierLabel(appSettings.region);
        const idValue = usesRouting ? paymentMethod.routingNumber : paymentMethod.sortCode;
        const bankInfo = `${paymentMethod.bankName}\nAccount Name: ${paymentMethod.accountHolderName}\n${label}: ${idValue ?? ''}\nAccount Number: ${paymentMethod.accountNumber}`;
        await navigator.clipboard.writeText(bankInfo);
        toast.success('Bank account details copied to clipboard');
      } else {
        const mobileInfo = `${paymentMethod.provider}\nPhone Number: ${paymentMethod.phoneNumber}`;
        await navigator.clipboard.writeText(mobileInfo);
        toast.success('Mobile money details copied to clipboard');
      }
    } catch (error) {
      toast.error('Failed to copy details. Please copy manually.');
    }
  };

  const copyAmount = () => {
    navigator.clipboard.writeText(bill.yourShare.toFixed(2));
    toast.success('Amount copied to clipboard');
  };

  const copyReference = async () => {
    try {
      // Prefer server-side reference for reconciliation
      const data = await apiClient(`/api/bill-splits/${bill.id}/reference`, { method: 'POST' });
      const reference = data?.reference || `Biltip-${bill.id}-${Date.now()}`;
      await navigator.clipboard.writeText(reference);
      toast.success('Payment reference copied to clipboard');
    } catch {
      const fallback = `Biltip-${bill.id}-${Date.now()}`;
      try {
        await navigator.clipboard.writeText(fallback);
        toast.success('Payment reference copied to clipboard');
      } catch {
        toast.error('Failed to copy reference. Please copy manually.');
      }
    }
  };

  const markAsSent = async () => {
    if (!bill) return;
    try {
      await apiClient(`/bill-splits/${bill.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' })
      });
      setPaymentStatus('sent');
      toast.success('Payment marked as sent! The bill creator will be notified.');

      // Navigate back to bills screen after a short delay
      setTimeout(() => {
        onNavigate('bills');
      }, 2000);
    } catch (error) {
      console.error('Failed to mark payment as sent', error);
      toast.error('Failed to mark payment as sent');
    }
  };

  const formatAccountNumber = (accountNumber: string) =>
    formatBankAccountForRegion(appSettings.region, accountNumber);

  const getPaymentInstructions = () => {
    const { paymentMethod } = bill;
    
    if (paymentMethod.type === 'bank') {
      return 'Use your banking app (mobile or web), or visit a branch to send this payment.';
    } else {
      return `Open your ${paymentMethod.provider} app and send money to the phone number above.`;
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
            onClick={() => onNavigate('bills')}
            className="min-h-[44px] min-w-[44px] -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">Pay Bill Split</h2>
            <p className="text-sm text-muted-foreground truncate">{bill.title}</p>
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
                    Your payment has been marked as sent. The bill creator will confirm receipt.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Amount to Pay - Prominent display */}
        <Card className="border-primary bg-primary/5">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Amount to Pay
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-6">
            <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
              {formatCurrencyForRegion(appSettings.region, bill.yourShare)}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Your share of {formatCurrencyForRegion(appSettings.region, bill.totalAmount)} total
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyAmount}
              className="min-h-[40px]"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Amount
            </Button>
          </CardContent>
        </Card>

        {/* Payment Destination */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              {bill.paymentMethod.type === 'bank' ? (
                <Building2 className="h-5 w-5" />
              ) : (
                <Smartphone className="h-5 w-5" />
              )}
              Payment Destination
            </CardTitle>
            <CardDescription>
              Send your payment to {bill.createdBy}'s account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-base mb-2">
                        {bill.paymentMethod.type === 'bank' 
                          ? bill.paymentMethod.bankName 
                          : bill.paymentMethod.provider
                        }
                      </p>
                      
                      {bill.paymentMethod.type === 'bank' ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Account Name:</span>
                            <span className="font-medium">{bill.paymentMethod.accountHolderName}</span>
                          </div>
                          {(() => {
                            const usesRouting = requiresRoutingNumber(appSettings.region);
                            const label = getBankIdentifierLabel(appSettings.region);
                            const value = usesRouting ? bill.paymentMethod.routingNumber : bill.paymentMethod.sortCode;
                            return (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">{label}:</span>
                                  <span className="font-mono">{value}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Account Number:</span>
                                  <span className="font-mono">{formatAccountNumber(bill.paymentMethod.accountNumber!)}</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone Number:</span>
                            <span className="font-mono">{bill.paymentMethod.phoneNumber}</span>
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
                Biltip-{bill.id}-{bill.title.replace(/\s+/g, '').slice(0, 10)}
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

        {/* Bill Details - Collapsible on mobile */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Bill Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bill.location && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Location</p>
                <p className="text-sm">{bill.location}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-muted-foreground mb-1">Created by</p>
              <p className="text-sm">{bill.createdBy} • {bill.date}</p>
            </div>

            {bill.note && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Note</p>
                <p className="text-sm leading-relaxed">{bill.note}</p>
              </div>
            )}

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Payment Status</p>
                <p className="text-sm text-muted-foreground">
                  {bill.participants.filter(p => p.paid).length} of {bill.participants.length} paid
                </p>
              </div>
              <div className="space-y-3">
                {bill.participants.map((participant, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-xs">
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate">{participant.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-medium">{formatCurrencyForRegion(appSettings.region, participant.amount)}</span>
                      {participant.paid ? (
                        <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Paid
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-warning/10 text-warning text-xs">
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
              <li>• The bill creator will confirm receipt of your payment</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Action Buttons at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="max-w-md mx-auto space-y-3">
          {paymentStatus === 'pending' && (
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
                  onClick={() => onNavigate('bill-split-details', { billSplitId: bill.id })}
                >
                  View Bill Details
                </Button>
              </div>
            </>
          )}
          
          {paymentStatus === 'sent' && (
            <Button 
              variant="outline" 
              className="w-full h-12"
              onClick={() => onNavigate('bill-split-details', { billSplitId: bill.id })}
            >
              View Bill Details
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
