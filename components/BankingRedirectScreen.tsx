import { useState, useEffect } from 'react';
import { ArrowLeft, Smartphone, ExternalLink, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { useUserProfile } from './UserProfileContext';
import { formatCurrencyForRegion } from '../utils/regions';

interface BankingRedirectScreenProps {
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
  onNavigate: (tab: string, data?: any) => void;
}

interface LinkedBankOption {
  id: string;
  name: string;
  accountName: string;
  accountType: string;
  last4: string;
  deepLink: string;
  backgroundColor: string;
  isVerified: boolean;
  isDefault: boolean;
}

export function BankingRedirectScreen({ paymentRequest, method, onNavigate }: BankingRedirectScreenProps) {
  const { userProfile, appSettings } = useUserProfile();
  const fmt = (n: number) => formatCurrencyForRegion(appSettings.region, n);
  const linkedBanks: LinkedBankOption[] = userProfile.linkedBankAccounts.map(account => ({
    id: account.id,
    name: account.bankName,
    accountName: account.accountName,
    accountType: account.accountType,
    last4: account.last4,
    deepLink: account.deepLink,
    backgroundColor: account.backgroundColor,
    isVerified: account.isVerified,
    isDefault: account.isDefault
  }));

  const [selectedBank, setSelectedBank] = useState<string | null>(
    linkedBanks.find(bank => bank.isDefault)?.id || linkedBanks[0]?.id || null
  );
  const [redirectStatus, setRedirectStatus] = useState<'selecting' | 'redirecting' | 'waiting' | 'checking'>('selecting');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [checkAttempts, setCheckAttempts] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (redirectStatus === 'waiting' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setRedirectStatus('selecting');
      toast.error('Payment session expired. Please try again.');
    }

    return () => clearInterval(timer);
  }, [redirectStatus, timeLeft]);

  // Simulate checking for payment completion
  useEffect(() => {
    let checkTimer: NodeJS.Timeout;
    
    if (redirectStatus === 'waiting') {
      checkTimer = setInterval(() => {
        setCheckAttempts(prev => prev + 1);
        
        // Simulate random payment completion after some attempts
        if (checkAttempts > 3 && Math.random() > 0.7) {
          onNavigate('payment-confirmation', {
            paymentRequest,
            method,
            status: 'success'
          });
        }
      }, 3000);
    }

    return () => clearInterval(checkTimer);
  }, [redirectStatus, checkAttempts]);

  if (!paymentRequest || !method) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('bills')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2>Payment</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Payment information not found</p>
        </div>
      </div>
    );
  }

  const totalAmount = paymentRequest.amount + method.fees;
  const selectedBankData = linkedBanks.find(bank => bank.id === selectedBank);

  const handleBankSelection = (bankId: string) => {
    setSelectedBank(bankId);
    setRedirectStatus('redirecting');
    
    // Simulate opening banking app
    setTimeout(() => {
      setRedirectStatus('waiting');
      setTimeLeft(300);
      toast.success('Redirected to banking app');
    }, 1500);
  };

  const handleManualCheck = () => {
    setRedirectStatus('checking');
    
    setTimeout(() => {
      // Simulate payment check
      if (Math.random() > 0.5) {
        onNavigate('payment-confirmation', {
          paymentRequest,
          method,
          status: 'success'
        });
      } else {
        setRedirectStatus('waiting');
        toast.error('Payment not detected yet. Please complete the payment in your banking app.');
      }
    }, 2000);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (redirectStatus === 'redirecting') {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2>Redirecting to Bank</h2>
        </div>

        <Card className="p-6">
          <div className="text-center space-y-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-white"
              style={{ backgroundColor: selectedBankData?.backgroundColor }}
            >
              <Smartphone className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-medium">Opening {selectedBankData?.name}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedBankData?.accountName} •••• {selectedBankData?.last4}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please complete your payment in the banking app
              </p>
            </div>
            <Progress value={75} className="w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (redirectStatus === 'waiting' || redirectStatus === 'checking') {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => setRedirectStatus('selecting')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2>Waiting for Payment</h2>
        </div>

        {/* Timer */}
        <Card className="p-4 bg-warning/10 border-warning">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-warning text-warning-foreground flex items-center justify-center">
              <span className="text-sm font-bold">{Math.floor(timeLeft / 60)}</span>
            </div>
            <div>
              <p className="text-sm font-medium">Session expires in {formatTime(timeLeft)}</p>
              <p className="text-xs text-muted-foreground">
                Complete your payment before the session expires
              </p>
            </div>
          </div>
        </Card>

        {/* Status */}
        <Card className="p-6">
          <div className="text-center space-y-4">
            {redirectStatus === 'checking' ? (
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-white"
                style={{ backgroundColor: selectedBankData?.backgroundColor }}
              >
                <Smartphone className="h-8 w-8" />
              </div>
            )}
            <div>
              <h3 className="font-medium">
                {redirectStatus === 'checking' ? 'Checking Payment Status' : `Complete Payment in ${selectedBankData?.name}`}
              </h3>
              {redirectStatus !== 'checking' && (
                <p className="text-sm text-muted-foreground">
                  {selectedBankData?.accountName} •••• {selectedBankData?.last4}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {redirectStatus === 'checking' 
                  ? 'Verifying your payment...'
                  : 'We\'ll automatically detect when your payment is complete'
                }
              </p>
            </div>
          </div>
        </Card>

        {/* Payment Details */}
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Payment to</span>
              <span className="text-sm">{paymentRequest.recipient}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Amount</span>
              <span className="text-sm">{fmt(totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Description</span>
              <span className="text-sm">{paymentRequest.description}</span>
            </div>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-4 bg-muted/50">
          <h4 className="font-medium mb-2">Complete your payment:</h4>
          <ol className="text-sm text-muted-foreground space-y-1">
            <li>1. Authorize the payment in your banking app</li>
            <li>2. Return to SplitPay</li>
            <li>3. We'll confirm your payment automatically</li>
          </ol>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            className="w-full" 
            onClick={handleManualCheck}
            disabled={redirectStatus === 'checking'}
          >
            {redirectStatus === 'checking' ? 'Checking...' : 'Check Payment Status'}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => handleBankSelection(selectedBank!)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open {selectedBankData?.accountName} Again
          </Button>

          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => setRedirectStatus('selecting')}
          >
            Choose Different Bank
          </Button>
        </div>

        {/* Help */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Having trouble? <Button variant="link" className="text-xs p-0 h-auto">Contact Support</Button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('payment-flow', { paymentRequest })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2>Choose Your Bank</h2>
      </div>

      {/* Payment Summary */}
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium">{paymentRequest.description}</p>
            <p className="text-sm text-muted-foreground">To {paymentRequest.recipient}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{fmt(totalAmount)}</p>
            <Badge variant="secondary" className="text-xs">
              {method.name}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Bank Selection */}
      <Card className="p-6">
        <h3 className="font-medium mb-4">Select account to pay from</h3>
        {linkedBanks.length > 0 ? (
          <div className="space-y-3">
            {linkedBanks.map((bank) => (
              <div
                key={bank.id}
                onClick={() => bank.isVerified && handleBankSelection(bank.id)}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedBank === bank.id
                    ? 'border-primary bg-accent'
                    : bank.isVerified
                    ? 'hover:bg-muted/50 border-border'
                    : 'opacity-50 cursor-not-allowed border-muted'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: bank.backgroundColor }}
                  >
                    <span className="text-lg font-bold">
                      {bank.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium truncate">{bank.accountName}</p>
                      {bank.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                      {!bank.isVerified && (
                        <Badge variant="outline" className="text-xs text-warning">
                          Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {bank.name} {bank.accountType} •••• {bank.last4}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Smartphone className="h-6 w-6 text-muted-foreground" />
            </div>
            <h4 className="font-medium mb-2">No Bank Accounts Linked</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Link a bank account to use mobile banking payments
            </p>
            <Button onClick={() => onNavigate('payment-methods')}>
              Link Bank Account
            </Button>
          </div>
        )}
      </Card>

      {/* Security Notice */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-success mt-0.5" />
          <div>
            <p className="text-sm font-medium">Secure Connection</p>
            <p className="text-xs text-muted-foreground">
              You'll be redirected to your bank's official app to complete the payment securely.
            </p>
          </div>
        </div>
      </Card>

      {/* Alternative Options */}
      {linkedBanks.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Need to add another bank?</p>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => onNavigate('payment-methods')}
          >
            Manage Bank Accounts
          </Button>
        </div>
      )}
    </div>
  );
}
