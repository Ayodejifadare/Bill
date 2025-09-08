import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { EmptyState } from './ui/empty-state';
import { ArrowLeft, Plus, Building2, Smartphone, Copy, Trash2, Check, Edit2, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useUserProfile } from './UserProfileContext';
import { getBankDirectoryForRegion } from '../utils/banks';
import { getMobileMoneyProviders } from '../utils/providers';
import { getRegionConfig, requiresRoutingNumber, validateBankAccountNumber, getBankAccountLength, getBankIdentifierLabel, formatBankAccountForRegion } from '../utils/regions';
import { apiClient } from '../utils/apiClient';

interface GroupAccount {
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

interface GroupAccountScreenProps {
  groupId: string | null;
  onNavigate: (tab: string, data?: any) => void;
}

// Bank directory is centralized in utils/banks; providers in utils/providers

export function GroupAccountScreen({ groupId, onNavigate }: GroupAccountScreenProps) {
  const { appSettings } = useUserProfile();
  const banks = getBankDirectoryForRegion(appSettings.region);
  const providers = getMobileMoneyProviders(appSettings.region);
  const phoneCountryCode = getRegionConfig(appSettings.region).phoneCountryCode;

  const [group, setGroup] = useState<Group | null>(null);
  const [groupAccounts, setGroupAccounts] = useState<GroupAccount[]>([]);
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

  const fetchAccounts = async () => {
    if (!groupId) return;
    try {
      const data = await apiClient(`/api/groups/${groupId}/accounts`);
      const accounts = (data.accounts || []).map((a: any) => ({
        ...a,
        createdDate: a.createdDate || a.createdAt,
      }));
      setGroupAccounts(accounts);
    } catch (error) {
      toast.error('Failed to load group accounts');
    }
  };

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
      const selectedBank = banks.find(bank => bank.name === formData.bank);
      if (!selectedBank) {
        toast.error('Please select a valid bank');
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
      const provider = providers.find(p => p.name === formData.provider);
      if (!provider) {
        toast.error('Please select a valid provider');
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
              ...(
                requiresRoutingNumber(appSettings.region)
                  ? { routingNumber: selectedBank?.code }
                  : { sortCode: selectedBank?.code }
              )
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
      toast.success('Group account added successfully!');
      setIsAddingMethod(false);
      resetForm();
      await fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add group account');
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
      toast.success('Default group account updated');
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
      setGroupAccounts(prev => prev.filter(account => account.id !== accountId));
      toast.success('Group account removed');
      await fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove group account');
    }
  };

  const copyToClipboard = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    toast.success(label ? `${label} copied to clipboard!` : 'Copied to clipboard!');
  };

  const copyFullAccountInfo = (account: GroupAccount) => {
    if (account.type === 'bank') {
      const usesRouting = requiresRoutingNumber(appSettings.region);
      const label = getBankIdentifierLabel(appSettings.region);
      const idValue = usesRouting ? account.routingNumber : account.sortCode;
      const accountInfo = `${account.bankName}\nAccount Name: ${account.accountHolderName}\n${label}: ${idValue ?? ''}\nAccount Number: ${account.accountNumber}`;
      copyToClipboard(accountInfo);
    } else {
      copyToClipboard(`${account.provider}\nPhone: ${account.phoneNumber}`);
    }
  };

