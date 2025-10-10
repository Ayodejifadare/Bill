import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  CreditCard,
  Banknote,
  ChevronDown,
  Share,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription } from "./ui/alert";
import { Progress } from "./ui/progress";
import { BankSelectionSheet } from "./BankSelectionSheet";
import { PageLoading, LoadingSpinner } from "./ui/loading";
import { toast } from "sonner";
import { apiClient } from "../utils/apiClient";
import { useUserProfile } from "./UserProfileContext";
import { formatCurrencyForRegion, getCurrencySymbol } from "../utils/regions";

interface SettlementScreenProps {
  onNavigate: (tab: string, data?: unknown) => void;
  billSplitId?: string;
}

interface BillSplit {
  id: string;
  title: string;
  description: string;
  totalAmount: number;
  collectedAmount: number;
  participants: Array<{
    id: string;
    name: string;
    avatar: string;
    amount: number;
    hasPaid: boolean;
  }>;
  isHost: boolean;
  status: "collecting" | "ready" | "settled";
  dueDate: string;
  createdDate: string;
}

async function getBillSplit(id: string): Promise<BillSplit> {
  const data = await apiClient(`/bill-splits/${id}`);
  return data.billSplit ?? data;
}

async function initiateTransfer(payload: {
  billSplitId: string;
  recipientName: string;
  bankName: string;
  accountNumber: string;
  amount: number;
  narration?: string;
}): Promise<void> {
  await apiClient("/initiate-transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function SettlementScreen({
  onNavigate,
  billSplitId,
}: SettlementScreenProps) {
  const { appSettings } = useUserProfile();
  const fmt = (n: number) => formatCurrencyForRegion(appSettings.region, n);
  const symbol = getCurrencySymbol(appSettings.region);
  const [step, setStep] = useState<
    "overview" | "transfer" | "confirm" | "complete"
  >("overview");
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
      const data = await getBillSplit(billSplitId);
      setBillSplit(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load bill split",
      );
      setBillSplit(null);
    } finally {
      setLoading(false);
    }
  }, [billSplitId]);

  useEffect(() => {
    fetchBillSplit();
  }, [fetchBillSplit]);

  // Transfer form state
  const [recipientName, setRecipientName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferFullAmount, setTransferFullAmount] = useState(true);
  const [narration, setNarration] = useState("");
  const [showBankSheet, setShowBankSheet] = useState(false);
  const [processingFee] = useState(2.5); // 2.5% processing fee
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const getActualTransferAmount = () => {
    if (!billSplit) return 0;
    if (transferFullAmount) {
      return billSplit.collectedAmount;
    }
    return parseFloat(transferAmount) || 0;
  };

  const calculateProcessingFee = (amount: number) => {
    return (amount * processingFee) / 100;
  };

  const getFinalAmount = (amount: number) => {
    return amount - calculateProcessingFee(amount);
  };

  const handleInitiateTransfer = async () => {
    if (!billSplitId || !billSplit) return;
    setTransferLoading(true);
    setTransferError(null);
    try {
      const amount = getActualTransferAmount();
      await initiateTransfer({
        billSplitId,
        recipientName,
        bankName,
        accountNumber,
        amount,
        narration,
      });
      toast.success("Transfer initiated successfully!");
      setBillSplit({ ...billSplit, status: "settled" });
      setStep("complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transfer failed";
      setTransferError(message);
      toast.error(message);
    } finally {
      setTransferLoading(false);
    }
  };

  const getProgressPercentage = () => {
    if (!billSplit) return 0;
    return (billSplit.collectedAmount / billSplit.totalAmount) * 100;
  };

  const handleTransferFullAmountChange = (checked: boolean) => {
    setTransferFullAmount(checked);
    if (checked) {
      setTransferAmount("");
    }
  };

  if (loading) {
    return <PageLoading message="Loading settlement..." />;
  }

  if (error) {
    return (
      <div className="space-y-4 p-4 text-center">
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchBillSplit} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  if (!billSplit) {
    return null;
  }

  // Overview Step
  if (step === "overview") {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => onNavigate("bills")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2>Settlement & Withdrawal</h2>
            <p className="text-sm text-muted-foreground">
              Transfer collected funds
            </p>
          </div>
        </div>

        {/* Bill Summary */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="font-medium">{billSplit.title}</h3>
              <p className="text-sm text-muted-foreground">
                {billSplit.description}
              </p>
            </div>

            <div className="text-center space-y-2">
              <p className="text-3xl font-bold text-success">
                {fmt(billSplit.collectedAmount)}
              </p>
              <p className="text-sm text-muted-foreground">
                Collected from {billSplit.participants.length} participants
              </p>
            </div>

            <Progress value={getProgressPercentage()} className="h-2" />

            <div className="flex justify-between text-sm">
              <span>Collection Status</span>
              <span className="font-medium">
                {billSplit.participants.filter((p) => p.hasPaid).length}/
                {billSplit.participants.length} paid
              </span>
            </div>
          </div>
        </Card>

        {/* Participants Status */}
        <Card className="p-4">
          <h4 className="font-medium mb-3">Payment Status</h4>
          <div className="space-y-2">
            {billSplit.participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {participant.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{participant.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{fmt(participant.amount)}</span>
                  <Badge
                    variant={participant.hasPaid ? "default" : "outline"}
                    className={
                      participant.hasPaid
                        ? "bg-success text-success-foreground"
                        : ""
                    }
                  >
                    {participant.hasPaid ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <Clock className="h-3 w-3 mr-1" />
                    )}
                    {participant.hasPaid ? "Paid" : "Pending"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Transfer Button */}
        {billSplit.status === "ready" && billSplit.isHost && (
          <Card className="p-4 border-success">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <h4 className="font-medium">Ready for Transfer</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                All participants have paid their shares. Transfer funds to the
                intended recipient.
              </p>
              <Button className="w-full" onClick={() => setStep("transfer")}>
                <DollarSign className="h-4 w-4 mr-2" />
                Transfer Funds
              </Button>
            </div>
          </Card>
        )}

        {billSplit.status === "collecting" && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Transfer will be available once all participants have paid their
              shares.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // Transfer Form Step
  if (step === "transfer") {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => setStep("overview")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2>Other Banks Transfer</h2>
            <p className="text-sm text-muted-foreground">
              Transfer to external account
            </p>
          </div>
        </div>

        {/* Account Status Card */}
        <Card className="p-4 bg-primary text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">SPLITPAY WALLET</p>
              <p className="text-sm opacity-90">Account Status: ACTIVE</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Available Balance Display */}
        <Card className="p-4 bg-muted/30">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Available Balance:</span>
            <span className="font-medium">
              {fmt(billSplit.collectedAmount)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-success">
              {fmt(billSplit.collectedAmount)} available
            </span>
            <span className="text-sm text-muted-foreground">{fmt(0)} used</span>
          </div>
        </Card>

        {/* Transfer Form */}
        <Card className="p-6">
          <div className="space-y-4">
            {/* Bank Selection */}
            <div>
              <Label htmlFor="bank">Bank</Label>
              <Button
                variant="outline"
                className="w-full justify-between h-12 mt-1"
                onClick={() => setShowBankSheet(true)}
              >
                <span className="text-left">{bankName || "Select Bank"}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Beneficiary Account Number */}
            <div>
              <Label htmlFor="account">Beneficiary Account Number</Label>
              <Input
                id="account"
                placeholder="Enter account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="mt-1 h-12"
              />
              {recipientName && (
                <div className="mt-2 p-3 bg-muted rounded text-center">
                  <p className="font-medium text-sm">
                    {recipientName.toUpperCase()}
                  </p>
                </div>
              )}
              {accountNumber.length >= 10 && !recipientName && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1 p-0 h-auto"
                  onClick={() => setRecipientName("RICHARD BOLUWATIFE FADARE")}
                >
                  Verify Account
                </Button>
              )}
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="amount">Amount</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg">
                  {symbol}
                </span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  max={billSplit.collectedAmount}
                  className="pl-8 text-lg h-12 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                  value={
                    transferFullAmount
                      ? billSplit.collectedAmount.toFixed(2)
                      : transferAmount
                  }
                  onChange={(e) =>
                    !transferFullAmount && setTransferAmount(e.target.value)
                  }
                  disabled={transferFullAmount}
                />
              </div>
              {!transferFullAmount &&
                parseFloat(transferAmount) > billSplit.collectedAmount && (
                  <p className="text-xs text-destructive mt-1">
                    Amount exceeds available balance
                  </p>
                )}

              {/* Transfer Full Amount Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mt-3">
                <div>
                  <Label htmlFor="transfer-full" className="font-medium">
                    Transfer Full Amount
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Transfer entire available balance
                  </p>
                </div>
                <Switch
                  id="transfer-full"
                  checked={transferFullAmount}
                  onCheckedChange={handleTransferFullAmountChange}
                />
              </div>

              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>Maximum: {fmt(billSplit.collectedAmount)}</span>
                <span>
                  Fee: {fmt(calculateProcessingFee(getActualTransferAmount()))}
                </span>
              </div>
            </div>

            {/* Narration */}
            <div>
              <Label htmlFor="narration">Narration</Label>
              <Textarea
                id="narration"
                placeholder="Enter payment description"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        <Button
          className="w-full h-12"
          onClick={() => setStep("confirm")}
          disabled={
            !bankName ||
            !accountNumber ||
            !recipientName ||
            getActualTransferAmount() === 0 ||
            getActualTransferAmount() > billSplit.collectedAmount
          }
        >
          PROCEED
        </Button>

        <BankSelectionSheet
          isOpen={showBankSheet}
          onClose={() => setShowBankSheet(false)}
          onSelectBank={setBankName}
          selectedBank={bankName}
        />
      </div>
    );
  }

  // Confirm Step
  if (step === "confirm") {
    const amount = getActualTransferAmount();
    const fee = calculateProcessingFee(amount);
    const finalAmount = getFinalAmount(amount);

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => setStep("transfer")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2>Review Transfer</h2>
            <p className="text-sm text-muted-foreground">
              Confirm transfer details
            </p>
          </div>
        </div>

        {/* Transfer Summary */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-medium">Transfer Summary</h3>
              <p className="text-sm text-muted-foreground">{billSplit.title}</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient:</span>
                <span className="font-medium">{recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank:</span>
                <span>{bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account:</span>
                <span className="font-mono">***{accountNumber.slice(-4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transfer Type:</span>
                <span>
                  {transferFullAmount ? "Full Amount" : "Custom Amount"}
                </span>
              </div>
              {narration && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Narration:</span>
                  <span className="text-right text-sm">{narration}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Transfer Amount</span>
                <span>${amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processing Fee ({processingFee}%)</span>
                <span>-${fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span>Recipient Receives</span>
                <span>${finalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Bank transfers typically process within 1-3 business days. This
            action cannot be undone.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Button
            className="w-full h-12"
            onClick={handleInitiateTransfer}
            disabled={transferLoading}
          >
            {transferLoading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            {transferLoading ? "PROCESSING..." : "PROCEED"}
          </Button>
          {transferError && (
            <p className="text-sm text-destructive text-center">
              {transferError}
            </p>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setStep("transfer")}
          >
            Edit Details
          </Button>
        </div>
      </div>
    );
  }

  // Complete Step
  if (step === "complete") {
    const amount = getActualTransferAmount();
    const finalAmount = getFinalAmount(amount);

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => onNavigate("bills")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2>Transfer Complete</h2>
            <p className="text-sm text-muted-foreground">
              Transfer has been initiated
            </p>
          </div>
        </div>

        <Card className="p-6">
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <div>
              <h3 className="font-medium">Transfer Initiated Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                Your transfer is being processed
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-success">
                ${finalAmount.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                to {recipientName}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-3">
            <h4 className="font-medium">What happens next?</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>Transfer has been queued for processing</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-muted rounded-full"></div>
                <span>Bank will process within 1-3 business days</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-muted rounded-full"></div>
                <span>You'll receive confirmation once completed</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <Button className="w-full" onClick={() => onNavigate("bills")}>
            <Banknote className="h-4 w-4 mr-2" />
            View All Bills
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onNavigate("home")}
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
