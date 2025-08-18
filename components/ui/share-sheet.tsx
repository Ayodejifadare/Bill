import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './sheet';
import { Button } from './button';
import { 
  MessageCircle, 
  FileText, 
  Image, 
  X,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Utility function to check if native sharing is supported
const canNativeShare = () => {
  return typeof navigator !== 'undefined' && 'share' in navigator;
};

// Utility function to check if file sharing is supported
const canShareFiles = () => {
  return canNativeShare() && 'canShare' in navigator;
};

// Utility function to check if we're in a secure context (required for some sharing features)
const isSecureContext = () => {
  return typeof window !== 'undefined' && (
    window.location.protocol === 'https:' || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  );
};

interface ShareOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  action: () => Promise<void> | void;
}

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  shareText: string;
  documentData?: {
    title: string;
    content: any;
    type: 'receipt' | 'invoice' | 'bill_split';
  };
}

export function ShareSheet({ isOpen, onClose, title, shareText, documentData }: ShareSheetProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Enhanced sharing function with comprehensive error handling
  const triggerNativeShare = async (data: { title: string; text: string; files?: File[] }) => {
    // Check if we're in a secure context first
    if (!isSecureContext() && canNativeShare()) {
      console.warn('Native sharing requires secure context (HTTPS)');
      return await fallbackToManualCopy(data.text, 'insecure_context');
    }

    if (canShareFiles() && data.files) {
      // Try file sharing first
      try {
        if (navigator.canShare && navigator.canShare({ files: data.files })) {
          return await navigator.share(data);
        }
      } catch (error) {
        console.warn('File sharing failed, falling back to text:', error);
        // Continue to text sharing fallback
      }
    }
    
    if (canNativeShare()) {
      // Fallback to text sharing
      try {
        return await navigator.share({
          title: data.title,
          text: data.text
        });
      } catch (error) {
        const shareError = error as Error;
        console.warn('Text sharing failed, falling back to clipboard:', shareError);
        
        if (shareError.name === 'AbortError') {
          // User cancelled - don't show error
          throw shareError;
        }
        
        // Continue to clipboard fallback for other errors
      }
    }
    
    // Final fallback - try multiple clipboard methods
    return await fallbackToManualCopy(data.text, 'no_native_support');
  };

  // Comprehensive clipboard fallback with multiple methods
  const fallbackToManualCopy = async (text: string, reason: string) => {
    // Method 1: Modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return { fallback: 'clipboard', reason, method: 'modern' };
      } catch (clipboardError) {
        console.warn('Modern clipboard failed:', clipboardError);
      }
    }

    // Method 2: Legacy document.execCommand (for older browsers)
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        return { fallback: 'clipboard', reason, method: 'legacy' };
      } else {
        throw new Error('execCommand failed');
      }
    } catch (legacyError) {
      console.warn('Legacy clipboard method failed:', legacyError);
    }

    // Method 3: Prompt user to manually copy
    try {
      const userConfirmed = window.confirm(
        `Unable to copy automatically due to browser restrictions. Would you like to see the text to copy manually?\n\nText to copy:\n\n${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`
      );
      
      if (userConfirmed) {
        // Create a modal-like display for manual copying
        const copyDialog = document.createElement('div');
        copyDialog.innerHTML = `
          <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; font-family: system-ui;">
            <div style="background: white; color: black; padding: 20px; border-radius: 8px; max-width: 90%; max-height: 80%; overflow: auto;">
              <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Copy Text Manually</h3>
              <textarea readonly style="width: 100%; min-height: 200px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 14px; resize: vertical;">${text}</textarea>
              <div style="margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(copyDialog);
        
        return { fallback: 'manual', reason, method: 'modal' };
      }
    } catch (promptError) {
      console.error('Manual copy prompt failed:', promptError);
    }

    throw new Error('All sharing and copying methods failed');
  };

  const handleWhatsAppShare = async () => {
    setIsProcessing('whatsapp');
    let whatsappText = '';
    
    try {
      // Clean WhatsApp share text with proper formatting
      whatsappText = shareText
        .replace(/\*\*/g, '*') // Convert markdown bold to WhatsApp bold
        .replace(/\n\n/g, '\n') // Clean up double line breaks
        .trim();
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
      
      // Try native sharing first on mobile devices, fallback to direct WhatsApp link
      if (canNativeShare() && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        try {
          await navigator.share({
            title: title,
            text: whatsappText
          });
          toast.success('Shared successfully');
        } catch (shareError) {
          const error = shareError as Error;
          if (error.name === 'AbortError') {
            // User cancelled - don't show error
            return;
          } else if (error.name === 'NotAllowedError') {
            // Permission denied - fallback to WhatsApp direct link
            window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
            toast.success('Opened WhatsApp directly');
          } else {
            // Other errors - fallback to WhatsApp direct link
            window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
            toast.success('Opened WhatsApp');
          }
        }
      } else {
        // Direct WhatsApp link for desktop or unsupported browsers
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        await new Promise(resolve => setTimeout(resolve, 800));
        toast.success('Opened WhatsApp');
      }
      
      onClose();
    } catch (error) {
      console.error('WhatsApp share failed:', error);
      
      try {
        const result = await fallbackToManualCopy(whatsappText, 'whatsapp_failed');
        
        if (result.fallback === 'clipboard') {
          if (result.method === 'modern') {
            toast.success('WhatsApp failed to open. Text copied to clipboard.');
          } else if (result.method === 'legacy') {
            toast.success('WhatsApp failed to open. Text copied using legacy method.');
          }
        } else if (result.fallback === 'manual') {
          toast.success('Text prepared for manual copying.');
        }
      } catch (allMethodsError) {
        console.error('All fallback methods failed:', allMethodsError);
        toast.error('Unable to share or copy. Please try again or copy manually.');
      }
    } finally {
      setIsProcessing(null);
    }
  };

  const handlePDFShare = async () => {
    setIsProcessing('pdf');
    try {
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const filename = documentData 
        ? `${documentData.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
        : 'document.pdf';
      
      // In a real app, this would generate an actual PDF blob
      const pdfContent = shareText; // Simplified for demo
      
      try {
        // Create a mock PDF file for sharing
        const blob = new Blob([pdfContent], { type: 'application/pdf' });
        const file = new File([blob], filename, { type: 'application/pdf' });
        
        const result = await triggerNativeShare({
          title: documentData?.title || 'Document',
          text: `Check out this ${documentData?.type || 'document'}\n\n${shareText}`,
          files: [file]
        });
        
        if (result?.fallback === 'clipboard') {
          if (result.reason === 'insecure_context') {
            toast.success('Content copied to clipboard (sharing requires HTTPS)');
          } else {
            toast.success('Content copied to clipboard');
          }
        } else {
          toast.success('PDF shared successfully');
        }
      } catch (shareError) {
        const error = shareError as Error;
        
        if (error.name === 'AbortError') {
          // User cancelled sharing - don't show error
          return;
        } else {
          // Use comprehensive fallback for all other errors
          const result = await fallbackToManualCopy(shareText, 'pdf_share_failed');
          
          if (result.fallback === 'clipboard') {
            if (result.method === 'modern') {
              toast.success('Permission denied. PDF content copied to clipboard.');
            } else if (result.method === 'legacy') {
              toast.success('PDF sharing failed. Content copied using legacy method.');
            }
          } else if (result.fallback === 'manual') {
            toast.success('PDF sharing failed. Content prepared for manual copying.');
          }
        }
      }
      
      onClose();
    } catch (error) {
      console.error('PDF share failed:', error);
      
      try {
        const result = await fallbackToManualCopy(shareText, 'pdf_failed');
        
        if (result.fallback === 'clipboard') {
          if (result.method === 'modern') {
            toast.success('PDF sharing failed. Content copied to clipboard.');
          } else if (result.method === 'legacy') {
            toast.success('PDF sharing failed. Content copied using legacy method.');
          }
        } else if (result.fallback === 'manual') {
          toast.success('PDF sharing failed. Content prepared for manual copying.');
        }
      } catch (allMethodsError) {
        console.error('All PDF fallback methods failed:', allMethodsError);
        toast.error('Unable to share PDF or copy text. Please try again or copy manually.');
      }
    } finally {
      setIsProcessing(null);
    }
  };

  const handleImageShare = async () => {
    setIsProcessing('image');
    try {
      // Simulate image generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const filename = documentData 
        ? `${documentData.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`
        : 'document.png';
      
      // In a real app, this would generate an actual image/screenshot
      // For demo, we'll create a simple canvas with the text
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 400;
        canvas.height = 600;
        
        // Simple text rendering (in real app, this would be a proper receipt/invoice design)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000000';
        ctx.font = '16px Arial';
        
        const lines = shareText.split('\n');
        lines.forEach((line, index) => {
          ctx.fillText(line, 20, 30 + (index * 25));
        });
        
        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              const file = new File([blob], filename, { type: 'image/png' });
              
              const result = await triggerNativeShare({
                title: documentData?.title || 'Document',
                text: `Check out this ${documentData?.type || 'document'}\n\n${shareText}`,
                files: [file]
              });
              
              if (result?.fallback === 'clipboard') {
                if (result.reason === 'insecure_context') {
                  toast.success('Content copied to clipboard (sharing requires HTTPS)');
                } else {
                  toast.success('Content copied to clipboard');
                }
              } else {
                toast.success('Image shared successfully');
              }
            } catch (shareError) {
              const error = shareError as Error;
              
              if (error.name === 'AbortError') {
                // User cancelled sharing - don't show error
                return;
              } else {
                // Use comprehensive fallback for all other errors
                const result = await fallbackToManualCopy(shareText, 'image_share_failed');
                
                if (result.fallback === 'clipboard') {
                  if (result.method === 'modern') {
                    toast.success('Permission denied. Image content copied to clipboard.');
                  } else if (result.method === 'legacy') {
                    toast.success('Image sharing failed. Content copied using legacy method.');
                  }
                } else if (result.fallback === 'manual') {
                  toast.success('Image sharing failed. Content prepared for manual copying.');
                }
              }
            }
          } else {
            // Canvas creation failed - use comprehensive fallback
            try {
              const result = await fallbackToManualCopy(shareText, 'canvas_failed');
              
              if (result.fallback === 'clipboard') {
                if (result.method === 'modern') {
                  toast.success('Image generation failed. Content copied to clipboard.');
                } else if (result.method === 'legacy') {
                  toast.success('Image generation failed. Content copied using legacy method.');
                }
              } else if (result.fallback === 'manual') {
                toast.success('Image generation failed. Content prepared for manual copying.');
              }
            } catch (fallbackError) {
              console.error('Canvas fallback failed:', fallbackError);
              toast.error('Image generation failed and unable to copy text.');
            }
          }
          onClose();
        }, 'image/png', 0.9);
      }
    } catch (error) {
      console.error('Image share failed:', error);
      
      try {
        const result = await fallbackToManualCopy(shareText, 'image_failed');
        
        if (result.fallback === 'clipboard') {
          if (result.method === 'modern') {
            toast.success('Image sharing failed. Content copied to clipboard.');
          } else if (result.method === 'legacy') {
            toast.success('Image sharing failed. Content copied using legacy method.');
          }
        } else if (result.fallback === 'manual') {
          toast.success('Image sharing failed. Content prepared for manual copying.');
        }
      } catch (allMethodsError) {
        console.error('All image fallback methods failed:', allMethodsError);
        toast.error('Unable to share image or copy text. Please try again or copy manually.');
      }
    } finally {
      setIsProcessing(null);
    }
  };

  const shareOptions: ShareOption[] = [
    {
      id: 'whatsapp',
      label: 'Share on WhatsApp',
      icon: MessageCircle,
      bgColor: 'bg-green-600',
      textColor: 'text-white',
      action: handleWhatsAppShare
    },
    {
      id: 'pdf',
      label: 'PDF',
      icon: FileText,
      bgColor: 'bg-transparent border-2 border-border',
      textColor: 'text-foreground',
      action: handlePDFShare
    },
    {
      id: 'image',
      label: 'Image',
      icon: Image,
      bgColor: 'bg-transparent border-2 border-border',
      textColor: 'text-foreground',
      action: handleImageShare
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-[20px] border-t-0 pb-8">
        <SheetHeader className="pb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">{title}</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full"
              aria-label="Close share options"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription className="sr-only">
            Choose how you'd like to share this content - as a WhatsApp message, PDF document, or image file
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3">
          {shareOptions.map((option) => {
            const IconComponent = option.icon;
            const isLoading = isProcessing === option.id;
            
            return (
              <Button
                key={option.id}
                onClick={option.action}
                disabled={isProcessing !== null}
                aria-label={`${option.label}${isLoading ? ' - processing' : ''}`}
                className={`
                  w-full h-14 flex items-center gap-4 justify-start rounded-xl 
                  ${option.bgColor} hover:opacity-90 ${option.textColor}
                  transition-all duration-200 font-medium text-base
                  ${isLoading ? 'opacity-80' : ''}
                  ${isProcessing && isProcessing !== option.id ? 'opacity-50' : ''}
                `}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  option.id === 'whatsapp' ? 'bg-white/20' : 'bg-muted'
                }`}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <IconComponent className="h-4 w-4" />
                  )}
                </div>
                
                <span className="flex-1 text-left">
                  {isLoading 
                    ? option.id === 'whatsapp' ? 'Opening WhatsApp...' 
                      : option.id === 'pdf' ? 'Preparing PDF...'
                      : 'Preparing Image...'
                    : option.label
                  }
                </span>
              </Button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Choose your sharing format
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}