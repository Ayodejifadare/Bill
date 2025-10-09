import { useState } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Smartphone } from 'lucide-react';
import { useUserProfile } from './UserProfileContext';
import OTPVerificationScreen from './OTPVerificationScreen';
import { toast } from 'sonner';
import { apiClient } from '../utils/apiClient';
import { Separator } from './ui/separator';
import { normalizePhoneNumber } from '../utils/phone';

interface LoginScreenProps {
  onLogin: (authData: any) => void;
  onShowRegister: () => void;
}

// Flag components
const NigeriaFlag = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" className="rounded-sm">
    <rect width="16" height="4" fill="#008751"/>
    <rect y="4" width="16" height="4" fill="#ffffff"/>
    <rect y="8" width="16" height="4" fill="#008751"/>
  </svg>
);

const USFlag = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" className="rounded-sm">
    <rect width="16" height="12" fill="#B22234"/>
    <rect y="1" width="16" height="1" fill="#ffffff"/>
    <rect y="3" width="16" height="1" fill="#ffffff"/>
    <rect y="5" width="16" height="1" fill="#ffffff"/>
    <rect y="7" width="16" height="1" fill="#ffffff"/>
    <rect y="9" width="16" height="1" fill="#ffffff"/>
    <rect y="11" width="16" height="1" fill="#ffffff"/>
    <rect width="6" height="6" fill="#3C3B6E"/>
  </svg>
);

const UKFlag = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" className="rounded-sm">
    <rect width="16" height="12" fill="#012169"/>
    <path d="M0 0l16 12M16 0L0 12" stroke="#ffffff" strokeWidth="1"/>
    <path d="M8 0v12M0 6h16" stroke="#ffffff" strokeWidth="2"/>
    <path d="M8 0v12M0 6h16" stroke="#C8102E" strokeWidth="1"/>
  </svg>
);

const CanadaFlag = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" className="rounded-sm">
    <rect width="5" height="12" fill="#FF0000"/>
    <rect x="5" width="6" height="12" fill="#ffffff"/>
    <rect x="11" width="5" height="12" fill="#FF0000"/>
    <path d="M8 2l1 2h2l-1.5 1.5L10 8l-2-1.5L6 8l0.5-1.5L5 5h2z" fill="#FF0000"/>
  </svg>
);

const countryOptions = [
  { code: 'NG', name: 'Nigeria', flag: <NigeriaFlag />, phonePrefix: '+234', region: 'NG' as const, currency: 'NGN' as const },
  { code: 'US', name: 'United States', flag: <USFlag />, phonePrefix: '+1', region: 'US' as const, currency: 'USD' as const },
  { code: 'GB', name: 'United Kingdom', flag: <UKFlag />, phonePrefix: '+44', region: 'GB' as const, currency: 'GBP' as const },
  { code: 'CA', name: 'Canada', flag: <CanadaFlag />, phonePrefix: '+1', region: 'CA' as const, currency: 'CAD' as const },
];

export function LoginScreen({ onLogin, onShowRegister }: LoginScreenProps) {
  const { updateAppSettings } = useUserProfile();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpContext, setOtpContext] = useState<{ phone: string; region: string; demoOTP?: string | number } | null>(null);
  const [error, setError] = useState<string>('');

  const selectedCountry = countryOptions.find(c => c.code === country);
  const exampleLocalNumber = selectedCountry?.code === 'NG'
    ? '8012345678'
    : selectedCountry?.code === 'GB'
      ? '7123456789'
      : '5551234567';

  const normalizePhoneInput = () => normalizePhoneNumber(phoneNumber, selectedCountry?.phonePrefix);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Set user region based on selected country
    if (selectedCountry) {
      updateAppSettings({
        region: selectedCountry.region,
        currency: selectedCountry.currency
      });
    }

    try {
      const normalizedPhone = normalizePhoneInput();
      if (!normalizedPhone) {
        throw new Error('Enter a valid phone number');
      }
      const res = await apiClient('/auth/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: normalizedPhone
        })
      });
      setOtpContext({ phone: normalizedPhone, region: selectedCountry?.region || 'US', demoOTP: (res && res.otp) || undefined });
      setShowOtpScreen(true);
      setError('');
    } catch (error: any) {
      console.error('OTP request error:', error);
      const message = error?.message || 'Failed to send code';
      setShowOtpScreen(false);
      setOtpContext(null);

      const userMissing = /user\s+not\s+found/i.test(message) || /no\s+user/i.test(message);

      if (userMissing) {
        toast.info('No account found for that number. Let\'s create one!');
        setError('');
        onShowRegister();
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = () => {
    toast.info('Not implemented');
  };

  if (showOtpScreen && otpContext) {
    return (
      <OTPVerificationScreen
        phone={otpContext.phone}
        region={otpContext.region}
        isNewUser={false}
        onSuccess={(data) => onLogin(data)}
        onBack={() => setShowOtpScreen(false)}
        demoOTP={otpContext.demoOTP}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-purple-50">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Welcome */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
            <span className="text-2xl text-primary-foreground">💰</span>
          </div>
          <h1 className="text-2xl">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to your Biltip account</p>
        </div>

        {/* Login Form */}
        <Card className="p-6">
          <form onSubmit={handleSendCode} className="space-y-4">
            {/* Country and Phone Number */}
            <div className="grid grid-cols-2 gap-4">
              {/* Country */}
              <div className="space-y-2">
                <label htmlFor="country" className="text-sm font-medium">Country</label>
                <Select value={country} onValueChange={setCountry} required>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select country">
                      {selectedCountry && (
                        <div className="flex items-center space-x-2">
                          {selectedCountry.flag}
                          <span className="text-sm">{selectedCountry.phonePrefix}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((countryOption) => (
                      <SelectItem key={countryOption.code} value={countryOption.code}>
                        <div className="flex items-center space-x-2">
                          {countryOption.flag}
                          <span>{countryOption.name}</span>
                          <span className="text-muted-foreground text-sm">({countryOption.phonePrefix})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label htmlFor="phoneNumber" className="text-sm font-medium">
                  Phone number <span className="text-red-500">*</span>
                </label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder={selectedCountry ? `e.g. ${exampleLocalNumber} or ${selectedCountry.phonePrefix}${exampleLocalNumber}` : 'e.g. +15551234567'}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-10"
                  required
                />
                {selectedCountry && (
                  <p className="text-xs text-muted-foreground">
                    Enter your number with or without the country code. Examples: {exampleLocalNumber}, {selectedCountry.phonePrefix}{exampleLocalNumber}
                  </p>
                )}
              </div>
            </div>

            {selectedCountry && (
              <p className="text-xs text-muted-foreground">
                App will be configured for {selectedCountry.region === 'NG' ? 'Nigeria' : 'International'} region
              </p>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Send OTP Button */}
            <Button
              type="submit"
              className="w-full h-12"
              disabled={isLoading || !phoneNumber || !country}
            >
              {isLoading ? 'Sending code...' : 'Send verification code'}
            </Button>
          </form>

          {/* Alternative Login Methods */}
          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Biometric Login */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12"
              onClick={handleBiometricLogin}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Use Biometric Login
            </Button>

            {/* Social Login Options */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-12">
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </Button>
              <Button variant="outline" className="h-12">
                <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>
            </div>
          </div>
        </Card>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-muted-foreground">
            Don't have an account?{' '}
            <Button variant="link" className="p-0 h-auto" onClick={onShowRegister}>
              Sign up
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
