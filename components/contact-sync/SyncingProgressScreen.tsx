import { useState, useEffect } from 'react';
import { MessageCircle, Users, Zap, Shield, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { ContactSyncScreenProps } from './types';

interface SyncingProgressScreenProps extends ContactSyncScreenProps {
  syncProgress: number;
  contactCount?: number;
  startTime?: number | null;
  onCancel?: () => void;
}

export function SyncingProgressScreen({
  onNavigate: _onNavigate,
  syncProgress,
  contactCount = 0,
  startTime,
  onCancel
}: SyncingProgressScreenProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  // Progress steps with messages
  const steps = [
    { threshold: 0, message: "Initializing...", icon: Zap },
    { threshold: 10, message: "Accessing your contacts...", icon: Users },
    { threshold: 40, message: `Scanning ${contactCount > 0 ? contactCount : ''} contacts...`.trim(), icon: Users },
    { threshold: 70, message: "Finding Biltip users...", icon: MessageCircle },
    { threshold: 90, message: "Finalizing results...", icon: CheckCircle },
    { threshold: 100, message: "Complete!", icon: CheckCircle }
  ];

  // Update elapsed time
  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Update current step based on progress
  useEffect(() => {
    const newStep = steps.findIndex((step, index) => {
      const nextStep = steps[index + 1];
      return syncProgress >= step.threshold && (!nextStep || syncProgress < nextStep.threshold);
    });
    setCurrentStep(Math.max(0, newStep));
  }, [syncProgress]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const currentStepData = steps[currentStep];
  const CurrentIcon = currentStepData?.icon || Zap;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold">Syncing Contacts</h1>
                <p className="text-sm text-muted-foreground">Finding your friends on Biltip</p>
              </div>
            </div>
          </div>
          
          {onCancel && syncProgress < 80 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="px-4 py-8 space-y-8">
        {/* Main Progress Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Animated Icon */}
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <CurrentIcon className={`h-10 w-10 text-white ${syncProgress < 100 ? 'animate-pulse' : ''}`} />
              </div>
              
              {/* Progress Text */}
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {currentStepData?.message || 'Processing...'}
                </h2>
                <p className="text-muted-foreground">
                  {syncProgress < 100 
                    ? 'This may take a few moments...' 
                    : 'Contact sync completed successfully!'
                  }
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-3">
                <Progress 
                  value={syncProgress} 
                  className="w-full h-3"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{Math.round(syncProgress)}% complete</span>
                  {startTime && elapsedTime > 0 && (
                    <span>{formatTime(elapsedTime)}</span>
                  )}
                </div>
              </div>

              {/* Contact Count */}
              {contactCount > 0 && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm">
                  <Users className="h-4 w-4" />
                  <span>{contactCount.toLocaleString()} contacts found</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step Indicators */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <h3 className="font-medium text-center">Sync Progress</h3>
              <div className="space-y-3">
                {steps.slice(0, -1).map((step, index) => {
                  const isCompleted = syncProgress > step.threshold;
                  const isCurrent = currentStep === index;
                  const StepIcon = step.icon;
                  
                  return (
                    <div 
                      key={index}
                      className={`flex items-center space-x-3 transition-all duration-300 ${
                        isCompleted ? 'text-green-600' : 
                        isCurrent ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        isCompleted ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                        isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <StepIcon className="h-3 w-3" />
                        )}
                      </div>
                      <span className={`text-sm ${isCurrent ? 'font-medium' : ''}`}>
                        {step.message.replace(/\d+\s*contacts?\.\.\.?/, contactCount > 0 ? `${contactCount} contacts...` : 'contacts...')}
                      </span>
                      {isCurrent && syncProgress < 100 && (
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-current rounded-full animate-pulse delay-0"></div>
                          <div className="w-1 h-1 bg-current rounded-full animate-pulse delay-150"></div>
                          <div className="w-1 h-1 bg-current rounded-full animate-pulse delay-300"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/30">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 text-center">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200 text-sm">
                  Your privacy is protected
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Contacts are processed locally on your device and never stored on our servers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fun Facts */}
        {syncProgress < 90 && (
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium mb-2">Did you know?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {syncProgress < 30 
                    ? "Biltip users save an average of 2 hours per month on bill splitting and expense tracking."
                    : syncProgress < 60
                    ? "Over 85% of Biltip users report better financial relationships with friends and family."
                    : "The average group on Biltip splits 12 bills per month, making expense sharing effortless."
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
