import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ArrowLeft, Plus, Building2, Smartphone, Copy, Trash2, Check, Edit2, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useUserProfile } from './UserProfileContext';
import { getBankDirectoryForRegion } from '../utils/banks';
import { getMobileMoneyProviders } from '../utils/providers';
import { getRegionConfig, validateBankAccountNumber, getBankAccountLength } from '../utils/regions';
import { apiClient } from '../utils/apiClient';

interface ExternalAccount {
  id: string;
  name: string;
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
  // Metadata
  isDefault: boolean;
  createdBy: string;
  createdDate: string;
}

interface Group {
  id: string;
  name: string;
  isAdmin: boolean;
}

interface VirtualAccountScreenProps {
  groupId: string | null;
  onNavigate: (tab: string, data?: any) => void;
}

// Bank directory now centralized in utils/banks

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

export function VirtualAccountScreen({ groupId, onNavigate }: VirtualAccountScreenProps) {
  const { appSettings } = useUserProfile();
  const isNigeria = appSettings.region === 'NG';
  const banks = getBankDirectoryForRegion(appSettings.region);
  const providers = getMobileMoneyProviders(appSettings.region);
  const phoneCountryCode = getRegionConfig(appSettings.region).phoneCountryCode;

  const [group, setGroup] = useState<Group | null>(null);
  const [externalAccounts, setExternalAccounts] = useState<ExternalAccount[]>([]);
  const [isGroupLoading, setIsGroupLoading] = useState(true);

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

  const fetchGroup = async () => {
    if (!groupId) {
      setGroup(null);
      setIsGroupLoading(false);
      return;
    }
    setIsGroupLoading(true);
    try {
      const data = await apiClient(`/api/groups/${groupId}`);
      if (data?.group) {
        setGroup({
          id: data.group.id,
          name: data.group.name,
          isAdmin: data.group.isAdmin,
        });
      } else {
        setGroup(null);
      }
    } catch (error) {
      toast.error('Failed to load group');
      setGroup(null);
    } finally {
      setIsGroupLoading(false);
    }
  };

  const fetchAccounts = async () => {
    if (!groupId) return;
    try {
      const data = await apiClient(`/api/groups/${groupId}/accounts`);
      setExternalAccounts(data.accounts || []);
    } catch (error) {
      toast.error('Failed to load group accounts');
    }
  };

  React.useEffect(() => {
    fetchGroup();
    fetchAccounts();
  }, [groupId]);

  if (isGroupLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('friends')} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1>Group Accounts</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('friends')} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1>Group Accounts</h1>
            <p className="text-muted-foreground">Group not found</p>
          </div>
        </div>
      </div>
    );
  }

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
      const payload: any = {
        type: methodType,
        ...(methodType === 'bank'
          ? {
              bank: formData.bank,
              accountNumber: formData.accountNumber,
              accountName: formData.accountName,
              accountType: formData.accountType,
              ...(isNigeria
                ? { sortCode: selectedBank?.code }
                : { routingNumber: selectedBank?.code })
            }
          : {
              provider: formData.provider,
              phoneNumber: formData.phoneNumber
            })
      };

      await apiClient(`/api/groups/${groupId}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      toast.success('External account added successfully!');
      setIsAddingMethod(false);
      resetForm();
      await fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (accountId: string) => {
    if (!groupId) return;
    try {
      await apiClient(`/api/groups/${groupId}/accounts/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true })
      });
      toast.success('Default external account updated');
      await fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update default account');
    }
  };

  const handleDeleteMethod = async (accountId: string) => {
    if (!groupId) return;
    try {
      await apiClient(`/api/groups/${groupId}/accounts/${accountId}`, {
        method: 'DELETE'
      });
      toast.success('External account removed');
      await fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove account');
    }
  };

  const copyToClipboard = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    toast.success(label ? `${label} copied to clipboard!` : 'Copied to clipboard!');
  };

  const copyFullAccountInfo = (account: ExternalAccount) => {
    if (account.type === 'bank') {
      const accountInfo = isNigeria
        ? `${account.bankName}\nAccount Name: ${account.accountHolderName}\nAccount Number: ${account.accountNumber}\nSort Code: ${account.sortCode}`
        : `${account.bankName}\nAccount Holder: ${account.accountHolderName}\nRouting Number: ${account.routingNumber}\nAccount Number: ${account.accountNumber}`;
      copyToClipboard(accountInfo);
    } else {
      copyToClipboard(`${account.provider}\nPhone: ${account.phoneNumber}`);
    }
  };

  const formatAccountNumber = (accountNumber: string) => {
    if (isNigeria) {
      return accountNumber.replace(/(\d{4})(\d{4})(\d{2})/, '$1 $2 $3');
    } else {
      return accountNumber.replace(/(\*{4})(\d{4})/, '$1 $2');
    }
  };

  const handleBankChange = (bankName: string) => {
    setFormData(prev => ({ ...prev, bank: bankName }));
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('group-details', { groupId })} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1>Group Accounts</h1>
            <p className="text-muted-foreground">
              {group.name} • {group.isAdmin ? 'Manage group payment accounts' : 'View group payment accounts'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {group.isAdmin && (
            <Badge variant="secondary" className="text-xs">
              <Crown className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          )}
          
          {group.isAdmin && (
            <Dialog open={isAddingMethod} onOpenChange={setIsAddingMethod}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Group Account</DialogTitle>
                  <DialogDescription>
                    Add a payment account that group members can use as a destination when creating splits.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">


                  {/* Method Type Selection - Only show for Nigeria */}
                  {isNigeria && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={methodType === 'bank' ? 'default' : 'outline'}
                        onClick={() => setMethodType('bank')}
                        className="h-auto p-3 flex flex-col gap-2"
                      >
                        <Building2 className="h-5 w-5" />
                        <span className="text-sm">Bank Account</span>
                      </Button>
                      <Button
                        variant={methodType === 'mobile_money' ? 'default' : 'outline'}
                        onClick={() => setMethodType('mobile_money')}
                        className="h-auto p-3 flex flex-col gap-2"
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
                          <SelectTrigger>
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
                          value={formData.accountName}
                          onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                          placeholder={isNigeria ? "Account holder name" : "Full name as it appears on account"}
                        />
                      </div>

                      {!isNigeria && (
                        <div className="space-y-2">
                          <Label>Account Type</Label>
                          <Select value={formData.accountType} onValueChange={(value: 'checking' | 'savings') => setFormData(prev => ({ ...prev, accountType: value }))}>
                            <SelectTrigger>
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
                          type={getBankAccountLength(appSettings.region) ? 'number' : 'password'}
                          value={formData.accountNumber}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            accountNumber: getBankAccountLength(appSettings.region) ? e.target.value.slice(0, getBankAccountLength(appSettings.region)) : e.target.value 
                          }))}
                          placeholder={getBankAccountLength(appSettings.region) ? '1234567890' : 'Account number'}
                          maxLength={getBankAccountLength(appSettings.region) || undefined}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select value={formData.provider} onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value }))}>
                          <SelectTrigger>
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
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          placeholder={`${phoneCountryCode || '+Country'} 801 234 5678`}
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button 
                      className="flex-1" 
                      onClick={handleAddMethod}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Verifying...
                        </>
                      ) : (
                        'Add Account'
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddingMethod(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Admin Info Card */}
      {!group.isAdmin && (
        <Card>
          <CardContent className="p-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Group Account Access:</strong> Only group administrators can manage external accounts. These accounts are available as payment destinations when creating group splits.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* External Accounts List */}
      <div className="space-y-4">
        {externalAccounts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              {isNigeria ? (
                <div className="flex items-center justify-center gap-4 mb-4">
                  <Building2 className="h-12 w-12 text-muted-foreground" />
                  <Smartphone className="h-12 w-12 text-muted-foreground" />
                </div>
              ) : (
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              )}
              <h3 className="mb-2">No external accounts</h3>
              <p className="text-muted-foreground mb-4">
                {group.isAdmin 
                  ? "Add payment accounts that group members can use when creating splits"
                  : "No payment accounts have been added to this group yet"
                }
              </p>
              {group.isAdmin && (
                <Button onClick={() => setIsAddingMethod(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First External Account
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          externalAccounts.map((account) => (
            <Card key={account.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      account.type === 'bank' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {account.type === 'bank' ? (
                        <Building2 className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Smartphone className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <h4>{account.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {account.type === 'bank' ? account.bankName : account.provider} • Added by {account.createdBy}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(account.createdDate)}
                      </p>
                    </div>
                  </div>
                  {account.isDefault && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Check className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  {account.type === 'bank' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {isNigeria ? 'Account Name:' : 'Account Holder:'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span>{account.accountHolderName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(account.accountHolderName!, 'Account name')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Account Number:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{formatAccountNumber(account.accountNumber!)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(account.accountNumber!, 'Account number')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {isNigeria ? (
                        account.sortCode && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Sort Code:</span>
                            <span className="font-mono">{account.sortCode}</span>
                          </div>
                        )
                      ) : (
                        account.routingNumber && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Routing Number:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{account.routingNumber}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(account.routingNumber!, 'Routing number')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Phone Number:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{account.phoneNumber}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(account.phoneNumber!, 'Phone number')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => copyFullAccountInfo(account)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All Details
                  </Button>
                  {group.isAdmin && !account.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSetDefault(account.id)}
                    >
                      Set as Default
                    </Button>
                  )}
                  {group.isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMethod(account.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Information Card */}
      <Card>
        <CardContent className="p-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Group Accounts:</strong> These payment accounts are shared with all group members and can be selected as payment destinations when creating group splits. Only group administrators can add, edit, or remove accounts.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Group Accounts Work</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">1</div>
              <p>Group admins add group accounts that can receive group payments</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">2</div>
              <p>When creating group splits, members can choose these accounts as payment destinations</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">3</div>
              <p>Payment details are automatically shared with all group members for easy transfers</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
