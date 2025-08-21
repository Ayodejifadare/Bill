import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, CheckCircle } from 'lucide-react';

interface KycVerificationScreenProps {
  onNavigate: (tab: string) => void;
}

export function KycVerificationScreen({ onNavigate }: KycVerificationScreenProps) {
  const [step, setStep] = useState<'phone' | 'email' | 'id' | 'complete'>('phone');

  const handleNext = () => {
    if (step === 'phone') setStep('email');
    else if (step === 'email') setStep('id');
    else if (step === 'id') setStep('complete');
    else onNavigate('profile');
  };

  const renderStep = () => {
    switch (step) {
      case 'phone':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="+1234567890" />
            </div>
            <Button className="w-full" onClick={handleNext}>Verify Phone</Button>
          </div>
        );
      case 'email':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" />
            </div>
            <Button className="w-full" onClick={handleNext}>Verify Email</Button>
          </div>
        );
      case 'id':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="id">ID Number</Label>
              <Input id="id" placeholder="Enter ID number" />
            </div>
            <Button className="w-full" onClick={handleNext}>Submit ID</Button>
          </div>
        );
      case 'complete':
        return (
          <div className="space-y-4 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <p>Your information has been submitted for verification.</p>
            <Button className="w-full" onClick={handleNext}>Back to Profile</Button>
          </div>
        );
    }
  };

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="flex items-center space-x-4 mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('profile')}
          className="p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2>KYC Verification</h2>
          <p className="text-muted-foreground">Verify your account</p>
        </div>
      </div>
      <Card className="p-6">
        {renderStep()}
      </Card>
    </div>
  );
}
