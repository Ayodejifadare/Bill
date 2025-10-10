import { AccountCard, AccountCardProps } from "./AccountCard";

interface BankAccount {
  id: string;
  bank?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  accountHolderName?: string;
  sortCode?: string;
  routingNumber?: string;
  accountType?: "checking" | "savings";
  isDefault: boolean;
}

export interface BankAccountCardProps
  extends Omit<AccountCardProps, "account"> {
  account: BankAccount;
}

export function BankAccountCard({ account, ...rest }: BankAccountCardProps) {
  return (
    <AccountCard
      account={{
        id: account.id,
        type: "bank",
        bankName: account.bankName || account.bank,
        accountNumber: account.accountNumber,
        accountHolderName: account.accountHolderName || account.accountName,
        sortCode: account.sortCode,
        routingNumber: account.routingNumber,
        accountType: account.accountType,
        isDefault: account.isDefault,
      }}
      {...rest}
    />
  );
}

export default BankAccountCard;
