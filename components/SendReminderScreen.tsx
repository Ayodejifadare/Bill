import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Send, MessageSquare, Bell, Users, Check, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { useUserProfile } from './UserProfileContext';
import { formatCurrencyForRegion } from '../utils/regions';
import { apiClient } from '../utils/apiClient';

interface SendReminderScreenProps {
  onNavigate: (tab: string, data?: Record<string, unknown>) => void;
  billSplitId?: string | null;
  paymentType?: 'bill_split' | 'direct_payment' | 'recurring' | 'outstanding_balance';
  friendId?: string;
  friendName?: string;
  amount?: number;
}

interface Participant {
  id: string;
  name: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  avatar: string;
  lastReminder?: string;
}

const reminderTemplates = [
  {
    id: 'friendly',
    name: 'Friendly Reminder',
    message: 'Hey! Just a friendly reminder about your payment for "{billTitle}". No rush, but when you get a chance, it would be great to settle up. Thanks! 😊'
  },
  {
    id: 'urgent',
    name: 'Urgent Reminder',
    message: 'Hi there! This is an urgent reminder about your outstanding payment for "{billTitle}". The payment is now overdue. Please settle as soon as possible. Thanks for your understanding.'
  },
  {
    id: 'professional',
    name: 'Professional',
    message: 'Dear {name}, This is a reminder regarding your payment of {amount} for "{billTitle}". Please process your payment at your earliest convenience. Best regards.'
  },
  {
    id: 'custom',
    name: 'Custom Message',
    message: ''
  }
];

