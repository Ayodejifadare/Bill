import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Copy } from 'lucide-react';
import { cn } from './ui/utils';
import type { PaymentMethod } from './PaymentMethodSelector';

interface BankAccountCardProps {
  method: PaymentMethod;
  isSelected?: boolean;
  onSelect?: (method: PaymentMethod) => void;
  onCopy?: (method: PaymentMethod) => void;
}

const formatAccountNumber = (accountNumber: string) => {
  return accountNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
};

export function BankAccountCard({
  method,
  isSelected,
  onSelect,
  onCopy
}: BankAccountCardProps) {
  const handleSelect = () => onSelect?.(method);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy?.(method);
  };

  return (
    <Card
      onClick={handleSelect}
      className={cn('cursor-pointer', isSelected && 'ring-2 ring-primary')}
    >
      <CardContent className="p-4 flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-medium">{method.bankName}</p>
          {method.accountHolderName && (
            <p className="text-sm text-muted-foreground">
              {method.accountHolderName}
            </p>
          )}
          {method.sortCode && (
            <p className="text-sm text-muted-foreground">
              Sort Code: {method.sortCode}
            </p>
          )}
          {method.routingNumber && (
            <p className="text-sm text-muted-foreground">
              Routing Number: {method.routingNumber}
            </p>
          )}
          {method.accountNumber && (
            <p className="text-sm text-muted-foreground">
              Account: {formatAccountNumber(method.accountNumber)}
            </p>
          )}
        </div>
        <div className="flex items-start gap-2">
          {method.isDefault && (
            <Badge variant="secondary" className="text-xs h-5">
              Default
            </Badge>
          )}
          {onCopy && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="p-2 h-7 w-7"
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
