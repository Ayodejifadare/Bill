import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ArrowLeft, Plus, Building2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useUserProfile } from './UserProfileContext';
import { getBankDirectoryForRegion } from '../utils/banks';
import { getMobileMoneyProviders } from '../utils/providers';
import { getRegionConfig, requiresRoutingNumber, validateBankAccountNumber, getBankAccountLength } from '../utils/regions';
import { BankAccountCard } from './BankAccountCard';
import { MobileMoneyCard } from './MobileMoneyCard';
import {
  fetchPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  type PaymentMethod,
  type CreatePaymentMethodPayload,
} from '@/api/payment-methods';

interface PaymentMethodsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  backTo?: string;
}

// Bank directory is centralized in utils/banks; providers in utils/providers

export function PaymentMethodsScreen({ onNavigate, backTo = 'profile' }: PaymentMethodsScreenProps) {
  const { appSettings } = useUserProfile();
  const banks = getBankDirectoryForRegion(appSettings.region);
  const providers = getMobileMoneyProviders(appSettings.region);
  const phoneCountryCode = getRegionConfig(appSettings.region).phoneCountryCode;

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [methodType, setMethodType] = useState<'bank' | 'mobile_money'>('bank');
  interface FormDataState {
    bank: string;
    accountNumber: string;
    accountName: string;
    accountType: 'checking' | 'savings';
    provider: string;
    phoneNumber: string;
  }
  const [formData, setFormData] = useState<FormDataState>({
    bank: '',
    accountNumber: '',
    accountName: '',
    accountType: 'checking',
    provider: '',
    phoneNumber: ''
  });
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadMethods = async () => {
      try {
        const methods = await fetchPaymentMethods();
        setPaymentMethods(methods);
      } catch {
        toast.error('Failed to load payment methods');
      }
    };
    loadMethods();
  }, [appSettings.region]);

  const resetForm = () => {
    setFormData({
      bank: '',
      accountNumber: '',
      accountName: '',
      accountType: 'checking',
      provider: '',
      phoneNumber: ''
    });
    setMethodType('bank');
    setEditingMethod(null);
  };

  const handleSaveMethod = async () => {
    if (methodType === 'bank') {
      if (!formData.bank || !formData.accountNumber || !formData.accountName) {
        toast.error('Please fill in all bank details');
        return;
      }
      if (!validateBankAccountNumber(appSettings.region, formData.accountNumber)) {
        toast.error('Please enter a valid account number');
        return;
      }
    } else {
      if (!formData.provider || !formData.phoneNumber) {
        toast.error('Please fill in all mobile money details');
        return;
      }
      if (phoneCountryCode && !formData.phoneNumber.startsWith(phoneCountryCode)) {
        toast.error(`Please enter a valid phone number starting with ${phoneCountryCode}`);
        return;
      }
    }

    setIsLoading(true);

    try {
      const selectedBank = banks.find(bank => bank.name === formData.bank);
      const basePayload: CreatePaymentMethodPayload =
        methodType === 'bank'
          ? {
              type: 'bank',
              bank: formData.bank,
              accountNumber: formData.accountNumber,
              accountName: formData.accountName,
              accountType: formData.accountType,
              ...(requiresRoutingNumber(appSettings.region)
                ? { routingNumber: selectedBank?.code ?? '' }
                : { sortCode: selectedBank?.code ?? '' }),
              isDefault: false,
            }
          : {
              type: 'mobile_money',
              provider: formData.provider,
              phoneNumber: formData.phoneNumber,
              isDefault: false,
            };

      if (editingMethod) {
        await updatePaymentMethod(editingMethod.id, basePayload);
        toast.success('Payment method updated successfully!');
      } else {
        basePayload.isDefault = paymentMethods.length === 0;
        await createPaymentMethod(basePayload);
        toast.success('Payment method added successfully!');
      }
      const methods = await fetchPaymentMethods();
      setPaymentMethods(methods);
      setIsAddingMethod(false);
      resetForm();
    } catch (error) {
      toast.error(editingMethod ? 'Failed to update payment method' : 'Failed to verify account. Please check details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      await updatePaymentMethod(methodId, { isDefault: true });
      const methods = await fetchPaymentMethods();
      setPaymentMethods(methods);
      toast.success('Default payment method updated');
    } catch {
      toast.error('Failed to update default payment method');
    }
  };

  const handleDeleteMethod = async (methodId: string) => {
    try {
      await deletePaymentMethod(methodId);
      const methods = await fetchPaymentMethods();
      setPaymentMethods(methods);
      toast.success('Payment method removed');
    } catch {
      toast.error('Failed to remove payment method');
    }
  };

  const handleEditMethod = (method: PaymentMethod) => {
    setEditingMethod(method);
    setMethodType(method.type);
    if (method.type === 'bank') {
      setFormData({
        bank: method.bank || '',
        accountNumber: method.accountNumber || '',
        accountName: method.accountName || '',
        accountType: method.accountType || 'checking',
        provider: '',
        phoneNumber: ''
      });
    } else {
      setFormData({
        bank: '',
        accountNumber: '',
        accountName: '',
        accountType: 'checking',
        provider: method.provider || '',
        phoneNumber: method.phoneNumber || ''
      });
    }
    setIsAddingMethod(true);
  };



  const handleBankChange = (bankName: string) => {
    setFormData(prev => ({ ...prev, bank: bankName }));
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
              onClick={() => onNavigate(backTo)}
              className="min-h-[44px] min-w-[44px] -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold">Payment Methods</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {providers.length > 0 ? 'Manage your payment options' : 'Manage your bank accounts'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 items-center">
            <Dialog
              open={isAddingMethod}
              onOpenChange={(open) => {
                setIsAddingMethod(open);
                if (!open) resetForm();
              }}
            >
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
                  <DialogTitle>{editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed">
                    {editingMethod
                      ? 'Update your payment method details.'
                      : providers.length > 0
                          ? 'Add a bank account or mobile money provider to receive payments from friends.'
                          : 'Add a bank account to receive payments from friends when splitting bills or money requests.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Method Type Selection - Only show when mobile money is supported */}
                  {providers.length > 0 && !editingMethod && (
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

                  {(providers.length === 0 || methodType === 'bank') ? (
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
                        <Label>Account Holder Name</Label>
                        <Input
                          className="h-12"
                          value={formData.accountName}
                          onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                          placeholder={"Full name as it appears on account"}
                        />
                      </div>

                      {requiresRoutingNumber(appSettings.region) && (
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
                          type={getBankAccountLength(appSettings.region) ? 'number' : 'password'}
                          value={formData.accountNumber}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            accountNumber: getBankAccountLength(appSettings.region) ? e.target.value.slice(0, getBankAccountLength(appSettings.region)) : e.target.value 
                          }))}
                          placeholder={getBankAccountLength(appSettings.region) ? '1234567890' : 'Account number'}
                          maxLength={getBankAccountLength(appSettings.region)}
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
                            {providers.map((provider) => (
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
                          placeholder={`${phoneCountryCode || '+Country'} 801 234 5678`}
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      className="flex-1 h-12"
                      onClick={handleSaveMethod}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingMethod ? 'Saving...' : 'Verifying...'}
                        </>
                      ) : editingMethod ? (
                        'Save Changes'
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
                {providers.length > 0 ? (
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <Building2 className="h-12 w-12 text-muted-foreground" />
                    <Smartphone className="h-12 w-12 text-muted-foreground" />
                  </div>
                ) : (
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                )}
                <h3 className="mb-2 text-lg">No payment methods</h3>
                <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                  {providers.length > 0
                    ? "Add a payment method to receive money from friends"
                    : "Add a bank account to receive money from friends"}
                </p>
                <Button 
                  onClick={() => setIsAddingMethod(true)} 
                  className="h-12"
                  aria-label={`Add your first ${providers.length > 0 ? 'payment method' : 'bank account'}`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First {providers.length > 0 ? 'Payment Method' : 'Bank Account'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            paymentMethods.map((method) => {
              if (method.type === 'bank') {
                return (
                  <BankAccountCard
                    key={method.id}
                    account={method}
                    onSetDefault={handleSetDefault}
                    onDelete={handleDeleteMethod}
                    onEdit={(account) => handleEditMethod(account as PaymentMethod)}
                    variant="personal"
                  />
                );
              }

              if (!method.provider || !method.phoneNumber) {
                return null;
              }

              return (
                <MobileMoneyCard
                  key={method.id}
                  account={{
                    id: method.id,
                    provider: method.provider,
                    phoneNumber: method.phoneNumber,
                    isDefault: method.isDefault,
                  }}
                  onSetDefault={handleSetDefault}
                  onDelete={handleDeleteMethod}
                  onEdit={(account) => handleEditMethod(account as PaymentMethod)}
                  variant="personal"
                />
              );
            })
          )}
        </div>

        {/* Information Card */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 leading-relaxed">
                <strong>Secure Payments:</strong> Your payment information is encrypted and secure. 
                {providers.length > 0
                  ? " We use these details to help friends send you money via bank transfers or mobile money."
                  : " We share these details with friends to help them send you money via direct bank transfers when you split bills or request payments."}
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
                <p>Add your {providers.length > 0 ? 'bank account or mobile money' : 'bank account'} details to receive payments</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-primary text-primary-foreground rounded-full min-w-[24px] h-6 flex items-center justify-center flex-shrink-0 text-xs">2</div>
                <p>When you split bills or request money, your payment details are shared automatically</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-primary text-primary-foreground rounded-full min-w-[24px] h-6 flex items-center justify-center flex-shrink-0 text-xs">3</div>
                <p>Friends can send payments directly using {providers.length > 0 ? 'their banking or mobile money app' : 'their banking app'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
