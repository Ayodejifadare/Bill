import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, UserPlus, Send, Mail, MessageCircle, Phone, Users, ChevronDown, ChevronUp, CheckCircle, RefreshCw, Clock, Zap, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { showContactError } from '../utils/contacts-api';
import { lookupUserByIdentifier, LookupUserResult, LookupIdentifierType, LookupRelationshipStatus } from '../utils/users-api';
import type { MatchedContact } from './contact-sync/types';
import { handleSendFriendRequest } from './contact-sync/helpers';
import { getInitials } from '../utils/name';

interface Contact {
  id: string;
  name: string;
  username?: string;
  phoneNumber?: string;
  email?: string;
  avatar?: string;
  mutualFriends?: number;
  isAlreadyFriend?: boolean;
  status?: 'available' | 'pending' | 'friends' | 'existing_user' | 'not_on_app';
  isOnApp?: boolean;
  userId?: string;
  isFriend?: boolean;
  matchedBy?: string | null;
  relationshipStatus?: LookupRelationshipStatus;
  isLookupResult?: boolean;
}

interface AddFriendScreenProps {
  onNavigate: (screen: string, data?: unknown) => void;
}


const determineLookupType = (value: string): LookupIdentifierType | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes('@')) return 'email';
  const numericCandidate = trimmed.replace(/[^0-9+]/g, '');
  if (numericCandidate.length >= 7 && /^[-+()0-9\s.]+$/.test(trimmed)) {
    return 'phone';
  }
  if (/^[a-zA-Z0-9._-]{3,}$/.test(trimmed)) {
    return 'username';
  }
  return undefined;
};

const mapRelationshipStatusToContactStatus = (status: LookupRelationshipStatus): Contact['status'] => {
  switch (status) {
    case 'friends':
      return 'friends';
    case 'pending_outgoing':
    case 'pending_incoming':
      return 'pending';
    default:
      return 'existing_user';
  }
};

const getRelationshipMessage = (status: LookupRelationshipStatus): string => {
  switch (status) {
    case 'friends':
      return 'You are already connected on Biltip.';
    case 'pending_outgoing':
      return 'Friend request sent. Waiting for them to respond.';
    case 'pending_incoming':
      return 'This user sent you a friend request. Review it from the requests tab.';
    case 'self':
      return 'This is your account.';
    case 'none':
    default:
      return 'Send a friend request to connect on Biltip.';
  }
};

