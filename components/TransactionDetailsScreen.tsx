import { useEffect, useState } from 'react';
import { ArrowLeft, User, Calendar, Building2, MapPin, Receipt, MoreHorizontal, Copy, Smartphone, Share2, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { useUserProfile } from './UserProfileContext';
import { getCurrencySymbol, requiresRoutingNumber, getBankIdentifierLabel, formatBankAccountForRegion, formatCurrencyForRegion } from '../utils/regions';
import { ShareSheet } from './ui/share-sheet';
import { createDeepLink } from './ShareUtils';
import { apiClient } from '../utils/apiClient';

interface PaymentMethod {
  type: 'bank' | 'mobile_money';
  // Bank fields
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  sortCode?: string;
  routingNumber?: string;
  accountType?: 'checking' | 'savings';
  // Mobile money fields
  provider?: string;
  phoneNumber?: string;
}

interface TransactionDetailsScreenProps {
  transactionId: string | null;
  onNavigate: (tab: string, data?: any) => void;
}

interface TransactionDetails {
  id: string;
  type: string;
  amount: number;
  description: string;
  user: {
    id?: string;
    name: string;
    avatar?: string;
    phone?: string;
  };
  date: string;
  status: string;
  fullDate: string;
  location?: string;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  note?: string;
  category?: string;
  coordinationType?: string;
  paymentInstructions?: string;
  totalParticipants?: number;
  paidParticipants?: number;
}

export function TransactionDetailsScreen({ transactionId, onNavigate }: TransactionDetailsScreenProps) {
  const { appSettings } = useUserProfile();
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currencySymbol = getCurrencySymbol(appSettings.region);

  const mapTransaction = (data: any): TransactionDetails => {
    const user = data.user || data.sender || data.receiver || {};
    return {
      id: data.id,
      type: data.type,
      amount: data.amount,
      description: data.description || '',
      user: {
        id: user.id,
        name: user.name || 'Unknown',
        avatar: user.avatar || (user.name ? user.name.split(' ').map((n: string) => n[0]).join('') : ''),
        phone: user.phone || user.phoneNumber,
      },
      date: data.date || data.createdAt || new Date().toISOString(),
      status: data.status,
      fullDate: data.fullDate || new Date(data.date || data.createdAt || Date.now()).toLocaleString(),
      location: data.location,
      paymentMethod: data.paymentMethod,
      transactionId: data.transactionId || data.reference,
      note: data.note,
      category: data.category,
      coordinationType: data.coordinationType,
      paymentInstructions: data.paymentInstructions,
      totalParticipants: data.totalParticipants,
      paidParticipants: data.paidParticipants,
    };
  };

  useEffect(() => {
    if (!transactionId) return;
    const fetchTransaction = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient(`/api/transactions/${transactionId}`);
        const tx = mapTransaction(data.transaction || data);
        setTransaction(tx);
      } catch (err) {
        console.error('Failed to load transaction', err);
        setError('Failed to load transaction');
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [transactionId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'payment_sent': 
      case 'payment_received': 
        return 'bg-success text-success-foreground';
      case 'pending_payment': 
        return 'bg-warning text-warning-foreground';
      case 'coordination_failed': 
        return 'bg-destructive text-destructive-foreground';
      default: 
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'payment_sent': return 'Payment Sent';
      case 'payment_received': return 'Payment Received';
      case 'pending_payment': return 'Pending Payment';
      case 'coordination_failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'coordination_received': return 'text-success';
      case 'coordination_sent': return 'text-primary';
      case 'split_coordination': return 'text-warning';
      default: return 'text-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'coordination_received': return 'Money Received';
      case 'coordination_sent': return 'Money Sent';
      case 'split_coordination': return 'Bill Split';
      default: return 'Transaction';
    }
  };

  // Create share data for this transaction
  const shareData = transaction ? {
    type: 'transaction' as const,
    title: transaction.description,
    amount: transaction.amount,
    status: getStatusLabel(transaction.status),
    transactionId: transaction.transactionId,
    paymentMethod: transaction.paymentMethod?.type === 'bank'
      ? transaction.paymentMethod.bankName
      : transaction.paymentMethod?.provider,
    deepLink: createDeepLink('transaction', transaction.id)
  } : null;

  const renderPlaceholder = (message: string) => (
    <div className="pb-20">
      {/* Static Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('home')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1>Transaction Details</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return renderPlaceholder('Loading transaction...');
  }

  if (error) {
    return renderPlaceholder(error);
  }

  if (!transaction) {
    return renderPlaceholder('Transaction not found');
  }

  const copyPaymentDetails = async () => {
    if (!transaction.paymentMethod) return;
    
    const paymentMethod = transaction.paymentMethod;
    
    try {
      if (paymentMethod.type === 'bank') {
        const usesRouting = requiresRoutingNumber(appSettings.region);
        const label = getBankIdentifierLabel(appSettings.region);
        const idValue = usesRouting ? paymentMethod.routingNumber : paymentMethod.sortCode;
        const bankInfo = `${paymentMethod.bankName}\nAccount Name: ${paymentMethod.accountHolderName}\n${label}: ${idValue ?? ''}\nAccount Number: ${paymentMethod.accountNumber}`;
        
        // Try modern clipboard first
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(bankInfo);
          toast.success('Bank account details copied to clipboard');
        } else {
          // Fallback to legacy method
          const textArea = document.createElement('textarea');
          textArea.value = bankInfo;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            toast.success('Bank account details copied to clipboard');
          } else {
            throw new Error('Copy failed');
          }
        }
      } else {
        const mobileInfo = `${paymentMethod.provider}\nPhone Number: ${paymentMethod.phoneNumber}`;
        
        // Try modern clipboard first
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(mobileInfo);
          toast.success('Mobile money details copied to clipboard');
        } else {
          // Fallback to legacy method
          const textArea = document.createElement('textarea');
          textArea.value = mobileInfo;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            toast.success('Mobile money details copied to clipboard');
          } else {
            throw new Error('Copy failed');
          }
        }
      }
    } catch (error) {
      console.error('Copy payment details failed:', error);
      toast.error('Unable to copy details. Please try again or copy manually from the displayed information.');
    }
  };

  const formatAccountNumber = (accountNumber: string) =>
    formatBankAccountForRegion(appSettings.region, accountNumber);

  return (
    <div className="pb-20">
      {/* Static Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('home')}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1>Transaction Details</h1>
          </div>
          <div className="flex items-center space-x-2">
            {shareData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareSheet(true)}
                className="p-2"
                aria-label="Share transaction details"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">

        {/* Transaction Overview */}
        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {transaction.user.avatar}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h3 className="text-lg font-medium">{transaction.user.name}</h3>
              <p className="text-muted-foreground">{transaction.description}</p>
              <p className="text-xs text-muted-foreground mt-1">{getTypeLabel(transaction.type)}</p>
            </div>
            <div className="space-y-2">
              <p className={`text-3xl font-bold ${getTypeColor(transaction.type)}`}>
                {transaction.type === 'coordination_sent' ? '' : '+'}
                {formatCurrencyForRegion(appSettings.region, transaction.amount)}
              </p>
              <Badge className={getStatusColor(transaction.status)}>
                {getStatusLabel(transaction.status)}
              </Badge>
            </div>

            {/* Split Progress (for bill splits) */}
            {transaction.type === 'split_coordination' && transaction.totalParticipants && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">Split Progress</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {transaction.paidParticipants} of {transaction.totalParticipants} participants have paid
                </p>
                <div className="w-full bg-background rounded-full h-2 mt-2">
                  <div 
                    className="bg-success h-2 rounded-full" 
                    style={{ width: `${((transaction.paidParticipants || 0) / transaction.totalParticipants) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Payment Method Details */}
        {transaction.paymentMethod && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {transaction.paymentMethod.type === 'bank' ? (
                  <Building2 className="h-5 w-5" />
                ) : (
                  <Smartphone className="h-5 w-5" />
                )}
                Payment Method
              </CardTitle>
              <CardDescription>
                Details {transaction.type === 'coordination_sent' ? 'shared with' : 'received from'} {transaction.user.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Card className="bg-muted">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {transaction.paymentMethod.type === 'bank' 
                          ? transaction.paymentMethod.bankName 
                          : transaction.paymentMethod.provider
                        }
                      </p>
                      
                      {transaction.paymentMethod.type === 'bank' ? (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Account Holder: {transaction.paymentMethod.accountHolderName}
                          </p>
                          {requiresRoutingNumber(appSettings.region) && transaction.paymentMethod.accountType && (
                            <p className="text-sm text-muted-foreground">
                              Account Type: {transaction.paymentMethod.accountType.charAt(0).toUpperCase() + transaction.paymentMethod.accountType.slice(1)}
                            </p>
                          )}
                          {(() => {
                            const label = getBankIdentifierLabel(appSettings.region);
                            const usesRouting = requiresRoutingNumber(appSettings.region);
                            const value = usesRouting ? transaction.paymentMethod.routingNumber : transaction.paymentMethod.sortCode;
                            return (
                              <>
                                <p className="text-sm text-muted-foreground">
                                  {label}: {value}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Account Number: {formatBankAccountForRegion(appSettings.region, transaction.paymentMethod.accountNumber!)}
                                </p>
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Phone Number: {transaction.paymentMethod.phoneNumber}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyPaymentDetails}
                      className="p-2"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-blue-800 font-medium">Payment Coordination</p>
                    <p className="text-sm text-blue-700 mt-1">
                      {transaction.paymentInstructions}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction Details */}
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="font-medium">Transaction Information</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Date & Time</span>
                </div>
                <span className="text-sm">{transaction.fullDate}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Coordination ID</span>
                </div>
                <span className="text-sm font-mono">{transaction.transactionId}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Contact</span>
                </div>
                <span className="text-sm">{transaction.user.phone}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Location</span>
                </div>
                <span className="text-sm">{transaction.location}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Category</span>
                </div>
                <span className="text-sm">{transaction.category}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Note */}
        {transaction.note && (
          <Card className="p-4">
            <div className="space-y-2">
              <h4 className="font-medium">Note</h4>
              <p className="text-sm text-muted-foreground">{transaction.note}</p>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {transaction.status === 'pending_payment' && (
            <Button className="w-full" onClick={copyPaymentDetails}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Payment Details
            </Button>
          )}
          
          <Button 
            variant={transaction.status === 'pending_payment' ? 'outline' : 'default'} 
            className="w-full" 
            onClick={() => {
              if (transaction.type === 'coordination_received') {
                // Pre-fill request money form with transaction details
                onNavigate('request', {
                  requestData: {
                    amount: transaction.amount.toString(),
                    message: `Follow-up request: ${transaction.description}`,
                    friendId: transaction.user.name !== 'You' ? transaction.user.id || '1' : undefined
                  }
                });
              } else if (transaction.type === 'split_coordination') {
                onNavigate('split');
              } else {
                onNavigate('send');
              }
            }}
          >
            {transaction.type === 'coordination_received' ? 'Request Money Again' : 
             transaction.type === 'split_coordination' ? 'Create New Split' : 'Send Money Again'}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowShareSheet(true)}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Transaction Details
          </Button>
          
          <Button variant="outline" className="w-full">
            Report Issue
          </Button>
        </div>
      </div>

      {/* Share Sheet */}
      {showShareSheet && shareData && (
        <ShareSheet
          isOpen={showShareSheet}
          onClose={() => setShowShareSheet(false)}
          title="Share Transaction Details"
          shareText={`*${shareData.title}*\n\n💰 Amount: ${currencySymbol}${shareData.amount.toFixed(2)}\n📊 Status: ${shareData.status}${shareData.transactionId ? `\n🧾 Ref: ${shareData.transactionId}` : ''}${shareData.paymentMethod ? `\n💳 Via: ${shareData.paymentMethod}` : ''}\n\n_Powered by Biltip 🚀_`}
          documentData={{
            title: shareData.title,
            content: shareData,
            type: 'receipt'
          }}
        />
      )}
    </div>
  );
}
