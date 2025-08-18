import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, UserPlus, Send, Mail, MessageCircle, Phone, Users, Plus, ChevronDown, ChevronUp, CheckCircle, RefreshCw, Zap, X, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { toast } from 'sonner';

// Simple contacts API for demo purposes
const contactsAPI = {
  isSupported: () => typeof navigator !== 'undefined' && 'contacts' in navigator,
  requestPermission: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ granted: true, userDenied: false });
      }, 1000);
    });
  },
  checkPermissionStatus: async () => {
    return { granted: false };
  },
  getContacts: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([]);
      }, 500);
    });
  },
  matchContacts: async (contacts: any[]) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([]);
      }, 500);
    });
  }
};

interface Contact {
  id: string;
  name: string;
  username?: string;
  phoneNumber?: string;
  email?: string;
  avatar?: string;
  mutualFriends?: number;
  isInGroup?: boolean;
  status?: 'available' | 'pending' | 'friends' | 'existing_user' | 'not_on_app';
  isOnApp?: boolean;
  userId?: string;
  isFriend?: boolean;
}

interface AddGroupMemberScreenProps {
  groupId: string | null;
  onNavigate: (screen: string, data?: any) => void;
}

// Mock contacts data for demonstration
const mockGroupContacts: Contact[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    username: '@alice_j',
    phoneNumber: '+1 (555) 123-4567',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150',
    mutualFriends: 5,
    isInGroup: false,
    status: 'existing_user',
    isOnApp: true,
    userId: 'user_1',
    isFriend: true
  },
  {
    id: '2',
    name: 'Bob Wilson',
    username: '@bob_wilson',
    phoneNumber: '+1 (555) 234-5678',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    mutualFriends: 3,
    isInGroup: false,
    status: 'existing_user',
    isOnApp: true,
    userId: 'user_2',
    isFriend: true
  },
  {
    id: '3',
    name: 'Carol Davis',
    phoneNumber: '+1 (555) 345-6789',
    mutualFriends: 0,
    isInGroup: false,
    status: 'not_on_app',
    isOnApp: false,
    isFriend: false
  },
  {
    id: '4',
    name: 'David Brown',
    phoneNumber: '+1 (555) 456-7890',
    mutualFriends: 0,
    isInGroup: false,
    status: 'not_on_app',
    isOnApp: false,
    isFriend: false
  },
  {
    id: '5',
    name: 'Emma Garcia',
    username: '@emma_g',
    phoneNumber: '+1 (555) 567-8901',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    mutualFriends: 4,
    isInGroup: false,
    status: 'pending',
    isOnApp: true,
    userId: 'user_5',
    isFriend: true
  },
  {
    id: '6',
    name: 'Frank Miller',
    phoneNumber: '+1 (555) 678-9012',
    mutualFriends: 0,
    isInGroup: false,
    status: 'not_on_app',
    isOnApp: false,
    isFriend: false
  },
  // Additional contacts on Biltip
  {
    id: '7',
    name: 'Grace Liu',
    username: '@grace_l',
    phoneNumber: '+1 (555) 111-2222',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    mutualFriends: 1,
    isInGroup: false,
    status: 'existing_user',
    isOnApp: true,
    userId: 'user_7',
    isFriend: false
  },
  {
    id: '8',
    name: 'Henry Chen',
    username: '@henry_c',
    phoneNumber: '+1 (555) 333-4444',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    mutualFriends: 2,
    isInGroup: false,
    status: 'existing_user',
    isOnApp: true,
    userId: 'user_8',
    isFriend: false
  }
];

