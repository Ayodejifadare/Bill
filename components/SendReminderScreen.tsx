import { useState, useEffect } from 'react';
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
import { toast } from 'sonner@2.0.3';
import { useUserProfile } from './UserProfileContext';

interface SendReminderScreenProps {
  onNavigate: (tab: string, data?: any) => void;
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
  const { appSettings } = useUserProfile();
  const currencySymbol = appSettings.region === 'NG' ? '₦' : '$';
  
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [reminderType, setReminderType] = useState('friendly');
  const [customMessage, setCustomMessage] = useState('');
  const [includePaymentDetails, setIncludePaymentDetails] = useState(true);
  const [scheduleReminder, setScheduleReminder] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');

  // Get bill data based on billSplitId - matches BillsScreen data
  const getBillData = () => {
    const billSplits = [
      {
        id: '1',
        title: 'Dinner at Tony\'s Pizza',
        totalAmount: 75.00,
        participants: [
          { id: 'p1', name: 'Sarah Johnson', amount: 18.75, paid: true },
          { id: 'p2', name: 'Mike Chen', amount: 18.75, paid: false },
          { id: 'p3', name: 'Emily Davis', amount: 18.75, paid: true },
          { id: 'p4', name: 'You', amount: 18.75, paid: false },
        ]
      },
      {
        id: '2',
        title: 'Uber to Airport',
        totalAmount: 45.00,
        participants: [
          { id: 'p5', name: 'Alex Rodriguez', amount: 15.00, paid: true },
          { id: 'p6', name: 'Jessica Lee', amount: 15.00, paid: true },
          { id: 'p7', name: 'You', amount: 15.00, paid: true },
        ]
      },
      {
        id: '3',
        title: 'Grocery Shopping',
        totalAmount: 120.50,
        participants: [
          { id: 'p8', name: 'Mike Chen', amount: 40.17, paid: true },
          { id: 'p9', name: 'Emily Davis', amount: 40.17, paid: false },
          { id: 'p10', name: 'You', amount: 40.16, paid: true },
        ]
      }
    ];

    if (billSplitId) {
      const bill = billSplits.find(b => b.id === billSplitId);
      return bill || billSplits[0];
    }
    return billSplits[0];
  };

  const billData = getBillData();
  
  // Convert bill participants to reminder participants format
  const getParticipantsFromBill = (): Participant[] => {
    return billData.participants
      .filter(p => p.name !== 'You') // Exclude current user
      .map(p => ({
        id: p.id,
        name: p.name,
        amount: p.amount,
        status: p.paid ? 'paid' as const : 'pending' as const,
        avatar: p.name.split(' ').map(n => n[0]).join(''),
        lastReminder: p.paid ? undefined : Math.random() > 0.5 ? '2 days ago' : undefined
      }));
  };

  const participants = getParticipantsFromBill();
  const pendingParticipants = participants.filter(p => p.status !== 'paid');
  const overdueParticipants = participants.filter(p => p.status === 'overdue');

  // Auto-select participants with outstanding balances when screen loads
  useEffect(() => {
    if (billSplitId && pendingParticipants.length > 0) {
      const unpaidIds = pendingParticipants.map(p => p.id);
      setSelectedParticipants(unpaidIds);
      
      // Show success message indicating auto-selection
      toast.success(`Auto-selected ${unpaidIds.length} participant${unpaidIds.length > 1 ? 's' : ''} with outstanding payments`);
    }
  }, [billSplitId, pendingParticipants.length]);

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

  const getPreviewMessage = () => {
    const template = reminderTemplates.find(t => t.id === reminderType);
    if (!template) return '';
    
    if (reminderType === 'custom') {
      return customMessage;
    }
    
    let message = template.message;
    message = message.replace('{billTitle}', billData.title);
    message = message.replace('{name}', 'John'); // Example name
    message = message.replace('{amount}', `${currencySymbol}28.50`); // Example amount
    
    return message;
  };

  const sendReminders = () => {
    if (selectedParticipants.length === 0) {
      toast.error('Please select at least one participant');
      return;
    }
    
    if (reminderType === 'custom' && !customMessage.trim()) {
      toast.error('Please enter a custom message');
      return;
    }
    
    // Get selected participant details for detailed toast
    const selectedDetails = participants.filter(p => selectedParticipants.includes(p.id));
    const totalAmount = selectedDetails.reduce((sum, p) => sum + p.amount, 0);
    
    const action = scheduleReminder ? 'scheduled' : 'sent';
    toast.success(
      `Payment reminder ${action} to ${selectedParticipants.length} participant${selectedParticipants.length > 1 ? 's' : ''} for ${currencySymbol}${totalAmount.toFixed(2)} total outstanding`
    );
    
    // Navigate back after successful send
    setTimeout(() => {
      onNavigate(billSplitId ? 'bills' : 'home');
    }, 1500);
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
              {billData.title}
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
                          <div>{currencySymbol}{participant.amount.toFixed(2)}</div>
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
            
            {selectedParticipants.length > 0 && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                <p className="text-sm font-medium">
                  {selectedParticipants.length} participant{selectedParticipants.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-sm text-muted-foreground">
                  Total amount: {currencySymbol}
                  {selectedParticipants.reduce((sum, id) => {
                    const participant = participants.find(p => p.id === id);
                    return sum + (participant?.amount || 0);
                  }, 0).toFixed(2)}
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
                onCheckedChange={setIncludePaymentDetails}
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
                onCheckedChange={setScheduleReminder}
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
            disabled={selectedParticipants.length === 0}
          >
            <Send className="h-5 w-5 mr-2" />
            {scheduleReminder ? 'Schedule Reminder' : 'Send Reminder Now'}
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