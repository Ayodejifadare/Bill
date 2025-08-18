import { useState, useEffect } from 'react';
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
import { useUserProfile } from './UserProfileContext';

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

// Mock data for editing
const mockBillSplitData: Record<string, BillSplit> = {
  '1': {
    id: '1',
    title: 'Team Dinner at Tony\'s Pizza',
    location: 'Tony\'s Pizza Downtown',
    date: '2025-01-13',
    note: 'Great team dinner! Thanks everyone for coming out.',
    splitMethod: 'equal',
    creatorId: 'user-123',
    items: [
      { id: '1', name: 'Margherita Pizza', price: 18.00, quantity: 2 },
      { id: '2', name: 'Pepperoni Pizza', price: 20.00, quantity: 1 },
      { id: '3', name: 'Caesar Salad', price: 12.00, quantity: 2 },
      { id: '4', name: 'Garlic Bread', price: 8.00, quantity: 1 },
      { id: '5', name: 'Drinks', price: 35.00, quantity: 1 },
      { id: '6', name: 'Tax', price: 11.50, quantity: 1 },
      { id: '7', name: 'Tip', price: 20.00, quantity: 1 }
    ],
    participants: [
      { id: '1', name: 'Emily Davis', avatar: 'ED', amount: 28.50, percentage: 20 },
      { id: '2', name: 'John Doe', avatar: 'JD', amount: 28.50, percentage: 20 },
      { id: '3', name: 'Sarah Johnson', avatar: 'SJ', amount: 28.50, percentage: 20 },
      { id: '4', name: 'Mike Chen', avatar: 'MC', amount: 28.50, percentage: 20 },
      { id: '5', name: 'Alex Rodriguez', avatar: 'AR', amount: 28.50, percentage: 20 }
    ],
    totalAmount: 142.50,
    paymentMethod: {
      id: '1',
      type: 'bank',
      bankName: 'Access Bank',
      accountNumber: '0123456789',
      accountHolderName: 'John Doe',
      sortCode: '044',
      isDefault: true
    }
  }
};

