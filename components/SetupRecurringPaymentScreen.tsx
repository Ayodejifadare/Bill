import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Calendar, Clock, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Switch } from './ui/switch';
import { Avatar, AvatarFallback } from './ui/avatar';
import { toast } from 'sonner';
import { useUserProfile } from './UserProfileContext';
import { formatCurrencyForRegion, getCurrencySymbol } from '../utils/regions';
import { fetchPaymentMethods as apiFetchPaymentMethods, type PaymentMethod as ApiPaymentMethod } from '@/api/payment-methods';
import { apiClient } from '../utils/apiClient';

interface SetupRecurringPaymentScreenProps {
  onNavigate: (tab: string, data?: unknown) => void;
  paymentId?: string | null;
  editMode?: boolean;
}

interface PaymentMethod {
  id: string;
  type: 'bank' | 'mobile_money';
  name: string;
  details: string;
}

interface Friend {
  id: string;
  name: string;
  avatar?: string;
}

const categories = [
  'Housing', 'Transportation', 'Food & Groceries', 'Entertainment',
  'Health & Fitness', 'Utilities', 'Shopping', 'Education', 'Other'
];

// Fetch friends and payment methods

export function SetupRecurringPaymentScreen({
  onNavigate,
  paymentId = null,
  editMode = false
}: SetupRecurringPaymentScreenProps) {
  const { appSettings } = useUserProfile();
  const currencySymbol = getCurrencySymbol(appSettings.region);
  const fmt = (n: number | string) => {
    const num = typeof n === 'string' ? parseFloat(n || '0') : n;
    return formatCurrencyForRegion(appSettings.region, isNaN(num as number) ? 0 : (num as number));
  };

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const methods = await apiFetchPaymentMethods();
      const formatted: PaymentMethod[] = methods.map((m: ApiPaymentMethod) => ({
        id: m.id,
        type: m.type,
        name: m.type === 'bank'
          ? m.bank || m.accountName || 'Bank Account'
          : m.provider || 'Mobile Money',
        details:
          m.type === 'bank'
            ? `****${(m.accountNumber || '').slice(-4)}`
            : m.phoneNumber || '',
      }));
      setPaymentMethods(formatted);
    } catch (err) {
      console.error('Failed to load payment methods', err);
    }
  }, []);

  const loadFriends = useCallback(async () => {
    try {
      const data: { friends?: Friend[] } = await apiClient('/friends');
      const friendsData: Friend[] = (data.friends || []).map((f) => ({
        id: f.id,
        name: f.name,
        avatar: f.avatar,
      }));
      setFriends(friendsData);
    } catch (err) {
      console.error('Failed to load friends', err);
    }
  }, []);
  
  const [formData, setFormData] = useState({
    title: '',
    recipient: '',
    amount: '',
    frequency: 'monthly',
    startDate: new Date(),
    endDate: null as Date | null,
    hasEndDate: false,
    totalPayments: '',
    category: '',
    paymentMethod: '',
    notes: '',
    type: 'direct_payment' as 'direct_payment' | 'bill_split' | 'subscription'
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const refreshAll = () => {
      loadFriends();
      loadPaymentMethods();
    };
    refreshAll();
    window.addEventListener('friendsUpdated', loadFriends);
    window.addEventListener('paymentMethodsUpdated', loadPaymentMethods);
    window.addEventListener('focus', refreshAll);
    return () => {
      window.removeEventListener('friendsUpdated', loadFriends);
      window.removeEventListener('paymentMethodsUpdated', loadPaymentMethods);
      window.removeEventListener('focus', refreshAll);
    };
  }, [loadFriends, loadPaymentMethods]);

  // Load existing payment data if editing
  useEffect(() => {
    if (editMode && paymentId) {
      const fetchPayment = async () => {
        try {
          const data = await apiClient(`/recurring-payments/${paymentId}`);
          setFormData(prev => ({
            ...prev,
            title: data.title ?? '',
            recipient: data.recipient ?? '',
            amount: data.amount != null ? data.amount.toString() : '',
            frequency: data.frequency ?? 'monthly',
            startDate: data.startDate ? new Date(data.startDate) : new Date(),
            endDate: data.endDate ? new Date(data.endDate) : null,
            hasEndDate: Boolean(data.endDate || data.totalPayments),
            totalPayments: data.totalPayments != null ? data.totalPayments.toString() : '',
            category: data.category ?? '',
            paymentMethod: data.paymentMethod ?? '',
            notes: data.notes ?? '',
            type: (data.type ?? 'direct_payment') as 'direct_payment' | 'bill_split' | 'subscription',
          }));
        } catch (err) {
          console.error('Failed to load recurring payment', err);
          toast.error('Failed to load recurring payment');
        }
      };
      fetchPayment();
    }
  }, [editMode, paymentId]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.recipient) {
      newErrors.recipient = 'Recipient is required';
    } else if (!friends.some(f => f.id === formData.recipient)) {
      newErrors.recipient = 'Invalid recipient';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }
    if (!formData.frequency) newErrors.frequency = 'Frequency is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    } else if (!paymentMethods.some(pm => pm.id === formData.paymentMethod)) {
      newErrors.paymentMethod = 'Invalid payment method';
    }
    
    if (formData.hasEndDate) {
      if (!formData.endDate && !formData.totalPayments) {
        newErrors.endCondition = 'End date or total payments is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    const payload = {
      title: formData.title,
      recipient: formData.recipient,
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      startDate: formData.startDate.toISOString(),
      endDate: formData.hasEndDate && formData.endDate ? formData.endDate.toISOString() : null,
      totalPayments: formData.totalPayments ? parseInt(formData.totalPayments) : null,
      category: formData.category,
      paymentMethod: formData.paymentMethod,
      type: formData.type,
    };

    try {
      if (editMode && paymentId) {
        await apiClient(`/recurring-payments/${paymentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        toast.success('Recurring payment updated successfully');
      } else {
        await apiClient('/recurring-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        toast.success('Recurring payment created successfully');
      }
      window.dispatchEvent(new Event('recurringPaymentsUpdated'));
      onNavigate('recurring-payments');
    } catch (err) {
      console.error('Failed to save recurring payment', err);
      toast.error('Failed to save recurring payment');
    }
  };

  const getFrequencyPreview = () => {
    const amount = parseFloat(formData.amount) || 0;
    const frequency = formData.frequency;
    
    let multiplier = 1;
    let period = 'month';
    
    switch (frequency) {
      case 'weekly':
        multiplier = 4.33;
        period = 'month';
        break;
      case 'monthly':
        multiplier = 1;
        period = 'month';
        break;
      case 'quarterly':
        multiplier = 1/3;
        period = 'month';
        break;
      case 'yearly':
        multiplier = 1/12;
        period = 'month';
        break;
    }
    
    const monthlyAmount = amount * multiplier;
    return `~ ${fmt(monthlyAmount)} per ${period}`;
  };

  const selectedPaymentMethod = paymentMethods.find(pm => pm.id === formData.paymentMethod);
  const selectedFriend = friends.find(f => f.id === formData.recipient);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('recurring-payments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2>{editMode ? 'Edit Recurring Payment' : 'Set Up Recurring Payment'}</h2>
          <p className="text-sm text-muted-foreground">
            Automate your regular payments and bill splits
          </p>
        </div>
      </div>

      {/* Payment Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Type</CardTitle>
          <CardDescription>Choose the type of recurring payment</CardDescription>
        </CardHeader>
        <CardContent>
            <RadioGroup
              value={formData.type}
              onValueChange={(value) =>
                setFormData(prev => ({
                  ...prev,
                  type: value as 'direct_payment' | 'bill_split' | 'subscription',
                }))
              }
            >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="direct_payment" id="direct_payment" />
              <Label htmlFor="direct_payment">Direct Payment</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bill_split" id="bill_split" />
              <Label htmlFor="bill_split">Bill Split</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="subscription" id="subscription" />
              <Label htmlFor="subscription">Subscription Split</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Payment Title</Label>
            <Input
              id="title"
              placeholder="e.g., Monthly Rent Split, Netflix Subscription"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title}</p>
            )}
          </div>

          <div>
            <Label htmlFor="recipient">Recipient</Label>
            <Select value={formData.recipient} onValueChange={(value) =>
              setFormData(prev => ({ ...prev, recipient: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                {friends.map((friend) => (
                  <SelectItem key={friend.id} value={friend.id}>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {friend.avatar || getInitials(friend.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{friend.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.recipient && (
              <p className="text-sm text-destructive mt-1">{errors.recipient}</p>
            )}
          </div>

          <div>
            <Label htmlFor="amount">Amount ({currencySymbol})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            />
            {errors.amount && (
              <p className="text-sm text-destructive mt-1">{errors.amount}</p>
            )}
            {formData.amount && formData.frequency && (
              <p className="text-sm text-muted-foreground mt-1">
                {getFrequencyPreview()}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, category: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive mt-1">{errors.category}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Frequency Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Frequency & Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="frequency">Payment Frequency</Label>
            <Select value={formData.frequency} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, frequency: value }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly (Every 3 months)</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Start Date</Label>
            <div className="flex items-center space-x-2 mt-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={formData.startDate.toISOString().split('T')[0]}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  startDate: new Date(e.target.value) 
                }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Set End Date</Label>
              <Switch 
                checked={formData.hasEndDate}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  hasEndDate: checked,
                  endDate: checked ? prev.endDate : null,
                  totalPayments: checked ? prev.totalPayments : ''
                }))}
              />
            </div>
            
            {formData.hasEndDate && (
              <div className="space-y-3 pl-4 border-l-2 border-border">
                <div>
                  <Label>End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={formData.endDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      endDate: e.target.value ? new Date(e.target.value) : null 
                    }))}
                  />
                </div>
                
                <div className="text-center text-sm text-muted-foreground">OR</div>
                
                <div>
                  <Label>Total Number of Payments</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 12 for 1 year"
                    value={formData.totalPayments}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      totalPayments: e.target.value 
                    }))}
                  />
                </div>
                
                {errors.endCondition && (
                  <p className="text-sm text-destructive">{errors.endCondition}</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={formData.paymentMethod} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
          >
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer ${
                    formData.paymentMethod === method.id ? 'border-primary bg-accent' : 'border-border'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method.id }))}
                >
                  <RadioGroupItem value={method.id} id={method.id} />
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{method.name}</p>
                      <p className="text-sm text-muted-foreground">{method.details}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
          {errors.paymentMethod && (
            <p className="text-sm text-destructive mt-2">{errors.paymentMethod}</p>
          )}
        </CardContent>
      </Card>

      {/* Summary Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="font-medium">
                {fmt(formData.amount || '0')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Frequency</span>
              <span className="font-medium capitalize">{formData.frequency}</span>
            </div>
            {selectedFriend && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recipient</span>
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {selectedFriend.avatar || getInitials(selectedFriend.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{selectedFriend.name}</span>
                </div>
              </div>
            )}
            {selectedPaymentMethod && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payment Method</span>
                <span className="font-medium">{selectedPaymentMethod.name}</span>
              </div>
            )}
            {formData.amount && formData.frequency && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Estimated Monthly</span>
                <span className="font-medium text-primary">
                  {getFrequencyPreview()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button className="w-full" onClick={handleSubmit}>
          {editMode ? 'Update Recurring Payment' : 'Create Recurring Payment'}
        </Button>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => onNavigate('recurring-payments')}
        >
          Cancel
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Automatic Payment Reminder</p>
              <p className="text-xs text-muted-foreground">
                You'll receive notifications before each payment is due. 
                The system will coordinate external transfers - no automatic charges will be made.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { getInitials } from '../utils/name';
