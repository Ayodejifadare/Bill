import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, AlertTriangle, RefreshCw, Server, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { useLoadingState } from './LoadingStateContext';
import { toast } from 'sonner';

// Network status types
interface NetworkStatus {
  isOnline: boolean;
  lastOnline: Date | null;
  connectionType: string;
  effectiveType: string;
}

interface NetworkError {
  type: 'connection' | 'timeout' | 'server' | 'unknown';
  message: string;
  statusCode?: number;
  retryAfter?: number;
}

interface NetworkErrorHandlerProps {
  onRetry?: () => void;
  error?: NetworkError | null;
  showStatus?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  className?: string;
}

// Network status hook
export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    lastOnline: navigator.onLine ? new Date() : null,
    connectionType: 'unknown',
    effectiveType: 'unknown'
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      setStatus(prev => ({
        isOnline: navigator.onLine,
        lastOnline: navigator.onLine ? new Date() : prev.lastOnline,
        connectionType: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown'
      }));
    };

    const handleOnline = () => {
      updateNetworkStatus();
      toast.success('Connection restored');
    };

    const handleOffline = () => {
      updateNetworkStatus();
      toast.error('Connection lost');
    };

    // Listen for network changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes (if supported)
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    // Initial status update
    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  return status;
};

// Retry mechanism hook
export const useRetryMechanism = (
  operation: () => Promise<void>,
  maxRetries: number = 3,
  baseDelay: number = 1000
) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const executeWithRetry = useCallback(async () => {
    let attempt = 0;
    
    while (attempt <= maxRetries) {
      try {
        setIsRetrying(true);
        setLastError(null);
        await operation();
        setRetryCount(0);
        return;
      } catch (error) {
        attempt++;
        setRetryCount(attempt);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setLastError(errorMessage);
        
        if (attempt <= maxRetries) {
          // Exponential backoff
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } finally {
        setIsRetrying(false);
      }
    }
  }, [operation, maxRetries, baseDelay]);

  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
    setLastError(null);
  }, []);

  return {
    executeWithRetry,
    retryCount,
    isRetrying,
    lastError,
    canRetry: retryCount < maxRetries,
    reset
  };
};

// Network error classifier
export const classifyNetworkError = (error: any): NetworkError => {
  // Connection errors
  if (!navigator.onLine) {
    return {
      type: 'connection',
      message: 'No internet connection. Please check your network settings.'
    };
  }

  // Timeout errors
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return {
      type: 'timeout',
      message: 'Request timed out. The server may be experiencing high traffic.'
    };
  }

  // Server errors
  if (error.status >= 500) {
    return {
      type: 'server',
      message: 'Server error. Please try again in a few moments.',
      statusCode: error.status,
      retryAfter: error.headers?.get('Retry-After') ? 
        parseInt(error.headers.get('Retry-After')) : undefined
    };
  }

  // Client errors
  if (error.status >= 400) {
    return {
      type: 'unknown',
      message: error.message || 'Request failed. Please check your input and try again.',
      statusCode: error.status
    };
  }

  // Generic network errors
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return {
      type: 'connection',
      message: 'Network error. Please check your connection and try again.'
    };
  }

  return {
    type: 'unknown',
    message: error.message || 'An unexpected error occurred.'
  };
};

