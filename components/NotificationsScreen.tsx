import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { EmptyState } from './ui/empty-state';
import { ArrowLeft, Bell, Check, X, Users, DollarSign, AlertTriangle, MessageCircle, Mail, Smartphone, Settings, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'payment' | 'request' | 'split' | 'friend' | 'reminder';
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionable?: boolean;
  user?: {
    name: string;
    avatar?: string;
  };
  amount?: number;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'payment',
    title: 'Payment Received',
    message: 'Sarah Johnson sent you $25.50 for coffee',
    time: '2 minutes ago',
    read: false,
    user: { name: 'Sarah Johnson' },
    amount: 25.50,
  },
  {
    id: '2',
    type: 'request',
    title: 'Payment Request',
    message: 'Mike Chen is requesting $15.00 for lunch',
    time: '1 hour ago',
    read: false,
    actionable: true,
    user: { name: 'Mike Chen' },
    amount: 15.00,
  },
  {
    id: '3',
    type: 'split',
    title: 'Bill Split Created',
    message: 'Emily Davis split dinner bill of $75.00 with you',
    time: '3 hours ago',
    read: true,
    user: { name: 'Emily Davis' },
    amount: 18.75,
  },
  {
    id: '4',
    type: 'friend',
    title: 'New Friend Request',
    message: 'Alex Rodriguez wants to be your friend',
    time: '1 day ago',
    read: false,
    actionable: true,
    user: { name: 'Alex Rodriguez' },
  },
  {
    id: '5',
    type: 'reminder',
    title: 'Payment Reminder',
    message: 'You have a pending payment of $18.75 to Sarah Johnson',
    time: '2 days ago',
    read: true,
    amount: 18.75,
  },
];

interface NotificationsScreenProps {
  onNavigate: (tab: string) => void;
}

interface NotificationSettings {
  whatsapp: {
    enabled: boolean;
  };
  push: {
    enabled: boolean;
    billSplits: boolean;
    paymentRequests: boolean;
    paymentReceived: boolean;
    paymentReminders: boolean;
    friendRequests: boolean;
    groupActivity: boolean;
  };
  email: {
    enabled: boolean;
    weeklyDigest: boolean;
    monthlyStatement: boolean;
    securityAlerts: boolean;
    productUpdates: boolean;
  };
  sms: {
    enabled: boolean;
    paymentConfirmations: boolean;
    securityAlerts: boolean;
    urgentReminders: boolean;
  };
}

const defaultNotificationSettings: NotificationSettings = {
  whatsapp: {
    enabled: true,
  },
  push: {
    enabled: true,
    billSplits: true,
    paymentRequests: true,
    paymentReceived: true,
    paymentReminders: true,
    friendRequests: true,
    groupActivity: true,
  },
  email: {
    enabled: false,
    weeklyDigest: false,
    monthlyStatement: true,
    securityAlerts: true,
    productUpdates: false,
  },
  sms: {
    enabled: false,
    paymentConfirmations: false,
    securityAlerts: true,
    urgentReminders: false,
  }
};

