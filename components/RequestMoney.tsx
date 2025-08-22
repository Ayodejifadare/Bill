import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, Building2, Copy, Send, Users, UserPlus, Repeat, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Checkbox } from './ui/checkbox';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { useUserProfile } from './UserProfileContext';
// Removed unused Share2-related imports as sharing is handled via copy-to-clipboard
// utilities rather than a dedicated share action.
import { createRequest } from '../utils/request-api';
import { PaymentMethodSelector, PaymentMethod } from './PaymentMethodSelector';
import { useFriends, Friend } from '../hooks/useFriends';
import { apiClient } from '../utils/apiClient';


interface Group {
  id: string;
  name: string;
  members: Friend[];
  color: string;
}

interface RequestMoneyProps {
  onNavigate: (screen: string) => void;
  prefillData?: {
    amount?: string;
    message?: string;
    friendId?: string;
  } | null;
}

export function RequestMoney({ onNavigate, prefillData }: RequestMoneyProps) {
  const { appSettings, userProfile } = useUserProfile();
  const isNigeria = appSettings.region === 'NG';
  const currencySymbol = isNigeria ? '₦' : '$';
  
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showGroupSelection, setShowGroupSelection] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [recurringDay, setRecurringDay] = useState('1');
  const [recurringDayOfWeek, setRecurringDayOfWeek] = useState('monday');
  const [groups, setGroups] = useState<Group[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { friends } = useFriends();

  const loadGroups = useCallback(async () => {
    try {
      const data = await apiClient('/api/groups');
      const groupsData: Group[] = (data.groups || []).map((g: {
        id: string;
        name: string;
        members?: string[];
        color?: string;
      }) => ({
        id: g.id,
        name: g.name,
        members: (g.members || [])
          .map((id: string) => friends.find(f => f.id === id))
          .filter(Boolean) as Friend[],
        color: g.color || 'bg-blue-500',
      }));
      setGroups(groupsData);
    } catch (err) {
      console.error('Failed to load groups', err);
    }
  }, [friends]);

  useEffect(() => {
    loadGroups();
    const refresh = () => loadGroups();
    window.addEventListener('groupsUpdated', refresh);
    return () => {
      window.removeEventListener('groupsUpdated', refresh);
    };
  }, [loadGroups]);

  useEffect(() => {
    const methods: PaymentMethod[] = (userProfile.linkedBankAccounts || []).map(acc => ({
      id: acc.id,
      type: 'bank',
      bankName: acc.bankName,
      accountNumber: acc.accountNumber,
      accountHolderName: acc.accountName,
      routingNumber: !isNigeria ? acc.routingNumber : undefined,
      sortCode: isNigeria ? acc.routingNumber : undefined,
      accountType: acc.accountType,
      isDefault: acc.isDefault,
    }));
    setPaymentMethods(methods);
    const defaultMethod = methods.find(m => m.isDefault) || null;
    setSelectedPaymentMethod(prev => {
      if (prev && methods.some(m => m.id === prev.id)) {
        return prev;
      }
      return defaultMethod;
    });
  }, [userProfile.linkedBankAccounts, isNigeria]);

  useEffect(() => {
    if (!prefillData) return;
    if (prefillData.amount) setAmount(prefillData.amount);
    if (prefillData.message) setMessage(prefillData.message);
    if (prefillData.friendId && friends.length > 0) {
      const friend = friends.find(f => f.id === prefillData.friendId);
      if (friend) setSelectedFriends([friend]);
    }
  }, [prefillData, friends]);

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFriendSelection = (friend: Friend) => {
    setSelectedFriends(current => {
      const isSelected = current.some(f => f.id === friend.id);
      if (isSelected) {
        return current.filter(f => f.id !== friend.id);
      } else {
        return [...current, friend];
      }
    });
  };

  const addGroupMembers = (group: Group) => {
    const newMembers = group.members.filter(member => 
      !selectedFriends.some(f => f.id === member.id)
    );

    setSelectedFriends(current => [...current, ...newMembers]);
    toast.success(`Added ${newMembers.length} members from ${group.name}`);
    setShowGroupSelection(false);
  };


  const handleSendRequest = async () => {
    if (selectedFriends.length === 0) {
      toast.error('Please select at least one friend');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method for receiving payments');
      return;
    }

    setIsSubmitting(true);
    try {
      await createRequest({
        amount: parseFloat(amount),
        recipients: selectedFriends.map(f => f.id),
        paymentMethod: selectedPaymentMethod,
        message: message.trim() || undefined,
      });

      if (isRecurring) {
        toast.success(`Recurring money request created! This will be sent to ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''} ${recurringFrequency}. Payment details have been included.`);
      } else {
        toast.success(`Money request sent to ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}! Payment details have been included.`);
      }

      setSelectedFriends([]);
      setAmount('');
      setMessage('');

      onNavigate('home');
    } catch (error) {
      console.error('Failed to send request', error);
      const message = error instanceof Error ? error.message : 'Failed to send request. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareRequestDetails = async () => {
    if (!selectedPaymentMethod || selectedFriends.length === 0 || !amount) {
      toast.error('Please complete all required fields');
      return;
    }

    let requestDetails = `💰 Payment Request: ${currencySymbol}${amount}
${message ? `📝 Message: ${message}\n` : ''}
🏦 Send payment to:`;

    if (selectedPaymentMethod.type === 'bank') {
      requestDetails += isNigeria 
        ? `
${selectedPaymentMethod.bankName}
👤 ${selectedPaymentMethod.accountHolderName}
🔢 Account: ${selectedPaymentMethod.accountNumber}
🏷️ Sort Code: ${selectedPaymentMethod.sortCode}`
        : `
${selectedPaymentMethod.bankName}
👤 ${selectedPaymentMethod.accountHolderName}
🔢 Routing: ${selectedPaymentMethod.routingNumber}
💳 Account: ${selectedPaymentMethod.accountNumber}`;
    } else {
      requestDetails += `
📱 ${selectedPaymentMethod.provider}
📞 ${selectedPaymentMethod.phoneNumber}`;
    }

    requestDetails += `

Recipients: ${selectedFriends.map(f => f.name).join(', ')}`;

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      toast.error('Clipboard not supported. Please copy manually.');
      return;
    }

    try {
      await navigator.clipboard.writeText(requestDetails);
      toast.success('Request details copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy request. Please copy manually.');
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

  return (
    <div className="pb-20">
      {/* Static Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('home')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1>Request Money</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">

      {/* Amount */}
      <Card>
        <CardHeader>
          <CardTitle>Request Amount</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-lg pl-8"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's this request for?"
              rows={3}
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
            Your friends will send payments to this account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PaymentMethodSelector
            methods={paymentMethods}
            selectedId={selectedPaymentMethod?.id || null}
            onSelect={setSelectedPaymentMethod}
            isNigeria={isNigeria}
            onManage={() => onNavigate('payment-methods')}
          />
        </CardContent>
      </Card>

      {/* Select Friends */}
      <Card>
        <CardHeader>
          <CardTitle>Send Request To</CardTitle>
          <CardDescription>
            Select friends to send this payment request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Group Toggle */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search friends..."
                className="pl-10"
              />
            </div>
            
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGroupSelection(!showGroupSelection)}
                className="h-8 px-3"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                {showGroupSelection ? 'Hide Groups' : 'Add Groups'}
              </Button>
            </div>

            {/* Group Selection */}
            {showGroupSelection && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Select a group to add all members:</p>
                <div className="grid grid-cols-1 gap-2">
                  {groups.map((group) => {
                    const unselectedMembers = group.members.filter(member => 
                      !selectedFriends.some(f => f.id === member.id)
                    );
                    
                    return (
                      <Button
                        key={group.id}
                        variant="outline"
                        onClick={() => addGroupMembers(group)}
                        disabled={unselectedMembers.length === 0}
                        className="h-auto p-3 justify-start"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className={`w-8 h-8 rounded-full ${group.color} flex items-center justify-center`}>
                            <Users className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-sm">{group.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {unselectedMembers.length} of {group.members.length} members available
                            </p>
                          </div>
                          <UserPlus className="h-4 w-4" />
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Selected Friends Summary */}
          {selectedFriends.length > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''} selected
                    </span>
                    {amount && (
                      <Badge variant="secondary">
                        {currencySymbol}{parseFloat(amount).toFixed(2)} each
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFriends([])}
                    className="text-xs h-6 px-2"
                  >
                    Clear all
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Friends List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredFriends.map((friend) => {
              const isSelected = selectedFriends.some(f => f.id === friend.id);
              return (
                <div
                  key={friend.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted'
                  }`}
                  onClick={() => toggleFriendSelection(friend)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={friend.avatar} />
                      <AvatarFallback>
                        {friend.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{friend.name}</p>
                      {friend.phoneNumber && (
                        <p className="text-sm text-muted-foreground">{friend.phoneNumber}</p>
                      )}
                    </div>
                  </div>
                  
                  <Checkbox
                    checked={isSelected}
                    onChange={() => toggleFriendSelection(friend)}
                  />
                </div>
              );
            })}
          </div>

          {filteredFriends.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No friends found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Summary */}
      {selectedFriends.length > 0 && amount && selectedPaymentMethod && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">Request Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount per person:</span>
              <span className="font-medium">{currencySymbol}{parseFloat(amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total expected:</span>
              <span className="font-medium">{currencySymbol}{(parseFloat(amount) * selectedFriends.length).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipients:</span>
              <span className="font-medium">{selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment to:</span>
              <span className="font-medium">
                {selectedPaymentMethod.type === 'bank' ? selectedPaymentMethod.bankName : selectedPaymentMethod.provider}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recurring Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Recurring Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Make this a recurring request</p>
              <p className="text-sm text-muted-foreground">
                Automatically send this request on a schedule
              </p>
            </div>
            <Switch
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>
          
          {isRecurring && (
            <div className="pl-4 border-l-2 border-border space-y-3">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="frequency">Repeat Frequency</Label>
                  <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly (Every 3 months)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurringFrequency === 'weekly' && (
                  <div>
                    <Label htmlFor="dayOfWeek">Day of the week</Label>
                    <Select value={recurringDayOfWeek} onValueChange={setRecurringDayOfWeek}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Every Monday</SelectItem>
                        <SelectItem value="tuesday">Every Tuesday</SelectItem>
                        <SelectItem value="wednesday">Every Wednesday</SelectItem>
                        <SelectItem value="thursday">Every Thursday</SelectItem>
                        <SelectItem value="friday">Every Friday</SelectItem>
                        <SelectItem value="saturday">Every Saturday</SelectItem>
                        <SelectItem value="sunday">Every Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {recurringFrequency === 'monthly' && (
                  <div>
                    <Label htmlFor="dayOfMonth">Request date</Label>
                    <Select value={recurringDay} onValueChange={setRecurringDay}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st of the month</SelectItem>
                        <SelectItem value="2">2nd of the month</SelectItem>
                        <SelectItem value="3">3rd of the month</SelectItem>
                        <SelectItem value="4">4th of the month</SelectItem>
                        <SelectItem value="5">5th of the month</SelectItem>
                        <SelectItem value="10">10th of the month</SelectItem>
                        <SelectItem value="15">15th of the month</SelectItem>
                        <SelectItem value="20">20th of the month</SelectItem>
                        <SelectItem value="25">25th of the month</SelectItem>
                        <SelectItem value="28">28th of the month</SelectItem>
                        <SelectItem value="last">Last day of the month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {recurringFrequency === 'quarterly' && (
                  <div>
                    <Label htmlFor="quarterlyDay">Request date</Label>
                    <Select value={recurringDay} onValueChange={setRecurringDay}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st of every 3rd month</SelectItem>
                        <SelectItem value="15">15th of every 3rd month</SelectItem>
                        <SelectItem value="last">Last day of every 3rd month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <p className="text-sm">
                  <strong>Note:</strong> This will automatically send the same request {getRecurringDescription()} to the selected friends. You'll receive notifications when requests are sent.
                </p>
                <div className="pt-1 border-t border-border/50">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Next request:</span>
                    <span className="font-medium ml-1">{getNextPaymentDate()}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={shareRequestDetails}
          disabled={selectedFriends.length === 0 || !amount || !selectedPaymentMethod}
          className="flex-1"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy Details
        </Button>
        <Button
          onClick={handleSendRequest}
          disabled={selectedFriends.length === 0 || !amount || !selectedPaymentMethod || isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {isRecurring ? 'Create Recurring Request' : 'Send Request'}
            </>
          )}
        </Button>
      </div>
      </div>
    </div>
  );
}