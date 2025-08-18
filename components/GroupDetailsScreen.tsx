import { useState } from 'react';
import { ArrowLeft, Users, Plus, MoreHorizontal, Settings, UserPlus, Receipt, Building2, Calendar, Edit, UserMinus, LogOut, Crown, DollarSign, User, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Separator } from './ui/separator';
import { TransactionCard } from './TransactionCard';
import { toast } from 'sonner';

interface GroupDetailsScreenProps {
  groupId: string | null;
  onNavigate: (tab: string, data?: any) => void;
  onGroupNavigation?: (screen: string, groupId?: string, additionalData?: any) => void;
}

interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  email: string;
  isAdmin: boolean;
  balance: number; // positive = owed money, negative = owes money
  totalSpent: number;
  joinedDate: string;
}

interface GroupTransaction {
  id: string;
  type: 'sent' | 'received' | 'bill_split';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending';
  paidBy: string;
  participants: string[];
}

const mockGroupData = {
  '1': {
    id: '1',
    name: 'Work Squad',
    description: 'Office lunches and team events',
    totalSpent: 1250.50,
    totalMembers: 8,
    isAdmin: true,
    createdDate: 'January 15, 2024',
    color: 'bg-blue-500',
    members: [
      {
        id: '1',
        name: 'Emily Davis',
        avatar: 'ED',
        email: 'emily@company.com',
        isAdmin: true,
        balance: 45.25,
        totalSpent: 285.50,
        joinedDate: 'Jan 2024'
      },
      {
        id: '2',
        name: 'John Doe',
        avatar: 'JD',
        email: 'john@company.com',
        isAdmin: false,
        balance: -28.50,
        totalSpent: 156.75,
        joinedDate: 'Jan 2024'
      },
      {
        id: '3',
        name: 'Sarah Johnson',
        avatar: 'SJ',
        email: 'sarah@company.com',
        isAdmin: false,
        balance: 15.75,
        totalSpent: 198.25,
        joinedDate: 'Feb 2024'
      },
      {
        id: '4',
        name: 'Mike Chen',
        avatar: 'MC',
        email: 'mike@company.com',
        isAdmin: false,
        balance: -12.00,
        totalSpent: 142.80,
        joinedDate: 'Jan 2024'
      },
      {
        id: '5',
        name: 'Alex Rodriguez',
        avatar: 'AR',
        email: 'alex@company.com',
        isAdmin: false,
        balance: 8.50,
        totalSpent: 167.20,
        joinedDate: 'Mar 2024'
      }
    ] as GroupMember[],
    recentTransactions: [
      {
        id: '1',
        type: 'bill_split',
        amount: 142.50,
        description: 'Team lunch at Tony\'s Pizza',
        date: '2025-01-13T12:30:00Z',
        status: 'pending',
        paidBy: 'Emily Davis',
        participants: ['John Doe', 'Sarah Johnson', 'Mike Chen', 'Alex Rodriguez']
      },
      {
        id: '2',
        type: 'bill_split',
        amount: 85.00,
        description: 'Coffee run',
        date: '2025-01-10T15:20:00Z',
        status: 'completed',
        paidBy: 'Mike Chen',
        participants: ['Emily Davis', 'John Doe', 'Sarah Johnson']
      },
      {
        id: '3',
        type: 'bill_split',
        amount: 325.75,
        description: 'Team dinner after project completion',
        date: '2025-01-08T19:45:00Z',
        status: 'completed',
        paidBy: 'Sarah Johnson',
        participants: ['Emily Davis', 'John Doe', 'Mike Chen', 'Alex Rodriguez']
      }
    ] as GroupTransaction[]
  },
  '2': {
    id: '2',
    name: 'Roommates',
    description: 'Shared expenses and utilities',
    totalSpent: 2840.75,
    totalMembers: 4,
    isAdmin: false,
    createdDate: 'December 1, 2023',
    color: 'bg-green-500',
    members: [
      {
        id: '1',
        name: 'Alex Rodriguez',
        avatar: 'AR',
        email: 'alex@example.com',
        isAdmin: true,
        balance: 125.00,
        totalSpent: 890.25,
        joinedDate: 'Dec 2023'
      },
      {
        id: '2',
        name: 'Lisa Wang',
        avatar: 'LW',
        email: 'lisa@example.com',
        isAdmin: false,
        balance: -85.50,
        totalSpent: 645.75,
        joinedDate: 'Dec 2023'
      },
      {
        id: '3',
        name: 'Tom Wilson',
        avatar: 'TW',
        email: 'tom@example.com',
        isAdmin: false,
        balance: -39.50,
        totalSpent: 567.25,
        joinedDate: 'Jan 2024'
      },
      {
        id: '4',
        name: 'John Doe',
        avatar: 'JD',
        email: 'john@example.com',
        isAdmin: false,
        balance: 0,
        totalSpent: 737.50,
        joinedDate: 'Dec 2023'
      }
    ] as GroupMember[],
    recentTransactions: [
      {
        id: '1',
        type: 'bill_split',
        amount: 250.00,
        description: 'Monthly utilities',
        date: '2025-01-01T10:00:00Z',
        status: 'pending',
        paidBy: 'Alex Rodriguez',
        participants: ['Lisa Wang', 'Tom Wilson', 'John Doe']
      }
    ] as GroupTransaction[]
  },
  '3': {
    id: '3',
    name: 'Travel Buddies',
    description: 'Weekend trips and adventures',
    totalSpent: 895.25,
    totalMembers: 6,
    isAdmin: true,
    createdDate: 'March 10, 2024',
    color: 'bg-purple-500',
    members: [
      {
        id: '1',
        name: 'Sarah Johnson',
        avatar: 'SJ',
        email: 'sarah@example.com',
        isAdmin: true,
        balance: 65.25,
        totalSpent: 195.50,
        joinedDate: 'Mar 2024'
      },
      {
        id: '2',
        name: 'Mike Chen',
        avatar: 'MC',
        email: 'mike@example.com',
        isAdmin: false,
        balance: -45.00,
        totalSpent: 156.75,
        joinedDate: 'Mar 2024'
      },
      {
        id: '3',
        name: 'Amy Park',
        avatar: 'AP',
        email: 'amy@example.com',
        isAdmin: false,
        balance: 20.25,
        totalSpent: 178.25,
        joinedDate: 'Apr 2024'
      }
    ] as GroupMember[],
    recentTransactions: [
      {
        id: '1',
        type: 'bill_split',
        amount: 450.00,
        description: 'Cabin rental for ski trip',
        date: '2025-01-05T16:00:00Z',
        status: 'completed',
        paidBy: 'Sarah Johnson',
        participants: ['Mike Chen', 'Amy Park']
      }
    ] as GroupTransaction[]
  }
};

