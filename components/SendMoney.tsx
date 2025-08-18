import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Building2, Copy, Send, CheckCircle, Smartphone, Users, UserPlus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import { useUserProfile } from './UserProfileContext';

interface PaymentMethod {
  id: string;
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
  isDefault: boolean;
}

interface Friend {
  id: string;
  name: string;
  avatar?: string;
  phoneNumber?: string;
  defaultPaymentMethod?: PaymentMethod;
}

interface Group {
  id: string;
  name: string;
  members: Friend[];
  color: string;
}

interface SendMoneyProps {
  onNavigate: (screen: string) => void;
  prefillData?: {
    recipientId?: string;
    recipientName?: string;
    prefillAmount?: number;
    description?: string;
  };
}

export function SendMoney({ onNavigate, prefillData }: SendMoneyProps) {
  const { appSettings } = useUserProfile();
  const isNigeria = appSettings.region === 'NG';
  const currencySymbol = isNigeria ? '₦' : '$';
  
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showGroupSelection, setShowGroupSelection] = useState(false);

  // Mock data for friends with payment methods based on region
  const allFriends: Friend[] = [
    { 
      id: '1', 
      name: 'Alice Johnson', 
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150', 
      phoneNumber: isNigeria ? '+234 801 123 4567' : '+1 (555) 123-4567',
      defaultPaymentMethod: isNigeria ? {
        id: 'alice_payment_1',
        type: 'bank',
        bankName: 'Access Bank',
        accountNumber: '0123456789',
        accountHolderName: 'Alice Johnson',
        sortCode: '044',
        isDefault: true
      } : {
        id: 'alice_bank_1',
        type: 'bank',
        bankName: 'Wells Fargo',
        accountType: 'checking',
        accountNumber: '****7890',
        routingNumber: '121000248',
        accountHolderName: 'Alice Johnson',
        isDefault: true
      }
    },
    { 
      id: '2', 
      name: 'Bob Wilson', 
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 
      phoneNumber: isNigeria ? '+234 802 234 5678' : '+1 (555) 234-5678',
      defaultPaymentMethod: isNigeria ? {
        id: 'bob_payment_1',
        type: 'mobile_money',
        provider: 'Opay',
        phoneNumber: '+234 802 234 5678',
        isDefault: true
      } : {
        id: 'bob_bank_1',
        type: 'bank',
        bankName: 'Chase Bank',
        accountType: 'checking',
        accountNumber: '****3456',
        routingNumber: '021000021',
        accountHolderName: 'Robert Wilson',
        isDefault: true
      }
    },
    { 
      id: '3', 
      name: 'Carol Davis', 
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 
      phoneNumber: isNigeria ? '+234 803 345 6789' : '+1 (555) 345-6789',
      defaultPaymentMethod: isNigeria ? {
        id: 'carol_payment_1',
        type: 'bank',
        bankName: 'GTBank',
        accountNumber: '0234567890',
        accountHolderName: 'Carol Davis',
        sortCode: '058',
        isDefault: true
      } : {
        id: 'carol_bank_1',
        type: 'bank',
        bankName: 'Bank of America',
        accountType: 'savings',
        accountNumber: '****9012',
        routingNumber: '026009593',
        accountHolderName: 'Carol Davis',
        isDefault: true
      }
    },
    { 
      id: '4', 
      name: 'David Brown', 
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 
      phoneNumber: isNigeria ? '+234 804 456 7890' : '+1 (555) 456-7890',
      defaultPaymentMethod: isNigeria ? {
        id: 'david_payment_1',
        type: 'mobile_money',
        provider: 'PalmPay',
        phoneNumber: '+234 804 456 7890',
        isDefault: true
      } : {
        id: 'david_bank_1',
        type: 'bank',
        bankName: 'Capital One',
        accountType: 'checking',
        accountNumber: '****5678',
        routingNumber: '031176110',
        accountHolderName: 'David Brown',
        isDefault: true
      }
    },
    { 
      id: '5', 
      name: 'Emma Garcia', 
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', 
      phoneNumber: isNigeria ? '+234 805 567 8901' : '+1 (555) 567-8901',
      defaultPaymentMethod: isNigeria ? {
        id: 'emma_payment_1',
        type: 'bank',
        bankName: 'First Bank',
        accountNumber: '3456789012',
        accountHolderName: 'Emma Garcia',
        sortCode: '011',
        isDefault: true
      } : {
        id: 'emma_bank_1',
        type: 'bank',
        bankName: 'Citibank',
        accountType: 'checking',
        accountNumber: '****2345',
        routingNumber: '021000089',
        accountHolderName: 'Emma Garcia',
        isDefault: true
      }
    },
  ];

  // Mock groups
  const groups: Group[] = [
    {
      id: '1',
      name: 'Work Team',
      members: allFriends.slice(0, 3),
      color: 'bg-blue-500'
    },
    {
      id: '2', 
      name: 'College Friends',
      members: allFriends.slice(1, 4),
      color: 'bg-green-500'
    },
    {
      id: '3',
      name: 'Roommates',
      members: allFriends.slice(2, 5),
      color: 'bg-purple-500'
    }
  ];

  // Handle prefill data
  useEffect(() => {
    if (prefillData) {
      if (prefillData.prefillAmount) {
        setAmount(prefillData.prefillAmount.toString());
      }
      if (prefillData.description) {
        setMessage(prefillData.description);
      }
      if (prefillData.recipientId && prefillData.recipientName) {
        // Find and set the friend based on the prefill data
        const matchingFriend = allFriends.find(friend => friend.id === prefillData.recipientId);
        if (matchingFriend) {
          setSelectedFriend(matchingFriend);
        } else {
          // Create a temporary friend object if not found in the list
          const tempFriend: Friend = {
            id: prefillData.recipientId,
            name: prefillData.recipientName,
            phoneNumber: 'Not available'
          };
          setSelectedFriend(tempFriend);
        }
      }
    }
  }, [prefillData]);

  const filteredFriends = allFriends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyPaymentDetails = (paymentMethod: PaymentMethod) => {
    if (paymentMethod.type === 'bank') {
      const bankInfo = isNigeria 
        ? `${paymentMethod.bankName}\nAccount Name: ${paymentMethod.accountHolderName}\nAccount Number: ${paymentMethod.accountNumber}\nSort Code: ${paymentMethod.sortCode}`
        : `${paymentMethod.bankName}\nAccount Holder: ${paymentMethod.accountHolderName}\nRouting Number: ${paymentMethod.routingNumber}\nAccount Number: ${paymentMethod.accountNumber}`;
      navigator.clipboard.writeText(bankInfo);
      toast.success('Bank account details copied to clipboard');
    } else {
      const mobileInfo = `${paymentMethod.provider}\nPhone Number: ${paymentMethod.phoneNumber}`;
      navigator.clipboard.writeText(mobileInfo);
      toast.success('Mobile money details copied to clipboard');
    }
  };

  const handleSendMoney = () => {
    if (!selectedFriend) {
      toast.error('Please select a friend');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!selectedFriend.defaultPaymentMethod) {
      toast.error('Selected friend has no payment method on file');
      return;
    }

    // Create the money transfer
    toast.success(`Payment instructions sent! Transfer ${currencySymbol}${parseFloat(amount).toFixed(2)} to ${selectedFriend.name} using their payment details.`);
    
    // Reset form
    setSelectedFriend(null);
    setAmount('');
    setMessage('');
    setSearchTerm('');
    
    onNavigate('home');
  };

  const sharePaymentDetails = () => {
    if (!selectedFriend || !selectedFriend.defaultPaymentMethod || !amount) {
      toast.error('Please complete all required fields');
      return;
    }

    const paymentMethod = selectedFriend.defaultPaymentMethod;
    let paymentDetails = `💸 Send Payment: ${currencySymbol}${amount}
👤 To: ${selectedFriend.name}
${message ? `📝 Message: ${message}\n` : ''}`;

    if (paymentMethod.type === 'bank') {
      paymentDetails += isNigeria 
        ? `🏦 Bank Details:
${paymentMethod.bankName}
👤 ${paymentMethod.accountHolderName}
🔢 Account: ${paymentMethod.accountNumber}
🏷️ Sort Code: ${paymentMethod.sortCode}`
        : `🏦 Bank Details:
${paymentMethod.bankName}
👤 ${paymentMethod.accountHolderName}
🔢 Routing: ${paymentMethod.routingNumber}
💳 Account: ${paymentMethod.accountNumber}`;
    } else {
      paymentDetails += `📱 Mobile Money:
${paymentMethod.provider}
📞 ${paymentMethod.phoneNumber}`;
    }

    paymentDetails += `\n📱 ${selectedFriend.phoneNumber || 'Phone not available'}`;

    navigator.clipboard.writeText(paymentDetails);
    toast.success('Payment details copied to clipboard');
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
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('home')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1>Send Money</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Amount */}
        <Card>
          <CardHeader>
            <CardTitle>Send Amount</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-lg pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's this payment for?"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Select Friend */}
        <Card>
          <CardHeader>
            <CardTitle>Send To</CardTitle>
            <CardDescription>
              Select a friend to send money to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Group Browse */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search friends..."
                  className="pl-10"
                />
              </div>
              
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGroupSelection(!showGroupSelection)}
                  className="h-8 px-3"
                >
                  <Users className="h-3 w-3 mr-1" />
                  {showGroupSelection ? 'Hide Groups' : 'Browse Groups'}
                </Button>
              </div>

              {/* Group Browse */}
              {showGroupSelection && !selectedFriend && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Browse friends by group:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {groups.map((group) => (
                      <div key={group.id} className="border rounded-lg p-3">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-6 h-6 rounded-full ${group.color} flex items-center justify-center`}>
                            <Users className="h-3 w-3 text-white" />
                          </div>
                          <p className="font-medium text-sm">{group.name}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {group.members.map((friend) => (
                            <Button
                              key={friend.id}
                              variant="ghost"
                              onClick={() => {
                                setSelectedFriend(friend);
                                setShowGroupSelection(false);
                              }}
                              className="h-auto p-2 justify-start"
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={friend.avatar} />
                                  <AvatarFallback className="text-xs">
                                    {friend.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{friend.name}</span>
                                {friend.defaultPaymentMethod && (
                                  <Badge variant="secondary" className="text-xs ml-auto">
                                    {friend.defaultPaymentMethod.type === 'bank' 
                                      ? friend.defaultPaymentMethod.bankName 
                                      : friend.defaultPaymentMethod.provider
                                    }
                                  </Badge>
                                )}
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Friend */}
            {selectedFriend && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedFriend.avatar} />
                        <AvatarFallback>
                          {selectedFriend.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedFriend.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedFriend.phoneNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFriend(null)}
                        className="text-xs h-6 px-2"
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Friends List */}
            {!selectedFriend && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted"
                    onClick={() => setSelectedFriend(friend)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback>
                          {friend.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{friend.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">{friend.phoneNumber}</p>
                          {friend.defaultPaymentMethod && (
                            <Badge variant="secondary" className="text-xs">
                              {friend.defaultPaymentMethod.type === 'bank' 
                                ? friend.defaultPaymentMethod.bankName 
                                : friend.defaultPaymentMethod.provider
                              }
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {!friend.defaultPaymentMethod && (
                      <Badge variant="outline" className="text-xs">
                        No Payment Info
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {filteredFriends.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No friends found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Destination */}
        {selectedFriend && selectedFriend.defaultPaymentMethod && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedFriend.defaultPaymentMethod.type === 'bank' ? (
                  <Building2 className="h-5 w-5" />
                ) : (
                  <Smartphone className="h-5 w-5" />
                )}
                Payment Destination
              </CardTitle>
              <CardDescription>
                Send your payment to {selectedFriend.name}'s {selectedFriend.defaultPaymentMethod.type === 'bank' ? 'bank account' : 'mobile money'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Card className="bg-muted">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {selectedFriend.defaultPaymentMethod.type === 'bank' 
                          ? selectedFriend.defaultPaymentMethod.bankName 
                          : selectedFriend.defaultPaymentMethod.provider
                        }
                      </p>
                      
                      {selectedFriend.defaultPaymentMethod.type === 'bank' ? (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Account Holder: {selectedFriend.defaultPaymentMethod.accountHolderName}
                          </p>
                          {!isNigeria && selectedFriend.defaultPaymentMethod.accountType && (
                            <p className="text-sm text-muted-foreground">
                              Account Type: {selectedFriend.defaultPaymentMethod.accountType.charAt(0).toUpperCase() + selectedFriend.defaultPaymentMethod.accountType.slice(1)}
                            </p>
                          )}
                          {isNigeria ? (
                            <>
                              <p className="text-sm text-muted-foreground">
                                Sort Code: {selectedFriend.defaultPaymentMethod.sortCode}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Account Number: {formatAccountNumber(selectedFriend.defaultPaymentMethod.accountNumber!)}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-muted-foreground">
                                Routing Number: {selectedFriend.defaultPaymentMethod.routingNumber}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Account Number: {formatAccountNumber(selectedFriend.defaultPaymentMethod.accountNumber!)}
                              </p>
                            </>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Phone Number: {selectedFriend.defaultPaymentMethod.phoneNumber}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyPaymentDetails(selectedFriend.defaultPaymentMethod!)}
                      className="p-2"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="h-4 w-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-amber-800 font-medium">Payment Instructions</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Use your {selectedFriend.defaultPaymentMethod.type === 'bank' ? 'bank' : 'mobile money'} app to send a transfer to the {selectedFriend.defaultPaymentMethod.type === 'bank' ? 'account' : 'number'} above. 
                      Include "{message || `Payment from SplitPay - ${currencySymbol}${amount}`}" in the transfer memo.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Payment Method Warning */}
        {selectedFriend && !selectedFriend.defaultPaymentMethod && (
          <Card className="border-warning">
            <CardContent className="p-4">
              <div className="flex gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-warning font-medium">No Payment Method</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedFriend.name} hasn't added their payment information yet. 
                    You'll need to ask them for their {isNigeria ? 'bank or mobile money' : 'banking'} details to send this payment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Summary */}
        {selectedFriend && amount && selectedFriend.defaultPaymentMethod && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-base">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">{currencySymbol}{parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To:</span>
                <span className="font-medium">{selectedFriend.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {selectedFriend.defaultPaymentMethod.type === 'bank' ? 'Bank:' : 'Provider:'}
                </span>
                <span className="font-medium">
                  {selectedFriend.defaultPaymentMethod.type === 'bank' 
                    ? selectedFriend.defaultPaymentMethod.bankName 
                    : selectedFriend.defaultPaymentMethod.provider
                  }
                </span>
              </div>
              {message && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Message:</span>
                  <span className="font-medium text-right max-w-[200px] truncate">{message}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Next steps:</strong> Use your {selectedFriend.defaultPaymentMethod.type === 'bank' ? 'bank' : 'mobile money'} app to transfer {currencySymbol}{parseFloat(amount).toFixed(2)} to {selectedFriend.name}'s account using the details above.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={sharePaymentDetails}
            className="flex-1"
            disabled={!selectedFriend || !amount || !selectedFriend.defaultPaymentMethod}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Details
          </Button>
          <Button
            onClick={handleSendMoney}
            className="flex-1"
            disabled={!selectedFriend || !amount || !selectedFriend.defaultPaymentMethod}
          >
            <Send className="h-4 w-4 mr-2" />
            Send Instructions
          </Button>
        </div>
      </div>
    </div>
  );
}