import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Minus, X, Users, MapPin, Calendar, Receipt, Building2, Copy, Smartphone, Edit } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { PageLoading, LoadingSpinner } from './ui/loading';
import { useUserProfile } from './UserProfileContext';
import { getCurrencySymbol, requiresRoutingNumber, getBankIdentifierLabel, formatBankAccountForRegion } from '../utils/regions';
import { apiClient } from '../utils/apiClient';

interface EditBillSplitScreenProps {
  billSplitId: string | null;
  onNavigate: (tab: string, data?: any) => void;
}

interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Participant {
  id: string;
  name: string;
  avatar: string;
  amount: number;
  percentage?: number;
}

interface PaymentMethod {
  id: string;
  type: 'bank' | 'mobile_money';
  // Bank fields
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  sortCode?: string;
  routingNumber?: string;
  accountType?: 'checking' | 'savings';
  // Mobile money fields
  provider?: string;
  phoneNumber?: string;
  isDefault: boolean;
}

interface BillSplit {
  id: string;
  title: string;
  location: string;
  date: string;
  note: string;
  items: BillItem[];
  participants: Participant[];
  totalAmount: number;
  splitMethod: 'equal' | 'percentage' | 'custom';
  paymentMethod?: PaymentMethod;
  creatorId: string;
}

async function fetchBillSplit(id: string): Promise<BillSplit> {
  const data = await apiClient(`/bill-splits/${id}`);
  return data.billSplit ?? data;
}

async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const data = await apiClient('/payment-methods');
  return data.paymentMethods ?? data;
}

