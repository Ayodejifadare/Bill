import { Card } from "./card";
import { useUserProfile } from "../UserProfileContext";
import { formatCurrencyForRegion } from "../../utils/regions";

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

export function BalanceCard({
  title,
  items,
  className = "",
}: BalanceCardProps) {
  const { appSettings } = useUserProfile();
  return (
    <Card className={`p-4 ${className}`}>
      <h3 className="font-medium mb-3">{title}</h3>
      <div className={`grid gap-4 grid-cols-${items.length}`}>
        {items.map((item, index) => (
          <div key={index} className="text-center">
            <p
              className={`text-2xl font-medium ${item.color || "text-foreground"}`}
            >
              {formatCurrencyForRegion(appSettings.region, item.amount)}
            </p>
            <p className="text-sm text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
