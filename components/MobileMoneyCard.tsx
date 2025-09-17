import { AccountCard, AccountCardProps } from './AccountCard';

interface MobileMoneyAccount {
  id: string;
  provider: string;
  phoneNumber: string;
  isDefault: boolean;
}

export interface MobileMoneyCardProps extends Omit<AccountCardProps, 'account'> {
  account: MobileMoneyAccount;
}

export function MobileMoneyCard({ account, ...rest }: MobileMoneyCardProps) {
  return (
    <AccountCard
      account={{
        id: account.id,
        type: 'mobile_money',
        provider: account.provider,
        phoneNumber: account.phoneNumber,
        isDefault: account.isDefault,
      }}
      {...rest}
    />
  );
}

export default MobileMoneyCard;