async function updateBillSplit(id: string, payload: any): Promise<void> {
  await apiClient(`/bill-splits/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function EditBillSplitScreen({ billSplitId, onNavigate }: EditBillSplitScreenProps) {
  const { appSettings, userProfile } = useUserProfile();
  const isNigeria = appSettings.region === 'NG';
  const currencySymbol = getCurrencySymbol(appSettings.region);

  const [billSplit, setBillSplit] = useState<BillSplit | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<BillItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [splitMethod, setSplitMethod] = useState<'equal' | 'percentage' | 'custom'>('equal');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!billSplitId) {
      setError('Bill split not found');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [bs, methods] = await Promise.all([
        fetchBillSplit(billSplitId),
        fetchPaymentMethods()
      ]);
      setBillSplit(bs);
      setPaymentMethods(methods);
      setTitle(bs.title);
      setLocation(bs.location);
      setDate(bs.date);
      setNote(bs.note);
      setItems(bs.items);
      setParticipants(bs.participants);
      setTotalAmount(bs.items.reduce((sum, item) => sum + (item.price * item.quantity), 0));
      setSplitMethod(bs.splitMethod);
      const defaultMethod = bs.paymentMethod || methods.find(m => m.isDefault) || null;
      setSelectedPaymentMethod(defaultMethod);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bill split');
      setBillSplit(null);
    } finally {
      setLoading(false);
    }
  }, [billSplitId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isCreator = billSplit && billSplit.creatorId === userProfile.id;

  useEffect(() => {
    if (!selectedPaymentMethod && paymentMethods.length > 0) {
      const defaultMethod = paymentMethods.find(method => method.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod);
      }
    }
  }, [selectedPaymentMethod, paymentMethods]);

  if (loading) {
    return <PageLoading message="Loading bill split..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('bills')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2>Edit Bill Split</h2>
        </div>
        <div className="text-center py-8 space-y-4">
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchData} variant="outline">Retry</Button>
        </div>
      </div>
    );
  }

  if (!billSplit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('bills')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2>Edit Bill Split</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Bill split not found</p>
        </div>
      </div>
    );
  }

  // Check access control - only creator can edit
  if (!isCreator) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('bill-split-details', { billSplitId })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2>Edit Bill Split</h2>
        </div>

        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Edit className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium">Access Restricted</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Only the creator of this bill split can edit it. You can view the details and pay your share, but editing is restricted to maintain payment coordination integrity.
              </p>
            </div>
            <div className="flex flex-col gap-3 mt-6">
              <Button onClick={() => onNavigate('bill-split-details', { billSplitId })}>
                View Bill Split Details
              </Button>
              <Button variant="outline" onClick={() => onNavigate('bills')}>
                Back to Bills
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const calculateEqualSplit = (participantsList: Participant[], total: number = totalAmount) => {
    if (participantsList.length === 0) return;

    const perPerson = total / participantsList.length;
    const perPersonPercentage = 100 / participantsList.length;

    setParticipants(participantsList.map(p => ({
      ...p,
      amount: perPerson,
      percentage: perPersonPercentage
    })));
  };

  const recalculateTotal = (updatedItems: BillItem[]) => {
    const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotalAmount(newTotal);

    if (splitMethod === 'equal' && participants.length > 0) {
      calculateEqualSplit(participants, newTotal);
    } else if (splitMethod === 'percentage') {
      setParticipants(prev => prev.map(p => ({
        ...p,
        amount: ((p.percentage || 0) / 100) * newTotal
      })));
    }
  };

  const updateParticipantAmount = (participantId: string, amount: number) => {
    const total = totalAmount || 1;
    setParticipants(prev => prev.map(p =>
      p.id === participantId
        ? { ...p, amount: isNaN(amount) ? 0 : amount, percentage: (amount / total) * 100 }
        : p
    ));
  };

  const updateParticipantPercentage = (participantId: string, percentage: number) => {
    const total = totalAmount;
    const safePercentage = isNaN(percentage) ? 0 : Math.max(0, Math.min(100, percentage));
    setParticipants(prev => prev.map(p =>
      p.id === participantId
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

  const addItem = () => {
    const newItem: BillItem = {
      id: Date.now().toString(),
      name: '',
      price: 0,
      quantity: 1
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    recalculateTotal(newItems);
  };

  const updateItem = (id: string, field: keyof BillItem, value: string | number) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setItems(updatedItems);

    if (field === 'price' || field === 'quantity') {
      recalculateTotal(updatedItems);
    }
  };

  const removeItem = (id: string) => {
    const updatedItems = items.filter(item => item.id !== id);
    setItems(updatedItems);
    recalculateTotal(updatedItems);
  };

  const removeParticipant = (id: string) => {
    const updatedParticipants = participants.filter(p => p.id !== id);
    setParticipants(updatedParticipants);
    
    // Recalculate equal splits
    if (splitMethod === 'equal' && updatedParticipants.length > 0) {
      calculateEqualSplit(updatedParticipants);
    }
  };

  const copyPaymentDetails = async () => {
    if (!selectedPaymentMethod) return;

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      toast.error('Clipboard not supported. Please copy manually.');
      return;
    }

    try {
      if (selectedPaymentMethod.type === 'bank') {
        const usesRouting = requiresRoutingNumber(appSettings.region);
        const label = getBankIdentifierLabel(appSettings.region);
        const idValue = usesRouting ? selectedPaymentMethod.routingNumber : selectedPaymentMethod.sortCode;
        const bankInfo = `${selectedPaymentMethod.bankName}\nAccount Name: ${selectedPaymentMethod.accountHolderName}\n${label}: ${idValue ?? ''}\nAccount Number: ${selectedPaymentMethod.accountNumber}`;
        await navigator.clipboard.writeText(bankInfo);
        toast.success('Bank account details copied to clipboard');
      } else {
        const mobileInfo = `${selectedPaymentMethod.provider}\nPhone Number: ${selectedPaymentMethod.phoneNumber}`;
        await navigator.clipboard.writeText(mobileInfo);
        toast.success('Mobile money details copied to clipboard');
      }
    } catch (error) {
      toast.error('Failed to copy details. Please copy manually.');
    }
  };

  const formatAccountNumber = (accountNumber: string) =>
    formatBankAccountForRegion(appSettings.region, accountNumber);

  const getTotalSplit = () => {
    return participants.reduce((sum, p) => sum + (isNaN(p.amount) ? 0 : p.amount), 0);
  };

  const saveBillSplitHandler = async () => {
    if (!title.trim()) {
      toast.error('Please enter a bill title');
      return;
    }

    if (participants.length === 0) {
      toast.error('Please add at least one participant');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    const total = totalAmount;
    const splitTotal = getTotalSplit();

    if (Math.abs(splitTotal - total) > 0.01) {
      toast.error(`Split amounts (${currencySymbol}${splitTotal.toFixed(2)}) don't match total (${currencySymbol}${total.toFixed(2)})`);
      return;
    }

    if (!billSplitId) return;

    setSaving(true);
    setSaveError(null);
    try {
      await updateBillSplit(billSplitId, {
        title,
        location,
        date,
        note,
        items,
        participants,
        splitMethod,
        paymentMethodId: selectedPaymentMethod.id
      });
      toast.success('Bill split updated successfully');
      onNavigate('bill-split-details', { billSplitId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save bill split';
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('bill-split-details', { billSplitId })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2>Edit Bill Split</h2>
        </div>
        <Button onClick={saveBillSplitHandler} disabled={saving}>
          {saving && <LoadingSpinner size="sm" className="mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Bill Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter bill title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder="Enter location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              placeholder="Add a note about this bill..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
            Participants will send payments to this account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={selectedPaymentMethod?.id || ''}
            onValueChange={(value) => {
              const method = paymentMethods.find(acc => acc.id === value);
              setSelectedPaymentMethod(method || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((method) => (
                <SelectItem key={method.id} value={method.id}>
                  <div className="flex items-center gap-2">
                    {method.type === 'bank' ? (
                      <Building2 className="h-4 w-4" />
                    ) : (
                      <Smartphone className="h-4 w-4" />
                    )}
                    <span>
                      {method.type === 'bank' ? method.bankName : method.provider}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                      {method.type === 'bank' ? method.accountNumber : method.phoneNumber}
                    </span>
                    {method.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedPaymentMethod && (
            <Card className="bg-muted">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {selectedPaymentMethod.type === 'bank' 
                        ? selectedPaymentMethod.bankName 
                        : selectedPaymentMethod.provider
                      }
                    </p>
                    
                    {selectedPaymentMethod.type === 'bank' ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {selectedPaymentMethod.accountHolderName}
                        </p>
                        {(() => {
                          const label = getBankIdentifierLabel(appSettings.region);
                          const usesRouting = requiresRoutingNumber(appSettings.region);
                          const value = usesRouting ? selectedPaymentMethod.routingNumber : selectedPaymentMethod.sortCode;
                          return (
                            <>
                              <p className="text-sm text-muted-foreground">
                                {label}: {value}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Account: {formatAccountNumber(selectedPaymentMethod.accountNumber!)}
                              </p>
                            </>
                          );
                        })()}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Phone: {selectedPaymentMethod.phoneNumber}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyPaymentDetails}
                    className="p-2"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('payment-methods')}
            className="w-full"
          >
            Manage Payment Methods
          </Button>
        </CardContent>
      </Card>

      {/* Split Method */}
      <Card>
        <CardHeader>
          <CardTitle>Split Method</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={splitMethod} onValueChange={handleSplitMethodChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equal">Split Equally</SelectItem>
              <SelectItem value="percentage">Split by Percentage</SelectItem>
              <SelectItem value="custom">Custom Amounts</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants ({participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{participant.avatar}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{participant.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {splitMethod === 'custom' && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">{currencySymbol}</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={participant.amount || ''}
                        onChange={(e) => updateParticipantAmount(participant.id, parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-xs"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                  
                  {splitMethod === 'percentage' && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={participant.percentage || ''}
                        onChange={(e) => updateParticipantPercentage(participant.id, parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-xs"
                        placeholder="0"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  )}
                  
                  {splitMethod === 'equal' && (
                    <span className="text-sm font-medium">
                      {currencySymbol}{participant.amount.toFixed(2)}
                    </span>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeParticipant(participant.id)}
                    disabled={participants.length <= 1}
                    className="p-1 h-8 w-8"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={() => onNavigate('friends')}>
            <Users className="h-4 w-4 mr-2" />
            Add Participants
          </Button>
        </CardContent>
      </Card>

      {/* Bill Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Bill Items
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="space-y-3 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Input
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    className="flex-1 mr-2"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm">{currencySymbol}</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={item.price || ''}
                        onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Quantity</Label>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateItem(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="text-center flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateItem(item.id, 'quantity', item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">
                    Subtotal: {currencySymbol}{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No items added yet</p>
              <p className="text-sm">Add items to split the bill</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Split Summary */}
      <Card className="border-primary">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount:</span>
            <span className="font-medium">{currencySymbol}{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Split Total:</span>
              <span className="font-medium">{currencySymbol}{getTotalSplit().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Participants:</span>
              <span className="font-medium">{participants.length} people</span>
            </div>
            
            {Math.abs(getTotalSplit() - totalAmount) > 0.01 && (
              <div className="text-xs text-warning bg-warning/10 p-2 rounded">
                ⚠️ Split amounts don't match total. Please adjust amounts.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="space-y-3">
        <Button className="w-full" onClick={saveBillSplitHandler} disabled={saving}>
          {saving && <LoadingSpinner size="sm" className="mr-2" />}
          Save Changes
        </Button>
        <Button variant="outline" className="w-full" onClick={() => onNavigate('bill-split-details', { billSplitId })}>
          Cancel
        </Button>
        {saveError && <p className="text-sm text-destructive text-center">{saveError}</p>}
      </div>
    </div>
  );
}
