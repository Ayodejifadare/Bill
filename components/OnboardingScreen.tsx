import { Button } from './ui/button';

interface OnboardingScreenProps {
  onNavigate: (tab: string) => void;
}

export function OnboardingScreen({ onNavigate }: OnboardingScreenProps) {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Onboarding</h1>
      <p>Onboarding flow coming soon.</p>
      <Button onClick={() => onNavigate('home')}>Go to Home</Button>
    </div>
  );
}
