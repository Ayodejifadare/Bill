# Biltip Sharing System Documentation

## Overview

The Biltip sharing system has been streamlined and consolidated into a unified, efficient architecture that provides a consistent 3-format sharing experience (WhatsApp, PDF, Image) across all components.

## Architecture

### Core Components

1. **ShareUtils.tsx** - Main sharing utility with consolidated logic
2. **ShareSheet.tsx** - Universal bottom sheet with 3 sharing options
3. **Deprecated Files** - Legacy files kept for backwards compatibility

### Key Features

- **Unified Interface**: Single ShareSheet component for all sharing needs
- **3-Format Support**: WhatsApp, PDF, and Image sharing
- **Comprehensive Fallbacks**: Multiple fallback strategies for all sharing methods
- **Error Handling**: Robust error handling with graceful degradation
- **Cross-Browser Support**: Works across different browsers and permission policies
- **Mobile-First**: Optimized for mobile sharing patterns

## Implementation

### Basic Usage

```tsx
import { ShareUtils } from './ShareUtils';

// Basic share button
<ShareUtils 
  shareData={{
    type: 'bill_split',
    title: 'Dinner at Tony\'s',
    amount: 142.50,
    participantNames: ['John', 'Jane', 'Bob']
  }}
/>
```

### Specialized Components

```tsx
import { 
  ShareTransactionButton, 
  ShareBillSplitButton, 
  SharePaymentRequestButton 
} from './ShareUtils';

// Transaction sharing
<ShareTransactionButton
  transactionId="txn_123"
  title="Payment to John"
  amount={25.50}
  status="Completed"
/>

// Bill split sharing
<ShareBillSplitButton
  billSplitId="split_456"
  title="Team Dinner"
  amount={142.50}
  participantNames={['John', 'Jane', 'Bob']}
/>
```

### Quick Share Button

```tsx
import { QuickShareButton } from './ShareUtils';

<QuickShareButton 
  shareData={shareData}
  variant="outline"
  size="sm"
  showText={false}
/>
```

## ShareData Interface

```tsx
interface ShareData {
  type: 'bill_split' | 'payment_request' | 'transaction' | 'payment_confirmation' | 'group_summary';
  title: string;
  amount: number;
  description?: string;
  participantNames?: string[];
  dueDate?: string; // Pass a user-friendly string; ISO dates are formatted automatically
  status?: string;
  groupName?: string;
  paymentMethod?: string;
  transactionId?: string;
  deepLink?: string;
}
```

## Sharing Formats

### 1. WhatsApp Sharing
- **Primary format** for instant messaging
- **Fallbacks**: Direct WhatsApp link → Clipboard → Manual copy
- **Features**: Markdown formatting, emoji support, mobile optimization

### 2. PDF Sharing
- **Format**: Generated PDF document
- **Use Cases**: Receipts, invoices, formal documentation
- **Fallbacks**: Native file sharing → Text sharing → Clipboard → Manual copy
- **Features**: Professional formatting, print-ready

### 3. Image Sharing
- **Format**: PNG/JPEG image
- **Use Cases**: Social sharing, visual documentation
- **Fallbacks**: File sharing → Text sharing → Clipboard → Manual copy
- **Features**: Canvas-based generation, customizable design

## Error Handling Strategy

The sharing system uses a multi-tiered fallback approach:

1. **Primary Method**: Native sharing API (when available)
2. **Secondary**: Platform-specific sharing (WhatsApp direct link)
3. **Tertiary**: Modern clipboard API
4. **Quaternary**: Legacy clipboard methods
5. **Final**: Manual copy modal

### Security Context Handling

- **HTTPS Required**: File sharing requires secure context
- **Graceful Degradation**: Falls back to text sharing in insecure contexts
- **User Feedback**: Clear messaging about security limitations

## Performance Optimizations

### Code Splitting
- Lazy loading of sharing components
- On-demand PDF/image generation
- Minimal bundle impact

### Memory Management
- Cleanup of generated files and canvas elements
- Efficient blob handling
- Garbage collection friendly patterns

### User Experience
- Loading states for all operations
- Progress indicators for long operations
- Immediate feedback for all actions

## Migration Guide

### From SocialSharingUtils.tsx

```tsx
// OLD
import { SocialSharingUtils } from './SocialSharingUtils';

// NEW
import { ShareUtils } from './ShareUtils';
```

### From SimpleShareUtils.tsx

```tsx
// OLD
import { SimpleShareUtils } from './SimpleShareUtils';

// NEW
import { ShareUtils } from './ShareUtils';
```

### Breaking Changes
- **None** - Full backwards compatibility maintained
- Legacy files export the new components
- Gradual migration recommended

## Best Practices

### Component Usage

1. **Use ShareUtils** for full-featured sharing needs
2. **Use QuickShareButton** for compact UI elements
3. **Use specialized components** for specific content types

### Data Preparation

1. **Include deep links** for better user experience
2. **Provide meaningful descriptions** for context
3. **Format amounts** according to user's region
4. **Normalize due dates** into user-facing strings before sharing

### Error Handling

1. **Always provide fallbacks** for sharing failures
2. **Give clear feedback** to users
3. **Handle permission denials** gracefully

## Testing Considerations

### Browser Compatibility
- Test on mobile Safari (iOS sharing restrictions)
- Test on Chrome Android (different permission model)
- Test on desktop browsers (limited native sharing)

### Permission Scenarios
- Test with clipboard permissions denied
- Test with file sharing unsupported
- Test in insecure contexts (HTTP)

### Network Conditions
- Test with poor connectivity
- Test PDF/image generation timeouts
- Test WhatsApp fallback scenarios

## Future Enhancements

### Planned Features
- **Custom PDF templates** per content type
- **Advanced image generation** with branded layouts
- **Analytics tracking** for sharing patterns
- **Social platform detection** for optimized sharing

### Technical Improvements
- **Service Worker integration** for offline sharing
- **Background PDF generation** for better performance
- **Enhanced accessibility** features
- **Dark mode support** for generated content

## Troubleshooting

### Common Issues

1. **Sharing fails on iOS**: Check HTTPS requirement
2. **PDF not generating**: Verify browser canvas support
3. **WhatsApp not opening**: Check URL encoding
4. **Clipboard access denied**: Provide manual copy option

### Debug Mode

Enable debug logging:
```tsx
// Set in browser console
localStorage.setItem('biltip_debug_sharing', 'true');
```

## Support

For issues or questions about the sharing system:
1. Check browser console for error details
2. Verify network connectivity
3. Test in different browsers
4. Check security context (HTTPS)

---

*Last updated: January 2025*
*Version: 2.0.0*