  const formatAccountNumber = (accountNumber: string) =>
    formatBankAccountForRegion(appSettings.region, accountNumber);

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
    <div className="min-h-screen">
      {/* Static Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-md mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Button variant="ghost" size="sm" onClick={() => onNavigate('group-details', { groupId })} className="p-1.5 sm:p-2 flex-shrink-0">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base truncate">Group Accounts</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {group.name} • {group.isAdmin ? 'Manage accounts' : 'View accounts'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {group.isAdmin && (
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
              
              {group.isAdmin && (
                <Dialog open={isAddingMethod} onOpenChange={setIsAddingMethod}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 px-2 sm:px-3">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-md mx-auto">
                    <DialogHeader>
                      <DialogTitle className="text-base sm:text-lg">Add Group Account</DialogTitle>
                      <DialogDescription className="text-sm">
                        Add a payment account that group members can use as a destination when creating splits.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto">

                      {/* Method Type Selection - Only show when mobile money is supported */}
                      {providers.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <Button
                            variant={methodType === 'bank' ? 'default' : 'outline'}
                            onClick={() => setMethodType('bank')}
                            className="h-auto p-2 sm:p-3 flex flex-col gap-1 sm:gap-2"
                          >
                            <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="text-xs sm:text-sm">Bank Account</span>
                          </Button>
                          <Button
                            variant={methodType === 'mobile_money' ? 'default' : 'outline'}
                            onClick={() => setMethodType('mobile_money')}
                            className="h-auto p-2 sm:p-3 flex flex-col gap-1 sm:gap-2"
                          >
                            <Smartphone className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="text-xs sm:text-sm">Mobile Money</span>
                          </Button>
                        </div>
                      )}

                      {(providers.length === 0 || methodType === 'bank') ? (
                        <>
                          <div className="space-y-1 sm:space-y-2">
                            <Label className="text-sm">Bank</Label>
                            <Select value={formData.bank} onValueChange={handleBankChange}>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select your bank" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {banks.map((bank) => (
                                  <SelectItem key={bank.code} value={bank.name} className="text-sm">
                                    {bank.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1 sm:space-y-2">
                            <Label className="text-sm">Account Holder Name</Label>
                            <Input
                              value={formData.accountName}
                              onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                              placeholder={"Full name as it appears on account"}
                              className="h-10 text-sm"
                            />
                          </div>

                          {requiresRoutingNumber(appSettings.region) && (
                            <div className="space-y-1 sm:space-y-2">
                              <Label className="text-sm">Account Type</Label>
                              <Select value={formData.accountType} onValueChange={(value: 'checking' | 'savings') => setFormData(prev => ({ ...prev, accountType: value }))}>
                                <SelectTrigger className="h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="checking" className="text-sm">Checking</SelectItem>
                                  <SelectItem value="savings" className="text-sm">Savings</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-1 sm:space-y-2">
                            <Label className="text-sm">Account Number</Label>
                            <Input
                              type={getBankAccountLength(appSettings.region) ? "number" : "password"}
                              value={formData.accountNumber}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                accountNumber: getBankAccountLength(appSettings.region) ? e.target.value.slice(0, getBankAccountLength(appSettings.region)) : e.target.value 
                              }))}
                              placeholder={getBankAccountLength(appSettings.region) ? '1234567890' : 'Account number'}
                              maxLength={getBankAccountLength(appSettings.region)}
                              className="h-10 text-sm"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1 sm:space-y-2">
                            <Label className="text-sm">Provider</Label>
                            <Select value={formData.provider} onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value }))}>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                              <SelectContent>
                                {providers.map((provider) => (
                                  <SelectItem key={provider.code} value={provider.name} className="text-sm">
                                    {provider.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1 sm:space-y-2">
                            <Label className="text-sm">Phone Number</Label>
                            <Input
                              type="tel"
                              value={formData.phoneNumber}
                              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                              placeholder={`${phoneCountryCode || '+Country'} 801 234 5678`}
                              className="h-10 text-sm"
                            />
                          </div>
                        </>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
                        <Button 
                          className="flex-1 h-10 order-1 sm:order-1" 
                          onClick={handleAddMethod}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              <span className="text-sm">Verifying...</span>
                            </>
                          ) : (
                            <span className="text-sm">Add Account</span>
                          )}
                        </Button>
                        <Button variant="outline" onClick={() => setIsAddingMethod(false)} className="flex-1 h-10 order-2 sm:order-2">
                          <span className="text-sm">Cancel</span>
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-md mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24">
        {/* Admin Info Card */}
        {!group.isAdmin && (
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>Group Account Access:</strong> Only group administrators can manage group accounts. These accounts are available as payment destinations when creating group splits.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Group Accounts List */}
        <div className="space-y-3 sm:space-y-4">
          {groupAccounts.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No group accounts"
              description={
                group.isAdmin
                  ? 'Add payment accounts that group members can use when creating splits'
                  : 'No payment accounts have been added to this group yet'
              }
              actionLabel={group.isAdmin ? 'Add First Group Account' : undefined}
              onAction={group.isAdmin ? () => setIsAddingMethod(true) : undefined}
            />
          ) : (
            groupAccounts.map((account) => (
              <Card key={account.id} className="relative">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        account.type === 'bank' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {account.type === 'bank' ? (
                          <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        ) : (
                          <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm sm:text-base truncate">{account.name}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {account.type === 'bank' ? account.bankName : account.provider} • Added by {account.createdBy}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(account.createdDate)}
                        </p>
                      </div>
                    </div>
                    {account.isDefault && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 flex-shrink-0 text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
                    {account.type === 'bank' ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-muted-foreground">Account Holder:</span>
                          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                            <span className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{account.accountHolderName}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0"
                              onClick={() => copyToClipboard(account.accountHolderName!, 'Account name')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-muted-foreground">Account Number:</span>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <span className="font-mono text-xs sm:text-sm">{formatAccountNumber(account.accountNumber!)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0"
                              onClick={() => copyToClipboard(account.accountNumber!, 'Account number')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {(() => {
                          const usesRouting = requiresRoutingNumber(appSettings.region);
                          const label = getBankIdentifierLabel(appSettings.region);
                          const value = usesRouting ? account.routingNumber : account.sortCode;
                          if (!value) return null;
                          return (
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm text-muted-foreground">{label}:</span>
                              <div className="flex items-center gap-1 sm:gap-2">
                                <span className="font-mono text-xs sm:text-sm">{value}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0"
                                  onClick={() => copyToClipboard(value!, label)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-muted-foreground">Phone Number:</span>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span className="font-mono text-xs sm:text-sm">{account.phoneNumber}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0"
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
                      className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                      onClick={() => copyFullAccountInfo(account)}
                    >
                      <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Copy All Details</span>
                      <span className="sm:hidden">Copy All</span>
                    </Button>
                    {group.isAdmin && !account.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                        onClick={() => handleSetDefault(account.id)}
                      >
                        <span className="hidden sm:inline">Set as Default</span>
                        <span className="sm:hidden">Set Default</span>
                      </Button>
                    )}
                    {group.isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label="Delete account"
                        onClick={() => handleDeleteMethod(account.id)}
                        className="text-destructive hover:text-destructive h-8 sm:h-9 px-2 sm:px-3"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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
          <CardContent className="p-3 sm:p-4">
            <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-800">
                <strong>Group Accounts:</strong> These payment accounts are shared with all group members and can be selected as payment destinations when creating group splits. Only group administrators can add, edit, or remove accounts.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
