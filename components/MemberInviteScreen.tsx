import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScreenHeader } from './ui/screen-header';
import { EmptyState } from './ui/empty-state';
import { FilterTabs } from './ui/filter-tabs';
import { Switch } from './ui/switch';
import { 
  MessageCircle, 
  Mail, 
  Phone, 
  Clock, 
  Check, 
  X, 
  RotateCcw,
  Link,
  Copy,
  Settings,
  Users,
  Calendar
} from 'lucide-react';
import { Separator } from './ui/separator';
import { toast } from 'sonner';

interface PendingInvite {
  id: string;
  name?: string;
  contact: string; // phone or email
  method: 'whatsapp' | 'sms' | 'email' | 'link';
  invitedBy: string;
  invitedAt: string;
  status: 'sent' | 'delivered' | 'opened' | 'expired';
  expiresAt: string;
  attempts: number;
  lastAttempt?: string;
}

interface InviteLink {
  id: string;
  link: string;
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  currentUses: number;
  createdBy: string;
  isActive: boolean;
}

interface InviteSettings {
  autoExpire: boolean;
  expireDays: number;
  maxAttempts: number;
  requireApproval: boolean;
  allowLinkInvites: boolean;
  linkMaxUses: number;
  linkExpireDays: number;
}

const mockPendingInvites: PendingInvite[] = [
  {
    id: '1',
    name: 'Jessica Wilson',
    contact: '+1234567890',
    method: 'whatsapp',
    invitedBy: 'Sarah Johnson',
    invitedAt: '2024-01-15T10:30:00Z',
    status: 'delivered',
    expiresAt: '2024-01-22T10:30:00Z',
    attempts: 1
  },
  {
    id: '2',
    name: 'David Kim',
    contact: 'david@example.com',
    method: 'email',
    invitedBy: 'You',
    invitedAt: '2024-01-14T14:20:00Z',
    status: 'opened',
    expiresAt: '2024-01-21T14:20:00Z',
    attempts: 2,
    lastAttempt: '2024-01-16T09:15:00Z'
  },
  {
    id: '3',
    contact: '+1234567891',
    method: 'sms',
    invitedBy: 'Mike Chen',
    invitedAt: '2024-01-13T16:45:00Z',
    status: 'sent',
    expiresAt: '2024-01-20T16:45:00Z',
    attempts: 1
  }
];

const mockInviteLinks: InviteLink[] = [
  {
    id: '1',
    link: 'https://biltip.com/invite/work-squad-abc123',
    createdAt: '2024-01-15T12:00:00Z',
    expiresAt: '2024-01-22T12:00:00Z',
    maxUses: 10,
    currentUses: 3,
    createdBy: 'You',
    isActive: true
  }
];

interface MemberInviteScreenProps {
  groupId: string | null;
  onNavigate: (tab: string, data?: any) => void;
}