export function SendReminderScreen({
  onNavigate,
  billSplitId = null,
  paymentType = 'bill_split',
  friendId,
  friendName,
  amount
}: SendReminderScreenProps) {
  const { appSettings, userProfile } = useUserProfile();
  const fmt = (n: number) => formatCurrencyForRegion(appSettings.region, n);

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [reminderType, setReminderType] = useState('friendly');
  const [customMessage, setCustomMessage] = useState('');
  const [includePaymentDetails, setIncludePaymentDetails] = useState(true);
  const [scheduleReminder, setScheduleReminder] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const buildAvatarInitials = useCallback((value?: string | null) => {
    if (!value) {
      return '??';
    }
    const initials = value
      .split(' ')
      .filter(Boolean)
      .map((segment) => segment[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return initials || '??';
  }, []);

  const [billTitle, setBillTitle] = useState(() => {
    if (billSplitId) {
      return 'Payment Reminder';
    }
    if (friendName) {
      return `Remind ${friendName}`;
    }
    if (paymentType === 'direct_payment') {
      return 'Direct Payment Reminder';
    }
    return 'Send Payment Reminder';
  });
  const [participants, setParticipants] = useState<Participant[]>(() => {
    if (!billSplitId && friendName) {
      const fallbackAmount = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
      const fallbackId = friendId || friendName || `participant-${Date.now()}`;
      return [
        {
          id: String(fallbackId),
          name: friendName,
          amount: fallbackAmount,
          status: 'pending',
          avatar: buildAvatarInitials(friendName),
        },
      ];
    }
    return [];
  });
  const [billLoading, setBillLoading] = useState<boolean>(!!billSplitId);
  const [billError, setBillError] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [autoSelected, setAutoSelected] = useState(false);

  const mapParticipantsFromResponse = useCallback(
    (rawParticipants: unknown): Participant[] => {
      if (!Array.isArray(rawParticipants)) {
        return [];
      }

      return rawParticipants
        .map((entry, index) => {
          if (!entry || typeof entry !== 'object') {
            return null;
          }

          const participantRecord = entry as Record<string, unknown>;
          const userValue = participantRecord['user'];
          const userRecord =
            userValue && typeof userValue === 'object'
              ? (userValue as Record<string, unknown>)
              : undefined;

          const userIdValue = participantRecord['userId'];
          const recordIdValue = participantRecord['id'];
          const userRecordIdValue = userRecord?.['id'];
          const participantIdValue =
            typeof userIdValue === 'string'
              ? userIdValue
              : userIdValue != null
                ? String(userIdValue)
                : typeof recordIdValue === 'string'
                  ? recordIdValue
                  : recordIdValue != null
                    ? String(recordIdValue)
                    : typeof userRecordIdValue === 'string'
                      ? userRecordIdValue
                      : userRecordIdValue != null
                        ? String(userRecordIdValue)
                        : undefined;
          const participantId = participantIdValue ?? `participant-${index}`;

          const nameValue = participantRecord['name'];
          const userNameValue = userRecord?.['name'];
          const name =
            typeof nameValue === 'string' && nameValue
              ? nameValue
              : typeof userNameValue === 'string' && userNameValue
                ? userNameValue
                : 'Unknown';

          const amountRaw = participantRecord['amount'];
          const shareRaw = participantRecord['share'];
          const amountValue =
            typeof amountRaw === 'number'
              ? amountRaw
              : typeof amountRaw === 'string'
                ? Number(amountRaw)
                : typeof shareRaw === 'number'
                  ? shareRaw
                  : typeof shareRaw === 'string'
                    ? Number(shareRaw)
                    : 0;
          const amount = Number.isFinite(amountValue) ? amountValue : 0;

          const paidRaw = participantRecord['paid'];
          const isPaidRaw = participantRecord['isPaid'];
          const statusRaw = participantRecord['status'];
          const paidFlag =
            typeof paidRaw === 'boolean'
              ? paidRaw
              : typeof isPaidRaw === 'boolean'
                ? isPaidRaw
                : false;
          const normalizedStatus =
            typeof statusRaw === 'string' ? statusRaw.toLowerCase() : undefined;
          const status: Participant['status'] = paidFlag || normalizedStatus === 'paid'
            ? 'paid'
            : normalizedStatus === 'overdue'
              ? 'overdue'
              : 'pending';

          const lastReminderValue = participantRecord['lastReminder'];
          const lastReminderAtValue = participantRecord['lastReminderAt'];
          const lastReminder =
            typeof lastReminderValue === 'string'
              ? lastReminderValue
              : typeof lastReminderAtValue === 'string'
                ? new Date(lastReminderAtValue).toLocaleString()
                : undefined;

          const avatarSource =
            typeof userRecord?.['name'] === 'string' && userRecord['name']
              ? String(userRecord['name'])
              : name;

          if (name.trim().toLowerCase() === 'you') {
            return null;
          }
          if (userProfile?.id && participantId === userProfile.id) {
            return null;
          }

          return {
            id: String(participantId),
            name,
            amount,
            status,
            avatar: buildAvatarInitials(avatarSource),
            lastReminder,
          } as Participant;
        })
        .filter(Boolean) as Participant[];
    },
    [buildAvatarInitials, userProfile?.id]
  );

  const loadBillDetails = useCallback(async () => {
    if (!billSplitId) {
      setBillLoading(false);
      setBillError(null);
      if (friendName) {
        const fallbackAmount = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
        const fallbackId = friendId || friendName || `participant-${Date.now()}`;
        setParticipants([
          {
            id: String(fallbackId),
            name: friendName,
            amount: fallbackAmount,
            status: 'pending',
            avatar: buildAvatarInitials(friendName),
          },
        ]);
        setBillTitle(`Remind ${friendName}`);
      } else {
        setParticipants([]);
        setBillTitle(paymentType === 'direct_payment' ? 'Direct Payment Reminder' : 'Send Payment Reminder');
      }
      return;
    }

    setBillLoading(true);
    setBillError(null);
    try {
      const data = await apiClient(`/api/bill-splits/${billSplitId}`);
      const billSplit = data?.billSplit ?? data;
      if (!billSplit) {
        throw new Error('Bill split not found');
      }

      const normalizedTitle =
        typeof billSplit.title === 'string' && billSplit.title.trim()
          ? billSplit.title
          : 'Payment Reminder';
      setBillTitle(normalizedTitle);
      setParticipants(mapParticipantsFromResponse(billSplit.participants));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load bill split';
      setBillError(message);
      setParticipants([]);
    } finally {
      setBillLoading(false);
    }
  }, [amount, billSplitId, buildAvatarInitials, friendId, friendName, mapParticipantsFromResponse, paymentType]);

  useEffect(() => {
    loadBillDetails();
  }, [loadBillDetails]);

  useEffect(() => {
    setAutoSelected(false);
    setSelectedParticipants([]);
  }, [billSplitId]);

  useEffect(() => {
    setSelectedParticipants((prev) =>
      prev.filter((id) => {
        const participant = participants.find((p) => p.id === id);
        return participant && participant.status !== 'paid';
      })
    );
  }, [participants]);

  const pendingParticipants = useMemo(
    () => participants.filter((p) => p.status !== 'paid'),
    [participants]
  );
  const overdueParticipants = useMemo(
    () => participants.filter((p) => p.status === 'overdue'),
    [participants]
  );

  // Auto-select participants with outstanding balances when screen loads
  useEffect(() => {
    if (!billSplitId || autoSelected || billLoading) {
      return;
    }
    if (pendingParticipants.length > 0) {
      const unpaidIds = pendingParticipants.map((p) => p.id);
      setSelectedParticipants(unpaidIds);
      toast.success(
        `Auto-selected ${unpaidIds.length} participant${unpaidIds.length > 1 ? 's' : ''} with outstanding payments`
      );
      setAutoSelected(true);
    }
  }, [autoSelected, billLoading, billSplitId, pendingParticipants]);

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const selectAllPending = () => {
    const pendingIds = pendingParticipants.map(p => p.id);
    setSelectedParticipants(pendingIds);
  };

  const selectAllOverdue = () => {
    const overdueIds = overdueParticipants.map(p => p.id);
    setSelectedParticipants(overdueIds);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-success text-success-foreground';
      case 'overdue':
        return 'bg-destructive text-destructive-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const selectedParticipantDetails = useMemo(
    () => participants.filter((participant) => selectedParticipants.includes(participant.id)),
    [participants, selectedParticipants]
  );

  const selectedTotalAmount = useMemo(
    () => selectedParticipantDetails.reduce((sum, participant) => sum + participant.amount, 0),
    [selectedParticipantDetails]
  );

  const previewParticipant = useMemo(() => {
    return (
      selectedParticipantDetails[0] ||
      pendingParticipants[0] ||
      participants[0] ||
      undefined
    );
  }, [pendingParticipants, participants, selectedParticipantDetails]);

  const getPreviewMessage = () => {
    const template = reminderTemplates.find(t => t.id === reminderType);
    if (!template) return '';

    if (reminderType === 'custom') {
      return customMessage;
    }

    let message = template.message;
    message = message.replace('{billTitle}', billTitle || 'your bill');

    const fallbackAmount = typeof amount === 'number' && Number.isFinite(amount) ? amount : 28.5;
    const exampleAmount = selectedParticipants.length <= 1
      ? (previewParticipant?.amount ?? fallbackAmount)
      : (selectedTotalAmount || fallbackAmount);
    message = message.replace('{amount}', fmt(exampleAmount));

    const nameReplacement = selectedParticipants.length <= 1
      ? (previewParticipant?.name ?? 'friend')
      : 'friends';
    message = message.replace('{name}', nameReplacement);

    return message;
  };

  const sendReminders = async () => {
    if (selectedParticipants.length === 0) {
      toast.error('Please select at least one participant');
      return;
    }

    if (reminderType === 'custom' && !customMessage.trim()) {
      toast.error('Please enter a custom message');
      return;
    }

    if (!billSplitId) {
      if (paymentType && paymentType !== 'bill_split') {
        toast.error('Reminders for this payment type are not available yet.');
      } else {
        toast.error('A bill split is required to send reminders.');
      }
      return;
    }

    if (billError) {
      toast.error('Resolve the bill split issue before sending reminders.');
      return;
    }

    const selectedDetails = participants.filter(p => selectedParticipants.includes(p.id));
    const totalAmount = selectedDetails.reduce((sum, p) => sum + p.amount, 0);

    const templateToSend = (() => {
      if (reminderType === 'custom') {
        return customMessage.trim();
      }
      const template = reminderTemplates.find(t => t.id === reminderType);
      if (!template) {
        return '';
      }
      let message = template.message;
      message = message.replace('{billTitle}', billTitle || 'your bill');
      const amountValue = selectedParticipants.length <= 1
        ? (selectedDetails[0]?.amount ?? totalAmount)
        : totalAmount;
      message = message.replace('{amount}', fmt(amountValue));
      const nameValue = selectedParticipants.length <= 1
        ? (selectedDetails[0]?.name ?? 'friend')
        : 'friends';
      message = message.replace('{name}', nameValue);
      return message;
    })();

    const payload = {
      participantIds: selectedParticipants,
      template: templateToSend,
      type: reminderType,
    };

    setSendingReminders(true);
    try {
      const response: unknown = await apiClient(`/api/bill-splits/${billSplitId}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const reminderResponse =
        typeof response === 'object' && response !== null
          ? (response as Record<string, unknown>)['reminders']
          : undefined;
      const reminders = Array.isArray(reminderResponse) ? reminderResponse : [];
      const reminderLabels = new Map<string, string>();
      reminders.forEach((entry) => {
        if (!entry || typeof entry !== 'object') {
          return;
        }
        const reminderRecord = entry as Record<string, unknown>;
        const recipientValue = reminderRecord['recipientId'];
        const recipientId =
          typeof recipientValue === 'string'
            ? recipientValue
            : recipientValue != null
              ? String(recipientValue)
              : undefined;
        if (!recipientId) {
          return;
        }
        const channelsValue = reminderRecord['channels'];
        const channels = Array.isArray(channelsValue)
          ? channelsValue.filter((channel): channel is string => typeof channel === 'string')
          : [];
        const normalizedChannels = channels
          .map((channel) => {
            const lower = channel.toLowerCase();
            switch (lower) {
              case 'push':
                return 'push';
              case 'email':
                return 'email';
              case 'sms':
                return 'SMS';
              default:
                return channel;
            }
          })
          .join(', ');
        const label = normalizedChannels
          ? `just now via ${normalizedChannels}`
          : 'just now';
        reminderLabels.set(recipientId, label);
      });

      if (reminderLabels.size > 0) {
        setParticipants((prev) =>
          prev.map((participant) =>
            reminderLabels.has(participant.id)
              ? { ...participant, lastReminder: reminderLabels.get(participant.id) ?? 'just now' }
              : participant
          )
        );
        setSelectedParticipants((prev) => prev.filter((id) => !reminderLabels.has(id)));
      }

      const action = scheduleReminder ? 'scheduled' : 'sent';
      const reminderCount = reminders.length || selectedParticipants.length;
      toast.success(
        `Payment reminder ${action} to ${reminderCount} participant${reminderCount === 1 ? '' : 's'} for ${fmt(totalAmount)} total outstanding`
      );

      setTimeout(() => {
        onNavigate(billSplitId ? 'bills' : 'home');
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reminders';
      toast.error(message);
    } finally {
      setSendingReminders(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Sticky */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center space-x-3 px-4 py-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onNavigate(billSplitId ? 'bills' : 'home')}
            className="min-h-[44px] min-w-[44px] -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">Send Payment Reminder</h2>
            <p className="text-sm text-muted-foreground truncate">
              {billTitle}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 pb-32">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllPending}
            className="h-12"
            disabled={pendingParticipants.length === 0 || billLoading}
          >
            <div className="text-center">
              <div className="text-sm font-medium">All Pending</div>
              <div className="text-xs text-muted-foreground">({pendingParticipants.filter(p => p.status === 'pending').length})</div>
            </div>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllOverdue}
            className="h-12"
            disabled={overdueParticipants.length === 0 || billLoading}
          >
            <div className="text-center">
              <div className="text-sm font-medium">All Overdue</div>
              <div className="text-xs text-muted-foreground">({overdueParticipants.length})</div>
            </div>
          </Button>
        </div>

        {/* Participant Selection */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Select Recipients
            </CardTitle>
            <CardDescription>
              Choose who to send the payment reminder to
            </CardDescription>
          </CardHeader>
          <CardContent>
            {billLoading ? (
              <p className="text-sm text-muted-foreground">Loading participants...</p>
            ) : billError ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{billError}</p>
                <Button size="sm" variant="outline" onClick={() => loadBillDetails()}>
                  Retry
                </Button>
              </div>
            ) : participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No participants available to remind.</p>
            ) : (
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                      selectedParticipants.includes(participant.id)
                        ? 'border-primary bg-accent'
                        : 'border-border hover:bg-muted/50'
                    } ${participant.status !== 'paid' ? 'cursor-pointer' : 'opacity-60'}`}
                    onClick={() => participant.status !== 'paid' && toggleParticipant(participant.id)}
                  >
                    <Checkbox
                      checked={selectedParticipants.includes(participant.id)}
                      disabled={participant.status === 'paid'}
                      className="flex-shrink-0"
                    />
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="text-sm">{participant.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{participant.name}</p>
                          <div className="text-sm text-muted-foreground">
                            <div>{fmt(participant.amount)}</div>
                            {participant.lastReminder && (
                              <div className="text-xs">Last reminded {participant.lastReminder}</div>
                            )}
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(participant.status)} text-xs flex-shrink-0`}>
                          {participant.status === 'paid' && <Check className="h-3 w-3 mr-1" />}
                          {participant.status === 'overdue' && <Clock className="h-3 w-3 mr-1" />}
                          {participant.status.charAt(0).toUpperCase() + participant.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedParticipants.length > 0 && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                <p className="text-sm font-medium">
                  {selectedParticipants.length} participant{selectedParticipants.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-sm text-muted-foreground">
                  Total amount: {fmt(selectedTotalAmount)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Template */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              Reminder Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Message Template</Label>
              <RadioGroup value={reminderType} onValueChange={setReminderType} className="space-y-3">
                {reminderTemplates.map((template) => (
                  <div key={template.id} className="flex items-center space-x-3 p-2">
                    <RadioGroupItem value={template.id} id={template.id} className="flex-shrink-0" />
                    <Label htmlFor={template.id} className="flex-1 cursor-pointer text-sm leading-relaxed">
                      {template.name}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {reminderType === 'custom' && (
              <div>
                <Label htmlFor="custom-message" className="text-sm font-medium">Custom Message</Label>
                <Textarea
                  id="custom-message"
                  placeholder="Write your custom reminder message..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                  className="mt-2 resize-none"
                />
              </div>
            )}

            {/* Message Preview */}
            <div>
              <Label className="text-sm font-medium">Message Preview</Label>
              <div className="p-3 bg-muted/50 rounded-lg mt-2 min-h-[60px]">
                <p className="text-sm whitespace-pre-line leading-relaxed">
                  {getPreviewMessage() || 'Select a template or write a custom message...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Options */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Additional Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label className="text-sm font-medium">Include Payment Details</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Include bank account and payment information
                </p>
              </div>
              <Checkbox 
                checked={includePaymentDetails}
                onCheckedChange={(checked) => setIncludePaymentDetails(checked === true)}
                className="flex-shrink-0 mt-1"
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label className="text-sm font-medium">Schedule Reminder</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Send the reminder at a specific time
                </p>
              </div>
              <Checkbox 
                checked={scheduleReminder}
                onCheckedChange={(checked) => setScheduleReminder(checked === true)}
                className="flex-shrink-0 mt-1"
              />
            </div>

            {scheduleReminder && (
              <div className="pl-4 border-l-2 border-border space-y-3">
                <Label className="text-sm font-medium">Schedule Time</Label>
                <Select value={scheduleTime} onValueChange={setScheduleTime}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select when to send" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1hour">In 1 hour</SelectItem>
                    <SelectItem value="tomorrow">Tomorrow morning (9 AM)</SelectItem>
                    <SelectItem value="3days">In 3 days</SelectItem>
                    <SelectItem value="1week">In 1 week</SelectItem>
                    <SelectItem value="custom">Custom date/time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Reminder Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Recipients</span>
                <span className="font-medium">{selectedParticipants.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Message Type</span>
                <span className="font-medium text-sm">
                  {reminderTemplates.find(t => t.id === reminderType)?.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Include Payment Details</span>
                <span className="font-medium">{includePaymentDetails ? 'Yes' : 'No'}</span>
              </div>
              {scheduleReminder && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Scheduled</span>
                  <span className="font-medium text-sm">{scheduleTime || 'Not set'}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Bell className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium mb-2">Reminder Tips</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Be polite and understanding in your messages</li>
                  <li>• Include payment details to make it easy for others</li>
                  <li>• Avoid sending too many reminders in a short time</li>
                  <li>• Consider scheduling reminders for appropriate times</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Action Buttons at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="max-w-md mx-auto space-y-3">
          <Button
            className="w-full h-12 text-base font-medium"
            onClick={sendReminders}
            disabled={
              selectedParticipants.length === 0 ||
              sendingReminders ||
              billLoading ||
              (!!billError && !!billSplitId)
            }
          >
            <Send className="h-5 w-5 mr-2" />
            {sendingReminders
              ? 'Sending...'
              : scheduleReminder
                ? 'Schedule Reminder'
                : 'Send Reminder Now'}
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-12"
            onClick={() => onNavigate(billSplitId ? 'bills' : 'home')}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