export function EditBillSplitScreen({ billSplitId, onNavigate }: EditBillSplitScreenProps) {
  const { appSettings, userProfile } = useUserProfile();
  const isNigeria = appSettings.region === 'NG';
  const currencySymbol = isNigeria ? '₦' : '$';
  
  const originalBillSplit = billSplitId ? mockBillSplitData[billSplitId] : null;
  
  // Check if current user is the creator of this bill split
  const isCreator = originalBillSplit && originalBillSplit.creatorId === userProfile.id;
  
  const [title, setTitle] = useState(originalBillSplit?.title || '');
  const [location, setLocation] = useState(originalBillSplit?.location || '');
  const [date, setDate] = useState(originalBillSplit?.date || '');
  const [note, setNote] = useState(originalBillSplit?.note || '');
  const [items, setItems] = useState<BillItem[]>(originalBillSplit?.items || []);
  const [participants, setParticipants] = useState<Participant[]>(originalBillSplit?.participants || []);
  const [splitMethod, setSplitMethod] = useState<'equal' | 'percentage' | 'custom'>(originalBillSplit?.splitMethod || 'equal');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(originalBillSplit?.paymentMethod || null);

  // Mock payment methods based on region
  const paymentMethods: PaymentMethod[] = isNigeria ? [
    {
      id: '1',
      type: 'bank',
      bankName: 'Access Bank',
      accountNumber: '0123456789',
      accountHolderName: 'John Doe',
      sortCode: '044',
      isDefault: true
    },
    {
      id: '2',
      type: 'mobile_money',
      provider: 'Opay',
      phoneNumber: '+234 801 234 5678',
      isDefault: false
    },
    {
      id: '3',
      type: 'bank',
      bankName: 'GTBank',
      accountNumber: '0234567890',
      accountHolderName: 'John Doe',
      sortCode: '058',
      isDefault: false
    }
  ] : [
    {
      id: '1',
      type: 'bank',
      bankName: 'Chase Bank',
      accountType: 'checking',
      accountNumber: '****1234',
      routingNumber: '021000021',
      accountHolderName: 'John Doe',
      isDefault: true
    },
    {
      id: '2',
      type: 'bank',
      bankName: 'Bank of America',
      accountType: 'savings',
      accountNumber: '****5678',
      routingNumber: '026009593',
      accountHolderName: 'John Doe',
      isDefault: false
    }
  ];

  useEffect(() => {
    // Set default payment method if none selected
    if (!selectedPaymentMethod) {
      const defaultMethod = paymentMethods.find(method => method.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod);
      }
    }
  }, [selectedPaymentMethod]);

  if (!originalBillSplit) {
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

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateEqualSplit = (participantsList: Participant[]) => {
    const total = calculateTotal();
    if (participantsList.length === 0) return;
    
    const perPerson = total / participantsList.length;
    const perPersonPercentage = 100 / participantsList.length;
    
    setParticipants(participantsList.map(p => ({
      ...p,
      amount: perPerson,
      percentage: perPersonPercentage
    })));
  };

  const updateParticipantAmount = (participantId: string, amount: number) => {
    const total = calculateTotal() || 1;
    setParticipants(prev => prev.map(p => 
      p.id === participantId 
        ? { ...p, amount: isNaN(amount) ? 0 : amount, percentage: (amount / total) * 100 }
        : p
    ));
  };

  const updateParticipantPercentage = (participantId: string, percentage: number) => {
    const total = calculateTotal();
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
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof BillItem, value: string | number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
    
    // Recalculate splits when items change
    if (splitMethod === 'equal') {
      setTimeout(() => calculateEqualSplit(participants), 0);
    } else if (splitMethod === 'percentage') {
      const newTotal = calculateTotal();
      setParticipants(prev => prev.map(p => ({
        ...p,
        amount: ((p.percentage || 0) / 100) * newTotal
      })));
    }
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    
    // Recalculate splits when items change
    if (splitMethod === 'equal') {
      setTimeout(() => calculateEqualSplit(participants), 0);
    }
  };

  const removeParticipant = (id: string) => {
    const updatedParticipants = participants.filter(p => p.id !== id);
    setParticipants(updatedParticipants);
    
    // Recalculate equal splits
    if (splitMethod === 'equal' && updatedParticipants.length > 0) {
      calculateEqualSplit(updatedParticipants);
    }
  };

  const copyPaymentDetails = () => {
    if (!selectedPaymentMethod) return;
    
    if (selectedPaymentMethod.type === 'bank') {
      const bankInfo = isNigeria 
        ? `${selectedPaymentMethod.bankName}\nAccount Name: ${selectedPaymentMethod.accountHolderName}\nAccount Number: ${selectedPaymentMethod.accountNumber}\nSort Code: ${selectedPaymentMethod.sortCode}`
        : `${selectedPaymentMethod.bankName}\nAccount Holder: ${selectedPaymentMethod.accountHolderName}\nRouting Number: ${selectedPaymentMethod.routingNumber}\nAccount Number: ${selectedPaymentMethod.accountNumber}`;
      navigator.clipboard.writeText(bankInfo);
      toast.success('Bank account details copied to clipboard');
    } else {
      const mobileInfo = `${selectedPaymentMethod.provider}\nPhone Number: ${selectedPaymentMethod.phoneNumber}`;
      navigator.clipboard.writeText(mobileInfo);
      toast.success('Mobile money details copied to clipboard');
    }
  };

  const formatAccountNumber = (accountNumber: string) => {
    if (isNigeria) {
      return accountNumber.replace(/(\d{4})(\d{4})(\d{2})/, '$1 $2 $3');
    } else {
      return accountNumber.replace(/(\*{4})(\d{4})/, '$1 $2');
    }
  };

  const getTotalSplit = () => {
    return participants.reduce((sum, p) => sum + (isNaN(p.amount) ? 0 : p.amount), 0);
  };

  const handleSave = () => {
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

    const total = calculateTotal();
    const splitTotal = getTotalSplit();
    
    if (Math.abs(splitTotal - total) > 0.01) {
      toast.error(`Split amounts (${currencySymbol}${splitTotal.toFixed(2)}) don't match total (${currencySymbol}${total.toFixed(2)})`);
      return;
    }
    
    // Here you would normally save to backend
    toast.success('Bill split updated successfully');
    onNavigate('bill-split-details', { billSplitId });
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
        <Button onClick={handleSave}>
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
                        {isNigeria ? (
                          <>
                            <p className="text-sm text-muted-foreground">
                              Sort Code: {selectedPaymentMethod.sortCode}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Account: {formatAccountNumber(selectedPaymentMethod.accountNumber!)}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">
                              Routing: {selectedPaymentMethod.routingNumber}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Account: {formatAccountNumber(selectedPaymentMethod.accountNumber!)}
                            </p>
                          </>
                        )}
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
              <span className="font-medium">{currencySymbol}{calculateTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Split Total:</span>
              <span className="font-medium">{currencySymbol}{getTotalSplit().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Participants:</span>
              <span className="font-medium">{participants.length} people</span>
            </div>
            
            {Math.abs(getTotalSplit() - calculateTotal()) > 0.01 && (
              <div className="text-xs text-warning bg-warning/10 p-2 rounded">
                ⚠️ Split amounts don't match total. Please adjust amounts.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="space-y-3">
        <Button className="w-full" onClick={handleSave}>
          Save Changes
        </Button>
        <Button variant="outline" className="w-full" onClick={() => onNavigate('bill-split-details', { billSplitId })}>
          Cancel
        </Button>
      </div>
    </div>
  );
}