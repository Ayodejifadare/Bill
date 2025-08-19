import { BankAccountCard } from './BankAccountCard';
import { MobileMoneyCard } from './MobileMoneyCard';

export interface PaymentMethod {
  id: string;
  type: 'bank' | 'mobile_money';
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  sortCode?: string;
  routingNumber?: string;
  accountType?: 'checking' | 'savings';
  provider?: string;
  phoneNumber?: string;
  isDefault?: boolean;
}

interface PaymentMethodSelectorProps {
  paymentMethods: PaymentMethod[];
  selectedId?: string | null;
  onSelect?: (method: PaymentMethod) => void;
  onCopy?: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({
  paymentMethods,
  selectedId,
  onSelect,
  onCopy
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-2">
      {paymentMethods.map((method) =>
        method.type === 'bank' ? (
          <BankAccountCard
            key={method.id}
            method={method}
            isSelected={method.id === selectedId}
            onSelect={onSelect}
            onCopy={onCopy}
          />
        ) : (
          <MobileMoneyCard
            key={method.id}
            method={method}
            isSelected={method.id === selectedId}
            onSelect={onSelect}
            onCopy={onCopy}
          />
        )
      )}
    </div>
  );
}
