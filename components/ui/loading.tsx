import { Loader2, RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';
import { Skeleton } from './skeleton';
import { cn } from './utils';

// Basic loading spinner
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  );
};

// Full page loading screen
interface PageLoadingProps {
  message?: string;
  showSpinner?: boolean;
  className?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({ 
  message = 'Loading...', 
  showSpinner = true,
  className 
}) => (
  <div className={cn('min-h-screen flex items-center justify-center p-4', className)}>
    <div className="text-center space-y-4">
      {showSpinner && <LoadingSpinner size="lg" className="mx-auto text-primary" />}
      <p className="text-muted-foreground">{message}</p>
    </div>
  </div>
);

// Section loading (for parts of a page)
interface SectionLoadingProps {
  message?: string;
  height?: string;
  className?: string;
}

export const SectionLoading: React.FC<SectionLoadingProps> = ({ 
  message = 'Loading...', 
  height = 'h-32',
  className 
}) => (
  <div className={cn('flex items-center justify-center', height, className)}>
    <div className="text-center space-y-2">
      <LoadingSpinner className="mx-auto text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

// Inline loading (for buttons, small components)
interface InlineLoadingProps {
  message?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({ 
  message, 
  size = 'sm',
  className 
}) => (
  <div className={cn('flex items-center gap-2', className)}>
    <LoadingSpinner size={size} />
    {message && <span className="text-sm text-muted-foreground">{message}</span>}
  </div>
);

// Network-aware loading states
interface NetworkLoadingProps {
  isOnline?: boolean;
  onRetry?: () => void;
  message?: string;
  className?: string;
}

export const NetworkLoading: React.FC<NetworkLoadingProps> = ({
  isOnline = navigator.onLine,
  onRetry,
  message,
  className
}) => {
  if (!isOnline) {
    return (
      <Card className={cn('p-6 text-center', className)}>
        <WifiOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-medium mb-2">No Internet Connection</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Please check your internet connection and try again.
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className={cn('text-center space-y-4', className)}>
      <div className="flex items-center justify-center gap-2">
        <Wifi className="h-4 w-4 text-success animate-pulse" />
        <LoadingSpinner size="sm" />
      </div>
      <p className="text-sm text-muted-foreground">
        {message || 'Connecting...'}
      </p>
    </div>
  );
};

// Loading skeleton components for different content types
export const TransactionSkeleton: React.FC = () => (
  <Card className="p-4">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-3 w-[120px]" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-4 w-[80px] ml-auto" />
        <Skeleton className="h-3 w-[60px] ml-auto" />
      </div>
    </div>
  </Card>
);

export const BillSplitSkeleton: React.FC = () => (
  <Card className="p-4">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-[180px]" />
          <Skeleton className="h-3 w-[120px]" />
        </div>
        <Skeleton className="h-6 w-[60px]" />
      </div>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-3 w-[40px]" />
      </div>
      <Skeleton className="h-2 w-full" />
    </div>
  </Card>
);

export const ProfileSkeleton: React.FC = () => (
  <Card className="p-6">
    <div className="text-center space-y-4">
      <Skeleton className="h-20 w-20 rounded-full mx-auto" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-[150px] mx-auto" />
        <Skeleton className="h-4 w-[200px] mx-auto" />
      </div>
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-[60px] mx-auto" />
          <Skeleton className="h-3 w-[80px] mx-auto" />
        </div>
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-[60px] mx-auto" />
          <Skeleton className="h-3 w-[80px] mx-auto" />
        </div>
      </div>
    </div>
  </Card>
);

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="p-4">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[160px]" />
            <Skeleton className="h-3 w-[100px]" />
          </div>
          <Skeleton className="h-6 w-[50px]" />
        </div>
      </Card>
    ))}
  </div>
);

// Error retry component
interface ErrorRetryProps {
  error: string;
  onRetry?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  className?: string;
}

export const ErrorRetry: React.FC<ErrorRetryProps> = ({
  error,
  onRetry,
  onCancel,
  showCancel = false,
  className
}) => (
  <Card className={cn('p-6 text-center', className)}>
    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
    <h3 className="font-medium mb-2">Something went wrong</h3>
    <p className="text-sm text-muted-foreground mb-4">{error}</p>
    <div className="flex gap-2 justify-center">
      {onRetry && (
        <Button onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
      {showCancel && onCancel && (
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  </Card>
);

// Loading overlay for existing content
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  message = 'Loading...',
  className
}) => (
  <div className={cn('relative', className)}>
    {children}
    {isLoading && (
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <LoadingSpinner />
            <span className="text-sm font-medium">{message}</span>
          </div>
        </Card>
      </div>
    )}
  </div>
);