export function AddGroupMemberScreen({ groupId, onNavigate }: AddGroupMemberScreenProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteMethod, setInviteMethod] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [inviteData, setInviteData] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });
  const [activeMode, setActiveMode] = useState<'contacts' | 'invite'>('contacts');
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  // Contact sync state
  const [syncedContacts, setSyncedContacts] = useState<Contact[]>([]);
  const [hasSyncedContacts, setHasSyncedContacts] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [showSyncPrompt, setShowSyncPrompt] = useState(true);
  const [contactSubTab, setContactSubTab] = useState<'on_app' | 'invite'>('on_app');
  
  // Progressive disclosure states
  const [showInvitePreview, setShowInvitePreview] = useState(false);

  // Check for existing synced contacts on mount
  useEffect(() => {
    const checkExistingSync = () => {
      const hasExistingSync = localStorage.getItem('biltip_contacts_synced') === 'true';
      if (hasExistingSync) {
        setHasSyncedContacts(true);
        setSyncedContacts(mockGroupContacts);
        setShowSyncPrompt(false);
      }
    };
    
    checkExistingSync();
  }, []);

  // Separate friends and non-friends on Biltip
  const friendsOnBiltip = syncedContacts.filter(c => 
    c.status === 'existing_user' && c.isFriend && !c.isInGroup
  );
  const friendsPending = syncedContacts.filter(c => 
    c.status === 'pending' && c.isFriend && !c.isInGroup
  );
  const allFriends = [...friendsOnBiltip, ...friendsPending];
  
  const nonFriendsOnBiltip = syncedContacts.filter(c => 
    c.status === 'existing_user' && !c.isFriend && !c.isInGroup
  );
  
  const inviteableContacts = syncedContacts.filter(c => c.status === 'not_on_app');
  
  // Smart filtering with cross-tab search capability
  const getFilteredContactsForTab = (tabType: 'on_app' | 'invite') => {
    const baseContacts = tabType === 'on_app' ? [...allFriends, ...nonFriendsOnBiltip] : inviteableContacts;
    
    if (!searchQuery.trim()) {
      return baseContacts;
    }

    const query = searchQuery.toLowerCase();
    return baseContacts.filter(contact => 
      contact.name.toLowerCase().includes(query) ||
      (contact.phoneNumber && contact.phoneNumber.toLowerCase().includes(query)) ||
      (contact.username && contact.username.toLowerCase().includes(query))
    );
  };

  // WhatsApp-style real-time contact filtering
  const filteredContacts = useMemo(() => {
    return getFilteredContactsForTab(contactSubTab);
  }, [searchQuery, contactSubTab, allFriends, nonFriendsOnBiltip, inviteableContacts]);

  // Smart tab switching logic - check other tab for matches when current tab has no results
  useEffect(() => {
    if (!searchQuery.trim() || !hasSyncedContacts || activeMode !== 'contacts') return;

    const currentTabResults = getFilteredContactsForTab(contactSubTab);
    
    // If current tab has no results, check the other tab
    if (currentTabResults.length === 0) {
      const otherTab = contactSubTab === 'on_app' ? 'invite' : 'on_app';
      const otherTabResults = getFilteredContactsForTab(otherTab);
      
      // If other tab has results, auto-switch with feedback
      if (otherTabResults.length > 0) {
        const tabName = otherTab === 'on_app' ? 'On Biltip' : 'Invite';
        
        // Add a small delay for better UX
        const switchTimer = setTimeout(() => {
          setContactSubTab(otherTab);
          toast.info(`Found ${otherTabResults.length} result${otherTabResults.length !== 1 ? 's' : ''} in ${tabName} tab`);
          
          // Add highlight animation to the switched tab
          setTimeout(() => {
            const targetTab = document.querySelector(`[data-value="${otherTab}"]`);
            if (targetTab) {
              targetTab.classList.add('tab-switch-highlight');
              setTimeout(() => {
                targetTab.classList.remove('tab-switch-highlight');
              }, 1000);
            }
          }, 100);
        }, 500);

        return () => clearTimeout(switchTimer);
      }
    }
  }, [searchQuery, contactSubTab, allFriends, nonFriendsOnBiltip, inviteableContacts, hasSyncedContacts, activeMode]);
  
  const getDisplayContacts = () => {
    if (!hasSyncedContacts || activeMode !== 'contacts') return [];
    return filteredContacts;
  };

  const displayContacts = getDisplayContacts();

  // Get selected contacts for display
  const getSelectedContacts = () => {
    return syncedContacts.filter(contact => selectedMembers.includes(contact.id));
  };

  const handleMemberToggle = (contactId: string) => {
    setSelectedMembers(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleRemoveSelected = (contactId: string) => {
    setSelectedMembers(prev => prev.filter(id => id !== contactId));
  };

  const handleSyncContacts = async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    
    try {
      setSyncProgress(20);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSyncProgress(50);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSyncProgress(80);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSyncProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setSyncedContacts(mockGroupContacts);
      setHasSyncedContacts(true);
      setShowSyncPrompt(false);
      localStorage.setItem('biltip_contacts_synced', 'true');
      
      toast.success(`Found ${allFriends.length + nonFriendsOnBiltip.length} people on Biltip and ${inviteableContacts.length} contacts to invite!`);
      
    } catch (error) {
      console.error('Contact sync failed:', error);
      toast.error('Contact sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetrySync = () => {
    setSyncedContacts([]);
    setHasSyncedContacts(false);
    setShowSyncPrompt(true);
    setSelectedMembers([]);
    localStorage.removeItem('biltip_contacts_synced');
  };

  const handleAddSelectedMembers = () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member to add');
      return;
    }

    const selectedFriends = syncedContacts.filter(contact => selectedMembers.includes(contact.id));
    const names = selectedFriends.map(f => f.name).join(', ');
    
    toast.success(`Added ${selectedMembers.length} member${selectedMembers.length > 1 ? 's' : ''} to the group: ${names}`);
    onNavigate('group-members', { groupId });
    setSelectedMembers([]);
  };

  const handleInviteMembers = () => {
    const selectedContactsList = inviteableContacts.filter(contact => 
      selectedMembers.includes(contact.id)
    );
    
    if (selectedContactsList.length === 0) return;
    
    const groupName = 'Work Squad'; // Mock group name - in real app would come from props/context
    
    selectedContactsList.forEach(contact => {
      const message = `Hi ${contact.name}! You've been invited to join "${groupName}" on Biltip - a bill splitting app. Join us to split expenses easily! Download it here: https://biltip.com/download`;
      const whatsappUrl = `whatsapp://send?phone=${encodeURIComponent(contact.phoneNumber?.replace(/\D/g, '') || '')}&text=${encodeURIComponent(message)}`;
      
      try {
        window.open(whatsappUrl, '_blank');
      } catch (error) {
        console.warn('Failed to open WhatsApp for:', contact.name);
      }
    });
    
    toast.success(`Sent ${selectedContactsList.length} group invitation${selectedContactsList.length !== 1 ? 's' : ''} via WhatsApp!`);
    setSelectedMembers([]);
  };

  const handleSingleInvite = (contact: Contact) => {
    const groupName = 'Work Squad'; // Mock group name
    const message = `Hi ${contact.name}! You've been invited to join "${groupName}" on Biltip - a bill splitting app. Join us to split expenses easily! Download it here: https://biltip.com/download`;
    const whatsappUrl = `whatsapp://send?phone=${encodeURIComponent(contact.phoneNumber?.replace(/\D/g, '') || '')}&text=${encodeURIComponent(message)}`;
    
    try {
      window.open(whatsappUrl, '_blank');
      toast.success(`Group invitation sent to ${contact.name}!`);
    } catch (error) {
      toast.error('Failed to open WhatsApp. Please try again.');
    }
  };

  const handleSendInvite = () => {
    if (!inviteData.name.trim()) {
      toast.error('Please enter the person\'s name');
      return;
    }

    if (inviteMethod === 'email' && !inviteData.email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if ((inviteMethod === 'whatsapp' || inviteMethod === 'sms') && !inviteData.phone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    const methodName = inviteMethod === 'whatsapp' ? 'WhatsApp' : inviteMethod === 'sms' ? 'SMS' : 'Email';
    
    if (inviteMethod === 'whatsapp') {
      const message = getInviteMessage();
      const whatsappUrl = `whatsapp://send?phone=${encodeURIComponent(inviteData.phone.replace(/\D/g, ''))}&text=${encodeURIComponent(message)}`;
      
      try {
        window.open(whatsappUrl, '_blank');
        toast.success(`Opening WhatsApp to invite ${inviteData.name} to the group`);
      } catch (error) {
        toast.success(`Group invitation sent to ${inviteData.name} via ${methodName}`);
      }
    } else {
      toast.success(`Group invitation sent to ${inviteData.name} via ${methodName}`);
    }
    
    setInviteData({
      name: '',
      phone: '',
      email: '',
      message: ''
    });
  };

  const getInviteMessage = () => {
    const groupName = 'Work Squad'; // Mock group name
    const defaultMessage = `Hi ${inviteData.name}! You've been invited to join "${groupName}" on Biltip - a bill splitting app. Join us to split expenses easily! Download it here: https://biltip.com/download`;
    return inviteData.message || defaultMessage;
  };

  const getStatusBadge = (status: string, isFriend?: boolean) => {
    switch (status) {
      case 'available':
        return null;
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Pending</Badge>;
      case 'friends':
        return <Badge variant="default" className="text-xs bg-success text-success-foreground">Friends</Badge>;
      case 'existing_user':
        if (isFriend) {
          return <Badge variant="default" className="text-xs bg-success text-success-foreground">Friend</Badge>;
        }
        return <Badge variant="default" className="text-xs bg-success text-success-foreground">On Biltip</Badge>;
      case 'not_on_app':
        return <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">Not on Biltip</Badge>;
      default:
        return null;
    }
  };

  const handleModeChange = (mode: 'contacts' | 'invite') => {
    setActiveMode(mode);
    setIsSearchMode(false);
    setSearchQuery('');
  };

  const handleSearchToggle = () => {
    setIsSearchMode(!isSearchMode);
    if (!isSearchMode) {
      // Focus search input after it's shown
      setTimeout(() => {
        const searchInput = document.querySelector('#whatsapp-search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    } else {
      // Clear search when hiding
      setSearchQuery('');
    }
  };

  const handleExitSearch = () => {
    setIsSearchMode(false);
    setSearchQuery('');
  };

  // Render contact sections with proper organization
  const renderContactSection = (contacts: Contact[], sectionTitle: string, showSeparator: boolean = false) => {
    if (contacts.length === 0) return null;

    return (
      <div className="space-y-3">
        {showSeparator && <Separator />}
        
        {/* Section Header */}
        <div className="px-1">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {sectionTitle}
          </h4>
        </div>
        
        {/* Contacts List */}
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Card 
              key={contact.id} 
              className={`transition-all cursor-pointer min-h-[72px] ${
                selectedMembers.includes(contact.id)
                  ? 'bg-primary/5 border-primary/30' 
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => handleMemberToggle(contact.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedMembers.includes(contact.id)}
                    onChange={() => handleMemberToggle(contact.id)}
                    className="min-h-[20px] min-w-[20px]"
                  />
                  
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback>
                      {contact.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-base">{contact.name}</p>
                      {getStatusBadge(contact.status!, contact.isFriend)}
                      {contact.mutualFriends && contact.mutualFriends > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {contact.mutualFriends} mutual
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{contact.phoneNumber}</p>
                      {contact.username && (
                        <p className="text-xs text-muted-foreground">{contact.username}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center justify-between px-4 py-3">
          {/* WhatsApp-style search mode or normal header */}
          {isSearchMode ? (
            <>
              {/* Search Mode Header */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExitSearch}
                  className="min-h-[44px] min-w-[44px] -ml-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                  <Input
                    id="whatsapp-search-input"
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full min-h-[44px] border-none bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                    autoComplete="off"
                  />
                </div>
              </div>
              
              {/* Action Button when members selected in search mode */}
              {selectedMembers.length > 0 && (
                <Button
                  onClick={contactSubTab === 'on_app' ? handleAddSelectedMembers : handleInviteMembers}
                  size="sm"
                  className={`min-h-[44px] ml-2 ${contactSubTab === 'invite' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                >
                  {contactSubTab === 'on_app' ? (
                    <>Add ({selectedMembers.length})</>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4 mr-1" />
                      WhatsApp ({selectedMembers.length})
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            <>
              {/* Normal Header */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('group-members', { groupId })}
                  className="min-h-[44px] min-w-[44px] -ml-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-semibold">Add Members</h1>
                  <p className="text-sm text-muted-foreground">
                    Invite friends to join the group
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Search Icon */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSearchToggle}
                  className="min-h-[44px] min-w-[44px]"
                >
                  <Search className="h-5 w-5" />
                </Button>
                
                {/* 3-dot Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-[44px] min-w-[44px]"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleModeChange('contacts')}>
                      <Users className="h-4 w-4 mr-2" />
                      View Contacts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleModeChange('invite')}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Send Invite
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Action Button when members selected */}
                {selectedMembers.length > 0 && (
                  <Button
                    onClick={contactSubTab === 'on_app' ? handleAddSelectedMembers : handleInviteMembers}
                    size="sm"
                    className={`min-h-[44px] ${contactSubTab === 'invite' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                  >
                    {contactSubTab === 'on_app' ? (
                      <>Add ({selectedMembers.length})</>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4 mr-1" />
                        WhatsApp ({selectedMembers.length})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* WhatsApp-Style Selected Members Bar - Sticky Full Width */}
      {selectedMembers.length > 0 && (
        <div className="sticky top-[73px] w-full z-10 border-b border-border bg-background">
          <div className="px-4 py-3">
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-1">
                {getSelectedContacts().map((contact) => (
                  <div key={contact.id} className="flex flex-col items-center gap-1 min-w-[60px] group">
                    <div className="relative">
                      <Avatar className={`h-12 w-12 border-2 ${contactSubTab === 'invite' ? 'border-green-300' : 'border-primary/30'}`}>
                        <AvatarImage src={contact.avatar} />
                        <AvatarFallback className="text-xs">
                          {contact.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Remove button */}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSelected(contact.id);
                        }}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Name */}
                    <p className="text-xs text-center max-w-[60px] truncate">
                      {contact.name.split(' ')[0]}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      <div className={`px-4 ${selectedMembers.length > 0 ? 'pt-6' : 'py-6'} space-y-6 pb-8`}>
        {/* Search Results Info */}
        {(isSearchMode || searchQuery) && activeMode === 'contacts' && (
          <div className="text-sm text-muted-foreground px-1 search-info-fade-in">
            {filteredContacts.length > 0 ? (
              `Found ${filteredContacts.length} contact${filteredContacts.length !== 1 ? 's' : ''} matching "${searchQuery}"`
            ) : searchQuery ? (
              (() => {
                // Check if other tab has results when current tab is empty
                const otherTab = contactSubTab === 'on_app' ? 'invite' : 'on_app';
                const otherTabResults = getFilteredContactsForTab(otherTab);
                
                if (otherTabResults.length > 0) {
                  const tabName = otherTab === 'on_app' ? 'On Biltip' : 'Invite';
                  return `No results in current tab. Switching to ${tabName} tab...`;
                }
                
                return `No contacts found matching "${searchQuery}"`;
              })()
            ) : (
              'Search through your contacts...'
            )}
          </div>
        )}

        {/* Contacts Mode */}
        {activeMode === 'contacts' && (
          <div className="space-y-4">
            {isSyncing ? (
              /* Syncing Progress */
              <Card>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <Users className="h-8 w-8 text-white animate-pulse" />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Syncing Contacts</h3>
                      <p className="text-sm text-muted-foreground">Finding your friends for the group...</p>
                    </div>

                    <div className="space-y-2">
                      <Progress value={syncProgress} className="w-full h-2" />
                      <p className="text-xs text-muted-foreground">{syncProgress}% complete</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : !hasSyncedContacts && showSyncPrompt ? (
              /* Sync Prompt */
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <MessageCircle className="h-8 w-8 text-white" />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Find Members from Contacts</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Sync your contacts to find friends already on Biltip and invite others to join the group
                      </p>
                    </div>

                    <div className="space-y-3 text-left">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm">Add existing Biltip users instantly</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <MessageCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm">Send group invites via WhatsApp</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Zap className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm">Private & secure - contacts processed locally</span>
                      </div>
                    </div>

                    <Button 
                      onClick={handleSyncContacts}
                      className="w-full min-h-[52px] text-base bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Users className="h-5 w-5 mr-3" />
                      Sync Contacts
                    </Button>
                    
                    <Button 
                      variant="ghost"
                      onClick={() => setShowSyncPrompt(false)}
                      className="w-full"
                    >
                      Skip for Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : hasSyncedContacts ? (
              /* Synced Contacts */
              <div className="space-y-4">


                {/* Contact Sub-tabs */}
                <Tabs value={contactSubTab} onValueChange={(value) => setContactSubTab(value as 'on_app' | 'invite')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 min-h-[48px]">
                    <TabsTrigger value="on_app" className="min-h-[44px]">
                      <Users className="h-4 w-4 mr-2" />
                      On Biltip
                      {(allFriends.length + nonFriendsOnBiltip.length) > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {allFriends.length + nonFriendsOnBiltip.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="invite" className="min-h-[44px]">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Invite
                      {inviteableContacts.length > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {inviteableContacts.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="on_app" className="space-y-4 mt-4">
                    {/* WhatsApp-Style Organized Members List */}
                    <div className="space-y-6">
                      {/* Friends Section */}
                      {renderContactSection(allFriends, "Friends")}
                      
                      {/* On Biltip Section (Non-friends) */}
                      {renderContactSection(nonFriendsOnBiltip, "On Biltip", allFriends.length > 0)}
                      
                      {/* No contacts found state */}
                      {allFriends.length === 0 && nonFriendsOnBiltip.length === 0 && (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-medium mb-2">No friends found on Biltip</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              None of your contacts are using Biltip yet
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={() => setContactSubTab('invite')}
                              className="min-h-[44px]"
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Invite People
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="invite" className="space-y-4 mt-4">
                    {/* Inviteable Contacts List */}
                    <div className="space-y-3">
                      {displayContacts.length > 0 ? (
                        displayContacts.map((contact) => (
                          <Card 
                            key={contact.id}
                            className={`transition-all cursor-pointer min-h-[72px] ${
                              selectedMembers.includes(contact.id)
                                ? 'bg-green-50 border-green-200 dark:bg-green-950/20' 
                                : 'hover:bg-accent/50'
                            }`}
                            onClick={() => handleMemberToggle(contact.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  checked={selectedMembers.includes(contact.id)}
                                  onChange={() => handleMemberToggle(contact.id)}
                                  className="min-h-[20px] min-w-[20px]"
                                />
                                
                                <Avatar className="h-12 w-12">
                                  <AvatarFallback>
                                    {contact.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-base">{contact.name}</p>
                                    {getStatusBadge(contact.status!, contact.isFriend)}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{contact.phoneNumber}</p>
                                  {contact.email && (
                                    <p className="text-xs text-muted-foreground">{contact.email}</p>
                                  )}
                                </div>
                                
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSingleInvite(contact);
                                  }}
                                  className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-950/20 min-h-[36px]"
                                >
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                  WhatsApp
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : searchQuery ? (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-medium mb-2">No results found</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              No contacts match your search for "{searchQuery}"
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={() => setSearchQuery('')}
                              className="min-h-[44px]"
                            >
                              Clear Search
                            </Button>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-medium mb-2">No contacts to invite</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              All your contacts are already using Biltip!
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={() => setContactSubTab('on_app')}
                              className="min-h-[44px]"
                            >
                              <Users className="h-4 w-4 mr-2" />
                              View Members
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              /* No sync prompt shown - manual mode */
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No contacts synced</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sync your contacts to find members or send invites manually
                  </p>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => setShowSyncPrompt(true)}
                      className="w-full min-h-[44px]"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Sync Contacts
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleModeChange('invite')}
                      className="w-full min-h-[44px]"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Send Invite
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Invite Mode */}
        {activeMode === 'invite' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Send Group Invitation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* WhatsApp recommended notice */}
                {inviteMethod === 'whatsapp' && (
                  <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      <p className="text-sm">
                        <strong>Recommended:</strong> WhatsApp group invites are more likely to be seen and acted upon.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Invitation Method Selection */}
                <div className="space-y-3">
                  <Label>Invitation Method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={inviteMethod === 'whatsapp' ? 'default' : 'outline'}
                      onClick={() => setInviteMethod('whatsapp')}
                      className="min-h-[48px] flex-col gap-1"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs">WhatsApp</span>
                    </Button>
                    <Button
                      variant={inviteMethod === 'sms' ? 'default' : 'outline'}
                      onClick={() => setInviteMethod('sms')}
                      className="min-h-[48px] flex-col gap-1"
                    >
                      <Phone className="h-4 w-4" />
                      <span className="text-xs">SMS</span>
                    </Button>
                    <Button
                      variant={inviteMethod === 'email' ? 'default' : 'outline'}
                      onClick={() => setInviteMethod('email')}
                      className="min-h-[48px] flex-col gap-1"
                    >
                      <Mail className="h-4 w-4" />
                      <span className="text-xs">Email</span>
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Contact Information */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="Enter their name"
                      value={inviteData.name}
                      onChange={(e) => setInviteData(prev => ({ ...prev, name: e.target.value }))}
                      className="min-h-[48px]"
                    />
                  </div>

                  {(inviteMethod === 'whatsapp' || inviteMethod === 'sms') && (
                    <div className="space-y-2">
                      <Label>Phone Number *</Label>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={inviteData.phone}
                        onChange={(e) => setInviteData(prev => ({ ...prev, phone: e.target.value }))}
                        className="min-h-[48px]"
                      />
                    </div>
                  )}

                  {inviteMethod === 'email' && (
                    <div className="space-y-2">
                      <Label>Email Address *</Label>
                      <Input
                        type="email"
                        placeholder="friend@example.com"
                        value={inviteData.email}
                        onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                        className="min-h-[48px]"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Custom Message (Optional)</Label>
                    <Textarea
                      placeholder="Add a personal message for the group invitation..."
                      value={inviteData.message}
                      onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
                      rows={3}
                      className="min-h-[48px]"
                    />
                  </div>
                </div>

                {/* Invitation Preview */}
                <Collapsible open={showInvitePreview} onOpenChange={setShowInvitePreview}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full min-h-[44px] justify-between">
                      <span>Preview Group Invitation</span>
                      {showInvitePreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <p className="text-sm font-medium mb-2">Message Preview:</p>
                        <p className="text-sm leading-relaxed">{getInviteMessage()}</p>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>

                <Button 
                  onClick={handleSendInvite}
                  className={`w-full min-h-[52px] text-base ${
                    inviteMethod === 'whatsapp' ? 'bg-green-600 hover:bg-green-700 text-white' : ''
                  }`}
                  disabled={!inviteData.name.trim() || 
                    (inviteMethod === 'email' && !inviteData.email.trim()) ||
                    ((inviteMethod === 'whatsapp' || inviteMethod === 'sms') && !inviteData.phone.trim())
                  }
                >
                  <Send className="h-5 w-5 mr-2" />
                  {inviteMethod === 'whatsapp' ? 'Send Group WhatsApp Invitation' : 
                   inviteMethod === 'sms' ? 'Send Group SMS Invitation' : 'Send Group Email Invitation'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}