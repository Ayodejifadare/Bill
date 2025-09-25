import { useEffect, useState, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import {
  Settings,
  CreditCard,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  Edit3,
  Wallet,
  Users,
  Receipt,
  TrendingUp,
  ChevronRight,
  MessageCircle,
  Mail,
  Clock,
} from 'lucide-react';
import { ThemeToggleButton } from './ThemeToggleButton';
import { useUserProfile } from './UserProfileContext';
import { formatCurrencyForRegion } from '../utils/regions';
import { ProfileSkeleton } from './ui/profile-skeleton';

interface ProfileScreenProps {
  onNavigate: (tab: string, data?: any) => void;
  onLogout?: () => void;
}

export function ProfileScreen({ onNavigate, onLogout }: ProfileScreenProps) {
  const { userProfile, updateUserProfile, refreshUserProfile, appSettings } = useUserProfile();
  const defaultPreferences = {
    notifications: false,
    emailAlerts: false,
    whatsappAlerts: false,
    darkMode: false,
    biometrics: false,
    notificationSettings: {},
  };
  const [preferences, setPreferences] = useState(
    userProfile?.preferences ?? defaultPreferences,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.preferences) {
      setPreferences(userProfile.preferences);
    }
  }, [userProfile]);

  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const loadProfile = async () => {
      setIsLoading(true);
      await refreshUserProfile();
      setIsLoading(false);
    };

    loadProfile();
  }, [refreshUserProfile]);

  const updatePreference = (key: keyof typeof preferences, value: boolean) => {
    const newPrefs = {
      ...preferences,
      [key]: value,
    };
    setPreferences(newPrefs);
    updateUserProfile({ preferences: newPrefs });
  };

  const menuItems = [
    {
      section: 'Account',
      items: [
        { icon: Edit3, label: 'Edit Profile', action: () => onNavigate('account-settings') },
        { icon: CreditCard, label: 'Payment Methods', action: () => onNavigate('payment-methods') },
        { icon: Wallet, label: 'Wallet & Cards', action: () => {} },
        { icon: Shield, label: 'Privacy & Security', action: () => onNavigate('security') },
      ],
    },
    {
      section: 'Activity',
      items: [
        { icon: Receipt, label: 'Transaction History', action: () => onNavigate('transaction-history', { from: 'profile' }) },
        { icon: TrendingUp, label: 'Spending Insights', action: () => onNavigate('spending-insights') },
        { icon: Users, label: 'Friend Activity', action: () => onNavigate('friends') },
      ],
    },
    {
      section: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', action: () => {} },
        { icon: Settings, label: 'Settings', action: () => onNavigate('settings') },
        { icon: LogOut, label: 'Sign Out', action: () => onLogout?.(), danger: true },
      ],
    },
  ];

  if (!userProfile) {
    return isLoading ? <ProfileSkeleton /> : <div>Error loading profile</div>;
  }

  return (
    <div className="pb-20">
      {/* Static Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between gap-4 p-4">
          <h1>Profile</h1>
          <ThemeToggleButton />
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <ProfileSkeleton />
      ) : (
        <div className="py-4 space-y-6">
          {/* Profile Header */}
          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {userProfile.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2>{userProfile.name}</h2>
                  {userProfile.kycStatus === 'verified' ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-800 cursor-pointer hover:bg-yellow-200"
                      onClick={() => onNavigate('kyc-verification')}
                      title="Complete verification"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Verify Account
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                <p className="text-sm text-muted-foreground">Member since {userProfile.joinDate}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigate('account-settings')}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Stats */}
          <Card className="p-6">
            <h3 className="mb-4">Your Activity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-medium text-green-600">
                  {formatCurrencyForRegion(appSettings.region, Number(userProfile.stats.totalReceived.toFixed(0)))}
                </p>
                <p className="text-sm text-muted-foreground">Received</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-medium text-blue-600">
                  {formatCurrencyForRegion(appSettings.region, Number(userProfile.stats.totalSent.toFixed(0)))}
                </p>
                <p className="text-sm text-muted-foreground">Sent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-medium text-purple-600">
                  {userProfile.stats.totalSplits}
                </p>
                <p className="text-sm text-muted-foreground">Bill Splits</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-medium text-orange-600">
                  {userProfile.stats.friends}
                </p>
                <p className="text-sm text-muted-foreground">Friends</p>
              </div>
            </div>
          </Card>

          {/* Preferences */}
          <Card className="p-6">
            <h3 className="mb-4">Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified about transactions
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.notifications}
                  onCheckedChange={(checked) => updatePreference('notifications', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.emailAlerts}
                  onCheckedChange={(checked) => updatePreference('emailAlerts', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">WhatsApp Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Get instant updates via WhatsApp
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.whatsappAlerts}
                  onCheckedChange={(checked) => updatePreference('whatsappAlerts', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Biometric Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      Use fingerprint or face ID
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.biometrics}
                  onCheckedChange={(checked) => updatePreference('biometrics', checked)}
                />
              </div>
            </div>
          </Card>

          {/* Menu Items */}
          <div className="space-y-6">
            {menuItems.map((section, sectionIndex) => (
              <Card key={sectionIndex} className="p-6">
                <h3 className="mb-4">{section.section}</h3>
                <div className="space-y-1">
                  {section.items.map((item, itemIndex) => (
                    <button
                      key={itemIndex}
                      onClick={item.action}
                      className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors ${
                        item.danger ? 'text-destructive hover:bg-destructive/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
