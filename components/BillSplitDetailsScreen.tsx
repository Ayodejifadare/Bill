import { useState, useEffect, useCallback, MouseEvent } from 'react';
import { ArrowLeft, Users, Calendar, CreditCard, MapPin, Receipt, MoreHorizontal, Check, Clock, Edit, Trash2, Settings, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';
import { useUserProfile } from './UserProfileContext';
import { ShareSheet } from './ui/share-sheet';
import { createDeepLink } from './ShareUtils';
import { PageLoading } from './ui/loading';
import { apiClient } from '../utils/apiClient';

interface BillSplitDetailsScreenProps {
  billSplitId: string | null;
  onNavigate: (tab: string, data?: Record<string, unknown>) => void;
}

interface Participant {
  name: string;
  avatar: string;
  amount: number;
  status: 'paid' | 'pending';
}

interface BillItem {
  name: string;
  price: number;
  quantity: number;
}

interface BillSplit {
  id: string;
  title: string;
  totalAmount: number;
  yourShare: number;
  status: string;
  date: string;
  location: string;
  organizer: { name: string; avatar: string };
  creatorId: string;
  participants: Participant[];
  items: BillItem[];
  note: string;
}

const billSplitCache = new Map<string, BillSplit>();

async function getBillSplit(id: string): Promise<BillSplit> {
  const data = await apiClient(`/api/bill-splits/${id}`);
  return data.billSplit ?? data;
}

async function deleteBillSplit(id: string): Promise<void> {
  await apiClient(`/api/bill-splits/${id}`, {
    method: 'DELETE',
  });
}

export function BillSplitDetailsScreen({ billSplitId, onNavigate }: BillSplitDetailsScreenProps) {
  const { userProfile, appSettings } = useUserProfile();
  const currencySymbol = appSettings.region === 'NG' ? '₦' : '$';
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [billSplit, setBillSplit] = useState<BillSplit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBillSplit = useCallback(async () => {
    if (!billSplitId) {
      setBillSplit(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (billSplitCache.has(billSplitId)) {
        setBillSplit(billSplitCache.get(billSplitId)!);
      } else {
        const data = await getBillSplit(billSplitId);
        billSplitCache.set(billSplitId, data);
        setBillSplit(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bill split');
      setBillSplit(null);
    } finally {
      setLoading(false);
    }
  }, [billSplitId]);

  useEffect(() => {
    fetchBillSplit();
  }, [fetchBillSplit]);

  const isCreator = billSplit && billSplit.creatorId === userProfile.id;

  if (loading) {
    return <PageLoading message="Loading bill split..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('bills')}
            className="min-h-[44px] min-w-[44px] -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold">Bill Split Details</h2>
        </div>
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchBillSplit} variant="outline">Retry</Button>
        </div>
      </div>
    );
  }

  if (!billSplit) {
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('bills')}
            className="min-h-[44px] min-w-[44px] -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold">Bill Split Details</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Bill split not found</p>
        </div>
      </div>
    );
  }

  const paidParticipants = billSplit.participants.filter(p => p.status === 'paid');
  const totalPaid = paidParticipants.reduce((sum, p) => sum + p.amount, 0);
  const progressPercentage = (totalPaid / billSplit.totalAmount) * 100;

  const handleEdit = () => {
    if (billSplitId) {
      billSplitCache.delete(billSplitId);
    }
    onNavigate('edit-bill-split', { billSplitId });
  };

  const handleDelete = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!billSplitId) return;
    try {
      await deleteBillSplit(billSplitId);
      billSplitCache.delete(billSplitId);
      toast.success('Bill split deleted successfully');
      setShowDeleteDialog(false);
      onNavigate('bills', { refresh: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete bill split');
      // Dialog remains open on failure
    }
  };

  const handleSettle = () => {
    onNavigate('settlement', { billSplitId });
  };

  // Create share data for this bill split
  const shareData = billSplit ? {
    type: 'bill_split' as const,
    title: billSplit.title,
    amount: billSplit.totalAmount,
    description: billSplit.note,
    participantNames: billSplit.participants.map(p => p.name),
    dueDate: billSplit.date,
    status: billSplit.status,
    deepLink: createDeepLink('bill-split', billSplit.id)
  } : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Fixed positioning for better mobile UX */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onNavigate('bills')}
              className="min-h-[44px] min-w-[44px] -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-semibold">Bill Split</h2>
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Share Button - Available to all users */}
            {shareData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareSheet(true)}
                className="min-h-[44px] min-w-[44px]"
                aria-label="Share bill split"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            )}
            
            {/* Creator Controls */}
            {isCreator && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-3" />
                    Edit Bill Split
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate('send-reminder', { 
                    billSplitId, 
                    paymentType: 'bill_split' 
                  })}>
                    <Settings className="h-4 w-4 mr-3" />
                    Send Reminder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowShareSheet(true)}>
                    <Share2 className="h-4 w-4 mr-3" />
                    Share Bill Split
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-3" />
                    Delete Bill Split
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 pb-24">
        {/* Bill Overview */}
        <Card className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-semibold leading-tight">{billSplit.title}</h3>
                <div className="flex items-center justify-center space-x-2 flex-wrap">
                  <p className="text-sm text-muted-foreground">Organized by {billSplit.organizer.name}</p>
                  {isCreator && (
                    <Badge variant="secondary" className="text-xs">
                      Creator
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-2xl sm:text-3xl font-bold">{currencySymbol}{billSplit.totalAmount.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Amount</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Payment Progress</span>
                <span>{paidParticipants.length}/{billSplit.participants.length} paid</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{currencySymbol}{totalPaid.toFixed(2)} collected</span>
                <span>{currencySymbol}{(billSplit.totalAmount - totalPaid).toFixed(2)} remaining</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Your Share */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Your Share</p>
              <p className="text-sm text-muted-foreground">You owe</p>
            </div>
            <div className="text-right space-y-2">
              <p className="text-xl font-bold text-destructive">{currencySymbol}{billSplit.yourShare.toFixed(2)}</p>
              <Badge variant="outline" className="text-warning">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            </div>
          </div>
        </Card>

        {/* Participants */}
        <Card className="p-4">
          <div className="space-y-4">
            <h3 className="font-medium">Participants ({billSplit.participants.length})</h3>
            
            <div className="space-y-3">
              {billSplit.participants.map((participant, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {participant.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{participant.name}</p>
                      <p className="text-sm text-muted-foreground">{currencySymbol}{participant.amount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    {participant.status === 'paid' ? (
                      <Badge className="bg-success text-success-foreground">
                        <Check className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-warning">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Bill Items */}
        <Card className="p-4">
          <div className="space-y-4">
            <h3 className="font-medium">Bill Items</h3>
            
            <div className="space-y-2">
              {billSplit.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="text-sm truncate">{item.name}</span>
                    {item.quantity > 1 && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">x{item.quantity}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium flex-shrink-0 ml-2">{currencySymbol}{item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Bill Details */}
        <Card className="p-4">
          <div className="space-y-3">
            <h3 className="font-medium">Details</h3>
            
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Date</span>
                </div>
                <span className="text-sm text-right ml-3">{billSplit.date}</span>
              </div>
              
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Location</span>
                </div>
                <span className="text-sm text-right ml-3">{billSplit.location}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Note */}
        {billSplit.note && (
          <Card className="p-4">
            <div className="space-y-2">
              <h4 className="font-medium">Note</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{billSplit.note}</p>
            </div>
          </Card>
        )}

        {/* Share Sheet */}
        {showShareSheet && shareData && (
          <ShareSheet
            isOpen={showShareSheet}
            onClose={() => setShowShareSheet(false)}
            title="Share Bill Split"
            shareText={`*${shareData.title}*\n\n💰 Total: ${currencySymbol}${shareData.amount.toFixed(2)}${shareData.participantNames ? `\n👥 Split with: ${shareData.participantNames.join(', ')}` : ''}${shareData.dueDate ? `\n📅 Date: ${shareData.dueDate}` : ''}${shareData.description ? `\n📝 ${shareData.description}` : ''}\n\n_Shared via Biltip 🚀_`}
            documentData={{
              title: shareData.title,
              content: shareData,
              type: 'bill_split'
            }}
          />
        )}
      </div>

      {/* Fixed Actions at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 space-y-3">
        <div className="max-w-md mx-auto space-y-3">
          {isCreator ? (
            <>
              {/* Creator actions */}
              {progressPercentage === 100 && (
                <Button className="w-full h-12" onClick={handleSettle}>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Settle & Transfer Funds
                </Button>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  className="h-12" 
                  onClick={() => onNavigate('send-reminder', { 
                    billSplitId, 
                    paymentType: 'bill_split' 
                  })}
                >
                  Send Reminder
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Participant actions */}
              <Button className="w-full h-12 text-base font-medium" onClick={() => onNavigate('payment-flow', {
                paymentRequest: {
                  id: `bill-${billSplit.id}`,
                  amount: billSplit.yourShare,
                  description: billSplit.title,
                  recipient: billSplit.organizer.name,
                  billSplitId: billSplit.id,
                  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
                }
              })}>
                Pay Your Share - {currencySymbol}{billSplit.yourShare.toFixed(2)}
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-12"
                  onClick={() => onNavigate('send-reminder', { 
                    billSplitId, 
                    paymentType: 'bill_split' 
                  })}
                >
                  Send Reminder
                </Button>
                <Button 
                  variant="outline" 
                  className="h-12"
                  onClick={() => setShowShareSheet(true)}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Share Receipt
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md" aria-describedby="delete-dialog-description">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill Split</AlertDialogTitle>
            <AlertDialogDescription id="delete-dialog-description" className="leading-relaxed">
              Are you sure you want to delete "{billSplit.title}"? This action cannot be undone and will remove the bill split for all participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Bill Split
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}