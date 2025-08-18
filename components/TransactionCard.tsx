import { ArrowUpRight, ArrowDownLeft, Users, Clock } from "lucide-react";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";

interface TransactionUser {
  name: string;
  avatar?: string;
}

interface Transaction {
  id: string;
  type: 'sent' | 'received' | 'split' | 'bill_split' | 'request';
  amount: number;
  description: string;
  user?: TransactionUser; // Legacy format
  recipient?: TransactionUser; // New format
  sender?: TransactionUser; // New format
  avatarFallback?: string; // Fallback avatar text
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

interface TransactionCardProps {
  transaction: Transaction;
  onNavigate?: (tab: string, data?: any) => void;
  onClick?: () => void;
  currencySymbol?: string;
}

export function TransactionCard({ transaction, onNavigate, onClick, currencySymbol = '$' }: TransactionCardProps) {
  const getIcon = () => {
    switch (transaction.type) {
      case 'sent':
        return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      case 'received':
        return <ArrowDownLeft className="h-4 w-4 text-success" />;
      case 'split':
      case 'bill_split':
        return <Users className="h-4 w-4 text-primary" />;
      case 'request':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  const getAmountColor = () => {
    switch (transaction.type) {
      case 'sent':
        return 'text-destructive';
      case 'received':
        return 'text-success';
      case 'split':
      case 'bill_split':
        return 'text-primary';
      case 'request':
        return 'text-warning';
      default:
        return 'text-foreground';
    }
  };

  const getAmountPrefix = () => {
    switch (transaction.type) {
      case 'sent':
        return '-';
      case 'received':
        return '+';
      case 'split':
      case 'bill_split':
        return '-';
      case 'request':
        return '';
      default:
        return '';
    }
  };

  const getTypeLabel = () => {
    switch (transaction.type) {
      case 'sent':
        return 'Sent';
      case 'received':
        return 'Received';
      case 'split':
      case 'bill_split':
        return 'Bill Split';
      case 'request':
        return 'Request';
      default:
        return '';
    }
  };

  // Determine user info based on transaction type and available data
  const getUserInfo = () => {
    // Legacy format
    if (transaction.user) {
      return transaction.user;
    }
    
    // New format - determine user based on transaction type
    if (transaction.type === 'sent' && transaction.recipient) {
      return transaction.recipient;
    }
    
    if (transaction.type === 'received' && transaction.sender) {
      return transaction.sender;
    }
    
    if ((transaction.type === 'bill_split' || transaction.type === 'split') && transaction.recipient) {
      return transaction.recipient;
    }
    
    if (transaction.type === 'request' && transaction.recipient) {
      return transaction.recipient;
    }
    
    // Fallback
    return {
      name: transaction.type === 'bill_split' ? 'Bill Split' : 'Unknown',
      avatar: transaction.avatarFallback || 'UN'
    };
  };

  const userInfo = getUserInfo();
  const avatarFallback = transaction.avatarFallback || 
                        userInfo.avatar || 
                        userInfo.name.split(' ').map(n => n[0]).join('').toUpperCase();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (onNavigate) {
      onNavigate('transaction-details', { transactionId: transaction.id });
    }
  };

  return (
    <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer active:scale-[0.98] touch-manipulation" onClick={handleClick}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-muted text-xs">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-border">
              {getIcon()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <p className="font-medium truncate pr-2">{userInfo.name}</p>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <p className={`font-medium text-sm ${getAmountColor()}`}>
                  {getAmountPrefix()}{currencySymbol}{transaction.amount.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{getTypeLabel()}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground truncate leading-relaxed mb-1">
              {transaction.description}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
              <div className="flex gap-1">
                {transaction.status === 'pending' && (
                  <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                    Pending
                  </Badge>
                )}
                {transaction.status === 'failed' && (
                  <Badge variant="destructive" className="text-xs px-2 py-0 h-5">
                    Failed
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}