import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "./ui/button";
import { ShareSheet } from "./ui/share-sheet";
import { useUserProfile } from "./UserProfileContext";
import { formatCurrencyForRegion } from "../utils/regions";
import { formatDueDate } from "../utils/formatDueDate";

export interface ShareData {
  type:
    | "bill_split"
    | "payment_request"
    | "transaction"
    | "payment_confirmation"
    | "group_summary";
  title: string;
  amount: number;
  description?: string;
  participantNames?: string[];
  dueDate?: string;
  status?: string;
  groupName?: string;
  paymentMethod?: string;
  transactionId?: string;
  deepLink?: string;
}

/**
 * Generate formatted share text based on share data type
 */
export function generateShareText(
  shareData: ShareData,
  formatAmount: (n: number) => string,
  userProfile: any,
) {
  const {
    type,
    title,
    amount,
    description,
    participantNames,
    dueDate,
    status,
    groupName,
  } = shareData;
  const formattedAmount = formatAmount(amount);
  const formattedDueDate = dueDate ? formatDueDate(dueDate) || dueDate : "";

  switch (type) {
    case "bill_split": {
      const participantsList = participantNames
        ? participantNames.join(", ")
        : "friends";
      return `*${title}*

 Amount: ${formattedAmount}
   Split with: ${participantsList}${formattedDueDate ? `\n Due: ${formattedDueDate}` : ""}${description ? `\n ${description}` : ""}

_Shared via Biltip _`;
    }

    case "payment_request": {
      return `*Payment Request*

 Amount: ${formattedAmount}
 From: ${userProfile.name}
   For: ${title}${formattedDueDate ? `\n Due: ${formattedDueDate}` : ""}${description ? `\n ${description}` : ""}

_Send via Biltip _`;
    }

    case "transaction": {
      return `*Transaction Complete*

 ${title}: ${formattedAmount}
 Status: ${status || "Completed"}${shareData.transactionId ? `\n Ref: ${shareData.transactionId}` : ""}${shareData.paymentMethod ? `\n Via: ${shareData.paymentMethod}` : ""}

_Powered by Biltip _`;
    }

    case "payment_confirmation": {
      return `*Payment Sent Successfully!*

 Amount: ${formattedAmount}
 To: ${title}${shareData.transactionId ? `\n Reference: ${shareData.transactionId}` : ""}${shareData.paymentMethod ? `\n Method: ${shareData.paymentMethod}` : ""}

_Paid via Biltip _`;
    }

    case "group_summary": {
      return `*${groupName || "Group"} Expense Summary*

 Total: ${formattedAmount}${participantNames ? `\n Members: ${participantNames.join(", ")}` : ""}${description ? `\n ${description}` : ""}

_Tracked with Biltip _`;
    }

    default:
      return `Check out this ${title} for ${formattedAmount} on Biltip!`;
  }
}

/**
 * Get document data for share sheet
 */
export function getDocumentData(shareData: ShareData) {
  return {
    title: shareData.title,
    content: shareData,
    type:
      shareData.type === "bill_split"
        ? ("bill_split" as const)
        : shareData.type === "payment_request"
          ? ("invoice" as const)
          : ("receipt" as const),
  };
}

/**
 * Create shareable deep links
 */
export const createDeepLink = (type: string, id: string): string => {
  const baseUrl = "https://biltip.app"; // This would be your actual app URL
  return `${baseUrl}/${type}/${id}`;
};

/**
 * Main share component that opens the standardized ShareSheet
 */
interface ShareUtilsProps {
  shareData: ShareData;
  onNavigate?: (tab: string, data?: any) => void;
  buttonText?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function ShareUtils({
  shareData,
  onNavigate: _onNavigate,
  buttonText = "Share",
  variant = "default",
  size = "lg",
  className = "",
}: ShareUtilsProps) {
  const { appSettings } = useUserProfile();
  const fmt = (n: number) => formatCurrencyForRegion(appSettings.region, n);
  const [showShareSheet, setShowShareSheet] = useState(false);

  const shareText = generateShareText(shareData, fmt, userProfile);
  const documentData = getDocumentData(shareData);

  return (
    <>
      <Button
        onClick={() => setShowShareSheet(true)}
        className={`w-full bg-primary hover:bg-primary/90 text-primary-foreground ${className}`}
        variant={variant}
        size={size}
      >
        <Share2 className="h-4 w-4 mr-2" />
        {buttonText}
      </Button>

      <ShareSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        title="Share Details"
        shareText={shareText}
        documentData={documentData}
      />
    </>
  );
}

/**
 * Quick share button component for individual screens
 */
interface QuickShareButtonProps {
  shareData: ShareData;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  showText?: boolean;
  className?: string;
}

export function QuickShareButton({
  shareData,
  variant = "outline",
  size = "sm",
  showText = true,
  className = "",
}: QuickShareButtonProps) {
  const [showShareSheet, setShowShareSheet] = useState(false);
  const { userProfile, appSettings } = useUserProfile();
  const fmt = (n: number) => formatCurrencyForRegion(appSettings.region, n);

  const generateQuickShareText = () => {
    const formattedAmount = fmt(shareData.amount);
    return `*${shareData.title}*

 ${formattedAmount}${shareData.description ? `\n ${shareData.description}` : ""}

_Shared via Biltip _`;
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowShareSheet(true)}
        className={className}
      >
        <Share2 className="h-4 w-4" />
        {showText && <span className="ml-2">Share</span>}
      </Button>

      <ShareSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        title="Share"
        shareText={generateQuickShareText()}
        documentData={{
          title: shareData.title,
          content: shareData,
          type: "bill_split",
        }}
      />
    </>
  );
}

/**
 * Specialized share buttons for common use cases
 */

// Transaction Details Share Button
export function ShareTransactionButton({
  transactionId,
  title,
  amount,
  status = "Completed",
  paymentMethod,
  className = "",
}: {
  transactionId: string;
  title: string;
  amount: number;
  status?: string;
  paymentMethod?: string;
  className?: string;
}) {
  const shareData: ShareData = {
    type: "transaction",
    title,
    amount,
    status,
    paymentMethod,
    transactionId,
    deepLink: createDeepLink("transaction", transactionId),
  };

  return (
    <ShareUtils
      shareData={shareData}
      buttonText="Share Transaction"
      className={className}
    />
  );
}

// Bill Split Share Button
export function ShareBillSplitButton({
  billSplitId,
  title,
  amount,
  participantNames,
  dueDate,
  description,
  className = "",
}: {
  billSplitId: string;
  title: string;
  amount: number;
  participantNames?: string[];
  dueDate?: string;
  description?: string;
  className?: string;
}) {
  const shareData: ShareData = {
    type: "bill_split",
    title,
    amount,
    participantNames,
    dueDate,
    description,
    deepLink: createDeepLink("bill", billSplitId),
  };

  return (
    <ShareUtils
      shareData={shareData}
      buttonText="Share Bill Split"
      className={className}
    />
  );
}

// Payment Request Share Button
export function SharePaymentRequestButton({
  requestId,
  title,
  amount,
  dueDate,
  description,
  className = "",
}: {
  requestId: string;
  title: string;
  amount: number;
  dueDate?: string;
  description?: string;
  className?: string;
}) {
  const shareData: ShareData = {
    type: "payment_request",
    title,
    amount,
    dueDate,
    description,
    deepLink: createDeepLink("request", requestId),
  };

  return (
    <ShareUtils
      shareData={shareData}
      buttonText="Share Request"
      className={className}
    />
  );
}