export function GroupDetailsScreen({ groupId, onNavigate, onGroupNavigation }: GroupDetailsScreenProps) {
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showMemberActions, setShowMemberActions] = useState(false);
  const [selectedMemberForActions, setSelectedMemberForActions] = useState<GroupMember | null>(null);

  const group = groupId ? mockGroupData[groupId as keyof typeof mockGroupData] : null;

  if (!group) {
    return (
      <div className="min-h-screen">
        {/* Static Header */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="max-w-md mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => onNavigate('friends')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2>Group Details</h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Group not found</p>
          </div>
        </div>
      </div>
    );
  }

  const totalOwed = group.members.reduce((sum, member) => sum + Math.max(0, member.balance), 0);
  const totalOwe = group.members.reduce((sum, member) => sum + Math.abs(Math.min(0, member.balance)), 0);

  const handleSplitBill = () => {
    onNavigate('split', { groupId: group.id });
  };

  const handleLeaveGroup = () => {
    toast.success('Left group successfully');
    onNavigate('friends');
  };

  const handleRemoveMember = (memberId: string) => {
    const member = group.members.find(m => m.id === memberId);
    if (member) {
      toast.success(`Removed ${member.name} from group`);
      setShowRemoveMemberDialog(false);
      setSelectedMemberId(null);
      setShowMemberActions(false);
      setSelectedMemberForActions(null);
    }
  };

  const handleMemberClick = (member: GroupMember) => {
    setSelectedMemberForActions(member);
    setShowMemberActions(true);
  };

  const handleMemberAction = (action: string, member: GroupMember) => {
    switch (action) {
      case 'request':
        onNavigate('request', { 
          requestData: { 
            friendId: member.id,
            friendName: member.name,
            groupId: group.id,
            groupName: group.name
          } 
        });
        setShowMemberActions(false);
        break;
      case 'profile':
        onNavigate('friend-profile', { friendId: member.id });
        setShowMemberActions(false);
        break;
      case 'remove':
        setSelectedMemberId(member.id);
        setShowRemoveMemberDialog(true);
        setShowMemberActions(false);
        break;
      default:
        break;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen">
      {/* Static Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => onNavigate('friends')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2>{group.name}</h2>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {group.isAdmin && (
                  <>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Group
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNavigate('add-group-member', { groupId: group.id })}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Members
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => setShowLeaveDialog(true)} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24">
        {/* Group Overview */}
        <Card className="p-4 sm:p-6">
          <div className="text-center space-y-3 sm:space-y-4">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${group.color} text-white flex items-center justify-center mx-auto`}>
              <Users className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h3 className="font-medium">{group.name}</h3>
              <p className="text-sm text-muted-foreground px-2">{group.description}</p>
              <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 mt-2 text-xs sm:text-sm">
                <span className="text-muted-foreground whitespace-nowrap">
                  {group.totalMembers} members
                </span>
                <span className="text-muted-foreground hidden sm:inline">•</span>
                <span className="text-muted-foreground whitespace-nowrap">
                  Created {group.createdDate}
                </span>
                {group.isAdmin && (
                  <>
                    <span className="text-muted-foreground hidden sm:inline">•</span>
                    <Badge variant="secondary" className="text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="p-3 sm:p-4 text-center">
            <p className="text-lg sm:text-xl font-bold">${group.totalSpent.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground leading-tight">Total Spent</p>
          </Card>
          <Card className="p-3 sm:p-4 text-center">
            <p className="text-lg sm:text-xl font-bold text-success">${totalOwed.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground leading-tight">You're Owed</p>
          </Card>
          <Card className="p-3 sm:p-4 text-center">
            <p className="text-lg sm:text-xl font-bold text-destructive">${totalOwe.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground leading-tight">You Owe</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button className="w-full h-12" onClick={handleSplitBill}>
            <Plus className="h-4 w-4 mr-2" />
            Split Bill
          </Button>
          <Button variant="outline" className="w-full h-12" onClick={() => onNavigate('group-account', { groupId })}>
            <Building2 className="h-4 w-4 mr-2" />
            Group Accounts
          </Button>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="activity" className="text-sm">Activity</TabsTrigger>
            <TabsTrigger value="members" className="text-sm">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-3 sm:space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Recent Activity</h3>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('bills', { groupId })} className="text-xs sm:text-sm h-8">
                View All
              </Button>
            </div>

            {group.recentTransactions.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {group.recentTransactions.map((transaction) => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={{
                      id: transaction.id,
                      type: transaction.type,
                      amount: transaction.amount,
                      description: transaction.description,
                      date: transaction.date,
                      status: transaction.status,
                      sender: { name: transaction.paidBy, avatar: 'PB' }
                    }}
                    onClick={() => onNavigate('transaction-details', { transactionId: transaction.id })}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-6 sm:p-8 text-center">
                <Receipt className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-medium mb-2">No activity yet</h3>
                <p className="text-sm text-muted-foreground mb-4 px-2">
                  Start splitting bills with your group
                </p>
                <Button onClick={handleSplitBill} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Split First Bill
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-3 sm:space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Members ({group.members.length})</h3>
              {group.isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs sm:text-sm h-8"
                  onClick={() => onNavigate('add-group-member', { groupId: group.id })}
                >
                  <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Invite</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )}
            </div>

            <div className="space-y-2 sm:space-y-3">
              {group.members.map((member) => (
                <Card 
                  key={member.id} 
                  className="p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors" 
                  onClick={() => handleMemberClick(member)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                        <AvatarFallback className="text-sm">{member.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-sm sm:text-base truncate">{member.name}</p>
                          {member.isAdmin && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              <Crown className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Admin</span>
                              <span className="sm:hidden">A</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{member.email}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="hidden sm:inline">Joined {member.joinedDate} • </span>
                          <span className="sm:hidden">{member.joinedDate} • </span>
                          Spent ${member.totalSpent.toFixed(0)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-2">
                      <div>
                        <p className={`font-medium text-sm sm:text-base ${member.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {member.balance >= 0 ? '+' : ''}${member.balance.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.balance >= 0 ? 'gets back' : 'owes'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* View All Members Button */}
            <div className="text-center mt-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onNavigate('group-members', { groupId: group.id })}
                className="text-xs sm:text-sm h-8"
              >
                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                View All Members
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Leave Group Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave "{group.name}"? You'll no longer be able to participate in group activities or see group transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Member Actions Sheet */}
      <Sheet open={showMemberActions} onOpenChange={setShowMemberActions}>
        <SheetContent side="bottom" className="h-auto">
          {selectedMemberForActions && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg">
                      {selectedMemberForActions.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <SheetTitle className="flex items-center space-x-2">
                      <span>{selectedMemberForActions.name}</span>
                      {selectedMemberForActions.isAdmin && (
                        <Badge variant="secondary" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </SheetTitle>
                    <SheetDescription>{selectedMemberForActions.email}</SheetDescription>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span>Joined {selectedMemberForActions.joinedDate}</span>
                      <span className="mx-2">•</span>
                      <span>Spent ${selectedMemberForActions.totalSpent.toFixed(0)}</span>
                      <span className="mx-2">•</span>
                      <span className={selectedMemberForActions.balance >= 0 ? 'text-success' : 'text-destructive'}>
                        {selectedMemberForActions.balance >= 0 ? 'Gets back' : 'Owes'} ${Math.abs(selectedMemberForActions.balance).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-2 px-4 pb-6">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12"
                  onClick={() => handleMemberAction('request', selectedMemberForActions)}
                >
                  <DollarSign className="h-5 w-5 mr-3" />
                  Request from {selectedMemberForActions.name}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start h-12"
                  onClick={() => handleMemberAction('profile', selectedMemberForActions)}
                >
                  <User className="h-5 w-5 mr-3" />
                  View Profile
                </Button>

                {selectedMemberForActions.balance < 0 && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12"
                    onClick={() => {
                      toast.success('Reminder sent!');
                      setShowMemberActions(false);
                    }}
                  >
                    <Receipt className="h-5 w-5 mr-3" />
                    Send Payment Reminder
                  </Button>
                )}

                {group.isAdmin && !selectedMemberForActions.isAdmin && (
                  <>
                    <Separator className="my-2" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 text-destructive hover:text-destructive"
                      onClick={() => handleMemberAction('remove', selectedMemberForActions)}
                    >
                      <UserMinus className="h-5 w-5 mr-3" />
                      Remove from Group
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Remove Member Dialog */}
      <AlertDialog open={showRemoveMemberDialog} onOpenChange={setShowRemoveMemberDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the group? They will no longer have access to group activities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedMemberId && handleRemoveMember(selectedMemberId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}