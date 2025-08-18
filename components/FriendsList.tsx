import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { EmptyState } from './ui/empty-state';
import { ScreenHeader } from './ui/screen-header';
import { SearchInput } from './ui/search-input';
import { UserPlus, Send, Users } from 'lucide-react';
import { GroupSection } from './GroupSection';

interface Friend {
  id: string;
  name: string;
  username: string;
  status: 'active' | 'pending' | 'blocked';
  avatar?: string;
  lastTransaction?: {
    amount: number;
    type: 'owes' | 'owed';
  };
}

interface FriendsListProps {
  onNavigate: (tab: string, data?: unknown) => void;
}

export function FriendsList({ onNavigate }: FriendsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    async function loadFriends() {
      try {
        const res = await fetch('/api/friends');
        if (!res.ok) {
          throw new Error('Failed to fetch friends');
        }
        const data = await res.json();
        const friendsData: Friend[] = (data.friends || []).map((f: {
          id: string;
          name: string;
          username?: string;
          email?: string;
          avatar?: string;
          lastTransaction?: Friend['lastTransaction'];
        }) => ({
          id: f.id,
          name: f.name,
          username: f.username || f.email || '',
          status: 'active',
          avatar: f.avatar,
          lastTransaction: f.lastTransaction,
        }));
        setFriends(friendsData);
      } catch (error) {
        console.error('Failed to load friends', error);
      }
    }
    loadFriends();
  }, []);

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeFriends = filteredFriends.filter(f => f.status === 'active');
  const pendingFriends = filteredFriends.filter(f => f.status === 'pending');

  return (
    <div>
      <ScreenHeader
        title="Friends"
        rightAction={
          <Button size="sm" onClick={() => onNavigate('add-friend')}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Friend
          </Button>
        }
        className="-mx-4 mb-6"
      />

      {/* Content Container */}
      <div className="py-4 space-y-6 pb-20">
        <SearchInput
          placeholder="Search friends..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Groups Section */}
        <GroupSection onNavigate={onNavigate} />

        <Separator />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl text-success">$48.25</p>
            <p className="text-sm text-muted-foreground">You're owed</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl text-destructive">$15.00</p>
            <p className="text-sm text-muted-foreground">You owe</p>
          </Card>
        </div>

        {/* Pending Requests */}
        {pendingFriends.length > 0 && (
          <div>
            <h3 className="mb-3">Pending ({pendingFriends.length})</h3>
            <div className="space-y-3">
              {pendingFriends.map((friend) => (
                <Card key={friend.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {friend.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p>{friend.name}</p>
                        <p className="text-sm text-muted-foreground">{friend.username}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        Decline
                      </Button>
                      <Button size="sm">
                        Accept
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Add Friends Suggestion */}
        {activeFriends.length < 3 && (
          <Card className="p-4 border-dashed border-2 border-muted hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onNavigate('add-friend')}>
            <div className="text-center">
              <UserPlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium mb-1">Add More Friends</p>
              <p className="text-sm text-muted-foreground">
                Find friends to split bills and share expenses easily
              </p>
            </div>
          </Card>
        )}

        {/* Active Friends */}
        <div>
        <h3 className="mb-3">Friends ({activeFriends.length})</h3>
        <div className="space-y-3">
          {activeFriends.length > 0 ? (
            activeFriends.map((friend) => (
              <Card key={friend.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center space-x-3 flex-1 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                    onClick={() => onNavigate('friend-profile', { friendId: friend.id })}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {friend.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p>{friend.name}</p>
                      <p className="text-sm text-muted-foreground">{friend.username}</p>
                      {friend.lastTransaction && (
                        <Badge 
                          variant={friend.lastTransaction.type === 'owed' ? 'default' : 'destructive'}
                          className="text-xs mt-1"
                        >
                          {friend.lastTransaction.type === 'owed' 
                            ? `Owes you ${friend.lastTransaction.amount.toFixed(2)}` 
                            : `You owe ${friend.lastTransaction.amount.toFixed(2)}`
                          }
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate('request', { 
                          requestData: { 
                            recipientId: friend.id,
                            recipientName: friend.name 
                          }
                        });
                      }}
                      title="Request money"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate('split');
                      }}
                      title="Split bill"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={UserPlus}
              title="No friends yet"
              description="Add friends to start splitting bills and sharing expenses!"
              actionLabel="Add Your First Friend"
              onAction={() => onNavigate('add-friend')}
            />
          )}
        </div>
      </div>
      </div>
    </div>
  );
}