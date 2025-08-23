import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Building2, Smartphone, Copy, Trash2, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useUserProfile } from './UserProfileContext';

interface BaseAccount {
  id: string;
  type: 'bank' | 'mobile_money';
  // Bank fields
  bank?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  accountHolderName?: string;
  sortCode?: string;
  routingNumber?: string;
  accountType?: 'checking' | 'savings';
  // Mobile money fields
  provider?: string;
  phoneNumber?: string;
  isDefault: boolean;
}

interface PersonalAccount extends BaseAccount {
  // Personal accounts don't need additional metadata
}

interface GroupAccount extends BaseAccount {
  name: string;
  createdBy: string;
  createdDate: string;
}

export interface AccountCardProps {
  account: PersonalAccount | GroupAccount;
  onSetDefault?: (accountId: string) => void;
  onDelete?: (accountId: string) => void;
  onEdit?: (account: PersonalAccount | GroupAccount) => void;
  showAdminActions?: boolean;
  variant?: 'personal' | 'group';
}

export function AccountCard({ 
  account, 
  onSetDefault,
  onDelete,
  onEdit,
  showAdminActions = true,
  variant = 'personal'
}: AccountCardProps) {
  const { appSettings } = useUserProfile();
  const isNigeria = appSettings.region === 'NG';
  const isGroupAccount = variant === 'group' && 'name' in account;
  const bank = account.bankName || account.bank;
  const accountName = account.accountHolderName || account.accountName;

  const copyToClipboard = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    toast.success(label ? `${label} copied to clipboard!` : 'Copied to clipboard!');
  };

  const copyFullAccountInfo = () => {
    if (account.type === 'bank') {
      const accountInfo = isNigeria
        ? `${bank}\nAccount Name: ${accountName}\nAccount Number: ${account.accountNumber}\nSort Code: ${account.sortCode}`
        : `${bank}\nAccount Holder: ${accountName}\nRouting Number: ${account.routingNumber}\nAccount Number: ${account.accountNumber}`;
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

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className="relative">
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
              {isGroupAccount ? (
                <>
                  <h4 className="text-sm sm:text-base truncate">{(account as GroupAccount).name}</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {account.type === 'bank' ? bank : account.provider} • Added by {(account as GroupAccount).createdBy}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate((account as GroupAccount).createdDate)}
                  </p>
                </>
              ) : (
                <>
                  <h4 className="text-sm sm:text-base">{account.type === 'bank' ? bank : account.provider}</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {account.type === 'bank' 
                      ? (isNigeria ? 'Bank Account' : `${account.accountType?.charAt(0).toUpperCase()}${account.accountType?.slice(1)} Account`)
                      : 'Mobile Money'
                    }
                  </p>
                </>
              )}
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
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {isNigeria ? 'Account Name:' : 'Account Holder:'}
                </span>
                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                  <span className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{accountName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0"
                    onClick={() => copyToClipboard(accountName!, 'Account name')}
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
              {isNigeria ? (
                account.sortCode && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">Sort Code:</span>
                    <span className="font-mono text-xs sm:text-sm">{account.sortCode}</span>
                  </div>
                )
              ) : (
                account.routingNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">Routing Number:</span>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="font-mono text-xs sm:text-sm">{account.routingNumber}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0"
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
            onClick={copyFullAccountInfo}
          >
            <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Copy All Details</span>
            <span className="sm:hidden">Copy All</span>
          </Button>
          {!account.isDefault && onSetDefault && showAdminActions && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
              onClick={() => onSetDefault(account.id)}
            >
              <span className="hidden sm:inline">Set as Default</span>
              <span className="sm:hidden">Set Default</span>
            </Button>
          )}
          {onEdit && showAdminActions && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(account)}
              className="h-8 sm:h-9 px-2 sm:px-3"
            >
              <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          )}
          {onDelete && showAdminActions && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(account.id)}
              className="text-destructive hover:text-destructive h-8 sm:h-9 px-2 sm:px-3"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}