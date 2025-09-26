import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { authService } from '../services/auth';
import { toast } from 'sonner';
import { devAuthConfig } from '../utils/auth-dev-config';
import { formatPhoneForRegion } from '../utils/regions';

interface OTPVerificationScreenProps {
  phone: string;
  region: string;
  isNewUser: boolean;
  name?: string;
  onSuccess: (data: { token: string; user: any }) => void;
  onBack: () => void;
  demoOTP?: string | number; // For demo purposes
}

export function OTPVerificationScreen({ 
  phone, 
  region, 
  isNewUser, 
  name, 
  onSuccess, 
  onBack,
  demoOTP 
}: OTPVerificationScreenProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  // Create refs for each input field to avoid React warnings
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  
  // Create a safe ref setter function
  const setInputRef = useCallback((index: number) => (el: HTMLInputElement | null) => {
    inputRefs.current[index] = el;
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Auto-fill OTP for demo purposes
  useEffect(() => {
    const normalizedDemoOtp =
      typeof demoOTP === 'string'
        ? demoOTP.trim()
        : typeof demoOTP === 'number'
          ? String(demoOTP).padStart(6, '0')
          : '';

    if (normalizedDemoOtp.length === 6) {
      devAuthConfig.log('Auto-filling OTP from server response', { demoOTP: normalizedDemoOtp });
      const otpArray = normalizedDemoOtp.split('').slice(0, 6);
      setOtp(otpArray);
      // Auto-focus last input
      setTimeout(() => {
        inputRefs.current[5]?.focus();
      }, 100);
      return;
    }

    if (devAuthConfig.shouldShowOTPDebug()) {
      const rawMockOtp = devAuthConfig.getMockOTP();
      const mockOTP = typeof rawMockOtp === 'string' ? rawMockOtp : String(rawMockOtp ?? '');
      if (mockOTP) {
        devAuthConfig.log('Auto-filling OTP from dev config', { mockOTP });
        const otpArray = mockOTP.padEnd(6, '0').split('').slice(0, 6);
        setOtp(otpArray);
        setTimeout(() => {
          inputRefs.current[5]?.focus();
        }, 100);
      }
    }
  }, [demoOTP]);

  const handleOtpChange = (index: number, value: string) => {
    devAuthConfig.log('OTP input change', { index, value, length: value.length });
    
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      
      // Focus last filled input or next empty input
      const nextIndex = Math.min(index + pastedOtp.length, 5);
      setTimeout(() => {
        inputRefs.current[nextIndex]?.focus();
      }, 0);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
      }, 0);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      setTimeout(() => {
        inputRefs.current[index - 1]?.focus();
      }, 0);
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('').replace(/\s/g, ''); // Remove any spaces
    devAuthConfig.log('Starting OTP verification', { 
      otp: otpString.replace(/./g, '*'), 
      length: otpString.length,
      phone: phone,
      isNewUser: isNewUser
    });
    
    if (otpString.length !== 6) {
      toast.error('Please enter a complete 6-digit code');
      return;
    }

    // Validate that all characters are digits
    if (!/^\d{6}$/.test(otpString)) {
      toast.error('Please enter only numbers');
      return;
    }

    setIsLoading(true);
    
    try {
      devAuthConfig.log('Calling authService.verifyOTP', { phone, isNewUser, name });
      const result = await authService.verifyOTP(phone, otpString, name, isNewUser);
      
      devAuthConfig.log('OTP verification result', { success: result.success, error: result.error });
      
      if (result.success && result.user && result.token) {
        toast.success(isNewUser ? 'Account created successfully!' : 'Welcome back!');
        onSuccess({ token: result.token, user: result.user });
      } else {
        devAuthConfig.logError('Verification failed', result);
        toast.error(result.error || 'Verification failed');
        // Clear OTP on error
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    } catch (error) {
      devAuthConfig.logError('OTP verification error', error);
      toast.error('Verification failed. Please try again.');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setCanResend(false);
    setCountdown(60);
    
    try {
      devAuthConfig.log('Resending OTP', { phone, region });
      const result = await authService.sendOTP(phone, region);
      if (result.success) {
        toast.success('Verification code sent');
        // For demo purposes, show the new OTP
        if (result.otp && devAuthConfig.shouldShowOTPDebug()) {
          toast.info(`Demo OTP: ${result.otp}`, { duration: 5000 });
        }
      } else {
        toast.error(result.error || 'Failed to resend code');
        setCanResend(true);
        setCountdown(0);
      }
    } catch (error) {
      devAuthConfig.logError('Resend OTP error', error);
      toast.error('Failed to resend code');
      setCanResend(true);
      setCountdown(0);
    } finally {
      setIsResending(false);
    }
  };

  const formatPhone = (phoneNumber: string) => formatPhoneForRegion(region, phoneNumber);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-purple-50">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl">Verify your phone</h1>
            <p className="text-sm text-muted-foreground">
              We sent a code to {formatPhone(phone)}
            </p>
          </div>
        </div>

        {/* OTP Input Card */}
        <Card className="p-6">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg mb-2">Enter verification code</h2>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code we sent to your phone
              </p>
            </div>

            {/* OTP Input Fields */}
            <div className="flex justify-center space-x-3">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={setInputRef(index)}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-semibold"
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {/* Demo OTP Notice */}
            {(demoOTP || devAuthConfig.shouldShowOTPDebug()) && (
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Demo Mode:</strong> {demoOTP ? `Server OTP: ${demoOTP}` : `Dev Config OTP: ${devAuthConfig.getMockOTP()}`}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {demoOTP ? 'OTP auto-filled from server response' : 'Using development configuration OTP'}
                </p>
              </div>
            )}

            {/* Verify Button */}
            <Button
              onClick={handleVerify}
              disabled={isLoading || otp.join('').length !== 6}
              className="w-full h-12"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>

            {/* Resend Code */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Didn't receive the code?
              </p>
              <Button
                variant="link"
                onClick={handleResend}
                disabled={!canResend || isResending}
                className="p-0 h-auto"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                {isResending ? 'Sending...' : canResend ? 'Resend code' : `Resend in ${countdown}s`}
              </Button>
            </div>
          </div>
        </Card>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Make sure you have a stable internet connection and check your SMS inbox
          </p>
        </div>
      </div>
    </div>
  );
}

export default OTPVerificationScreen;
