import { useState } from 'react';
import { ArrowLeft, Users, Search, MessageCircle, UserPlus, CheckCircle, RefreshCw, Settings, Share2, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { MatchedContact, ContactSyncScreenProps, ActiveTab } from './types';
import { filterContacts, handleBulkInviteContacts, handleSingleInvite, handleSendFriendRequest } from './helpers';

interface ContactResultsScreenProps extends ContactSyncScreenProps {
  matchedContacts: MatchedContact[];
  selectedContacts: Set<string>;
  setSelectedContacts: (value: Set<string>) => void;
  isInviting: boolean;
  setIsInviting: (value: boolean) => void;
  onRetrySync?: () => void;
  syncMethod?: 'contacts' | 'file' | 'demo';
}

export function ContactResultsScreen({
  onNavigate,
  matchedContacts,
  selectedContacts,
  setSelectedContacts,
  isInviting,
  setIsInviting,
  onRetrySync,
  syncMethod = 'contacts'
}: ContactResultsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('on_app');
  const [showSelectAll, setShowSelectAll] = useState(false);

  const filteredContacts = filterContacts(matchedContacts, searchQuery);
  const existingUsers = filteredContacts.filter(c => c.status === 'existing_user');
  const inviteableContacts = filteredContacts.filter(c => c.status === 'not_on_app');

  const getDisplayContacts = () => {
    return activeTab === 'on_app' ? existingUsers : inviteableContacts;
  };

  const displayContacts = getDisplayContacts();
  const allDisplayedSelected = displayContacts.length > 0 && 
    displayContacts.every(contact => selectedContacts.has(contact.id));

  const toggleContactSelection = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const toggleSelectAll = () => {
    if (allDisplayedSelected) {
      // Deselect all displayed contacts
      const newSelected = new Set(selectedContacts);
      displayContacts.forEach(contact => newSelected.delete(contact.id));
      setSelectedContacts(newSelected);
    } else {
      // Select all displayed contacts
      const newSelected = new Set(selectedContacts);
      displayContacts.forEach(contact => newSelected.add(contact.id));
      setSelectedContacts(newSelected);
    }
  };

  const handleInviteContacts = () => {
    const selectedContactsList = inviteableContacts.filter(contact => 
      selectedContacts.has(contact.id)
    );
    handleBulkInviteContacts(
      selectedContactsList,
      selectedContacts,
      setIsInviting,
      setSelectedContacts
    );
  };

  const handleAddAllFriends = () => {
    const selectedFriends = existingUsers.filter(contact => 
      selectedContacts.has(contact.id)
    );
    
    selectedFriends.forEach(contact => {
      handleSendFriendRequest(contact);
    });
    
    // Clear selections
    setSelectedContacts(new Set());
  };

  const getSyncMethodBadge = () => {
    switch (syncMethod) {
      case 'contacts':
        return <Badge variant="default" className="text-xs">Live Sync</Badge>;
      case 'file':
        return <Badge variant="secondary" className="text-xs">File Import</Badge>;
      case 'demo':
        return <Badge variant="outline" className="text-xs">Demo Mode</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('add-friend')}
              className="min-h-[44px] min-w-[44px] -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">Contact Results</h1>
                {getSyncMethodBadge()}
              </div>
              <p className="text-sm text-muted-foreground">
                {matchedContacts.length} contacts processed
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onRetrySync && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetrySync}
                className="min-h-[44px] min-w-[44px]"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 pb-8">
        {/* Success Summary */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Sync Complete!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Found {existingUsers.length + inviteableContacts.length} connections from your contacts
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {existingUsers.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Friends on Biltip</p>
                  <p className="text-xs text-muted-foreground mt-1">Ready to connect</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {inviteableContacts.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Can be invited</p>
                  <p className="text-xs text-muted-foreground mt-1">Via WhatsApp</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 min-h-[48px]"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 min-h-[48px]">
            <TabsTrigger value="on_app" className="min-h-[44px]">
              <Users className="h-4 w-4 mr-2" />
              On Biltip
              {existingUsers.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {existingUsers.length}
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

          {/* On Biltip Tab */}
          <TabsContent value="on_app" className="space-y-4 mt-6">
            {/* Selection Actions for Friends */}
            {existingUsers.length > 0 && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={allDisplayedSelected}
                        onCheckedChange={toggleSelectAll}
                        className="min-h-[20px] min-w-[20px]"
                      />
                      <div>
                        <p className="font-medium text-sm">
                          {selectedContacts.size > 0 
                            ? `${selectedContacts.size} selected` 
                            : 'Select friends to add'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Send friend requests to connect
                        </p>
                      </div>
                    </div>
                    
                    {selectedContacts.size > 0 && (
                      <Button
                        onClick={handleAddAllFriends}
                        size="sm"
                        className="min-h-[40px]"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add Friends ({selectedContacts.size})
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Friends List */}
            <div className="space-y-3">
              {existingUsers.length > 0 ? (
                existingUsers.map((contact) => (
                  <Card 
                    key={contact.id} 
                    className={`transition-all cursor-pointer min-h-[72px] ${
                      selectedContacts.has(contact.id)
                        ? 'bg-primary/5 border-primary/30' 
                        : 'hover:bg-accent/50'
                    }`}
                    onClick={() => toggleContactSelection(contact.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedContacts.has(contact.id)}
                          onChange={() => toggleContactSelection(contact.id)}
                          className="min-h-[20px] min-w-[20px]"
                        />
                        
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={contact.userId ? `https://images.unsplash.com/photo-${1500000000000 + parseInt(contact.id)}?w=100` : undefined} />
                          <AvatarFallback>
                            {contact.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-base">{contact.name}</p>
                            <Badge variant="default" className="text-xs bg-success text-success-foreground">
                              On Biltip
                            </Badge>
                            {contact.mutualFriends && contact.mutualFriends > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {contact.mutualFriends} mutual
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">{contact.phone}</p>
                            {contact.username && (
                              <p className="text-xs text-muted-foreground">{contact.username}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">No friends found on Biltip</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchQuery 
                        ? 'Try a different search term or check the invite tab' 
                        : 'None of your contacts are using Biltip yet'
                      }
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('invite')}
                      className="min-h-[44px]"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Invite Friends
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Invite Tab */}
          <TabsContent value="invite" className="space-y-4 mt-6">
            {/* Bulk Invite Actions */}
            {inviteableContacts.length > 0 && (
              <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={allDisplayedSelected}
                        onCheckedChange={toggleSelectAll}
                        className="min-h-[20px] min-w-[20px]"
                      />
                      <div>
                        <p className="font-medium text-sm">
                          {selectedContacts.size > 0 
                            ? `${selectedContacts.size} selected for WhatsApp invite` 
                            : 'Select contacts to invite'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Send personalized invitations via WhatsApp
                        </p>
                      </div>
                    </div>
                    
                    {selectedContacts.size > 0 && (
                      <Button 
                        onClick={handleInviteContacts}
                        disabled={isInviting}
                        className="min-h-[40px] bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isInviting ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <>
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Send via WhatsApp ({selectedContacts.size})
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Inviteable Contacts List */}
            <div className="space-y-3">
              {inviteableContacts.length > 0 ? (
                inviteableContacts.map((contact) => (
                  <Card 
                    key={contact.id}
                    className={`transition-all cursor-pointer min-h-[72px] ${
                      selectedContacts.has(contact.id)
                        ? 'bg-green-50 border-green-200 dark:bg-green-950/20' 
                        : 'hover:bg-accent/50'
                    }`}
                    onClick={() => toggleContactSelection(contact.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedContacts.has(contact.id)}
                          onChange={() => toggleContactSelection(contact.id)}
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
                            <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">
                              Not on Biltip
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{contact.phone}</p>
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
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">No contacts to invite</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchQuery 
                        ? 'Try a different search term or check the friends tab' 
                        : 'All your contacts are already using Biltip!'
                      }
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('on_app')}
                      className="min-h-[44px]"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Friends
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Cards */}
        <div className="grid gap-3">
          <Card>
            <CardContent className="p-4">
              <Button 
                variant="outline" 
                className="w-full justify-start h-auto py-3"
                onClick={() => onNavigate('add-friend')}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Add More Friends</p>
                    <p className="text-sm text-muted-foreground">Search by phone number or username</p>
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>

          {inviteableContacts.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto py-3"
                  onClick={() => {
                    const message = `Hey! I'm using Biltip to split bills and expenses easily. You should join too! Download it here: https://biltip.com/download`;
                    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
                    window.open(url, '_blank');
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <Share2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Share Biltip</p>
                      <p className="text-sm text-muted-foreground">Send a general invitation via WhatsApp</p>
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}