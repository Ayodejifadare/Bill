import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onRetry?: () => void;
  showHomeButton?: boolean;
  level?: 'page' | 'component' | 'critical';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('Error Boundary Caught Error:', {
      error: error.message,
      stack: error.stack,
      errorInfo: errorInfo.componentStack,
      errorId: this.state.errorId,
      level: this.props.level || 'component',
      timestamp: new Date().toISOString()
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, you would send this to an error reporting service
    // Example: Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Mock error reporting - replace with actual service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      level: this.props.level || 'component'
    };

    // Here you would send to your error reporting service
    console.warn('Error Report (would be sent to error service):', errorReport);
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorId: null,
        retryCount: retryCount + 1
      });

      // Call custom retry handler if provided
      this.props.onRetry?.();
    }
  };

  private handleGoHome = () => {
    // Reset error state and navigate to home
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0
    });

    // Navigate to home page
    window.location.href = '/';
  };

  private getErrorLevel = () => {
    return this.props.level || 'component';
  };

  private renderErrorUI = () => {
    const { error, errorId, retryCount } = this.state;
    const { showHomeButton = true } = this.props;
    const errorLevel = this.getErrorLevel();
    const canRetry = retryCount < this.maxRetries;

    // Different error UIs based on level
    if (errorLevel === 'critical') {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-destructive/5">
          <Card className="max-w-md w-full p-6 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-xl font-bold text-destructive mb-2">
                Critical Error
              </h1>
              <p className="text-sm text-muted-foreground mb-4">
                A critical error occurred that prevents the application from working properly.
              </p>
              <Alert className="border-destructive/20 bg-destructive/5 mb-4">
                <Bug className="h-4 w-4" />
                <AlertDescription className="text-left">
                  <strong>Error ID:</strong> {errorId}<br />
                  <strong>Message:</strong> {error?.message || 'Unknown error'}
                </AlertDescription>
              </Alert>
            </div>
            <div className="space-y-3">
              <Button 
                onClick={this.handleGoHome}
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Reload Application
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Force Refresh
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    if (errorLevel === 'page') {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="max-w-sm w-full p-6 text-center">
            <div className="mb-6">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold mb-2">
                Something went wrong
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                This page encountered an error and couldn't load properly.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <Alert className="border-destructive/20 bg-destructive/5 mb-4 text-left">
                  <Bug className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Error:</strong> {error?.message}<br />
                    <strong>ID:</strong> {errorId}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="space-y-3">
              {canRetry && (
                <Button 
                  onClick={this.handleRetry}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again ({this.maxRetries - retryCount} left)
                </Button>
              )}
              {showHomeButton && (
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              )}
            </div>
          </Card>
        </div>
      );
    }

    // Component level error (compact)
    return (
      <Alert className="border-destructive/20 bg-destructive/5">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>Component Error:</strong> {error?.message || 'Unknown error'}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-muted-foreground mt-1">
                  ID: {errorId}
                </div>
              )}
            </div>
            {canRetry && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={this.handleRetry}
                className="ml-3"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

// Convenience wrapper components for different error levels
export const PageErrorBoundary: React.FC<{ children: ReactNode; onRetry?: () => void }> = ({ 
  children, 
  onRetry 
}) => (
  <ErrorBoundary level="page" onRetry={onRetry}>
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode; onRetry?: () => void }> = ({ 
  children, 
  onRetry 
}) => (
  <ErrorBoundary level="component" onRetry={onRetry} showHomeButton={false}>
    {children}
  </ErrorBoundary>
);

export const CriticalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="critical">
    {children}
  </ErrorBoundary>
);