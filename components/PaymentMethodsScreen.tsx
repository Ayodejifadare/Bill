import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ArrowLeft, Plus, Building2, Smartphone, Copy, Trash2, Check, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useUserProfile } from './UserProfileContext';
import { AccountCard } from './AccountCard';

interface PaymentMethod {
  id: string;
  type: 'bank' | 'mobile_money';
  // Bank fields
  bank?: string;
  accountNumber?: string;
  accountName?: string;
  sortCode?: string;
  routingNumber?: string;
  accountType?: 'checking' | 'savings';
  // Mobile money fields
  provider?: string;
  phoneNumber?: string;
  isDefault: boolean;
}

interface PaymentMethodsScreenProps {
  onNavigate: (screen: string) => void;
}

const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '063', name: 'Access Bank (Diamond)' },
  { code: '023', name: 'Citi Bank' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'GTBank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' }
];

const US_BANKS = [
  { code: '021000021', name: 'Chase Bank' },
  { code: '026009593', name: 'Bank of America' },
  { code: '121000248', name: 'Wells Fargo' },
  { code: '031176110', name: 'Capital One' },
  { code: '021000089', name: 'Citibank' },
  { code: '091000019', name: 'US Bank' },
  { code: '221000113', name: 'TD Bank' },
  { code: '031101279', name: 'PNC Bank' },
  { code: '061000052', name: 'Bank of the West' },
  { code: '122000661', name: 'Ally Bank' },
  { code: '124003116', name: 'Discover Bank' },
  { code: '031201360', name: 'Regions Bank' },
  { code: '063100277', name: 'Fifth Third Bank' },
  { code: '044000024', name: 'KeyBank' },
  { code: '053100300', name: 'BB&T (Truist)' }
];

const MOBILE_MONEY_PROVIDERS = [
  { code: 'opay', name: 'Opay' },
  { code: 'palmpay', name: 'PalmPay' },
  { code: 'kuda', name: 'Kuda Bank' },
  { code: 'moniepoint', name: 'Moniepoint' },
  { code: 'carbon', name: 'Carbon' },
  { code: 'fairmoney', name: 'FairMoney' },
  { code: 'cowrywise', name: 'Cowrywise' },
  { code: 'piggyvest', name: 'PiggyVest' }
];