export function AddFriendScreen({ onNavigate }: AddFriendScreenProps) {
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteMethod, setInviteMethod] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [inviteData, setInviteData] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });
  const [contactsSectionOpen, setContactsSectionOpen] = useState(false);
  
  // Contact sync state
  const [syncedContacts, setSyncedContacts] = useState<Contact[]>([]);
  const [hasSyncedContacts, setHasSyncedContacts] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [showSyncPrompt, setShowSyncPrompt] = useState(true);
  const VISIBLE_BATCH = 50;
  const [visibleOnAppCount, setVisibleOnAppCount] = useState(VISIBLE_BATCH);
  const [visibleInviteCount, setVisibleInviteCount] = useState(VISIBLE_BATCH);
  const [lookupState, setLookupState] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    result: LookupUserResult | null;
    error?: string;
  }>({ status: 'idle', result: null });

  const [lookupActionLoading, setLookupActionLoading] = useState(false);

  useEffect(() => {
    const query = searchQuery.trim();

    if (!query || query.length < 2) {
      setLookupState({ status: 'idle', result: null });
      return;
    }

    let cancelled = false;
    const lookupType = determineLookupType(query);

    setLookupState({ status: 'loading', result: null });

    const timer = setTimeout(async () => {
      try {
        const response = await lookupUserByIdentifier(query, lookupType);
        if (cancelled) return;
        setLookupState({ status: 'success', result: response });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Unable to search Biltip directory.';
        setLookupState({ status: 'error', result: null, error: message });
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  
  // Progressive disclosure states
  const [showInvitePreview, setShowInvitePreview] = useState(false);
  const syncDeviceContacts = async () => {
    setSyncedContacts([]);
    setHasSyncedContacts(false);
    setShowSyncPrompt(true);
    setSelectedContacts(new Set());
    setSyncProgress(0);
    toast.info('Contact syncing is not available on the web.');
  };

  const existingUsers = syncedContacts.filter(c => c.status === 'existing_user');
  const inviteableContacts = syncedContacts.filter(c => c.status === 'not_on_app');

  const filteredExistingContacts = useMemo(() => {
    if (!searchQuery.trim()) {
      return existingUsers;
    }

    const query = searchQuery.toLowerCase();
    return existingUsers.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      (contact.phoneNumber && contact.phoneNumber.toLowerCase().includes(query)) ||
      (contact.username && contact.username.toLowerCase().includes(query))
    );
  }, [existingUsers, searchQuery]);

  const filteredInviteableContacts = useMemo(() => {
    if (!searchQuery.trim()) {
      return inviteableContacts;
    }

    const query = searchQuery.toLowerCase();
    return inviteableContacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      (contact.phoneNumber && contact.phoneNumber.toLowerCase().includes(query)) ||
      (contact.username && contact.username.toLowerCase().includes(query))
    );
  }, [inviteableContacts, searchQuery]);

  useEffect(() => {
    setVisibleOnAppCount(VISIBLE_BATCH);
  }, [searchQuery, existingUsers.length]);

  useEffect(() => {
    setVisibleInviteCount(VISIBLE_BATCH);
  }, [searchQuery, inviteableContacts.length]);

  const visibleExistingContacts = filteredExistingContacts.slice(0, visibleOnAppCount);
  const visibleInviteContacts = filteredInviteableContacts.slice(0, visibleInviteCount);

  const renderLookupActionButton = () => {
    if (!lookupContact) return null;

    switch (lookupContact.relationshipStatus) {
      case 'friends':
        return (
          <Button variant="outline" disabled className="min-h-[36px]">
            Friends
          </Button>
        );
      case 'pending_outgoing':
        return (
          <Button variant="outline" disabled className="min-h-[36px]">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            Request sent
          </Button>
        );
      case 'pending_incoming':
        return (
          <Button variant="outline" disabled className="min-h-[36px]">
            <Mail className="h-4 w-4 mr-2" />
            Awaiting your response
          </Button>
        );
      case 'self':
        return (
          <Button variant="outline" disabled className="min-h-[36px]">
            That's you
          </Button>
        );
      default:
        return (
          <Button className="min-h-[36px]" onClick={handleLookupFriendRequest} disabled={lookupActionLoading}>
            {lookupActionLoading ? (<Clock className="mr-2 h-4 w-4 animate-pulse" />) : (<UserPlus className="mr-2 h-4 w-4" />)}
            Add friend
          </Button>
        );
    }
  };

  const renderLookupCard = () => {
    if (!lookupContact) return null;

    const relationshipMessage = getRelationshipMessage(lookupContact.relationshipStatus ?? 'none');

    return (
      <Card className="border border-dashed border-primary/40 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={lookupContact.avatar} />
            <AvatarFallback>{getInitials(lookupContact.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-base truncate">{lookupContact.name}</p>
              {getStatusBadge(lookupContact.status ?? 'existing_user')}
              {lookupContact.matchedBy && (
                <Badge variant="outline" className="text-xs">
                  Matched by {lookupContact.matchedBy}
                </Badge>
              )}
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {lookupContact.email && <p>{lookupContact.email}</p>}
              {lookupContact.phoneNumber && <p>{lookupContact.phoneNumber}</p>}
            </div>
            <p className="text-xs text-muted-foreground">{relationshipMessage}</p>
          </div>
          <div className="flex-shrink-0">
            {renderLookupActionButton()}
          </div>
        </CardContent>
      </Card>
    );
  };

  const lookupContact = useMemo(() => {
    if (lookupState.status !== 'success' || !lookupState.result) {
      return null;
    }
    const result = lookupState.result;
    if (!result || result.relationshipStatus === 'self') {
      return null;
    }
    if (existingUsers.some(contact => contact.userId === result.id)) {
      return null;
    }
    const contactStatus = mapRelationshipStatusToContactStatus(result.relationshipStatus);
    const matchedBy = result.matchedBy ?? determineLookupType(searchQuery.trim()) ?? null;
    return {
      id: `lookup-${result.id}`,
      name: result.name,
      username: result.email ?? undefined,
      email: result.email ?? undefined,
      phoneNumber: result.phone ?? undefined,
      avatar: result.avatar ?? undefined,
      status: contactStatus,
      isOnApp: true,
      userId: result.id,
      relationshipStatus: result.relationshipStatus,
      matchedBy,
      isLookupResult: true,
    } as Contact;
  }, [lookupState, existingUsers, searchQuery]);

  const shouldShowLookupCard = Boolean(
    searchQuery.trim() &&
    lookupState.status === 'success' &&
    lookupContact
  );

  const isLookupLoading = lookupState.status === 'loading' && searchQuery.trim().length >= 2;
  const lookupErrorMessage = lookupState.status === 'error' ? lookupState.error : undefined;

  const hasLookupQuery = searchQuery.trim().length > 0;
  const isQueryLongEnough = searchQuery.trim().length >= 2;

  const handleContactToggle = (contactId: string) => {

    setSelectedContacts(prev => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };


  const handleLookupFriendRequest = async () => {
    if (!lookupContact || !lookupContact.userId) return;

    setLookupActionLoading(true);
    try {
      const requestPayload: MatchedContact = {
        id: lookupContact.userId,
        userId: lookupContact.userId,
        name: lookupContact.name,
        phone: lookupContact.phoneNumber || '',
        email: lookupContact.email,
        username: lookupContact.username,
        status: 'existing_user',
        avatar: lookupContact.avatar,
      };
      const result = await handleSendFriendRequest(requestPayload);
      if (result.success) {
        setLookupState(prev =>
          prev.result
            ? {
                status: 'success',
                result: {
                  ...prev.result,
                  relationshipStatus: 'pending_outgoing',
                },
              }
            : prev
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send friend request';
      toast.error(message);
    } finally {
      setLookupActionLoading(false);
    }
  };

  const handleRemoveSelected = (contactId: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev);
      next.delete(contactId);
      return next;
    });
  };

  const handleSyncContacts = async () => {
    setIsSyncing(true);
    setSyncProgress(0);

    try {
      await syncDeviceContacts();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetrySync = () => {
    setSyncedContacts([]);
    setHasSyncedContacts(false);
    setShowSyncPrompt(true);
    setSelectedContacts(new Set());
    localStorage.removeItem('biltip_contacts_synced');
  };

  const handleAddSelectedContacts = async () => {
    if (selectedContacts.size === 0) {
      showContactError('Please select at least one contact to add');
      return;
    }

    const selectedFriends = syncedContacts.filter(contact =>
      selectedContacts.has(contact.id) &&
      contact.status === 'existing_user' &&
      Boolean(contact.userId)
    );

    if (selectedFriends.length === 0) {
      showContactError('Select at least one friend already on Biltip');
      return;
    }

    if (selectedFriends.length !== selectedContacts.size) {
      toast.info('Only contacts already on Biltip can receive friend requests.');
    }

    let allSucceeded = true;

    for (const friend of selectedFriends) {
      if (!friend.userId) {
        continue;
      }

      const contactForRequest = {
        id: friend.id,
        name: friend.name,
        phone: friend.phoneNumber || '',
        email: friend.email,
        status: 'existing_user' as const,
        userId: friend.userId,
        username: friend.username,
        mutualFriends: friend.mutualFriends,
        avatar: friend.avatar,
      };

      const { success } = await handleSendFriendRequest(contactForRequest);

      if (success) {
        setSyncedContacts(prev =>
          prev.map(c =>
            c.id === friend.id
              ? { ...c, isFriend: false, status: 'pending' }
              : c
          )
        );
      } else {
        allSucceeded = false;
      }
    }

    if (allSucceeded) {
      setSelectedContacts(new Set());
    }
  };

  const handleInviteContacts = () => {
    const selectedContactsList = inviteableContacts.filter(contact =>
      selectedContacts.has(contact.id)
    );

    if (selectedContactsList.length === 0) return;

    selectedContactsList.forEach(contact => {
      const message = `Hi ${contact.name}! I'm using Biltip to split bills and expenses easily. You should join too! Download it here: https://biltip.com/download`;
      const whatsappUrl = `whatsapp://send?phone=${encodeURIComponent(contact.phoneNumber?.replace(/\D/g, '') || '')}&text=${encodeURIComponent(message)}`;

      try {
        window.open(whatsappUrl, '_blank');
      } catch (error) {
        console.warn('Failed to open WhatsApp for:', contact.name);
      }
    });

    toast.success(`Sent ${selectedContactsList.length} WhatsApp invitation${selectedContactsList.length !== 1 ? 's' : ''}!`);
    setSelectedContacts(new Set());
  };

  const selectedContactList = useMemo(
    () => syncedContacts.filter(contact => selectedContacts.has(contact.id)),
    [selectedContacts, syncedContacts]
  );
  const selectedAddableCount = selectedContactList.filter(contact => contact.status === 'existing_user').length;
  const selectedInviteableCount = selectedContactList.filter(contact => contact.status === 'not_on_app').length;
  const hasSelectedContacts = selectedContactList.length > 0;

  const handleSingleInvite = (contact: Contact) => {
    const message = `Hi ${contact.name}! I'm using Biltip to split bills and expenses easily. You should join too! Download it here: https://biltip.com/download`;
    const whatsappUrl = `whatsapp://send?phone=${encodeURIComponent(contact.phoneNumber?.replace(/\D/g, '') || '')}&text=${encodeURIComponent(message)}`;
    
    try {
      window.open(whatsappUrl, '_blank');
      toast.success(`WhatsApp invitation sent to ${contact.name}!`);
    } catch (error) {
      showContactError('Failed to open WhatsApp. Please try again.');
    }
  };

  const handleSendInvite = () => {
    if (!inviteData.name.trim()) {
      showContactError("Please enter the person's name");
      return;
    }

    if (inviteMethod === 'email' && !inviteData.email.trim()) {
      showContactError('Please enter an email address');
      return;
    }

    if ((inviteMethod === 'whatsapp' || inviteMethod === 'sms') && !inviteData.phone.trim()) {
      showContactError('Please enter a phone number');
      return;
    }

    const methodName = inviteMethod === 'whatsapp' ? 'WhatsApp' : inviteMethod === 'sms' ? 'SMS' : 'Email';
    
    if (inviteMethod === 'whatsapp') {
      const message = getInviteMessage();
      const whatsappUrl = `whatsapp://send?phone=${encodeURIComponent(inviteData.phone.replace(/\D/g, ''))}&text=${encodeURIComponent(message)}`;
      
      try {
        window.open(whatsappUrl, '_blank');
        toast.success(`Opening WhatsApp to invite ${inviteData.name}`);
      } catch (error) {
        toast.success(`Invitation sent to ${inviteData.name} via ${methodName}`);
      }
    } else {
      toast.success(`Invitation sent to ${inviteData.name} via ${methodName}`);
    }
    
    setInviteData({
      name: '',
      phone: '',
      email: '',
      message: ''
    });
  };

  const getInviteMessage = () => {
    const defaultMessage = `Hi ${inviteData.name}! I'd like to add you as a friend on Biltip - a bill splitting app. It makes sharing expenses really easy! Download it here: https://biltip.com/download`;
    return inviteData.message || defaultMessage;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return null;
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Pending</Badge>;
      case 'friends':
        return <Badge variant="default" className="text-xs bg-success text-success-foreground">Friends</Badge>;
      case 'existing_user':
        return <Badge variant="default" className="text-xs bg-success text-success-foreground">On Biltip</Badge>;
      case 'not_on_app':
        return <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">Not on Biltip</Badge>;
      default:
        return null;
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('friends')}
            className="min-h-[44px] min-w-[44px] -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">Add Friends</h1>
            <p className="text-sm text-muted-foreground">
              Connect with people to split bills together
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 pb-10">
        <div className="space-y-3">
          <Label htmlFor="add-friend-search">Search Biltip directory</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="add-friend-search"
              placeholder="Enter username, email, or phone number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 min-h-[44px]"
              autoComplete="off"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Start typing to search Biltip. We’ll look up matches after two characters.
          </p>
        </div>

        {hasLookupQuery && !isQueryLongEnough && (
          <Alert className="border-dashed border-muted">
            <AlertDescription>Type at least two characters to search.</AlertDescription>
          </Alert>
        )}

        {isLookupLoading && (
          <Card className="border-dashed border-muted">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Searching Biltip directory…</p>
                <p className="text-xs text-muted-foreground break-all">
                  Looking for “{searchQuery.trim()}”
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {lookupErrorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{lookupErrorMessage}</AlertDescription>
          </Alert>
        )}

        {shouldShowLookupCard && renderLookupCard()}

        {lookupState.status === 'success' && isQueryLongEnough && !lookupContact && !lookupErrorMessage && !isLookupLoading && (
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <Search className="h-8 w-8 mx-auto text-muted-foreground" />
              <h3 className="font-medium">No Biltip user found</h3>
              <p className="text-sm text-muted-foreground">
                We couldn’t find anyone matching “{searchQuery.trim()}”.
              </p>
            </CardContent>
          </Card>
        )}

        <Collapsible open={contactsSectionOpen} onOpenChange={setContactsSectionOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between min-h-[44px]">
              <span>Use contacts to find friends</span>
              {contactsSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 pt-4">
            {hasSelectedContacts && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Selected contacts</p>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedContacts(new Set())}>
                      Clear
                    </Button>
                  </div>
                  <ScrollArea className="w-full">
                    <div className="flex gap-3 pb-1">
                      {selectedContactList.map((contact) => {
                        const isInvite = contact.status === 'not_on_app';
                        return (
                          <div key={contact.id} className="flex flex-col items-center gap-1 min-w-[60px] group">
                            <div className="relative">
                              <Avatar className={`h-12 w-12 border-2 ${isInvite ? 'border-green-300' : 'border-primary/30'}`}>
                                <AvatarImage src={contact.avatar} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(contact.name)}
                                </AvatarFallback>
                              </Avatar>
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
                            <p className="text-xs text-center max-w-[60px] truncate">
                              {(contact.name || '').split(' ')[0]}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  <div className="flex flex-wrap gap-2">
                    {selectedAddableCount > 0 && (
                      <Button size="sm" className="min-h-[36px]" onClick={handleAddSelectedContacts}>
                        Add friends ({selectedAddableCount})
                      </Button>
                    )}
                    {selectedInviteableCount > 0 && (
                      <Button
                        size="sm"
                        onClick={handleInviteContacts}
                        className="min-h-[36px] bg-green-600 hover:bg-green-700 text-white"
                      >
                        <MessageCircle className="h-3 w-3 mr-2" />
                        WhatsApp ({selectedInviteableCount})
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {isSyncing ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <Users className="h-8 w-8 text-white animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Syncing Contacts</h3>
                      <p className="text-sm text-muted-foreground">Finding your friends on Biltip...</p>
                    </div>
                    <div className="space-y-2">
                      <Progress value={syncProgress} className="w-full h-2" />
                      <p className="text-xs text-muted-foreground">{syncProgress}% complete</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : !hasSyncedContacts && showSyncPrompt ? (
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
                <CardContent className="p-6 space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-white" />
                  </div>
                  <div className="space-y-2 text-center">
                    <h3 className="text-lg font-semibold">Find friends from contacts</h3>
                    <p className="text-sm text-muted-foreground">
                      Sync your contacts to find friends already on Biltip and invite others via WhatsApp.
                    </p>
                  </div>
                  <div className="space-y-3 text-left">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm">Find existing users instantly</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MessageCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm">Send WhatsApp invites to non-users</span>
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
                  <Button variant="ghost" onClick={() => setShowSyncPrompt(false)} className="w-full">
                    Skip for now
                  </Button>
                </CardContent>
              </Card>
            ) : hasSyncedContacts ? (
              <div className="space-y-6">
                <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">Contacts synced!</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{existingUsers.length} on Biltip</span>
                          <span>{inviteableContacts.length} can invite</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleRetrySync} className="min-h-[36px]">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Friends on Biltip</h3>
                    <span className="text-sm text-muted-foreground">{filteredExistingContacts.length} found</span>
                  </div>
                  {filteredExistingContacts.length > 0 ? (
                    <div className="space-y-3">
                      {visibleExistingContacts.map((contact) => (
                        <Card
                          key={contact.id}
                          className={`transition-all cursor-pointer min-h-[72px] ${
                            selectedContacts.has(contact.id)
                              ? 'bg-primary/5 border-primary/30'
                              : 'hover:bg-accent/50'
                          }`}
                          onClick={() => handleContactToggle(contact.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={selectedContacts.has(contact.id)}
                                onChange={() => handleContactToggle(contact.id)}
                                className="min-h-[20px] min-w-[20px]"
                              />
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={contact.avatar} />
                                <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-base">{contact.name}</p>
                                  {contact.status && getStatusBadge(contact.status)}
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
                      {filteredExistingContacts.length > visibleOnAppCount && (
                        <div className="text-center pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setVisibleOnAppCount((count) => count + VISIBLE_BATCH)}
                            className="min-h-[40px]"
                          >
                            Load more friends
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center space-y-2">
                        <Users className="h-10 w-10 mx-auto text-muted-foreground" />
                        <h3 className="font-medium">No friends found</h3>
                        <p className="text-sm text-muted-foreground">
                          None of your contacts are on Biltip yet. Invite them below.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Invite to Biltip</h3>
                    <span className="text-sm text-muted-foreground">{filteredInviteableContacts.length} found</span>
                  </div>
                  {filteredInviteableContacts.length > 0 ? (
                    <div className="space-y-3">
                      {visibleInviteContacts.map((contact) => (
                        <Card
                          key={contact.id}
                          className={`transition-all cursor-pointer min-h-[72px] ${
                            selectedContacts.has(contact.id)
                              ? 'bg-green-50 border-green-200 dark:bg-green-950/20'
                              : 'hover:bg-accent/50'
                          }`}
                          onClick={() => handleContactToggle(contact.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={selectedContacts.has(contact.id)}
                                onChange={() => handleContactToggle(contact.id)}
                                className="min-h-[20px] min-w-[20px]"
                              />
                              <Avatar className="h-12 w-12">
                                <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-base">{contact.name}</p>
                                  {contact.status && getStatusBadge(contact.status)}
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
                      ))}
                      {filteredInviteableContacts.length > visibleInviteCount && (
                        <div className="text-center pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setVisibleInviteCount((count) => count + VISIBLE_BATCH)}
                            className="min-h-[40px]"
                          >
                            Load more contacts
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center space-y-2">
                        <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground" />
                        <h3 className="font-medium">No one left to invite</h3>
                        <p className="text-sm text-muted-foreground">
                          All of your synced contacts are already on Biltip. Nice!
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </section>
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center space-y-4">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="font-medium mb-2">No contacts synced</h3>
                    <p className="text-sm text-muted-foreground">
                      Sync your contacts to find friends or send invites manually.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Button onClick={() => setShowSyncPrompt(true)} className="w-full min-h-[44px]">
                      <Users className="h-4 w-4 mr-2" />
                      Sync contacts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Send invitation manually</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {inviteMethod === 'whatsapp' && (
                  <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      <p className="text-sm">
                        <strong>Recommended:</strong> WhatsApp invites are more likely to be seen and acted upon.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-3">
                  <Label>Invitation method</Label>
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
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="Enter their name"
                      value={inviteData.name}
                      onChange={(e) => setInviteData((prev) => ({ ...prev, name: e.target.value }))}
                      className="min-h-[48px]"
                    />
                  </div>
                  {(inviteMethod === 'whatsapp' || inviteMethod === 'sms') && (
                    <div className="space-y-2">
                      <Label>Phone number *</Label>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={inviteData.phone}
                        onChange={(e) => setInviteData((prev) => ({ ...prev, phone: e.target.value }))}
                        className="min-h-[48px]"
                      />
                    </div>
                  )}
                  {inviteMethod === 'email' && (
                    <div className="space-y-2">
                      <Label>Email address *</Label>
                      <Input
                        type="email"
                        placeholder="friend@example.com"
                        value={inviteData.email}
                        onChange={(e) => setInviteData((prev) => ({ ...prev, email: e.target.value }))}
                        className="min-h-[48px]"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Custom message (optional)</Label>
                    <Textarea
                      placeholder="Add a personal message..."
                      value={inviteData.message}
                      onChange={(e) => setInviteData((prev) => ({ ...prev, message: e.target.value }))}
                      rows={3}
                      className="min-h-[48px]"
                    />
                  </div>
                </div>
                <Collapsible open={showInvitePreview} onOpenChange={setShowInvitePreview}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full min-h-[44px] justify-between">
                      <span>Preview invitation</span>
                      {showInvitePreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <p className="text-sm font-medium mb-2">Message preview:</p>
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
                  disabled={
                    !inviteData.name.trim() ||
                    (inviteMethod === 'email' && !inviteData.email.trim()) ||
                    ((inviteMethod === 'whatsapp' || inviteMethod === 'sms') && !inviteData.phone.trim())
                  }
                >
                  <Send className="h-5 w-5 mr-2" />
                  {inviteMethod === 'whatsapp'
                    ? 'Send WhatsApp invitation'
                    : inviteMethod === 'sms'
                    ? 'Send SMS invitation'
                    : 'Send email invitation'}
                </Button>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