export function MemberInviteScreen({ groupId, onNavigate }: MemberInviteScreenProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'links' | 'settings'>('pending');
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(mockPendingInvites);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>(mockInviteLinks);
  const [settings, setSettings] = useState<InviteSettings>({
    autoExpire: true,
    expireDays: 7,
    maxAttempts: 3,
    requireApproval: false,
    allowLinkInvites: true,
    linkMaxUses: 10,
    linkExpireDays: 7
  });

  const handleResendInvite = (inviteId: string) => {
    setPendingInvites(prev => prev.map(invite => 
      invite.id === inviteId 
        ? { 
            ...invite, 
            attempts: invite.attempts + 1,
            lastAttempt: new Date().toISOString(),
            status: 'sent' as const
          }
        : invite
    ));
    
    const invite = pendingInvites.find(i => i.id === inviteId);
    toast.success(`Invitation resent to ${invite?.name || invite?.contact}`);
  };

  const handleCancelInvite = (inviteId: string) => {
    const invite = pendingInvites.find(i => i.id === inviteId);
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    toast.success(`Invitation cancelled for ${invite?.name || invite?.contact}`);
  };

  const handleCreateInviteLink = () => {
    const newLink: InviteLink = {
      id: Date.now().toString(),
      link: `https://biltip.com/invite/work-squad-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + settings.linkExpireDays * 24 * 60 * 60 * 1000).toISOString(),
      maxUses: settings.linkMaxUses,
      currentUses: 0,
      createdBy: 'You',
      isActive: true
    };
    
    setInviteLinks(prev => [newLink, ...prev]);
    toast.success('New invite link created');
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard');
  };

  const handleDeactivateLink = (linkId: string) => {
    setInviteLinks(prev => prev.map(link => 
      link.id === linkId ? { ...link, isActive: false } : link
    ));
    toast.success('Invite link deactivated');
  };

  const handleDeleteLink = (linkId: string) => {
    setInviteLinks(prev => prev.filter(link => link.id !== linkId));
    toast.success('Invite link deleted');
  };

  const updateSettings = (key: keyof InviteSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast.success('Settings updated');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatExpiry = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'delivered':
        return <Check className="h-4 w-4 text-primary" />;
      case 'opened':
        return <Check className="h-4 w-4 text-success" />;
      case 'expired':
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-warning';
      case 'delivered':
        return 'text-primary';
      case 'opened':
        return 'text-success';
      case 'expired':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4 text-green-600" />;
      case 'email':
        return <Mail className="h-4 w-4 text-blue-600" />;
      case 'sms':
        return <Phone className="h-4 w-4 text-purple-600" />;
      case 'link':
        return <Link className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (!groupId) {
    return (
      <EmptyState
        icon={Users}
        title="No Group Selected"
        description="Please select a group to manage invitations"
        actionLabel="Go to Groups"
        onAction={() => onNavigate('friends')}
      />
    );
  }

  return (
    <div>
      <ScreenHeader
        title="Manage Invitations"
        subtitle="Control group invitations and settings"
        showBackButton
        onBack={() => onNavigate('group-members', { groupId })}
      />

      <div className="p-4 space-y-6 pb-20">
        {/* Tab Navigation */}
        <FilterTabs
          tabs={[
            { id: 'pending', label: 'Pending', count: pendingInvites.length },
            { id: 'links', label: 'Links', count: inviteLinks.filter(l => l.isActive).length },
            { id: 'settings', label: 'Settings' }
          ]}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as 'pending' | 'links' | 'settings')}
        />

        {activeTab === 'pending' && (
          <>
            {/* Pending Invitations */}
            {pendingInvites.length > 0 ? (
              <div className="space-y-3">
                {pendingInvites.map((invite) => {
                  const isExpired = new Date(invite.expiresAt) < new Date();
                  const canResend = !isExpired && invite.attempts < settings.maxAttempts;
                  
                  return (
                    <Card key={invite.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {getMethodIcon(invite.method)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">
                                {invite.name || 'Unnamed Contact'}
                              </h3>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getStatusColor(invite.status)}`}
                              >
                                {getStatusIcon(invite.status)}
                                {invite.status}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-1">
                              {invite.contact}
                            </p>
                            
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>
                                Invited by {invite.invitedBy} • {formatDate(invite.invitedAt)}
                              </p>
                              <p>
                                {formatExpiry(invite.expiresAt)} • {invite.attempts} attempt{invite.attempts !== 1 ? 's' : ''}
                              </p>
                              {invite.lastAttempt && (
                                <p>Last resent {formatDate(invite.lastAttempt)}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {canResend && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendInvite(invite.id)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Resend
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelInvite(invite.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="No pending invitations"
                description="All invitations have been responded to or expired"
                actionLabel="Add New Members"
                onAction={() => onNavigate('add-group-member', { groupId })}
              />
            )}
          </>
        )}

        {activeTab === 'links' && (
          <>
            {/* Create New Link */}
            {settings.allowLinkInvites && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">Invite Links</h3>
                    <p className="text-sm text-muted-foreground">
                      Share links that let people join the group directly
                    </p>
                  </div>
                  <Button onClick={handleCreateInviteLink}>
                    <Link className="h-4 w-4 mr-2" />
                    Create Link
                  </Button>
                </div>
              </Card>
            )}

            {/* Existing Links */}
            {inviteLinks.length > 0 ? (
              <div className="space-y-3">
                {inviteLinks.map((link) => {
                  const isExpired = new Date(link.expiresAt) < new Date();
                  const isMaxedOut = link.currentUses >= link.maxUses;
                  const isInactive = !link.isActive || isExpired || isMaxedOut;
                  
                  return (
                    <Card key={link.id} className={`p-4 ${isInactive ? 'opacity-60' : ''}`}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Link className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Invite Link</span>
                              {!link.isActive && (
                                <Badge variant="secondary" className="text-xs">Inactive</Badge>
                              )}
                              {isExpired && (
                                <Badge variant="destructive" className="text-xs">Expired</Badge>
                              )}
                              {isMaxedOut && (
                                <Badge variant="destructive" className="text-xs">Max Uses Reached</Badge>
                              )}
                            </div>
                            
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Created by {link.createdBy} • {formatDate(link.createdAt)}</p>
                              <p>{formatExpiry(link.expiresAt)}</p>
                              <p>{link.currentUses} of {link.maxUses} uses</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <code className="flex-1 text-sm truncate">{link.link}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyLink(link.link)}
                            disabled={isInactive}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          {link.isActive && !isExpired && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeactivateLink(link.id)}
                            >
                              Deactivate
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteLink(link.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Link}
                title="No invite links"
                description={settings.allowLinkInvites ? "Create a link to let people join the group easily" : "Link invites are disabled in settings"}
                actionLabel={settings.allowLinkInvites ? "Create First Link" : "Enable Link Invites"}
                onAction={settings.allowLinkInvites ? handleCreateInviteLink : () => setActiveTab('settings')}
              />
            )}
          </>
        )}

        {activeTab === 'settings' && (
          <>
            {/* Invitation Settings */}
            <div className="space-y-6">
              <Card className="p-4">
                <h3 className="font-medium mb-4">General Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-expire invitations</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically expire invitations after {settings.expireDays} days
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoExpire}
                      onCheckedChange={(checked) => updateSettings('autoExpire', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Require admin approval</p>
                      <p className="text-sm text-muted-foreground">
                        New members need admin approval to join
                      </p>
                    </div>
                    <Switch
                      checked={settings.requireApproval}
                      onCheckedChange={(checked) => updateSettings('requireApproval', checked)}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-medium mb-4">Link Invitations</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Allow invite links</p>
                      <p className="text-sm text-muted-foreground">
                        Members can create shareable invite links
                      </p>
                    </div>
                    <Switch
                      checked={settings.allowLinkInvites}
                      onCheckedChange={(checked) => updateSettings('allowLinkInvites', checked)}
                    />
                  </div>

                  {settings.allowLinkInvites && (
                    <>
                      <Separator />
                      <div>
                        <p className="font-medium mb-2">Default link settings</p>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span>Maximum uses per link</span>
                            <Badge variant="outline">{settings.linkMaxUses}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Link expiry</span>
                            <Badge variant="outline">{settings.linkExpireDays} days</Badge>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-medium mb-4">Invitation Limits</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Maximum resend attempts</span>
                    <Badge variant="outline">{settings.maxAttempts}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Invitation expiry</span>
                    <Badge variant="outline">{settings.expireDays} days</Badge>
                  </div>
                </div>
              </Card>

              {/* Reset Settings */}
              <Card className="p-4 border-destructive/20">
                <h3 className="font-medium mb-2 text-destructive">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  These actions cannot be undone
                </p>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full text-destructive border-destructive/20"
                    onClick={() => {
                      setPendingInvites([]);
                      toast.success('All pending invitations cancelled');
                    }}
                  >
                    Cancel All Pending Invitations
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-destructive border-destructive/20"
                    onClick={() => {
                      setInviteLinks([]);
                      toast.success('All invite links deleted');
                    }}
                  >
                    Delete All Invite Links
                  </Button>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}