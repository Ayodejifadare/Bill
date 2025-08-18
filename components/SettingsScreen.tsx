import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Bell, Shield, Smartphone, Moon, Sun, Monitor, Globe, CreditCard, Eye, MessageCircle } from 'lucide-react';
import { useTheme } from './ThemeContext';

interface SettingsScreenProps {
  onNavigate: (tab: string) => void;
}

export function SettingsScreen({ onNavigate }: SettingsScreenProps) {
  const { theme, setTheme, actualTheme } = useTheme();
  
  const [settings, setSettings] = useState({
    notifications: {
      pushNotifications: true,
      emailNotifications: false,
      whatsappNotifications: true,
      smsNotifications: true,
      transactionAlerts: true,
      friendRequests: true,
      billReminders: true,
    },
    privacy: {
      biometricAuth: true,
      twoFactorAuth: false,
      publicProfile: false,
      shareActivity: true,
    },
    preferences: {
      language: 'en',
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
    },
  });

  const updateSetting = (category: keyof typeof settings, key: string, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  return (
    <div>
      {/* Static Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40 -mx-4 px-4 py-3 mb-6">
        <div className="flex items-center space-x-4 max-w-md mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('profile')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2>Settings</h2>
            <p className="text-muted-foreground">Manage your app preferences</p>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="p-4 space-y-6 pb-20">
        {/* Notifications */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <h3>Notifications</h3>
          </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive notifications on your device
              </p>
            </div>
            <Switch
              checked={settings.notifications.pushNotifications}
              onCheckedChange={(checked) => updateSetting('notifications', 'pushNotifications', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">
                Get updates via email
              </p>
            </div>
            <Switch
              checked={settings.notifications.emailNotifications}
              onCheckedChange={(checked) => updateSetting('notifications', 'emailNotifications', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="font-medium">WhatsApp Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Get instant updates via WhatsApp
                </p>
              </div>
            </div>
            <Switch
              checked={settings.notifications.whatsappNotifications}
              onCheckedChange={(checked) => updateSetting('notifications', 'whatsappNotifications', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Transaction Alerts</p>
              <p className="text-sm text-muted-foreground">
                Notify me of all transactions
              </p>
            </div>
            <Switch
              checked={settings.notifications.transactionAlerts}
              onCheckedChange={(checked) => updateSetting('notifications', 'transactionAlerts', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Bill Reminders</p>
              <p className="text-sm text-muted-foreground">
                Remind me about pending bills
              </p>
            </div>
            <Switch
              checked={settings.notifications.billReminders}
              onCheckedChange={(checked) => updateSetting('notifications', 'billReminders', checked)}
            />
          </div>
          </div>
        </Card>

        {/* Privacy & Security */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h3>Privacy & Security</h3>
          </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Biometric Authentication</p>
              <p className="text-sm text-muted-foreground">
                Use fingerprint or Face ID
              </p>
            </div>
            <Switch
              checked={settings.privacy.biometricAuth}
              onCheckedChange={(checked) => updateSetting('privacy', 'biometricAuth', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">
                Add extra security to your account
              </p>
            </div>
            <Switch
              checked={settings.privacy.twoFactorAuth}
              onCheckedChange={(checked) => updateSetting('privacy', 'twoFactorAuth', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Public Profile</p>
              <p className="text-sm text-muted-foreground">
                Allow others to find you by username
              </p>
            </div>
            <Switch
              checked={settings.privacy.publicProfile}
              onCheckedChange={(checked) => updateSetting('privacy', 'publicProfile', checked)}
            />
          </div>
          </div>
        </Card>

        {/* App Preferences */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <h3>App Preferences</h3>
          </div>
        
        <div className="space-y-4">
          <div className="space-y-4">
            <div>
              <p className="font-medium mb-3">Theme</p>
              <p className="text-sm text-muted-foreground mb-4">
                Choose how the app looks, or sync with your system
              </p>
            </div>
            
            <div className="space-y-2">
              {/* Light Theme */}
              <div 
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  theme === 'light' 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'hover:bg-accent border-border'
                }`}
                onClick={() => setTheme('light')}
              >
                <div className="flex items-center gap-3">
                  <Sun className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Light</p>
                    <p className="text-xs opacity-70">Light mode</p>
                  </div>
                </div>
                {theme === 'light' && (
                  <div className="w-2 h-2 bg-current rounded-full" />
                )}
              </div>
              
              {/* Dark Theme */}
              <div 
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  theme === 'dark' 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'hover:bg-accent border-border'
                }`}
                onClick={() => setTheme('dark')}
              >
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Dark</p>
                    <p className="text-xs opacity-70">Dark mode</p>
                  </div>
                </div>
                {theme === 'dark' && (
                  <div className="w-2 h-2 bg-current rounded-full" />
                )}
              </div>
              
              {/* System Theme */}
              <div 
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  theme === 'system' 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'hover:bg-accent border-border'
                }`}
                onClick={() => setTheme('system')}
              >
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5" />
                  <div>
                    <p className="font-medium">System</p>
                    <p className="text-xs opacity-70">
                      Follow system setting ({actualTheme})
                    </p>
                  </div>
                </div>
                {theme === 'system' && (
                  <div className="w-2 h-2 bg-current rounded-full" />
                )}
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <label className="font-medium">Language</label>
            </div>
            <Select
              value={settings.preferences.language}
              onValueChange={(value) => updateSetting('preferences', 'language', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <label className="font-medium">Currency</label>
            </div>
            <Select
              value={settings.preferences.currency}
              onValueChange={(value) => updateSetting('preferences', 'currency', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="CAD">CAD ($)</SelectItem>
                <SelectItem value="NGN">NGN (₦)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
        </Card>

        {/* Save Changes */}
        <Button className="w-full h-12">
          Save Changes
        </Button>
      </div>
    </div>
  );
}