// Main network error handler component
export const NetworkErrorHandler: React.FC<NetworkErrorHandlerProps> = ({
  onRetry,
  error,
  showStatus = true,
  autoRetry = false,
  maxRetries = 3,
  retryDelay = 1000,
  className
}) => {
  const networkStatus = useNetworkStatus();
  const { retryCount, isRetrying, executeWithRetry, canRetry, reset } = useRetryMechanism(
    async () => {
      if (onRetry) {
        await onRetry();
      }
    },
    maxRetries,
    retryDelay
  );

  // Auto-retry for certain error types
  useEffect(() => {
    if (autoRetry && error && canRetry && networkStatus.isOnline) {
      const shouldAutoRetry = error.type === 'timeout' || 
                             error.type === 'connection' ||
                             (error.type === 'server' && error.statusCode && error.statusCode >= 500);
      
      if (shouldAutoRetry) {
        const delay = error.retryAfter ? error.retryAfter * 1000 : retryDelay;
        setTimeout(() => {
          executeWithRetry();
        }, delay);
      }
    }
  }, [error, autoRetry, canRetry, networkStatus.isOnline, retryDelay, executeWithRetry]);

  const getErrorIcon = (errorType: NetworkError['type']) => {
    switch (errorType) {
      case 'connection':
        return WifiOff;
      case 'timeout':
        return Clock;
      case 'server':
        return Server;
      default:
        return AlertTriangle;
    }
  };

  const getRetryDelay = () => {
    if (error?.retryAfter) return error.retryAfter;
    return Math.min(retryDelay * Math.pow(2, retryCount), 30000); // Max 30s
  };

  if (!error && networkStatus.isOnline) {
    return null;
  }

  return (
    <div className={className}>
      {/* Network Status Indicator */}
      {showStatus && (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            {networkStatus.isOnline ? (
              <Wifi className="h-4 w-4 text-success" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive" />
            )}
            <span className="text-sm text-muted-foreground">
              {networkStatus.isOnline ? 'Connected' : 'Offline'}
            </span>
            {networkStatus.effectiveType !== 'unknown' && networkStatus.isOnline && (
              <Badge variant="outline" className="text-xs">
                {networkStatus.effectiveType.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="border-destructive/20 bg-destructive/5">
          <div className="flex items-start gap-3">
            {React.createElement(getErrorIcon(error.type), { 
              className: "h-5 w-5 text-destructive mt-0.5" 
            })}
            <div className="flex-1 min-w-0">
              <AlertDescription>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-destructive">
                      {error.type === 'connection' && 'Connection Error'}
                      {error.type === 'timeout' && 'Request Timeout'}
                      {error.type === 'server' && 'Server Error'}
                      {error.type === 'unknown' && 'Error'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {error.message}
                    </p>
                    {error.statusCode && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Status: {error.statusCode}
                      </p>
                    )}
                  </div>

                  {/* Retry Information */}
                  {retryCount > 0 && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">
                        Retry attempt: {retryCount}/{maxRetries}
                      </p>
                      {isRetrying && (
                        <p className="text-warning">
                          Retrying in {Math.ceil(getRetryDelay() / 1000)} seconds...
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {onRetry && canRetry && !isRetrying && (
                      <Button
                        size="sm"
                        onClick={executeWithRetry}
                        disabled={!networkStatus.isOnline && error.type === 'connection'}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry {retryCount > 0 && `(${maxRetries - retryCount} left)`}
                      </Button>
                    )}
                    
                    {isRetrying && (
                      <Button size="sm" disabled>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Retrying...
                      </Button>
                    )}

                    {retryCount > 0 && (
                      <Button size="sm" variant="outline" onClick={reset}>
                        Reset
                      </Button>
                    )}
                  </div>

                  {/* Offline Help */}
                  {!networkStatus.isOnline && (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      <p className="font-medium">While offline:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Check your WiFi or mobile data connection</li>
                        <li>Try moving to an area with better signal</li>
                        <li>Restart your network connection</li>
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
};

// HOC for wrapping components with network error handling
export const withNetworkErrorHandling = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    showStatus?: boolean;
    autoRetry?: boolean;
    maxRetries?: number;
  } = {}
) => {
  const NetworkErrorWrapper: React.FC<P> = (props) => {
    const [error, setError] = useState<NetworkError | null>(null);
    const networkStatus = useNetworkStatus();

    const handleRetry = useCallback(() => {
      setError(null);
      // Force re-render by updating a timestamp or similar
    }, []);

    return (
      <div>
        <NetworkErrorHandler
          error={error}
          onRetry={handleRetry}
          showStatus={options.showStatus}
          autoRetry={options.autoRetry}
          maxRetries={options.maxRetries}
          className="mb-4"
        />
        <WrappedComponent {...props} />
      </div>
    );
  };

  NetworkErrorWrapper.displayName = `withNetworkErrorHandling(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return NetworkErrorWrapper;
};