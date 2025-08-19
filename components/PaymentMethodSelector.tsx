import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Building2, Smartphone } from 'lucide-react';
import { BankAccountCard } from './BankAccountCard';
import { MobileMoneyCard } from './MobileMoneyCard';

export interface PaymentMethod {
  id: string;
  type: 'bank' | 'mobile_money';
  // Bank fields
  bankName?: string;
  bank?: string;
  accountNumber?: string;
  accountHolderName?: string;
  accountName?: string;
  sortCode?: string;
  routingNumber?: string;
  accountType?: 'checking' | 'savings';
  // Mobile money fields
  provider?: string;
  phoneNumber?: string;
  // External account metadata
  isDefault?: boolean;
  isExternal?: boolean;
  name?: string;
  externalName?: string;
}

interface PaymentMethodSelectorProps {
  methods: PaymentMethod[];
  selectedId: string | null;
  onSelect: (method: PaymentMethod | null) => void;
  isNigeria: boolean;
  loading?: boolean;
  onManage?: () => void;
}

export function PaymentMethodSelector({
  methods,
  selectedId,
  onSelect,
  isNigeria,
  loading = false,
  onManage,
}: PaymentMethodSelectorProps) {
  const selectedMethod = methods.find((m) => m.id === selectedId) || null;

  const formatAccountNumber = (accountNumber: string) => {
    if (isNigeria) {
      return accountNumber.replace(/(\d{4})(\d{4})(\d{2})/, '$1 $2 $3');
    }
    return accountNumber;
  };

  const renderSelectItem = (method: PaymentMethod) => (
    <SelectItem key={method.id} value={method.id}>
      <div className="flex items-center gap-2">
        {method.type === 'bank' ? (
          <Building2 className="h-4 w-4" />
        ) : (
          <Smartphone className="h-4 w-4" />
        )}
        <span>
          {method.isExternal
            ? method.name
            : method.type === 'bank'
              ? method.bankName || method.bank
              : method.provider}
        </span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground text-sm">
          {method.isExternal
            ? method.type === 'bank'
              ? method.bankName
              : method.provider
            : method.type === 'bank'
              ? formatAccountNumber(method.accountNumber || '')
              : method.phoneNumber}
        </span>
        {method.isDefault && (
          <Badge variant="secondary" className="text-xs">
            Default
          </Badge>
        )}
      </div>
    </SelectItem>
  );

  const hasExternal = methods.some((m) => m.isExternal);

  return (
    <div className="space-y-4">
      <Select
        value={selectedId || ''}
        disabled={loading}
        onValueChange={(value) => {
          const method = methods.find((m) => m.id === value) || null;
          onSelect(method);
        }}
      >
        <SelectTrigger className="min-h-[48px]">
          <SelectValue placeholder="Select payment method" />
        </SelectTrigger>
        <SelectContent>
          {hasExternal ? (
            <>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Group External Accounts
              </div>
              {methods.filter((m) => m.isExternal).map(renderSelectItem)}
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Personal Accounts
              </div>
              {methods.filter((m) => !m.isExternal).map(renderSelectItem)}
            </>
          ) : (
            methods.map(renderSelectItem)
          )}
        </SelectContent>
      </Select>

      {selectedMethod && (
        selectedMethod.type === 'bank' ? (
          <BankAccountCard account={selectedMethod} showAdminActions={false} />
        ) : (
          <MobileMoneyCard account={selectedMethod} showAdminActions={false} />
        )
      )}

      {onManage && (
        <Button
          variant="outline"
          size="sm"
          onClick={onManage}
          className="w-full"
        >
          Manage Payment Methods
        </Button>
      )}
    </div>
  );
}

export default PaymentMethodSelector;
