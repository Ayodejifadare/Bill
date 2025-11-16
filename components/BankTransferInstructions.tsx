import { ReactNode, useMemo } from "react";
import { Building2, Copy, Smartphone } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import {
  formatCurrencyForRegion,
  formatBankAccountForRegion,
  formatMobileAccountNumberForRegion,
  getBankIdentifierLabel,
  requiresRoutingNumber,
  getCurrencyCode,
  RegionCode,
} from "../utils/regions";
import { toast } from "sonner";

export interface TransferAccountDetails {
  type?: "bank" | "mobile_money" | string | null;
  bank?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  sortCode?: string | null;
  routingNumber?: string | null;
  provider?: string | null;
  phoneNumber?: string | null;
}

interface BankTransferInstructionsProps {
  amount: number;
  currency?: string | null;
  region?: RegionCode | null;
  recipientName?: string;
  paymentMethod?: TransferAccountDetails | null;
  isMethodLoading?: boolean;
  methodError?: string | null;
  referenceDisplay?: string;
  referenceDescription?: string;
  onCopyReference?: () => Promise<void> | void;
  status?: "pending" | "sent" | "confirmed";
  onMarkAsSent?: () => Promise<void> | void;
  markAsSentLabel?: string;
  markAsSentDisabled?: boolean;
  actionSlot?: ReactNode;
  actionsPlacement?: "fixed" | "stacked";
}

function fallbackFormatCurrency(amount: number, currency?: string | null) {
  if (!currency) return amount.toFixed(2);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatAmount(
  amount: number,
  region?: RegionCode | null,
  currency?: string | null,
) {
  if (region) return formatCurrencyForRegion(region, amount);
  return fallbackFormatCurrency(amount, currency);
}

async function copyToClipboard(value: string) {
  if (!navigator?.clipboard?.writeText) {
    throw new Error("Clipboard not available");
  }
  await navigator.clipboard.writeText(value);
}

export function BankTransferInstructions({
  amount,
  currency,
  region,
  recipientName,
  paymentMethod,
  isMethodLoading,
  methodError,
  referenceDisplay,
  referenceDescription = "Include this reference in your payment description",
  onCopyReference,
  status = "pending",
  onMarkAsSent,
  markAsSentLabel = "Mark as Sent",
  markAsSentDisabled,
  actionSlot,
  actionsPlacement = "stacked",
}: BankTransferInstructionsProps) {
  const formattedAmount = useMemo(
    () => formatAmount(amount, region, currency ?? getCurrencyCode(region)),
    [amount, region, currency],
  );

  const identifierLabel = getBankIdentifierLabel(region);
  const usesRoutingNumber = requiresRoutingNumber(region);

  const handleCopyAmount = async () => {
    try {
      await copyToClipboard(amount.toFixed(2));
      toast.success("Amount copied to clipboard");
    } catch {
      toast.error("Unable to copy amount. Please copy manually.");
    }
  };

  const handleCopyPaymentDetails = async () => {
    if (!paymentMethod) return;
    try {
      if (paymentMethod.type === "bank") {
        const identifierValue = usesRoutingNumber
          ? paymentMethod.routingNumber
          : paymentMethod.sortCode;
        const info = [
          paymentMethod.bank && `Bank: ${paymentMethod.bank}`,
          paymentMethod.accountName && `Account Name: ${paymentMethod.accountName}`,
          identifierValue && `${identifierLabel}: ${identifierValue}`,
          paymentMethod.accountNumber &&
            `Account Number: ${paymentMethod.accountNumber}`,
        ]
          .filter(Boolean)
          .join("\n");
        await copyToClipboard(info);
      } else {
        const info = [
          paymentMethod.provider && `Provider: ${paymentMethod.provider}`,
          paymentMethod.phoneNumber &&
            `Phone Number: ${formatMobileAccountNumberForRegion(
              region,
              paymentMethod.phoneNumber,
            )}`,
        ]
          .filter(Boolean)
          .join("\n");
        await copyToClipboard(info);
      }
      toast.success("Payment details copied to clipboard");
    } catch {
      toast.error("Unable to copy payment details");
    }
  };

  const handleCopyReference = async () => {
    if (!referenceDisplay) return;
    try {
      if (onCopyReference) {
        await onCopyReference();
        return;
      }
      await copyToClipboard(referenceDisplay);
      toast.success("Payment reference copied");
    } catch {
      toast.error("Unable to copy reference");
    }
  };

  const showPrimaryAction =
    status === "pending" && Boolean(onMarkAsSent) && Boolean(paymentMethod);

  const actionContainerClass =
    actionsPlacement === "fixed"
      ? "fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4"
      : "pt-2";

  return (
    <>
      <Card className="border-primary bg-primary/5">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="text-center py-4 bg-background/50 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                {formattedAmount}
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyAmount}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Amount
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isMethodLoading ? (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-muted-foreground text-sm">
              Loading payment method...
            </div>
          </CardContent>
        </Card>
      ) : methodError ? (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-sm text-destructive">{methodError}</div>
          </CardContent>
        </Card>
      ) : paymentMethod ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              {paymentMethod.type === "bank" ? (
                <Building2 className="h-5 w-5" />
              ) : (
                <Smartphone className="h-5 w-5" />
              )}
              Payment Destination
            </CardTitle>
            <CardDescription>
              Send your payment to {recipientName || "this account"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1 space-y-2 text-sm">
                      {paymentMethod.type === "bank" ? (
                        <>
                          <p className="font-medium text-base">
                            {paymentMethod.bank}
                          </p>
                          {paymentMethod.accountName && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Account Name:
                              </span>
                              <span className="font-medium">
                                {paymentMethod.accountName}
                              </span>
                            </div>
                          )}
                          {(paymentMethod.sortCode || paymentMethod.routingNumber) && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                {identifierLabel}:
                              </span>
                              <span className="font-mono">
                                {usesRoutingNumber
                                  ? paymentMethod.routingNumber
                                  : paymentMethod.sortCode}
                              </span>
                            </div>
                          )}
                          {paymentMethod.accountNumber && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Account Number:
                              </span>
                              <span className="font-mono">
                                {formatBankAccountForRegion(
                                  region,
                                  paymentMethod.accountNumber,
                                )}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-base">
                            {paymentMethod.provider}
                          </p>
                          {paymentMethod.phoneNumber && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Phone Number:
                              </span>
                              <span className="font-mono">
                                {formatMobileAccountNumberForRegion(
                                  region,
                                  paymentMethod.phoneNumber,
                                )}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPaymentDetails}
                      className="min-h-[40px] min-w-[40px] ml-2"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
              💡
              {paymentMethod.type === "bank"
                ? " Use your banking app (mobile or web) to send this payment."
                : ` Open your ${paymentMethod.provider || "mobile money"} app and send to the number above.`}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="space-y-3">
              <div className="text-muted-foreground text-sm">
                ⚠️ Payment method information not available.
              </div>
              <p className="text-sm">
                Please contact the recipient directly for payment details.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {referenceDisplay && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Payment Reference</CardTitle>
            <CardDescription>{referenceDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <span className="font-mono text-sm min-w-0 flex-1 break-all">
                {referenceDisplay}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyReference}
                className="min-h-[40px] min-w-[40px] flex-shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={actionContainerClass}>
        <div className="max-w-md mx-auto space-y-3">
          {showPrimaryAction && (
            <Button
              className="w-full h-12 text-base font-medium"
              onClick={onMarkAsSent}
              disabled={markAsSentDisabled}
            >
              {markAsSentLabel}
            </Button>
          )}
          {actionSlot}
        </div>
      </div>
    </>
  );
}
