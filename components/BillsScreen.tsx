import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { EmptyState } from './ui/empty-state';
import { ScreenHeader } from './ui/screen-header';
import { FilterTabs } from './ui/filter-tabs';
import { Plus, Clock, CheckCircle, AlertCircle, Receipt, RotateCcw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useBillSplits } from '../hooks/useBillSplits';
import { useUserProfile } from './UserProfileContext';
import { formatCurrencyForRegion } from '../utils/regions';
import { formatBillDate } from '../utils/formatBillDate';

interface BillsScreenProps {
  onNavigate: (tab: string, data?: any) => void;
  groupId?: string | null;
}

export function BillsScreen({ onNavigate, groupId }: BillsScreenProps) {
  const [activeFilter, setActiveFilter] = useState('all');
  const { billSplits } = useBillSplits({ groupId: groupId || undefined });
  const { appSettings } = useUserProfile();
  const fmt = (n: number) => formatCurrencyForRegion(appSettings.region, n);

  const handleReorderSplit = (bill: any) => {
    // Create an exact copy with the same details but as a new split
    const reorderData = {
      ...bill.template,
      isReorder: true,
      originalBillId: bill.id,
      billName: `${bill.template.billName} (Reorder)`
    };

    toast.success(`Reordering "${bill.title}"...`);
    onNavigate('split', reorderData);
  };

  const handleReuseSplit = (bill: any) => {
    // Create a template for reuse (user can modify before creating)
    const reuseData = {
      ...bill.template,
      isReuse: true,
      originalBillId: bill.id,
      // Clear the amount to let user enter new amount
      totalAmount: '',
      billName: bill.template.billName
    };

    toast.success(`Using "${bill.title}" as template...`);
    onNavigate('split', reuseData);
  };

  const filteredBills = billSplits.filter(bill => {
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

  const groupName = billSplits.length > 0 ? billSplits[0].groupName : undefined;

  return (
    <div>
      <ScreenHeader
        title={groupId ? `${groupName || 'Group'} Bills` : 'Bill Splits'}
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
          {filteredBills.map((bill) => {
            const formattedBillDate = formatBillDate(bill.date);
            return (
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
                      {/*
                      <p className="text-sm text-muted-foreground">
                        Split by {bill.createdBy} • {bill.date}
                      </p>
                      */}
                      <p className="text-sm text-muted-foreground">
                        Split by {bill.createdBy}
                        {formattedBillDate ? ` • ${formattedBillDate}` : ''}
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
                    <p className="font-medium">{fmt(bill.yourShare)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-medium">{fmt(bill.totalAmount)}</p>
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
                <div className="flex gap-2 pt-2">
                  {bill.status === 'pending' && (
                    <>
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('pay-bill', { billId: bill.id });
                        }}
                      >
                        Pay {fmt(bill.yourShare)}
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
                    </>
                  )}
  
                  {/* Reorder/Reuse buttons - always show for completed bills, show for pending if you're the creator */}
                  {(bill.status === 'completed' || bill.createdBy === 'You') && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReorderSplit(bill);
                        }}
                        className="flex items-center gap-1"
                        title="Create identical split with same participants and amounts"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reorder
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReuseSplit(bill);
                        }}
                        className="flex items-center gap-1"
                        title="Use as template - you can modify before creating"
                      >
                        <Copy className="h-3 w-3" />
                        Reuse
                      </Button>
                    </>
                  )}
                </div>
              </div>
              </Card>
            );
          })}
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

