import { useState } from 'react';
import { ArrowLeft, User, Calendar, Building2, MapPin, Receipt, MoreHorizontal, Copy, Smartphone, Share2, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { useUserProfile } from './UserProfileContext';
import { ShareSheet } from './ui/share-sheet';
import { createDeepLink } from './ShareUtils';

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

const mockTransactionDetails = {
  '1': {
    id: '1',
    type: 'coordination_received' as const,
    amount: 25.50,
    description: 'Coffee and lunch',
    user: { id: '1', name: 'Sarah Johnson', avatar: 'SJ', phone: '+234 801 123 4567' },
    date: '2 hours ago',
    status: 'payment_sent' as const,
    fullDate: 'January 15, 2025 at 2:30 PM',
    location: 'Starbucks Downtown',
    paymentMethod: {
      type: 'bank' as const,
      bankName: 'Access Bank',
      accountNumber: '0123456789',
      accountHolderName: 'John Doe',
      sortCode: '044'
    },
    transactionId: 'COORD-2025-001',
    note: 'Thanks for covering lunch! Payment sent to your Access Bank account.',
    category: 'Food & Dining',
    coordinationType: 'money_request',
    paymentInstructions: 'Shared bank details via Biltip - payment completed externally'
  },
  '2': {
    id: '2',
    type: 'coordination_sent' as const,
    amount: 45.00,
    description: 'Uber ride home',
    user: { id: '2', name: 'Mike Chen', avatar: 'MC', phone: '+234 802 234 5678' },
    date: '1 day ago',
    status: 'payment_received' as const,
    fullDate: 'January 14, 2025 at 11:45 PM',
    location: 'Downtown to Home',
    paymentMethod: {
      type: 'mobile_money' as const,
      provider: 'Opay',
      phoneNumber: '+234 802 234 5678'
    },
    transactionId: 'COORD-2025-002',
    note: 'Split ride after the concert - paid via Opay',
    category: 'Transportation',
    coordinationType: 'send_money',
    paymentInstructions: 'Payment sent to Mike via Opay using shared details'
  },
  '3': {
    id: '3',
    type: 'split_coordination' as const,
    amount: 18.75,
    description: 'Dinner at Tony\'s Pizza',
    user: { id: '3', name: 'Emily Davis', avatar: 'ED', phone: '+234 803 345 6789' },
    date: '2 days ago',
    status: 'pending_payment' as const,
    fullDate: 'January 13, 2025 at 7:20 PM',
    location: 'Tony\'s Pizza',
    paymentMethod: {
      type: 'bank' as const,
      bankName: 'GTBank',
      accountNumber: '0234567890',
      accountHolderName: 'John Doe',
      sortCode: '058'
    },
    transactionId: 'SPLIT-2025-003',
    note: 'Split bill coordination - awaiting external payment',
    category: 'Food & Dining',
    coordinationType: 'bill_split',
    paymentInstructions: 'Bank details shared with participants - awaiting direct transfers',
    totalParticipants: 4,
    paidParticipants: 2
  }
};

export function TransactionDetailsScreen({ transactionId, onNavigate }: TransactionDetailsScreenProps) {
  const { appSettings } = useUserProfile();
  const [showShareSheet, setShowShareSheet] = useState(false);
  const isNigeria = appSettings.region === 'NG';
  const currencySymbol = isNigeria ? '₦' : '$';
  
  const transaction = transactionId ? mockTransactionDetails[transactionId as keyof typeof mockTransactionDetails] : null;

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

  if (!transaction) {
    return (
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
            <p className="text-muted-foreground">Transaction not found</p>
          </div>
        </div>
      </div>
    );
  }

  const copyPaymentDetails = async () => {
    if (!transaction.paymentMethod) return;
    
    const paymentMethod = transaction.paymentMethod;
    
    try {
      if (paymentMethod.type === 'bank') {
        const bankInfo = isNigeria 
          ? `${paymentMethod.bankName}\nAccount Name: ${paymentMethod.accountHolderName}\nAccount Number: ${paymentMethod.accountNumber}\nSort Code: ${paymentMethod.sortCode}`
          : `${paymentMethod.bankName}\nAccount Holder: ${paymentMethod.accountHolderName}\nRouting Number: ${paymentMethod.routingNumber}\nAccount Number: ${paymentMethod.accountNumber}`;
        
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

  const formatAccountNumber = (accountNumber: string) => {
    if (isNigeria) {
      return accountNumber.replace(/(\d{4})(\d{4})(\d{2})/, '$1 $2 $3');
    } else {
      return accountNumber.replace(/(\*{4})(\d{4})/, '$1 $2');
    }
  };

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
                {currencySymbol}{transaction.amount.toFixed(2)}
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
                          {!isNigeria && transaction.paymentMethod.accountType && (
                            <p className="text-sm text-muted-foreground">
                              Account Type: {transaction.paymentMethod.accountType.charAt(0).toUpperCase() + transaction.paymentMethod.accountType.slice(1)}
                            </p>
                          )}
                          {isNigeria ? (
                            <>
                              <p className="text-sm text-muted-foreground">
                                Sort Code: {transaction.paymentMethod.sortCode}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Account Number: {formatAccountNumber(transaction.paymentMethod.accountNumber!)}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-muted-foreground">
                                Routing Number: {transaction.paymentMethod.routingNumber}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Account Number: {formatAccountNumber(transaction.paymentMethod.accountNumber!)}
                              </p>
                            </>
                          )}
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