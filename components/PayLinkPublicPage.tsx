import { useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { BankTransferInstructions, TransferAccountDetails } from "./BankTransferInstructions";
import { resolveRegionFromCurrency, RegionCode } from "../utils/regions";

interface PublicPayLink {
  slug: string;
  title?: string | null;
  message?: string | null;
  amount: number;
  currency: string;
  status: string;
  expiresAt?: string | null;
  recipientName?: string | null;
  owner?: { name?: string | null; avatar?: string | null };
  bankTransferInstructions?: TransferAccountDetails | null;
}

interface PayLinkPublicPageProps {
  token: string;
}

export function PayLinkPublicPage({ token }: PayLinkPublicPageProps) {
  const [payLink, setPayLink] = useState<PublicPayLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"pending" | "sent" | "confirmed">(
    "pending",
  );
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchPayLink = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/pay-links/${token}`);
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const message =
            data?.error ||
            (res.status === 410
              ? "This pay link has expired or is no longer available."
              : "We couldn't find this pay link.");
          throw new Error(message);
        }
        if (cancelled) return;
        const payload = (data?.payLink ?? data) as PublicPayLink;
        setPayLink(payload);
        setStatus(payload.status === "FULFILLED" ? "sent" : "pending");
      } catch (err) {
        if (cancelled) return;
        setPayLink(null);
        setStatus("pending");
        setError(
          err instanceof Error ? err.message : "Failed to load payment link",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPayLink();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const region: RegionCode | undefined = useMemo(() => {
    return resolveRegionFromCurrency(payLink?.currency);
  }, [payLink?.currency]);

  const referenceDisplay = useMemo(() => {
    if (!payLink) return undefined;
    const suffix = payLink.slug ? payLink.slug.toUpperCase() : token;
    return `PAYLINK-${suffix}`;
  }, [payLink, token]);

  const recipientName =
    payLink?.owner?.name || payLink?.recipientName || "Your contact";

  const handleMarkPaid = async () => {
    setMarking(true);
    try {
      const res = await fetch(`/pay-links/${token}/mark-paid`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.error || "We couldn't confirm this payment just yet.",
        );
      }
      const payload = (data?.payLink ?? data) as PublicPayLink;
      setPayLink(payload);
      setStatus("sent");
      toast.success("Thanks! We've let the organizer know you sent payment.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to confirm payment.",
      );
    } finally {
      setMarking(false);
    }
  };

  const showInstructions = !loading && !error && payLink;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-md mx-auto px-4 py-10 space-y-6">
        <header className="text-center space-y-2">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Bankdrop Pay Link
          </p>
          <h1 className="text-2xl font-semibold">
            {payLink?.title || "Send a secure bank transfer"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {payLink?.message || "Review the payment details below."}
          </p>
        </header>

        {loading && (
          <Card>
            <CardContent className="p-6 space-y-4 animate-pulse">
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded" />
              <div className="h-24 bg-muted rounded" />
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Link unavailable
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {showInstructions && (
          <>
            {status === "sent" && (
              <Card className="border-success bg-success/10">
                <CardContent className="flex items-start gap-3 p-4 text-success">
                  <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Payment confirmed</p>
                    <p className="text-sm text-muted-foreground">
                      The recipient has been notified of your confirmation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  {payLink?.owner?.avatar ? (
                    <AvatarImage
                      src={payLink.owner.avatar}
                      alt={recipientName}
                      className="object-cover"
                    />
                  ) : (
                    <AvatarFallback>
                      {recipientName
                        .split(" ")
                        .map((name) => name[0])
                        .slice(0, 2)
                        .join("")}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">Pay to</p>
                  <p className="text-lg font-semibold">{recipientName}</p>
                  {payLink?.expiresAt && (
                    <p className="text-xs text-muted-foreground">
                      Expires {new Date(payLink.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <BankTransferInstructions
              amount={payLink.amount}
              currency={payLink.currency}
              region={region}
              recipientName={recipientName}
              paymentMethod={payLink.bankTransferInstructions}
              referenceDisplay={referenceDisplay}
              onMarkAsSent={status === "pending" ? handleMarkPaid : undefined}
              markAsSentLabel={
                status === "pending" ? "I've sent the money" : undefined
              }
              markAsSentDisabled={marking}
              status={status}
            />
          </>
        )}
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}
