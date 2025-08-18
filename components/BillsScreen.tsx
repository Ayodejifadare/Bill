import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { EmptyState } from './ui/empty-state';
import { ScreenHeader } from './ui/screen-header';
import { FilterTabs } from './ui/filter-tabs';
import { Plus, Clock, CheckCircle, AlertCircle, Receipt } from 'lucide-react';
import { toast } from 'sonner';

const mockBillSplits = [
  {
    id: '1',
    title: 'Dinner at Tony\'s Pizza',
    totalAmount: 75.00,
    yourShare: 18.75,
    status: 'pending',
    participants: [
      { name: 'Sarah Johnson', amount: 18.75, paid: true },
      { name: 'Mike Chen', amount: 18.75, paid: false },
      { name: 'Emily Davis', amount: 18.75, paid: true },
      { name: 'You', amount: 18.75, paid: false },
    ],
    createdBy: 'Sarah Johnson',
    date: '2 days ago',
    groupId: '1', // Work Squad
  },
  {
    id: '2',
    title: 'Uber to Airport',
    totalAmount: 45.00,
    yourShare: 15.00,
    status: 'completed',
    participants: [
      { name: 'Alex Rodriguez', amount: 15.00, paid: true },
      { name: 'Jessica Lee', amount: 15.00, paid: true },
      { name: 'You', amount: 15.00, paid: true },
    ],
    createdBy: 'You',
    date: '1 week ago',
    groupId: '3', // Travel Buddies
  },
  {
    id: '3',
    title: 'Grocery Shopping',
    totalAmount: 120.50,
    yourShare: 40.17,
    status: 'pending',
    participants: [
      { name: 'Mike Chen', amount: 40.17, paid: true },
      { name: 'Emily Davis', amount: 40.17, paid: false },
      { name: 'You', amount: 40.16, paid: true },
    ],
    createdBy: 'Mike Chen',
    date: '5 days ago',
    groupId: '2', // Roommates
  },
  {
    id: '4',
    title: 'Team Lunch at Tony\'s Pizza',
    totalAmount: 142.50,
    yourShare: 28.50,
    status: 'pending',
    participants: [
      { name: 'Emily Davis', amount: 28.50, paid: true },
      { name: 'John Doe', amount: 28.50, paid: false },
      { name: 'Sarah Johnson', amount: 28.50, paid: false },
      { name: 'Mike Chen', amount: 28.50, paid: false },
      { name: 'You', amount: 28.50, paid: false },
    ],
    createdBy: 'Emily Davis',
    date: '1 day ago',
    groupId: '1', // Work Squad
  },
  {
    id: '5',
    title: 'Coffee Run',
    totalAmount: 85.00,
    yourShare: 21.25,
    status: 'completed',
    participants: [
      { name: 'Emily Davis', amount: 21.25, paid: true },
      { name: 'John Doe', amount: 21.25, paid: true },
      { name: 'Sarah Johnson', amount: 21.25, paid: true },
      { name: 'You', amount: 21.25, paid: true },
    ],
    createdBy: 'Mike Chen',
    date: '3 days ago',
    groupId: '1', // Work Squad
  },
];

interface BillsScreenProps {
  onNavigate: (tab: string, data?: any) => void;
  groupId?: string | null;
}

export function BillsScreen({ onNavigate, groupId }: BillsScreenProps) {
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredBills = mockBillSplits.filter(bill => {
    // First filter by group if groupId is provided
    if (groupId && bill.groupId !== groupId) return false;
    
    // Then filter by status
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return bill.status === 'pending';
    if (activeFilter === 'completed') return bill.status === 'completed';
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Mock group names for display
  const groupNames: Record<string, string> = {
    '1': 'Work Squad',
    '2': 'Roommates',
    '3': 'Travel Buddies'
  };

  return (
    <div>
      <ScreenHeader
        title={groupId ? `${groupNames[groupId]} Bills` : 'Bill Splits'}
        subtitle={groupId ? "Group bill splits and expenses" : undefined}
        showBackButton={!!groupId}
        onBack={() => groupId && onNavigate('group-details', { groupId })}
        rightAction={
          <Button 
            size="sm"
            onClick={() => onNavigate('split', groupId ? { groupId } : undefined)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Split
          </Button>
        }
        className="-mx-4 mb-6"
      />

      {/* Content Container */}
      <div className="py-4 space-y-6 pb-20">
        <FilterTabs
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'completed', label: 'Completed' },
          ]}
          activeTab={activeFilter}
          onTabChange={setActiveFilter}
        />

        {/* Bills List */}
        <div className="space-y-4">
          {filteredBills.map((bill) => (
            <Card 
              key={bill.id} 
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onNavigate('bill-split-details', { billSplitId: bill.id })}
            >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{bill.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Split by {bill.createdBy} • {bill.date}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={`${getStatusColor(bill.status)} flex items-center gap-1`}
                >
                  {getStatusIcon(bill.status)}
                  {bill.status}
                </Badge>
              </div>

              {/* Amount Info */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Your share</p>
                  <p className="font-medium">${bill.yourShare.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium">${bill.totalAmount.toFixed(2)}</p>
                </div>
              </div>

              {/* Participants */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Participants</p>
                  <p className="text-sm text-muted-foreground">
                    {bill.participants.filter(p => p.paid).length} of {bill.participants.length} paid
                  </p>
                </div>
                <div className="flex -space-x-2">
                  {bill.participants.map((participant, index) => (
                    <div key={index} className="relative">
                      <Avatar className={`h-8 w-8 border-2 ${participant.paid ? 'border-green-500' : 'border-yellow-500'}`}>
                        <AvatarFallback className="text-xs">
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {participant.paid && (
                        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                          <CheckCircle className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {bill.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('pay-bill', { billId: bill.id });
                    }}
                  >
                    Pay ${bill.yourShare.toFixed(2)}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      const unpaidParticipants = bill.participants.filter(p => !p.paid && p.name !== 'You');
                      if (unpaidParticipants.length > 0) {
                        onNavigate('send-reminder', {
                          billSplitId: bill.id,
                          paymentType: 'bill-split'
                        });
                      } else {
                        toast.info('All participants have already paid');
                      }
                    }}
                  >
                    Remind Others
                  </Button>
                </div>
              )}
            </div>
            </Card>
          ))}
        </div>

        {filteredBills.length === 0 && (
          <EmptyState
            icon={Receipt}
            title="No Bills Found"
            description={
              groupId 
                ? `No ${activeFilter !== 'all' ? activeFilter : ''} bills found for this group`
                : `No ${activeFilter !== 'all' ? activeFilter : ''} bills found`
            }
            actionLabel={groupId ? 'Create Group Split' : 'Create Your First Split'}
            onAction={() => onNavigate('split', groupId ? { groupId } : undefined)}
          />
        )}
      </div>
    </div>
  );
}