import { Card } from './card';

interface BalanceItem {
  amount: number;
  label: string;
  color?: string;
}

interface BalanceCardProps {
  title: string;
  items: BalanceItem[];
  currencySymbol?: string;
  className?: string;
}

export function BalanceCard({ title, items, currencySymbol = '$', className = '' }: BalanceCardProps) {
  return (
    <Card className={`p-4 ${className}`}>
      <h3 className="font-medium mb-3">{title}</h3>
      <div className={`grid gap-4 grid-cols-${items.length}`}>
        {items.map((item, index) => (
          <div key={index} className="text-center">
            <p className={`text-2xl font-medium ${item.color || 'text-foreground'}`}>
              {currencySymbol}{item.amount.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}