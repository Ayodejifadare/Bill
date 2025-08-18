import { useState } from 'react';
import { Plus, Users, MoreHorizontal, Crown, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { EmptyState } from './ui/empty-state';

interface GroupSectionProps {
  onNavigate: (tab: string, data?: any) => void;
}

interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  totalSpent: number;
  recentActivity: string;
  members: Array<{
    name: string;
    avatar: string;
  }>;
  isAdmin: boolean;
  lastActive: string;
  pendingBills: number;
  color: string;
}

const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Work Squad',
    description: 'Office lunches and team events',
    memberCount: 8,
    totalSpent: 1250.50,
    recentActivity: 'Team lunch at Tony\'s Pizza',
    members: [
      { name: 'Emily Davis', avatar: 'ED' },
      { name: 'John Doe', avatar: 'JD' },
      { name: 'Sarah Johnson', avatar: 'SJ' },
      { name: 'Mike Chen', avatar: 'MC' }
    ],
    isAdmin: true,
    lastActive: '2 hours ago',
    pendingBills: 2,
    color: 'bg-blue-500'
  },
  {
    id: '2',
    name: 'Roommates',
    description: 'Shared expenses and utilities',
    memberCount: 4,
    totalSpent: 2840.75,
    recentActivity: 'Monthly utilities split',
    members: [
      { name: 'Alex Rodriguez', avatar: 'AR' },
      { name: 'Lisa Wang', avatar: 'LW' },
      { name: 'Tom Wilson', avatar: 'TW' }
    ],
    isAdmin: false,
    lastActive: '1 day ago',
    pendingBills: 1,
    color: 'bg-green-500'
  },
  {
    id: '3',
    name: 'Travel Buddies',
    description: 'Weekend trips and adventures',
    memberCount: 6,
    totalSpent: 895.25,
    recentActivity: 'Cabin rental for ski trip',
    members: [
      { name: 'Sarah Johnson', avatar: 'SJ' },
      { name: 'Mike Chen', avatar: 'MC' },
      { name: 'Amy Park', avatar: 'AP' }
    ],
    isAdmin: true,
    lastActive: '3 days ago',
    pendingBills: 0,
    color: 'bg-purple-500'
  }
];

export function GroupSection({ onNavigate }: GroupSectionProps) {
  const [showAllGroups, setShowAllGroups] = useState(false);

  const displayedGroups = showAllGroups ? mockGroups : mockGroups.slice(0, 2);
  const totalPendingBills = mockGroups.reduce((sum, group) => sum + group.pendingBills, 0);

  const handleGroupClick = (groupId: string) => {
    onNavigate('group-details', { groupId });
  };

  const handleCreateGroup = () => {
    onNavigate('create-group');
  };

  const handleSplitWithGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate('split', { groupId });
  };

  return (
    <div className="space-y-4">
      {/* Groups Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <h3>Groups ({mockGroups.length})</h3>
          {totalPendingBills > 0 && (
            <Badge variant="outline" className="text-warning">
              {totalPendingBills} pending
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={handleCreateGroup}>
          <Plus className="h-4 w-4 mr-1" />
          Create
        </Button>
      </div>

      {/* Groups List */}
      {mockGroups.length > 0 ? (
        <div className="space-y-3">
          {displayedGroups.map((group) => (
            <Card 
              key={group.id} 
              className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handleGroupClick(group.id)}
            >
              <div className="space-y-3">
                {/* Group Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`w-12 h-12 rounded-full ${group.color} flex items-center justify-center text-white`}>
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{group.name}</h4>
                        {group.isAdmin && (
                          <Crown className="h-4 w-4 text-warning" />
                        )}
                        {group.pendingBills > 0 && (
                          <Badge variant="outline" className="text-xs text-warning">
                            {group.pendingBills} pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                      <p className="text-xs text-muted-foreground">{group.memberCount} members • {group.lastActive}</p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleGroupClick(group.id);
                      }}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleSplitWithGroup(group.id, e)}>
                        Split Bill
                      </DropdownMenuItem>
                      {group.isAdmin && (
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          Manage Group
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Members Preview */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex -space-x-1">
                      {group.members.slice(0, 3).map((member, index) => (
                        <Avatar key={index} className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-xs bg-muted">
                            {member.avatar}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {group.memberCount > 3 && (
                        <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">
                            +{group.memberCount - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium">${group.totalSpent.toFixed(0)} spent</p>
                    <p className="text-xs text-muted-foreground">{group.recentActivity}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {/* Show More/Less Button */}
          {mockGroups.length > 2 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setShowAllGroups(!showAllGroups)}
            >
              {showAllGroups ? 'Show Less' : `Show ${mockGroups.length - 2} More Groups`}
            </Button>
          )}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No Groups Yet"
          description="Create groups to easily split bills with the same people"
          actionLabel="Create Your First Group"
          onAction={handleCreateGroup}
        />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="w-full" onClick={handleCreateGroup}>
          <Plus className="h-4 w-4 mr-2" />
          New Group
        </Button>
      </div>
    </div>
  );
}