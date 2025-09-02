import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Minus,
  Users,
  Building2,
  Send,
  UserPlus,
  Repeat,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { toast } from 'sonner';
import { apiClient } from '../utils/apiClient';
import { useUserProfile } from './UserProfileContext';
import {
  fetchFriends,
  fetchGroups,
  fetchExternalAccounts,
  Friend,
  Group,
  ExternalAccount,
} from '../utils/split-bill-api';
import { PaymentMethodSelector, PaymentMethod } from './PaymentMethodSelector';
interface SplitParticipant {
  friend: Friend;
  amount: number;
  percentage?: number;
}


interface SplitBillProps {
  onNavigate: (screen: string, data?: any) => void;
  groupId?: string | null;
}

export function SplitBill({ onNavigate, groupId }: SplitBillProps) {
  const { appSettings, userProfile } = useUserProfile();
  const isNigeria = appSettings.region === 'NG';
  const currencySymbol = isNigeria ? '₦' : '$';
  
  const [billName, setBillName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [description, setDescription] = useState('');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'percentage' | 'custom'>('equal');
  const [participants, setParticipants] = useState<SplitParticipant[]>([]);
  const [availableFriends, setAvailableFriends] = useState<Friend[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showGroupSelection, setShowGroupSelection] = useState(false);
  const [includeMe, setIncludeMe] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [recurringDay, setRecurringDay] = useState('1');
  const [recurringDayOfWeek, setRecurringDayOfWeek] = useState('monday');

  // Async data states
  const [groups, setGroups] = useState<Group[]>([]);
  const [externalAccounts, setExternalAccounts] = useState<ExternalAccount[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  // Progressive disclosure states - recurring expanded by default
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showRecurringOptions, setShowRecurringOptions] = useState(true); // Changed to true
  const [showSplitDetails, setShowSplitDetails] = useState(false);

  // Current user data
  const currentUser: Friend = {
    id: 'me',
    name: 'You',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    phoneNumber: isNigeria ? '+234 800 000 0000' : '+1 (555) 000-0000',
    status: 'active'
  };

  const [submitting, setSubmitting] = useState(false);

  // Personal payment methods fetched from API
  const [personalMethods, setPersonalMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadPaymentMethods() {
      try {
        const data = await apiClient('/payment-methods');
        if (cancelled) return;
        const methods = Array.isArray((data as any).paymentMethods)
          ? (data as any).paymentMethods
          : data;
        const mapped: PaymentMethod[] = methods.map((method: any) => ({
          id: String(method.id),
          type: method.type,
          bankName: method.bank || method.bankName,
          bank: method.bank,
          accountNumber: method.accountNumber,
          accountHolderName: method.accountName || method.accountHolderName,
          accountName: method.accountName,
          sortCode: method.sortCode,
          routingNumber: method.routingNumber,
          accountType: method.accountType,
          provider: method.provider,
          phoneNumber: method.phoneNumber,
          isDefault: method.isDefault,
        }));
        setPersonalMethods(mapped);
      } catch (err) {
        console.error('Failed to load payment methods', err);
      }
    }
    loadPaymentMethods();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch friends and groups
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [friends, fetchedGroups] = await Promise.all([
          fetchFriends(isNigeria),
          fetchGroups(isNigeria),
        ]);
        if (cancelled) return;
        setGroups(fetchedGroups);

        const creatorParticipant: SplitParticipant = {
          friend: currentUser,
          amount: 0,
          percentage: 0,
        };

        if (groupId) {
          const group = fetchedGroups.find((g) => g.id === groupId);
          const groupMembers = group ? group.members : [];
          const groupParticipants = groupMembers.map((friend) => ({
            friend,
            amount: 0,
            percentage: 0,
          }));
          setParticipants([creatorParticipant, ...groupParticipants]);
          setAvailableFriends(
            friends.filter(
              (friend) => !groupMembers.some((member) => member.id === friend.id)
            )
          );
        } else {
          setParticipants([creatorParticipant]);
          setAvailableFriends(friends);
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [groupId, isNigeria]);

  // Fetch external accounts when group changes
  useEffect(() => {
    let cancelled = false;
    async function loadAccounts() {
      if (!groupId) {
        setExternalAccounts([]);
        setAccountsError(null);
        setAccountsLoading(false);
        return;
      }
      try {
        setAccountsLoading(true);
        setAccountsError(null);
        const accounts = await fetchExternalAccounts(groupId);
        if (!cancelled) {
          setExternalAccounts(accounts);
        }
      } catch (err) {
        if (!cancelled) setAccountsError('Failed to load payment methods');
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    }
    loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  // Combine personal methods with external accounts
  useEffect(() => {
    const methods = [...personalMethods];
    if (groupId && externalAccounts.length > 0) {
      methods.push(
        ...externalAccounts.map((account) => ({
          ...account,
          id: `external-${account.id}`,
          isExternal: true,
          externalName: account.name,
        }))
      );
    }
    setPaymentMethods(methods);
  }, [personalMethods, externalAccounts, groupId]);

  // Ensure a default payment method is selected
  useEffect(() => {
    if (paymentMethods.length === 0) {
      setSelectedPaymentMethod(null);
      return;
    }
    if (
      !selectedPaymentMethod ||
      !paymentMethods.find((m) => m.id === selectedPaymentMethod.id)
    ) {
      const defaultMethod =
        paymentMethods.find((m) => m.isDefault) || paymentMethods[0];
      setSelectedPaymentMethod(defaultMethod);
    }
  }, [paymentMethods, selectedPaymentMethod]);

  const addParticipant = (friend: Friend) => {
    const newParticipant: SplitParticipant = {
      friend,
      amount: 0,
      percentage: splitMethod === 'equal' ? Math.floor(100 / (participants.length + 1)) : 0
    };
    
    setParticipants([...participants, newParticipant]);
    setAvailableFriends(availableFriends.filter(f => f.id !== friend.id));
    
    // Recalculate equal splits
    if (splitMethod === 'equal') {
      const updatedList = [...participants, newParticipant];
      if (updatedList.length > 0) {
        calculateEqualSplit(updatedList);
      }
    }
  };

  const addGroupMembers = (group: Group) => {
    const newMembers = group.members.filter(member => 
      !participants.some(p => p.friend.id === member.id) &&
      availableFriends.some(f => f.id === member.id)
    );

    const newParticipants = newMembers.map(member => ({
      friend: member,
      amount: 0,
      percentage: 0
    }));

    const updatedParticipants = [...participants, ...newParticipants];
    setParticipants(updatedParticipants);
    
    // Remove added members from available friends
    setAvailableFriends(availableFriends.filter(f => 
      !newMembers.some(member => member.id === f.id)
    ));

    // Recalculate equal splits
    if (splitMethod === 'equal') {
      if (updatedParticipants.length > 0) {
        calculateEqualSplit(updatedParticipants);
      }
    }

    toast.success(`Added ${newMembers.length} members from ${group.name}`);
    setShowGroupSelection(false);
  };

  const removeParticipant = (friendId: string) => {
    const participantToRemove = participants.find(p => p.friend.id === friendId);
    if (participantToRemove) {
      setParticipants(participants.filter(p => p.friend.id !== friendId));
      
      // Only add back to available friends if it's not the current user
      if (friendId !== 'me') {
        setAvailableFriends([...availableFriends, participantToRemove.friend]);
      } else {
        setIncludeMe(false);
      }
    }
    
    // Recalculate equal splits
    if (splitMethod === 'equal') {
      const updatedParticipants = participants.filter(p => p.friend.id !== friendId);
      if (updatedParticipants.length > 0) {
        calculateEqualSplit(updatedParticipants);
      }
    }
  };

  const calculateEqualSplit = (participantsList: SplitParticipant[]) => {
    const total = parseFloat(totalAmount) || 0;
    if (participantsList.length === 0) return; // Prevent division by zero

    const totalCents = Math.round(total * 100);
    const perPersonRaw = total / participantsList.length;
    const perPersonCents = Math.round(perPersonRaw * 100);
    let remainder = totalCents - perPersonCents * participantsList.length;

    const updatedParticipants = participantsList.map((p, index) => {
      let shareCents = perPersonCents;
      if (remainder > 0) {
        shareCents += 1;
        remainder -= 1;
      } else if (remainder < 0 && index === participantsList.length - 1) {
        // Adjust the last participant if we have distributed too much
        shareCents += remainder;
        remainder = 0;
      }

      const amount = shareCents / 100;
      return {
        ...p,
        amount,
        percentage: total === 0 ? 0 : (amount / total) * 100
      };
    });

    setParticipants(updatedParticipants);
    return updatedParticipants;
  };

  const updateParticipantAmount = (friendId: string, amount: number) => {
    const total = parseFloat(totalAmount) || 1; // Prevent division by zero
    setParticipants(participants.map(p => 
      p.friend.id === friendId 
        ? { ...p, amount: isNaN(amount) ? 0 : amount, percentage: (amount / total) * 100 }
        : p
    ));
  };

  const updateParticipantPercentage = (friendId: string, percentage: number) => {
    const total = parseFloat(totalAmount) || 0;
    const safePercentage = isNaN(percentage) ? 0 : Math.max(0, Math.min(100, percentage)); // Clamp between 0-100
    setParticipants(participants.map(p => 
      p.friend.id === friendId 
        ? { ...p, percentage: safePercentage, amount: (safePercentage / 100) * total }
        : p
    ));
  };

  const handleSplitMethodChange = (method: 'equal' | 'percentage' | 'custom') => {
    setSplitMethod(method);
    if (method === 'equal' && participants.length > 0) {
      calculateEqualSplit(participants);
    }
  };

  const toggleIncludeMe = () => {
    setIncludeMe(!includeMe);
    
    if (!includeMe) {
      // Add current user to participants
      const newParticipant: SplitParticipant = {
        friend: currentUser,
        amount: 0,
        percentage: 0
      };
      const updatedParticipants = [...participants, newParticipant];
      setParticipants(updatedParticipants);
      
      if (splitMethod === 'equal' && updatedParticipants.length > 0) {
        calculateEqualSplit(updatedParticipants);
      }
    } else {
      // Remove current user from participants
      const updatedParticipants = participants.filter(p => p.friend.id !== 'me');
      setParticipants(updatedParticipants);
      
      if (splitMethod === 'equal' && updatedParticipants.length > 0) {
        calculateEqualSplit(updatedParticipants);
      }
    }
  };

  const handleTotalAmountChange = (value: string) => {
    setTotalAmount(value);
    if (splitMethod === 'equal' && participants.length > 0) {
      calculateEqualSplit(participants);
    } else if (splitMethod === 'percentage') {
      const total = parseFloat(value) || 0;
      setParticipants(participants.map(p => ({
        ...p,
        amount: ((p.percentage || 0) / 100) * total
      })));
    }
  };

  const getTotalSplit = () => {
    return participants.reduce((sum, p) => sum + (isNaN(p.amount) ? 0 : p.amount), 0);
  };


  const handleCreateSplit = async () => {
    if (!billName.trim()) {
      toast.error('Please enter a bill name');
      return;
    }
    
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast.error('Please enter a valid total amount');
      return;
    }
    
    if (participants.length === 0) {
      toast.error('Please add at least one participant');
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method for receiving payments');
      return;
    }
    
    let currentParticipants = participants;
    if (splitMethod === 'equal') {
      currentParticipants = calculateEqualSplit(participants);
    }

    const splitTotalCents = Math.round(
      currentParticipants.reduce((sum, p) => sum + (isNaN(p.amount) ? 0 : p.amount), 0) * 100
    );
    const expectedTotalCents = Math.round(parseFloat(totalAmount) * 100);

    if (splitTotalCents !== expectedTotalCents) {
      toast.error(
        `Split amounts (${currencySymbol}${(splitTotalCents / 100).toFixed(2)}) don't match total (${currencySymbol}${(expectedTotalCents / 100).toFixed(2)})`
      );
      return;
    }

    // Create the split bill (backend)
    const hasMe = participants.some(p => p.friend.id === 'me');
    const myShare = hasMe ? participants.find(p => p.friend.id === 'me')?.amount || 0 : 0;

    try {
      setSubmitting(true);
      const currentUserId = userProfile?.id;
      const payload: any = {
        title: billName.trim(),
        totalAmount: parseFloat(totalAmount),
        description: description || undefined,
        splitMethod,
        groupId: groupId || undefined,
        paymentMethodId: selectedPaymentMethod?.isExternal ? String(selectedPaymentMethod.id).replace(/^external-/, '') : undefined,
        isRecurring,
        frequency: isRecurring ? recurringFrequency : undefined,
        day: isRecurring && recurringFrequency === 'monthly'
          ? parseInt(recurringDay || '1', 10)
          : undefined,
        dayOfWeek: isRecurring && recurringFrequency === 'weekly'
          ? recurringDayOfWeek
          : undefined,
        participants: participants
          .filter(p => !isNaN(p.amount) && p.amount > 0)
          .map(p => ({
            id: p.friend.id === 'me' ? (currentUserId || 'me') : p.friend.id,
            amount: Number(p.amount)
          })),
      };

      await apiClient('/bill-splits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (isRecurring) {
        if (hasMe && myShare > 0) {
          toast.success(`Recurring split bill created! You owe ${currencySymbol}${myShare.toFixed(2)} ${recurringFrequency}.`);
        } else {
          toast.success(`Recurring split bill created! This will repeat ${recurringFrequency}.`);
        }
      } else {
        if (hasMe && myShare > 0) {
          toast.success(`Split bill created! You owe ${currencySymbol}${myShare.toFixed(2)}.`);
        } else {
          toast.success('Split bill created successfully.');
        }
      }

      // Navigate back after success
      if (groupId) {
        onNavigate('group-details', { groupId });
      } else {
        onNavigate('bills');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create split bill');
    } finally {
      setSubmitting(false);
    }
  };

  const shareSplitDetails = async () => {
    if (!selectedPaymentMethod) {
      toast.error('No payment method selected');
      return;
    }

    const myShare = participants.find(p => p.friend.id === 'me')?.amount || 0;

    let splitDetails = `📄 Split Bill: ${billName || 'Untitled Bill'}
💰 Total Amount: ${currencySymbol}${totalAmount}
${description ? `📝 Description: ${description}\n` : ''}
${myShare > 0 ? `👥 Your Share: ${currencySymbol}${myShare.toFixed(2)}\n` : ''}
💳 Send payment to:`;

    if (selectedPaymentMethod.type === 'bank') {
      splitDetails += isNigeria
        ? `
🏦 ${selectedPaymentMethod.bankName}
👤 ${selectedPaymentMethod.accountHolderName}
🔢 Account: ${selectedPaymentMethod.accountNumber}
🏷️ Sort Code: ${selectedPaymentMethod.sortCode}`
        : `
🏦 ${selectedPaymentMethod.bankName}
👤 ${selectedPaymentMethod.accountHolderName}
🔢 Routing: ${selectedPaymentMethod.routingNumber}
💳 Account: ${selectedPaymentMethod.accountNumber}`;
    } else {
      splitDetails += `
📱 ${selectedPaymentMethod.provider}
📞 ${selectedPaymentMethod.phoneNumber}`;
    }

    try {
      if (navigator.share) {
        await navigator.share({ text: splitDetails });
        toast.success('Split details shared');
        return;
      }
      throw new Error('Share not supported');
    } catch {
      try {
        await navigator.clipboard.writeText(splitDetails);
        toast.success('Split details copied to clipboard');
      } catch {
        toast.error('Failed to share split details');
      }
    }
  };


  const getNextPaymentDate = () => {
    const now = new Date();
    let nextDate = new Date();

    if (recurringFrequency === 'weekly') {
      const daysOfWeek = {
        monday: 1, tuesday: 2, wednesday: 3, thursday: 4, 
        friday: 5, saturday: 6, sunday: 0
      };
      const targetDay = daysOfWeek[recurringDayOfWeek as keyof typeof daysOfWeek];
      const currentDay = now.getDay();
      const daysToAdd = (targetDay - currentDay + 7) % 7 || 7;
      nextDate.setDate(now.getDate() + daysToAdd);
    } else if (recurringFrequency === 'monthly') {
      if (recurringDay === 'last') {
        nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        if (nextDate <= now) {
          nextDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        }
      } else {
        const targetDay = parseInt(recurringDay);
        nextDate.setDate(targetDay);
        nextDate.setMonth(now.getMonth());
        if (nextDate <= now) {
          nextDate.setMonth(now.getMonth() + 1);
        }
        // Handle months with fewer days
        if (nextDate.getDate() !== targetDay) {
          nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0);
        }
      }
    } else if (recurringFrequency === 'quarterly') {
      if (recurringDay === 'last') {
        nextDate = new Date(now.getFullYear(), now.getMonth() + 3, 0);
        if (nextDate <= now) {
          nextDate = new Date(now.getFullYear(), now.getMonth() + 6, 0);
        }
      } else {
        const targetDay = parseInt(recurringDay);
        nextDate.setDate(targetDay);
        nextDate.setMonth(now.getMonth() + 3);
        if (nextDate <= now) {
          nextDate.setMonth(now.getMonth() + 6);
        }
      }
    }

    return nextDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getRecurringDescription = () => {
    if (recurringFrequency === 'weekly') {
      const dayName = recurringDayOfWeek.charAt(0).toUpperCase() + recurringDayOfWeek.slice(1);
      return `every ${dayName}`;
    } else if (recurringFrequency === 'monthly') {
      if (recurringDay === 'last') {
        return 'on the last day of each month';
      } else {
        const day = parseInt(recurringDay);
        const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
        return `on the ${day}${suffix} of each month`;
      }
    } else if (recurringFrequency === 'quarterly') {
      if (recurringDay === 'last') {
        return 'on the last day of every 3rd month';
      } else {
        const day = parseInt(recurringDay);
        const suffix = day === 1 ? 'st' : day === 15 ? 'th' : 'th';
        return `on the ${day}${suffix} of every 3rd month`;
      }
    }
    return recurringFrequency;
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="pb-20">
      {/* Static Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => groupId ? onNavigate('group-details', { groupId }) : onNavigate('home')}
            className="min-h-[44px] min-w-[44px] p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Split a Bill</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-4 space-y-6">

      {/* Bill Details */}
      <Card>
        <CardHeader>
          <CardTitle>Bill Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="billName">Bill Name *</Label>
            <Input
              id="billName"
              value={billName}
              onChange={(e) => setBillName(e.target.value)}
              placeholder="e.g., Dinner at Mario's"
              className="min-h-[48px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="totalAmount">Total Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                value={totalAmount}
                onChange={(e) => handleTotalAmountChange(e.target.value)}
                placeholder="0.00"
                className="pl-8 min-h-[48px]"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about the bill..."
              rows={3}
              className="min-h-[48px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Destination */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Payment Destination
          </CardTitle>
          <CardDescription>
            {includeMe 
              ? "Participants (including you) will send payments to this account"
              : "Your friends will send payments to this account"
            }
          </CardDescription>
        </CardHeader>
          <CardContent className="space-y-4">
            {accountsError && (
              <p className="text-sm text-red-500">{accountsError}</p>
            )}
          <PaymentMethodSelector
            methods={paymentMethods}
            selectedId={selectedPaymentMethod?.id || null}
            onSelect={setSelectedPaymentMethod}
            isNigeria={isNigeria}
            loading={accountsLoading}
          />
        </CardContent>
      </Card>

      {/* Participants */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants ({participants.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Include me</span>
              <Switch
                checked={includeMe}
                onCheckedChange={toggleIncludeMe}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Split Method Selection */}
          <div className="space-y-3">
            <Label>Split Method</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={splitMethod === 'equal' ? 'default' : 'outline'}
                onClick={() => handleSplitMethodChange('equal')}
                className="min-h-[44px] text-sm"
              >
                Equal
              </Button>
              <Button
                variant={splitMethod === 'percentage' ? 'default' : 'outline'}
                onClick={() => handleSplitMethodChange('percentage')}
                className="min-h-[44px] text-sm"
              >
                Percentage
              </Button>
              <Button
                variant={splitMethod === 'custom' ? 'default' : 'outline'}
                onClick={() => handleSplitMethodChange('custom')}
                className="min-h-[44px] text-sm"
              >
                Custom
              </Button>
            </div>
          </div>

          <Separator />

          {/* Current Participants */}
          {participants.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Split</span>
                <span className="text-sm text-muted-foreground">
                  {currencySymbol}{getTotalSplit().toFixed(2)} of {currencySymbol}{totalAmount || '0.00'}
                </span>
              </div>
              
              {participants.map((participant) => (
                <div key={participant.friend.id} className="flex items-center gap-3 p-3 border rounded-lg min-h-[60px]">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={participant.friend.avatar} />
                    <AvatarFallback>
                      {participant.friend.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{participant.friend.name}</p>
                    {splitMethod === 'equal' && (
                      <p className="text-xs text-muted-foreground">
                        {participants.length > 0 ? (100 / participants.length).toFixed(1) : 0}% each
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {splitMethod !== 'equal' && (
                      <div className="flex items-center gap-1">
                        {splitMethod === 'percentage' ? (
                          <Input
                            type="number"
                            value={participant.percentage?.toFixed(0) || '0'}
                            onChange={(e) => updateParticipantPercentage(participant.friend.id, parseFloat(e.target.value))}
                            className="w-16 h-8 text-xs text-center"
                            min="0"
                            max="100"
                          />
                        ) : (
                          <Input
                            type="number"
                            step="0.01"
                            value={participant.amount?.toFixed(2) || '0.00'}
                            onChange={(e) => updateParticipantAmount(participant.friend.id, parseFloat(e.target.value))}
                            className="w-20 h-8 text-xs text-center"
                            min="0"
                          />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {splitMethod === 'percentage' ? '%' : currencySymbol}
                        </span>
                      </div>
                    )}
                    
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {currencySymbol}{participant.amount?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeParticipant(participant.friend.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Add Participants - Using RequestMoney Style UI */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Add People</span>
              {availableFriends.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGroupSelection(!showGroupSelection)}
                  className="min-h-[36px]"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  {showGroupSelection ? 'Hide Groups' : 'Add Groups'}
                </Button>
              )}
            </div>

            {/* Group Selection - RequestMoney Style */}
            {showGroupSelection && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Select a group to add all members:</p>
                <div className="grid grid-cols-1 gap-2">
                  {groups.map((group) => {
                    const unselectedMembers = group.members.filter(member => 
                      !participants.some(p => p.friend.id === member.id) &&
                      availableFriends.some(f => f.id === member.id)
                    );
                    
                    return (
                      <Button
                        key={group.id}
                        variant="outline"
                        onClick={() => addGroupMembers(group)}
                        disabled={unselectedMembers.length === 0}
                        className="h-auto p-3 justify-start min-h-[52px]"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className={`w-8 h-8 rounded-full ${group.color} flex items-center justify-center flex-shrink-0`}>
                            <Users className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-medium text-sm">{group.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {unselectedMembers.length} of {group.members.length} members available
                            </p>
                          </div>
                          <UserPlus className="h-4 w-4 flex-shrink-0" />
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Individual Friends */}
            {availableFriends.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {availableFriends.slice(0, 5).map((friend) => (
                  <Button
                    key={friend.id}
                    variant="outline"
                    onClick={() => addParticipant(friend)}
                    className="h-auto p-3 justify-start min-h-[52px]"
                  >
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarImage src={friend.avatar} />
                      <AvatarFallback className="text-xs">
                        {friend.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-medium text-sm">{friend.name}</p>
                      <p className="text-xs text-muted-foreground">{friend.phoneNumber}</p>
                    </div>
                  </Button>
                ))}
                {availableFriends.length > 5 && (
                  <Button
                    variant="ghost"
                    onClick={() => onNavigate('add-friend')}
                    className="min-h-[44px]"
                  >
                    View all friends ({availableFriends.length - 5} more)
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">No more friends to add</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onNavigate('add-friend')}
                  className="min-h-[40px]"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New Friend
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recurring Options - Expanded by Default */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Recurring Split Bill
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Make this a recurring split</p>
              <p className="text-sm text-muted-foreground">
                Automatically create this split on a schedule
              </p>
            </div>
            <Switch
              checked={isRecurring}
              onCheckedChange={(checked) => {
                setIsRecurring(checked);
                if (!checked) {
                  setShowRecurringOptions(false);
                } else {
                  setShowRecurringOptions(true);
                }
              }}
            />
          </div>

          {/* Recurring Options - Always visible when switch is on */}
          {isRecurring && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Frequency</Label>
                  <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurringFrequency === 'weekly' ? (
                  <div>
                    <Label>Day of Week</Label>
                    <Select value={recurringDayOfWeek} onValueChange={setRecurringDayOfWeek}>
                      <SelectTrigger className="min-h-[44px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="tuesday">Tuesday</SelectItem>
                        <SelectItem value="wednesday">Wednesday</SelectItem>
                        <SelectItem value="thursday">Thursday</SelectItem>
                        <SelectItem value="friday">Friday</SelectItem>
                        <SelectItem value="saturday">Saturday</SelectItem>
                        <SelectItem value="sunday">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label>Day of {recurringFrequency === 'monthly' ? 'Month' : 'Quarter'}</Label>
                    <Select value={recurringDay} onValueChange={setRecurringDay}>
                      <SelectTrigger className="min-h-[44px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {i + 1}
                          </SelectItem>
                        ))}
                        <SelectItem value="last">Last Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">Next split:</span>{' '}
                  {getNextPaymentDate()} ({getRecurringDescription()})
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Options - Collapsible */}
      <Collapsible open={showAdvancedOptions} onOpenChange={setShowAdvancedOptions}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full min-h-[48px] justify-between">
            <span>Advanced Options</span>
            {showAdvancedOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          {/* Split Details Preview - Collapsible */}
          <Collapsible open={showSplitDetails} onOpenChange={setShowSplitDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full min-h-[44px] justify-between">
                <span>Preview Split Details</span>
                {showSplitDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Bill Name:</span>
                      <span className="text-sm font-medium">{billName || 'Untitled Bill'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Amount:</span>
                      <span className="text-sm font-medium">{currencySymbol}{totalAmount || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Participants:</span>
                      <span className="text-sm font-medium">{participants.length}</span>
                    </div>
                    {description && (
                      <div>
                        <span className="text-sm text-muted-foreground">Description:</span>
                        <p className="text-sm mt-1">{description}</p>
                      </div>
                    )}
                    <Separator />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={shareSplitDetails}
                      className="w-full min-h-[44px]"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Share Split Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </CollapsibleContent>
      </Collapsible>

      {/* Create Split Button */}
      <div className="space-y-3">
        <Button 
          onClick={handleCreateSplit}
          className="w-full min-h-[52px] text-base"
          disabled={submitting || !billName || !totalAmount || participants.length === 0 || !selectedPaymentMethod}
        >
          {submitting ? 'Creating…' : (isRecurring ? (
            <>
              <Repeat className="h-5 w-5 mr-2" />
              Create Recurring Split
            </>
          ) : (
            'Create Split Bill'
          ))}
        </Button>

        {/* Split Summary */}
        {participants.length > 0 && totalAmount && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Split {currencySymbol}{totalAmount} among {participants.length} {participants.length === 1 ? 'person' : 'people'}
            </p>
            {Math.abs(getTotalSplit() - parseFloat(totalAmount)) > 0.01 && (
              <p className="text-xs text-destructive mt-1">
                ⚠️ Split amounts don't match total
              </p>
            )}
          </div>
        )}
      </div>

      </div>
    </div>
  );
}
