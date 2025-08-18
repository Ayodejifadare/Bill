import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  ArrowLeft, 
  Shield, 
  Key, 
  Smartphone, 
  Lock, 
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Settings,
  Clock
} from 'lucide-react';

interface SecurityActivity {
  id: string;
  action: string;
  device: string;
  location: string;
  timestamp: string;
  suspicious: boolean;
}

const mockSecurityActivities: SecurityActivity[] = [
  {
    id: '1',
    action: 'Login',
    device: 'iPhone 14 Pro',
    location: 'San Francisco, CA',
    timestamp: '2 hours ago',
    suspicious: false,
  },
  {
    id: '2',
    action: 'Password Changed',
    device: 'MacBook Pro',
    location: 'San Francisco, CA',
    timestamp: '3 days ago',
    suspicious: false,
  },
  {
    id: '3',
    action: 'Login Attempt (Failed)',
    device: 'Unknown Device',
    location: 'New York, NY',
    timestamp: '1 week ago',
    suspicious: true,
  },
];

interface SecurityScreenProps {
  onNavigate: (tab: string) => void;
}

export function SecurityScreen({ onNavigate }: SecurityScreenProps) {
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    biometricAuth: true,
    emailAlerts: true,
    smsAlerts: false,
    loginNotifications: true,
    sessionTimeout: '30',
  });

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const updateSetting = (key: string, value: boolean | string) => {
    setSecuritySettings(prev => ({ ...prev, [key]: value }));
  };

  const handleChangePassword = () => {
    // Mock password change
    alert('Password changed successfully!');
    setShowChangePassword(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const securityScore = 85; // Mock security score

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Header */}
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
          <h2>Security</h2>
          <p className="text-muted-foreground">Manage your account security</p>
        </div>
      </div>

      {/* Security Score */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${securityScore >= 80 ? 'bg-green-100' : securityScore >= 60 ? 'bg-yellow-100' : 'bg-red-100'}`}>
              <Shield className={`h-6 w-6 ${securityScore >= 80 ? 'text-green-600' : securityScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`} />
            </div>
            <div>
              <h3>Security Score</h3>
              <p className="text-sm text-muted-foreground">Your account security level</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{securityScore}%</p>
            <Badge 
              variant="secondary" 
              className={securityScore >= 80 ? 'bg-green-100 text-green-800' : securityScore >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}
            >
              {securityScore >= 80 ? 'Excellent' : securityScore >= 60 ? 'Good' : 'Needs Improvement'}
            </Badge>
          </div>
        </div>
        
        {securityScore < 80 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Improve your security</p>
                <p className="text-xs text-yellow-600 mt-1">
                  Enable two-factor authentication and use a stronger password to increase your security score.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Password Management */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-muted-foreground" />
            <h3>Password</h3>
          </div>
          <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Change Password
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm">Current Password</label>
                  <div className="relative">
                    <Input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm">New Password</label>
                  <div className="relative">
                    <Input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm">Confirm New Password</label>
                  <div className="relative">
                    <Input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button onClick={handleChangePassword} className="w-full">
                  Change Password
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>Last changed: 3 days ago</p>
          <p className="mt-1">Use a strong password with at least 8 characters, including numbers and special characters.</p>
        </div>
      </Card>

      {/* Authentication Settings */}
      <Card className="p-6">
        <h3 className="mb-4">Authentication</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Add extra security with SMS or authenticator app
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {securitySettings.twoFactorAuth && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}
              <Switch
                checked={securitySettings.twoFactorAuth}
                onCheckedChange={(checked) => updateSetting('twoFactorAuth', checked)}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Biometric Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Use fingerprint or Face ID to unlock
                </p>
              </div>
            </div>
            <Switch
              checked={securitySettings.biometricAuth}
              onCheckedChange={(checked) => updateSetting('biometricAuth', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Security Alerts */}
      <Card className="p-6">
        <h3 className="mb-4">Security Alerts</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Alerts</p>
              <p className="text-sm text-muted-foreground">
                Get notified of suspicious activity via email
              </p>
            </div>
            <Switch
              checked={securitySettings.emailAlerts}
              onCheckedChange={(checked) => updateSetting('emailAlerts', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">SMS Alerts</p>
              <p className="text-sm text-muted-foreground">
                Receive security alerts via text message
              </p>
            </div>
            <Switch
              checked={securitySettings.smsAlerts}
              onCheckedChange={(checked) => updateSetting('smsAlerts', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Login Notifications</p>
              <p className="text-sm text-muted-foreground">
                Get notified when someone logs into your account
              </p>
            </div>
            <Switch
              checked={securitySettings.loginNotifications}
              onCheckedChange={(checked) => updateSetting('loginNotifications', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Recent Security Activity */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3>Recent Activity</h3>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            Manage
          </Button>
        </div>
        
        <div className="space-y-3">
          {mockSecurityActivities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${activity.suspicious ? 'bg-red-100' : 'bg-green-100'}`}>
                  {activity.suspicious ? (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.device} • {activity.location}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                {activity.suspicious && (
                  <Badge variant="destructive" className="text-xs mt-1">
                    Suspicious
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Session Management */}
      <Card className="p-6">
        <h3 className="mb-4">Session Management</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Auto-logout</p>
                <p className="text-sm text-muted-foreground">
                  Automatically log out after inactivity
                </p>
              </div>
            </div>
            <select
              value={securitySettings.sessionTimeout}
              onChange={(e) => updateSetting('sessionTimeout', e.target.value)}
              className="border rounded-md px-3 py-1 text-sm"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="never">Never</option>
            </select>
          </div>

          <Separator />

          <Button variant="outline" className="w-full">
            Log Out All Other Sessions
          </Button>
        </div>
      </Card>
    </div>
  );
}