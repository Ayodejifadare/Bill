// DEPRECATED: This file has been replaced by ShareUtils.tsx
// Please update imports to use ShareUtils.tsx instead

export { 
  ShareUtils as SimpleShareUtils,
  QuickShareButton,
  createDeepLink,
  type ShareData
} from './ShareUtils';
import { Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { ShareSheet } from './ui/share-sheet';
import { useUserProfile } from './UserProfileContext';
import { formatCurrencyForRegion, getCurrencySymbol } from '../utils/regions';
import { formatDueDate } from '../utils/formatDueDate';

export interface ShareData {
  type: 'bill_split' | 'payment_request' | 'transaction' | 'payment_confirmation' | 'group_summary';
  title: string;
  amount: number;
  description?: string;
  participantNames?: string[];
  dueDate?: string;
  status?: string;
  groupName?: string;
  paymentMethod?: string;
  transactionId?: string;
  deepLink?: string;
}

interface SimpleShareUtilsProps {
  shareData: ShareData;
  onNavigate?: (tab: string, data?: any) => void;
}

export function SimpleShareUtils({ shareData, onNavigate }: SimpleShareUtilsProps) {
  const { userProfile, appSettings } = useUserProfile();
  const currencySymbol = getCurrencySymbol(appSettings.region);
  const fmt = (n: number) => formatCurrencyForRegion(appSettings.region, n);
  const [showShareSheet, setShowShareSheet] = useState(false);

  const generateShareText = () => {
    const { type, title, amount, description, participantNames, dueDate, status, groupName } = shareData;
    const formattedAmount = fmt(amount);
    const formattedDueDate = dueDate ? formatDueDate(dueDate) : '';
    
    switch (type) {
      case 'bill_split':
        const participantsList = participantNames ? participantNames.join(', ') : 'friends';
        return `*${title}*

💰 Amount: ${formattedAmount}
  👥 Split with: ${participantsList}${formattedDueDate ? `\n📅 Due: ${formattedDueDate}` : ''}${description ? `\n📝 ${description}` : ''}

_Shared via Biltip 🚀_`;

      case 'payment_request':
        return `*Payment Request*

💸 Amount: ${formattedAmount}
👤 From: ${userProfile.name}
  📋 For: ${title}${formattedDueDate ? `\n📅 Due: ${formattedDueDate}` : ''}${description ? `\n📝 ${description}` : ''}

_Send via Biltip 🚀_`;

      case 'transaction':
        return `*Transaction Complete*

✅ ${title}: ${formattedAmount}
📊 Status: ${status || 'Completed'}${shareData.transactionId ? `\n🧾 Ref: ${shareData.transactionId}` : ''}${shareData.paymentMethod ? `\n💳 Via: ${shareData.paymentMethod}` : ''}

_Powered by Biltip 🚀_`;

      case 'payment_confirmation':
        return `*Payment Sent Successfully!*

💰 Amount: ${formattedAmount}
👤 To: ${title}${shareData.transactionId ? `\n🧾 Reference: ${shareData.transactionId}` : ''}${shareData.paymentMethod ? `\n💳 Method: ${shareData.paymentMethod}` : ''}

_Paid via Biltip 🚀_`;

      case 'group_summary':
        return `*${groupName || 'Group'} Expense Summary*

💰 Total: ${formattedAmount}${participantNames ? `\n👥 Members: ${participantNames.join(', ')}` : ''}${description ? `\n📝 ${description}` : ''}

_Tracked with Biltip 🚀_`;

      default:
        return `Check out this ${title} for ${formattedAmount} on Biltip!`;
    }
  };

  const getDocumentData = () => {
    return {
      title: shareData.title,
      content: shareData,
      type: shareData.type === 'bill_split' ? 'bill_split' as const : 'receipt' as const
    };
  };

  return (
    <>
      <Button 
        onClick={() => setShowShareSheet(true)}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        size="lg"
      >
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>

      <ShareSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        title="Share Details"
        shareText={generateShareText()}
        documentData={getDocumentData()}
      />
    </>
  );
}

// Quick share button component for individual screens
interface QuickShareButtonProps {
  shareData: ShareData;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showText?: boolean;
}

export function QuickShareButton({ shareData, variant = 'outline', size = 'sm', showText = true }: QuickShareButtonProps) {
  const [showShareSheet, setShowShareSheet] = useState(false);
  const { appSettings } = useUserProfile();
  const fmt = (n: number) => formatCurrencyForRegion(appSettings.region, n);

  const generateQuickShareText = () => {
    const formattedAmount = fmt(shareData.amount);
    return `*${shareData.title}*

💰 ${formattedAmount}${shareData.description ? `\n📝 ${shareData.description}` : ''}

_Shared via Biltip 🚀_`;
  };

  return (
    <>
      <Button 
        variant={variant} 
        size={size}
        onClick={() => setShowShareSheet(true)}
      >
        <Share2 className="h-4 w-4" />
        {showText && <span className="ml-2">Share</span>}
      </Button>

      <ShareSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        title="Share"
        shareText={generateQuickShareText()}
        documentData={{
          title: shareData.title,
          content: shareData,
          type: 'bill_split'
        }}
      />
    </>
  );
}

// Utility function to create shareable deep links
export const createDeepLink = (type: string, id: string): string => {
  const baseUrl = 'https://biltip.app'; // This would be your actual app URL
  return `${baseUrl}/${type}/${id}`;
};
