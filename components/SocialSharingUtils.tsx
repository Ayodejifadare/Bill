// DEPRECATED: This file has been replaced by ShareUtils.tsx
// Please update imports to use ShareUtils.tsx instead

export { 
  ShareUtils as SocialSharingUtils,
  QuickShareButton,
  createDeepLink,
  type ShareData
} from './ShareUtils';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useUserProfile } from './UserProfileContext';

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

interface SocialSharingUtilsProps {
  shareData: ShareData;
  onNavigate?: (tab: string, data?: any) => void;
}

export function SocialSharingUtils({ shareData, onNavigate }: SocialSharingUtilsProps) {
  const { userProfile, appSettings } = useUserProfile();
  const currencySymbol = appSettings.region === 'NG' ? '₦' : '$';

  const generateShareText = () => {
    const { type, title, amount, description, participantNames, dueDate, status, groupName } = shareData;
    const formattedAmount = `${currencySymbol}${amount.toFixed(2)}`;
    
    switch (type) {
      case 'bill_split':
        const participantsList = participantNames ? participantNames.join(', ') : 'friends';
        return `💰 *Bill Split: ${title}*\n\n` +
               `Amount: ${formattedAmount}\n` +
               `Split with: ${participantsList}\n` +
               (dueDate ? `Due: ${dueDate}\n` : '') +
               (description ? `Details: ${description}\n` : '') +
               `\n📱 Organized with Biltip - Your bill splitting made easy!` +
               (shareData.deepLink ? `\n\nView details: ${shareData.deepLink}` : '');

      case 'payment_request':
        return `💸 *Payment Request*\n\n` +
               `Amount: ${formattedAmount}\n` +
               `From: ${userProfile.name}\n` +
               `For: ${title}\n` +
               (dueDate ? `Due: ${dueDate}\n` : '') +
               (description ? `Details: ${description}\n` : '') +
               `\n📱 Send via Biltip - Quick & secure payments!` +
               (shareData.deepLink ? `\n\nPay now: ${shareData.deepLink}` : '');

      case 'transaction':
        return `✅ *Transaction Complete*\n\n` +
               `${title}: ${formattedAmount}\n` +
               `Status: ${status || 'Completed'}\n` +
               (shareData.transactionId ? `Ref: ${shareData.transactionId}\n` : '') +
               (shareData.paymentMethod ? `Via: ${shareData.paymentMethod}\n` : '') +
               `\n📱 Processed with Biltip`;

      case 'payment_confirmation':
        return `✅ *Payment Sent Successfully!*\n\n` +
               `Amount: ${formattedAmount}\n` +
               `To: ${title}\n` +
               (shareData.transactionId ? `Reference: ${shareData.transactionId}\n` : '') +
               (shareData.paymentMethod ? `Method: ${shareData.paymentMethod}\n` : '') +
               `\n📱 Paid via Biltip - Your trusted payment companion`;

      case 'group_summary':
        return `📊 *${groupName || 'Group'} Expense Summary*\n\n` +
               `Total: ${formattedAmount}\n` +
               (participantNames ? `Members: ${participantNames.join(', ')}\n` : '') +
               (description ? `${description}\n` : '') +
               `\n📱 Tracked with Biltip - Keep your group expenses organized!`;

      default:
        return `Check out this ${title} for ${formattedAmount} on Biltip!`;
    }
  };

  const generateWhatsAppURL = () => {
    const text = encodeURIComponent(generateShareText());
    return `https://wa.me/?text=${text}`;
  };

  const generateSMSURL = () => {
    const text = encodeURIComponent(generateShareText());
    return `sms:?body=${text}`;
  };

  const generateEmailURL = () => {
    const subject = encodeURIComponent(`Biltip: ${shareData.title}`);
    const body = encodeURIComponent(generateShareText());
    return `mailto:?subject=${subject}&body=${body}`;
  };

  const handleNativeShare = async () => {
    const shareText = generateShareText();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Biltip: ${shareData.title}`,
          text: shareText,
          url: shareData.deepLink || 'https://biltip.app'
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      // Fallback for browsers that don't support native sharing
      await copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const openWhatsApp = () => {
    window.open(generateWhatsAppURL(), '_blank');
  };

  const openSMS = () => {
    window.open(generateSMSURL(), '_blank');
  };

  const openEmail = () => {
    window.open(generateEmailURL(), '_blank');
  };

  const generateShareableImage = () => {
    // This would integrate with a service to generate shareable images
    // For now, we'll show a placeholder
    toast.info('Screenshot feature coming soon!');
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <Share2 className="h-5 w-5" />
        <h3 className="font-medium">Share</h3>
      </div>

      {/* WhatsApp - Primary option */}
      <Button 
        onClick={openWhatsApp}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        size="lg"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        Share on WhatsApp
      </Button>

      {/* Other sharing options */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          onClick={handleNativeShare}
          className="flex items-center justify-center"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>

        <Button 
          variant="outline" 
          onClick={copyToClipboard}
          className="flex items-center justify-center"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </Button>

        <Button 
          variant="outline" 
          onClick={openSMS}
          className="flex items-center justify-center"
        >
          💬 SMS
        </Button>

        <Button 
          variant="outline" 
          onClick={openEmail}
          className="flex items-center justify-center"
        >
          <Mail className="h-4 w-4 mr-2" />
          Email
        </Button>
      </div>

      {/* Advanced sharing options */}
      <div className="pt-3 border-t space-y-2">
        <p className="text-sm text-muted-foreground mb-2">More options</p>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={generateShareableImage}
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-2" />
            Create Image
          </Button>
          
          {shareData.type === 'transaction' && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => toast.info('Receipt download coming soon!')}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Receipt
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// Utility function to create shareable deep links
export const createDeepLink = (type: string, id: string): string => {
  const baseUrl = 'https://biltip.app'; // This would be your actual app URL
  return `${baseUrl}/${type}/${id}`;
};

// Quick share button component for individual screens
interface QuickShareButtonProps {
  shareData: ShareData;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showText?: boolean;
}

export function QuickShareButton({ shareData, variant = 'outline', size = 'sm', showText = true }: QuickShareButtonProps) {
  const handleQuickShare = async () => {
    const shareText = new SocialSharingUtils({ shareData }).generateShareText();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Biltip: ${shareData.title}`,
          text: shareText,
          url: shareData.deepLink || 'https://biltip.app'
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          // Fallback to WhatsApp
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
          window.open(whatsappUrl, '_blank');
        }
      }
    } else {
      // Direct to WhatsApp for browsers without native sharing
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={handleQuickShare}
    >
      <Share2 className="h-4 w-4" />
      {showText && <span className="ml-2">Share</span>}
    </Button>
  );
}