export function NotificationsScreen({ onNavigate }: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const storedAuth = localStorage.getItem('biltip_auth');
        const token = storedAuth ? JSON.parse(storedAuth).token : null;
        if (!token) return;
        const res = await fetch('/api/notification-settings', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setNotificationSettings(data.settings);
          }
        }
      } catch (error) {
        console.error('Error fetching notification settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const saveSettings = async (settings: NotificationSettings) => {
    try {
      const storedAuth = localStorage.getItem('biltip_auth');
      const token = storedAuth ? JSON.parse(storedAuth).token : null;
      if (!token) return;
      await fetch('/api/notification-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // Settings update functions
  const updateWhatsAppSetting = async (value: boolean) => {
    const updated = {
      ...notificationSettings,
      whatsapp: { enabled: value }
    };
    setNotificationSettings(updated);
    await saveSettings(updated);
    toast.success(value ? 'WhatsApp notifications enabled' : 'WhatsApp notifications disabled');
  };

  const updatePushSetting = async (key: keyof NotificationSettings['push'], value: boolean) => {
    const updated = {
      ...notificationSettings,
      push: {
        ...notificationSettings.push,
        [key]: value
      }
    };
    setNotificationSettings(updated);
    await saveSettings(updated);
  };

  const updateEmailSetting = async (key: keyof NotificationSettings['email'], value: boolean) => {
    const updated = {
      ...notificationSettings,
      email: {
        ...notificationSettings.email,
        [key]: value
      }
    };
    setNotificationSettings(updated);
    await saveSettings(updated);
  };

  const updateSmsSetting = async (key: keyof NotificationSettings['sms'], value: boolean) => {
    const updated = {
      ...notificationSettings,
      sms: {
        ...notificationSettings.sms,
        [key]: value
      }
    };
    setNotificationSettings(updated);
    await saveSettings(updated);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'request':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'split':
        return <Users className="h-4 w-4 text-purple-600" />;
      case 'friend':
        return <Users className="h-4 w-4 text-orange-600" />;
      case 'reminder':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const handleNotificationAction = (notification: Notification, action: 'accept' | 'decline') => {
    if (notification.type === 'request') {
      alert(`${action === 'accept' ? 'Accepted' : 'Declined'} payment request from ${notification.user?.name}`);
    } else if (notification.type === 'friend') {
      alert(`${action === 'accept' ? 'Accepted' : 'Declined'} friend request from ${notification.user?.name}`);
    }
    markAsRead(notification.id);
  };

  return (
    <div className="pb-20">
      {/* Static Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center space-x-4 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('home')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2>Notifications</h2>
            {activeTab === 'notifications' && unreadCount > 0 && (
              <p className="text-muted-foreground">{unreadCount} unread notifications</p>
            )}
          </div>
          {activeTab === 'notifications' && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'notifications' | 'settings')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Messages</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0.5">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Preferences</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4 mt-6">

          {/* Filter Tabs */}
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
            ].map((filterOption) => (
              <button
                key={filterOption.id}
                onClick={() => setFilter(filterOption.id as 'all' | 'unread')}
                className={`flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
                  filter === filterOption.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {filterOption.label}
                {filterOption.id === 'unread' && unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`p-4 ${!notification.read ? 'bg-blue-50 border-blue-200' : ''}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    {notification.user ? (
                      <Avatar className="h-10 w-10 mt-1">
                        <AvatarFallback>
                          {notification.user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="bg-muted p-2 rounded-full mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          {notification.amount && (
                            <p className="text-sm font-medium text-green-600 mt-1">
                              ${notification.amount.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">
                            {notification.time}
                          </span>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actionable notifications */}
                  {notification.actionable && !notification.read && (
                    <div className="flex space-x-2 pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleNotificationAction(notification, 'accept')}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {notification.type === 'request' ? 'Pay' : 'Accept'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleNotificationAction(notification, 'decline')}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  )}

                  {/* Mark as read button for non-actionable notifications */}
                  {!notification.actionable && !notification.read && (
                    <div className="pt-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => markAsRead(notification.id)}
                      >
                        Mark as read
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {filteredNotifications.length === 0 && (
            <EmptyState
              icon={Bell}
              title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              description={filter === 'unread' ? 'All caught up!' : 'Your notifications will appear here when you receive them'}
            />
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-6">
          {/* WhatsApp Notifications - Simplified */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-green-50 p-2 rounded-full dark:bg-green-950/20">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3>WhatsApp Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    Get notifications via WhatsApp
                  </p>
                </div>
              </div>
              <Switch
                checked={notificationSettings.whatsapp.enabled}
                onCheckedChange={(checked) => updateWhatsAppSetting(checked)}
              />
            </div>

            {notificationSettings.whatsapp.enabled && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950/20 dark:border-green-800">
                <div className="flex items-start space-x-2">
                  <MessageCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                      WhatsApp notifications enabled
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      You'll receive important notifications via WhatsApp. Configure your phone number in account settings.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Push Notifications */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-50 p-2 rounded-full dark:bg-blue-950/20">
                  <Smartphone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3>Push Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    App notifications on your device
                  </p>
                </div>
              </div>
              <Switch
                checked={notificationSettings.push.enabled}
                onCheckedChange={(checked) => updatePushSetting('enabled', checked)}
              />
            </div>

            {notificationSettings.push.enabled && (
              <>
                <Separator className="mb-4" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p>Bill splits & expenses</p>
                      <p className="text-sm text-muted-foreground">Real-time bill notifications</p>
                    </div>
                    <Switch
                      checked={notificationSettings.push.billSplits}
                      onCheckedChange={(checked) => updatePushSetting('billSplits', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p>Payment requests</p>
                      <p className="text-sm text-muted-foreground">Money request alerts</p>
                    </div>
                    <Switch
                      checked={notificationSettings.push.paymentRequests}
                      onCheckedChange={(checked) => updatePushSetting('paymentRequests', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p>Payment received</p>
                      <p className="text-sm text-muted-foreground">Payment confirmation alerts</p>
                    </div>
                    <Switch
                      checked={notificationSettings.push.paymentReceived}
                      onCheckedChange={(checked) => updatePushSetting('paymentReceived', checked)}
                    />
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Email Notifications */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-50 p-2 rounded-full dark:bg-purple-950/20">
                  <Mail className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3>Email Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    Weekly summaries and important updates
                  </p>
                </div>
              </div>
              <Switch
                checked={notificationSettings.email.enabled}
                onCheckedChange={(checked) => updateEmailSetting('enabled', checked)}
              />
            </div>

            {notificationSettings.email.enabled && (
              <>
                <Separator className="mb-4" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p>Weekly digest</p>
                      <p className="text-sm text-muted-foreground">Weekly expense summary</p>
                    </div>
                    <Switch
                      checked={notificationSettings.email.weeklyDigest}
                      onCheckedChange={(checked) => updateEmailSetting('weeklyDigest', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p>Monthly statement</p>
                      <p className="text-sm text-muted-foreground">Monthly financial summary</p>
                    </div>
                    <Switch
                      checked={notificationSettings.email.monthlyStatement}
                      onCheckedChange={(checked) => updateEmailSetting('monthlyStatement', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p>Security alerts</p>
                      <p className="text-sm text-muted-foreground">Important security notifications</p>
                    </div>
                    <Switch
                      checked={notificationSettings.email.securityAlerts}
                      onCheckedChange={(checked) => updateEmailSetting('securityAlerts', checked)}
                    />
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* SMS Notifications */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-50 p-2 rounded-full dark:bg-orange-950/20">
                  <Smartphone className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3>SMS Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    Critical alerts via text message
                  </p>
                </div>
              </div>
              <Switch
                checked={notificationSettings.sms.enabled}
                onCheckedChange={(checked) => updateSmsSetting('enabled', checked)}
              />
            </div>

            {notificationSettings.sms.enabled && (
              <>
                <Separator className="mb-4" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p>Payment confirmations</p>
                      <p className="text-sm text-muted-foreground">SMS for completed payments</p>
                    </div>
                    <Switch
                      checked={notificationSettings.sms.paymentConfirmations}
                      onCheckedChange={(checked) => updateSmsSetting('paymentConfirmations', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p>Security alerts</p>
                      <p className="text-sm text-muted-foreground">Critical security notifications</p>
                    </div>
                    <Switch
                      checked={notificationSettings.sms.securityAlerts}
                      onCheckedChange={(checked) => updateSmsSetting('securityAlerts', checked)}
                    />
                  </div>
                </div>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}