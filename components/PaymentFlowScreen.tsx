import { useState, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Users,
  Clock,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
// import { Separator } from './ui/separator';
import { toast } from "sonner";
import { useUserProfile } from "./UserProfileContext";
import { apiClient } from "../utils/apiClient";
import {
  type PaymentMethod,
  fetchUserPaymentMethods,
} from "@/api/payment-methods";
import { BankTransferInstructions } from "./BankTransferInstructions";

interface PaymentFlowScreenProps {
  paymentRequest: {
    id: string;
    amount: number;
    description: string;
    recipient: string;
    recipientId?: string;
    // If coming from upcoming payments, this is the request transaction id
    requestId?: string;
    groupId?: string;
    billSplitId?: string;
    dueDate?: string;
  } | null;
  onNavigate: (tab: string, data?: any) => void;
}

const recipientMethodCache = new Map<string, PaymentMethod | null>();

export function PaymentFlowScreen({
  paymentRequest,
  onNavigate,
}: PaymentFlowScreenProps) {
  const { appSettings } = useUserProfile();

  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "sent" | "confirmed"
  >("pending");
  const [recipientPaymentMethod, setRecipientPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [isMethodLoading, setIsMethodLoading] = useState(false);
  const [methodError, setMethodError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentRequest) return;

    const recipientId = paymentRequest.recipientId ?? paymentRequest.recipient;
    const cached = recipientMethodCache.get(recipientId);
    if (cached !== undefined) {
      setRecipientPaymentMethod(cached);
      return;
    }

    const loadMethod = async () => {
      setIsMethodLoading(true);
      setMethodError(null);
      try {
        const methods = await fetchUserPaymentMethods(recipientId);
        const method = methods[0] || null;
        recipientMethodCache.set(recipientId, method);
        setRecipientPaymentMethod(method);
      } catch (err: any) {
        setMethodError(err.message || "Failed to load payment method");
        recipientMethodCache.set(recipientId, null);
        setRecipientPaymentMethod(null);
      } finally {
        setIsMethodLoading(false);
      }
    };

    loadMethod();
  }, [paymentRequest]);

  if (!paymentRequest) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("home")}
            className="min-h-[44px] min-w-[44px] -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold">Payment</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No payment request found</p>
        </div>
      </div>
    );
  }

  const copyReference = async () => {
    try {
      let reference: string | null = null;
      if ((paymentRequest as any)?.billSplitId) {
        const data = await apiClient(
          `/bill-splits/${(paymentRequest as any).billSplitId}/reference`,
          { method: "POST" },
        );
        reference = data?.reference || null;
      }
      const refToCopy =
        reference || `Biltip-${paymentRequest.id}-${Date.now()}`;
      await navigator.clipboard.writeText(refToCopy);
      toast.success("Payment reference copied to clipboard");
    } catch {
      const fallback = `Biltip-${paymentRequest.id}-${Date.now()}`;
      try {
        await navigator.clipboard.writeText(fallback);
        toast.success("Payment reference copied to clipboard");
      } catch {
        toast.error("Failed to copy reference. Please copy manually.");
      }
    }
  };

  const markAsSent = async () => {
    try {
      // If this flow has a corresponding request transaction id, update it on the server
      const reqId = (paymentRequest as any)?.requestId as string | undefined;
      const billSplitId = (paymentRequest as any)?.billSplitId as
        | string
        | undefined;
      let txId: string | undefined;

      if (billSplitId) {
        // Bill split payments are tracked per-participant; mark current user as SENT
        await apiClient(`/bill-splits/${billSplitId}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SENT" }),
        });
      } else if (reqId) {
        const resp = await apiClient(`/transactions/${reqId}/mark-sent`, {
          method: "POST",
        });
        txId = resp?.transaction?.id || reqId;
      } else if ((paymentRequest as any)?.directRequestId) {
        // For direct pending requests (no transaction yet), create a pending SEND tx
        const dirReqId = String((paymentRequest as any).directRequestId);
        const resp = await apiClient(`/requests/${dirReqId}/mark-paid`, {
          method: "POST",
        });
        txId = resp?.transaction?.id;
      }

      setPaymentStatus("sent");
      toast.success("Payment marked as sent! The recipient will be notified.");

      // Ask lists to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("upcomingPaymentsUpdated"));
        window.dispatchEvent(new Event("transactionsUpdated"));
      }

      // Navigate to a relevant screen when available
      setTimeout(() => {
        if (billSplitId) {
          onNavigate("bill-split-details", { billSplitId });
        } else if (txId) {
          onNavigate("transaction-details", { transactionId: txId });
        } else if (reqId) {
          onNavigate("transaction-details", { transactionId: reqId });
        } else {
          onNavigate("home");
        }
      }, 1200);
    } catch (error) {
      console.error("Failed to mark payment as sent", error);
      toast.error("Failed to mark payment as sent");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Sticky for better mobile navigation */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center space-x-3 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("home")}
            className="min-h-[44px] min-w-[44px] -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">Send Payment</h2>
            <p className="text-sm text-muted-foreground truncate">
              {paymentRequest.description}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 pb-32">
        {/* Payment Status */}
        {paymentStatus === "sent" && (
          <Card className="border-success bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 text-success">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">Payment Sent!</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your payment has been marked as sent. The recipient will be
                    notified.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Overview - Enhanced mobile layout */}
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarFallback className="text-base">
                    {paymentRequest.recipient
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-base leading-tight">
                    {paymentRequest.description}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    To {paymentRequest.recipient}
                  </p>
                  {paymentRequest.dueDate && (
                    <div className="flex items-center space-x-1 mt-2">
                      <Clock className="h-3 w-3 text-warning flex-shrink-0" />
                      <span className="text-xs text-warning">
                        Due {formatDate(paymentRequest.dueDate)}
                      </span>
                    </div>
                  )}
                  {paymentRequest.groupId && (
                    <Badge variant="secondary" className="text-xs mt-2">
                      Group Payment
                    </Badge>
                  )}
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        <BankTransferInstructions
          amount={paymentRequest.amount}
          currency={appSettings.currency}
          region={appSettings.region}
          recipientName={paymentRequest.recipient}
          paymentMethod={recipientPaymentMethod}
          isMethodLoading={isMethodLoading}
          methodError={methodError}
          referenceDisplay={`Biltip-${paymentRequest.id}-${paymentRequest.description
            .replace(/\s+/g, "")
            .slice(0, 10)}`}
          onCopyReference={copyReference}
          status={paymentStatus}
          onMarkAsSent={recipientPaymentMethod ? markAsSent : undefined}
          actionsPlacement="fixed"
          actionSlot={
            paymentStatus === "pending" && recipientPaymentMethod ? (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Banking App
                </Button>
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => onNavigate("home")}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => onNavigate("home")}
              >
                {paymentStatus === "sent" ? "Back to Home" : "Cancel"}
              </Button>
            )
          }
        />

        {/* Payment Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm leading-relaxed">
                {paymentRequest.description}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Recipient</p>
              <p className="text-sm">{paymentRequest.recipient}</p>
            </div>

            {paymentRequest.dueDate && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Due Date</p>
                <p className="text-sm">{formatDate(paymentRequest.dueDate)}</p>
              </div>
            )}

            {paymentRequest.groupId && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Payment Type
                </p>
                <p className="text-sm">Group Payment</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Text */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Need Help?</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Make sure to include the payment reference</li>
              <li>• Double-check the account details before sending</li>
              <li>• Click "Mark as Sent" after completing the transfer</li>
              <li>• The recipient will be notified of your payment</li>
              {!recipientPaymentMethod && (
                <li>
                  • Contact the recipient directly if payment details are
                  missing
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