export function PaymentMethodsScreen({ onNavigate }: PaymentMethodsScreenProps) {
  const { appSettings, updateAppSettings } = useUserProfile();
  const isNigeria = appSettings.region === 'NG';
  const banks = isNigeria ? NIGERIAN_BANKS : US_BANKS;
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'bank',
      bank: isNigeria ? 'Access Bank' : 'Chase Bank',
      accountNumber: isNigeria ? '0123456789' : '****1234',
      accountName: 'John Doe',
      sortCode: isNigeria ? '044' : undefined,
      routingNumber: isNigeria ? undefined : '021000021',
      accountType: 'checking',
      isDefault: true
    }
  ]);

  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [methodType, setMethodType] = useState<'bank' | 'mobile_money'>('bank');
  const [formData, setFormData] = useState({
    bank: '',
    accountNumber: '',
    accountName: '',
    accountType: 'checking' as const,
    provider: '',
    phoneNumber: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      bank: '',
      accountNumber: '',
      accountName: '',
      accountType: 'checking',
      provider: '',
      phoneNumber: ''
    });
  };

  const handleAddMethod = async () => {
    if (methodType === 'bank') {
      if (!formData.bank || !formData.accountNumber || !formData.accountName) {
        toast.error('Please fill in all bank details');
        return;
      }
      if (isNigeria && formData.accountNumber.length !== 10) {
        toast.error('Account number must be 10 digits');
        return;
      }
    } else {
      if (!formData.provider || !formData.phoneNumber) {
        toast.error('Please fill in all mobile money details');
        return;
      }
      if (isNigeria && !formData.phoneNumber.startsWith('+234')) {
        toast.error('Please enter a valid Nigerian phone number');
        return;
      }
    }

    setIsLoading(true);

    try {
      // Simulate API call for account verification
      await new Promise(resolve => setTimeout(resolve, 1500));

      const selectedBank = banks.find(bank => bank.name === formData.bank);
      const newMethod: PaymentMethod = {
        id: Date.now().toString(),
        type: methodType,
        ...(methodType === 'bank' ? {
          bank: formData.bank,
          accountNumber: isNigeria ? formData.accountNumber : `****${formData.accountNumber.slice(-4)}`,
          accountName: formData.accountName,
          accountType: formData.accountType,
          ...(isNigeria ? {
            sortCode: selectedBank?.code
          } : {
            routingNumber: selectedBank?.code
          })
        } : {
          provider: formData.provider,
          phoneNumber: formData.phoneNumber
        }),
        isDefault: paymentMethods.length === 0
      };

      setPaymentMethods([...paymentMethods, newMethod]);
      toast.success('Payment method added successfully!');
      setIsAddingMethod(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to verify account. Please check details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = (methodId: string) => {
    const updated = paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === methodId
    }));
    setPaymentMethods(updated);
    toast.success('Default payment method updated');
  };

  const handleDeleteMethod = (methodId: string) => {
    const updated = paymentMethods.filter(method => method.id !== methodId);
    // If we deleted the default method, make the first remaining method default
    if (updated.length > 0 && !updated.some(m => m.isDefault)) {
      updated[0].isDefault = true;
    }
    setPaymentMethods(updated);
    toast.success('Payment method removed');
  };



  const handleBankChange = (bankName: string) => {
    setFormData(prev => ({ ...prev, bank: bankName }));
  };

  const handleRegionChange = (region: 'US' | 'NG') => {
    updateAppSettings({ 
      region, 
      currency: region === 'NG' ? 'NGN' : 'USD' 
    });
    // Clear current payment methods when switching regions
    setPaymentMethods([]);
    toast.success(`Switched to ${region === 'NG' ? 'Nigeria' : 'United States'}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Sticky for better mobile navigation */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onNavigate('settings')} 
              className="min-h-[44px] min-w-[44px] -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold">Payment Methods</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isNigeria ? 'Manage your payment options' : 'Manage your bank accounts'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 items-center">
            {/* Region Selector */}
            <Select value={appSettings.region} onValueChange={handleRegionChange}>
              <SelectTrigger className="w-18 sm:w-20 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NG">🇳🇬 NG</SelectItem>
                <SelectItem value="US">🇺🇸 US</SelectItem>
              </SelectContent>
            </Select>
            
            <Dialog open={isAddingMethod} onOpenChange={setIsAddingMethod}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="rounded-full h-10 px-3 sm:px-4"
                  aria-label="Add payment method"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span>Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Payment Method</DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed">
                    {isNigeria 
                      ? "Add a bank account or mobile money provider to receive payments from friends."
                      : "Add a bank account to receive payments from friends when splitting bills or money requests."
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Method Type Selection - Only show for Nigeria */}
                  {isNigeria && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={methodType === 'bank' ? 'default' : 'outline'}
                        onClick={() => setMethodType('bank')}
                        className="h-auto p-4 flex flex-col gap-2"
                      >
                        <Building2 className="h-5 w-5" />
                        <span className="text-sm">Bank Account</span>
                      </Button>
                      <Button
                        variant={methodType === 'mobile_money' ? 'default' : 'outline'}
                        onClick={() => setMethodType('mobile_money')}
                        className="h-auto p-4 flex flex-col gap-2"
                      >
                        <Smartphone className="h-5 w-5" />
                        <span className="text-sm">Mobile Money</span>
                      </Button>
                    </div>
                  )}

                  {(!isNigeria || methodType === 'bank') ? (
                    <>
                      <div className="space-y-2">
                        <Label>Bank</Label>
                        <Select value={formData.bank} onValueChange={handleBankChange}>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select your bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {banks.map((bank) => (
                              <SelectItem key={bank.code} value={bank.name}>
                                {bank.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{isNigeria ? 'Account Name' : 'Account Holder Name'}</Label>
                        <Input
                          className="h-12"
                          value={formData.accountName}
                          onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                          placeholder={isNigeria ? "Account holder name" : "Full name as it appears on account"}
                        />
                      </div>

                      {!isNigeria && (
                        <div className="space-y-2">
                          <Label>Account Type</Label>
                          <Select value={formData.accountType} onValueChange={(value: 'checking' | 'savings') => setFormData(prev => ({ ...prev, accountType: value }))}>
                            <SelectTrigger className="h-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="checking">Checking</SelectItem>
                              <SelectItem value="savings">Savings</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input
                          className="h-12"
                          type={isNigeria ? "number" : "password"}
                          value={formData.accountNumber}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            accountNumber: isNigeria ? e.target.value.slice(0, 10) : e.target.value 
                          }))}
                          placeholder={isNigeria ? "1234567890" : "Account number"}
                          maxLength={isNigeria ? 10 : undefined}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select value={formData.provider} onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value }))}>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {MOBILE_MONEY_PROVIDERS.map((provider) => (
                              <SelectItem key={provider.code} value={provider.name}>
                                {provider.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          className="h-12"
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          placeholder="+234 801 234 5678"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button 
                      className="flex-1 h-12" 
                      onClick={handleAddMethod}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Verifying...
                        </>
                      ) : (
                        'Add Method'
                      )}
                    </Button>
                    <Button variant="outline" className="h-12 px-6" onClick={() => setIsAddingMethod(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 pb-8">
        {/* Payment Methods List */}
        <div className="space-y-4">
          {paymentMethods.length === 0 ? (
            <Card>
              <CardContent className="p-6 sm:p-8 text-center">
                {isNigeria ? (
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <Building2 className="h-12 w-12 text-muted-foreground" />
                    <Smartphone className="h-12 w-12 text-muted-foreground" />
                  </div>
                ) : (
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                )}
                <h3 className="mb-2 text-lg">No payment methods</h3>
                <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                  {isNigeria 
                    ? "Add a payment method to receive money from friends"
                    : "Add a bank account to receive money from friends"
                  }
                </p>
                <Button 
                  onClick={() => setIsAddingMethod(true)} 
                  className="h-12"
                  aria-label={`Add your first ${isNigeria ? 'payment method' : 'bank account'}`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First {isNigeria ? 'Payment Method' : 'Bank Account'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            paymentMethods.map((method) => (
              <AccountCard
                key={method.id}
                account={method}
                onSetDefault={handleSetDefault}
                onDelete={handleDeleteMethod}
                variant="personal"
              />
            ))
          )}
        </div>

        {/* Information Card */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 leading-relaxed">
                <strong>Secure Payments:</strong> Your payment information is encrypted and secure. 
                {isNigeria 
                  ? " We use these details to help friends send you money via bank transfers or mobile money."
                  : " We share these details with friends to help them send you money via direct bank transfers when you split bills or request payments."
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <div className="bg-primary text-primary-foreground rounded-full min-w-[24px] h-6 flex items-center justify-center flex-shrink-0 text-xs">1</div>
                <p>Add your {isNigeria ? 'bank account or mobile money' : 'bank account'} details to receive payments</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-primary text-primary-foreground rounded-full min-w-[24px] h-6 flex items-center justify-center flex-shrink-0 text-xs">2</div>
                <p>When you split bills or request money, your payment details are shared automatically</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-primary text-primary-foreground rounded-full min-w-[24px] h-6 flex items-center justify-center flex-shrink-0 text-xs">3</div>
                <p>Friends can send payments directly using {isNigeria ? 'their banking or mobile money app' : 'their banking app'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}