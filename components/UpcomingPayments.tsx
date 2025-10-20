import { ListSkeleton } from "./ui/loading";
import { Alert, AlertDescription } from "./ui/alert";
import { useUpcomingPayments } from "../hooks/useUpcomingPayments";
import { Users, Clock } from "lucide-react";
import { formatDueDate } from "../utils/formatDueDate";
import { useUserProfile } from "./UserProfileContext";
import { formatCurrencyForRegion } from "../utils/regions";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface UpcomingPaymentsProps {
  onNavigate: (tab: string, data?: any) => void;
}

export function UpcomingPayments({ onNavigate }: UpcomingPaymentsProps) {
  const { upcomingPayments, loading, error } = useUpcomingPayments();
  const { appSettings, userProfile } = useUserProfile();
  const fmt = (n: number) => formatCurrencyForRegion(appSettings.region, n);

  const handleSeeAll = () => onNavigate("upcoming-payments");

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const transactions = upcomingPayments
    .filter(
      (p) =>
        p.status === "upcoming" ||
        p.status === "due_soon" ||
        p.status === "overdue" ||
        p.status === "pending",
    )
    .map((p) => {
      const participants = Array.isArray(p.participants) ? p.participants : [];
      const total = participants.length || (typeof p.participants === "number" ? p.participants : 0);
      const paid = participants.filter((x: any) => x?.isPaid).length;
      return {
        id: p.id,
        type: p.type === "bill_split" ? "payment" : "request",
        name: p.organizer?.name || "",
        initials: getInitials(p.organizer?.name || ""),
        avatar: p.organizer?.avatar || "",
        amount: p.amount,
        description: p.title,
        paid,
        total,
        date: formatDueDate(p.dueDate),
        isOverdue: p.status === "overdue",
        billSplitId: p.billSplitId,
        // For direct pending requests, server returns requestId=null; keep it null here
        // to ensure the payment flow uses direct mark-paid endpoint.
        requestId: p.requestId ?? null,
        organizerId: p.organizer?.id,
        senderId: (p as any).senderId,
        receiverId: (p as any).receiverId,
      } as any;
    });

  if (loading) {
    return <ListSkeleton count={2} />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="content-stretch flex flex-col gap-[13.987px] items-start w-full">
      <div className="h-[39.998px] relative shrink-0 w-full">
        <div className="flex flex-row items-center size-full">
          <div className="content-stretch flex h-[39.998px] items-center justify-between relative w-full">
            <div className="h-[21px] relative shrink-0">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[21px] items-start relative">
                <p className="font-['Roboto:Regular',_sans-serif] font-normal leading-[21px] relative shrink-0 text-[14px] text-foreground text-nowrap whitespace-pre" style={{ fontVariationSettings: "'wdth' 100" }}>
                  Pending
                </p>
              </div>
            </div>
            <button 
              onClick={handleSeeAll}
              className="h-[39.998px] relative rounded-[7px] shrink-0 hover:bg-muted transition-colors"
            >
              <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[7px] h-[39.998px] items-center justify-center px-[10.5px] py-0 relative">
                <p className="font-['Roboto:Medium',_sans-serif] font-medium leading-[17.5px] relative shrink-0 text-[12.25px] text-foreground text-nowrap whitespace-pre" style={{ fontVariationSettings: "'wdth' 100" }}>
                  See All
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="content-stretch flex flex-col gap-[10.5px] items-start relative shrink-0 w-full">
        {transactions.slice(0, 2).map((transaction: any) => {
          const percentage = transaction.total > 0 ? Math.round((transaction.paid / transaction.total) * 100) : 0;

          const handlePayNow = (id: string) => {
            if (transaction.billSplitId) {
              onNavigate("pay-bill", { billId: transaction.billSplitId });
            }
          };
          const handleCancel = (id: string) => {
            onNavigate("payment-request-cancel", { requestId: transaction.requestId || id });
          };
          const handleRemind = (id: string) => {
            onNavigate("send-reminder", { to: transaction.organizerId || transaction.name, requestId: transaction.requestId || id });
          };

          // Requester is the original sender of the request (not the organizer in our UI)
          const isRequester = Boolean(transaction.senderId && userProfile?.id === transaction.senderId);

          if (transaction.type === 'payment') {
            return (
              <div key={transaction.id} className="bg-card box-border flex flex-col gap-[16px] pb-[20px] pl-[20px] pr-[20px] pt-[20px] relative rounded-[16px] shrink-0 w-full">
                <div aria-hidden="true" className="absolute border-[1.268px] border-border border-solid inset-0 pointer-events-none rounded-[16px]" />
                
                <div className="flex gap-[12px] items-start">
                  <div className="relative shrink-0" style={{ width: "41.999px", height: "41.999px" }}>
                    <Avatar className="h-[41.999px] w-[41.999px]">
                      <AvatarImage src={transaction.avatar} />
                      <AvatarFallback className="bg-muted text-foreground/70 text-[10.5px]">
                        {transaction.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bg-background box-border content-stretch flex flex-col items-center justify-center left-[21.99px] pb-[1.268px] pt-[4.755px] px-[4.755px] rounded-full size-[23.496px] top-[21.99px] border border-border">
                      {transaction.type === 'payment' ? (
                        <Users className="h-[14px] w-[14px] text-primary" />
                      ) : (
                        <Clock className="h-[14px] w-[14px] text-warning" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-[4px]">
                    <div className="flex items-start justify-between w-full">
                      <p className="font-['Roboto:Medium',_sans-serif] font-medium leading-[21px] text-[14px] text-foreground" style={{ fontVariationSettings: "'wdth' 100" }}>
                        {transaction.name}
                      </p>
                      <p className="font-['Roboto:Medium',_sans-serif] font-medium leading-[21px] text-[14px] text-destructive whitespace-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
                        -{fmt(Math.abs(transaction.amount))}
                      </p>
                    </div>
                    <p className="font-['Roboto:Regular',_sans-serif] font-normal leading-[17.5px] text-muted-foreground text-[12.25px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                      {transaction.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-[12px] ml-[54px]">
                  <div className="flex items-center justify-between">
                    <p className="font-['Inter:Regular',_sans-serif] font-normal leading-[20px] not-italic text-[14px] text-muted-foreground">
                      {transaction.paid} of {transaction.total} paid
                    </p>
                    <p className="font-['Inter:Regular',_sans-serif] font-normal leading-[20px] not-italic text-[14px] text-foreground">
                      {percentage}%
                    </p>
                  </div>

                  <div className="relative w-full">
                    <div className="bg-muted h-[6px] rounded-[9999px] w-full" />
                    <div className="absolute top-0 bg-foreground h-[6px] rounded-l-[9999px]" style={{ width: `${percentage}%` }} />
                  </div>

                  <button onClick={() => handlePayNow(transaction.id)} className="bg-primary h-[44px] py-[10px] rounded-[8px] hover:bg-primary/90 transition-colors w-full">
                    <p className="font-['Inter:Regular',_sans-serif] font-normal leading-[20px] not-italic text-[14px] text-center text-primary-foreground">
                      Pay Now
                    </p>
                  </button>
                </div>
              </div>
            );
          }

          // Request card
          return (
            <div key={transaction.id} className="bg-card box-border flex flex-col gap-[16px] pb-[20px] pl-[20px] pr-[20px] pt-[20px] relative rounded-[16px] shrink-0 w-full">
              <div aria-hidden="true" className="absolute border-[1.268px] border-border border-solid inset-0 pointer-events-none rounded-[16px]" />
              
              <div className="flex gap-[12px] items-start">
                <div className="relative shrink-0" style={{ width: "41.999px", height: "41.999px" }}>
                  <Avatar className="h-[41.999px] w-[41.999px]">
                    <AvatarImage src={transaction.avatar} />
                    <AvatarFallback className="bg-muted text-foreground/70 text-[10.5px]">
                      {transaction.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-border">
                    {transaction.type === 'payment' ? (
                      <Users className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-warning" />
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-[4px]">
                  <div className="flex items-start justify-between w-full">
                    <p className="font-['Roboto:Medium',_sans-serif] font-medium leading-[21px] text-[14px] text-foreground" style={{ fontVariationSettings: "'wdth' 100" }}>
                      {transaction.name}
                    </p>
                    <p className="font-['Roboto:Medium',_sans-serif] font-medium leading-[21px] text-[14px] text-success whitespace-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
                      +{fmt(Math.abs(transaction.amount))}
                    </p>
                  </div>
                  <p className="font-['Roboto:Regular',_sans-serif] font-normal leading-[17.5px] text-muted-foreground text-[12.25px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                    {transaction.description}
                  </p>
                </div>
              </div>

              <div className="flex gap-[8px] items-center ml-[54px]">
                <p className="font-['Roboto:Regular',_sans-serif] font-normal leading-[14px] text-muted-foreground text-[10.5px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                  {transaction.date}
                </p>
                {transaction.isOverdue && (
                  <div className="bg-destructive h-[20px] rounded-[6px] px-[10px] flex items-center">
                    <p className="font-['Roboto:Medium',_sans-serif] font-medium leading-[14px] text-[10.5px] text-destructive-foreground" style={{ fontVariationSettings: "'wdth' 100" }}>
                      Overdue
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-[12px] flex-1 ml-[54px]">
                {isRequester ? (
                  <>
                    <button onClick={() => handleCancel(transaction.id)} className="flex-1 bg-background border border-solid border-border h-[44px] py-[10px] rounded-[8px] hover:bg-muted transition-colors">
                      <p className="font-['Inter:Regular',_sans-serif] font-normal leading-[20px] not-italic text-[14px] text-center text-foreground">
                        Cancel
                      </p>
                    </button>
                    <button onClick={() => handleRemind(transaction.id)} className="flex-1 bg-primary h-[44px] py-[10px] rounded-[8px] hover:bg-primary/90 transition-colors">
                      <p className="font-['Inter:Regular',_sans-serif] font-normal leading-[20px] not-italic text-[14px] text-center text-primary-foreground">
                        Remind
                      </p>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() =>
                onNavigate("payment-flow", {
                  paymentRequest: {
                    id: `upcoming-${transaction.id}`,
                    amount: transaction.amount,
                    description: transaction.description,
                    recipient: transaction.name,
                    recipientId: transaction.organizerId || transaction.name,
                    // If this is a transaction-backed request it will carry a requestId (now deprecated in list)
                    requestId: transaction.requestId || undefined,
                    // For direct pending requests, use the direct request id for mark-paid
                    directRequestId:
                      transaction.type === "request" && !transaction.requestId
                        ? String(transaction.id)
                        : undefined,
                  },
                })
                    }
                    className="flex-1 bg-primary h-[44px] py-[10px] rounded-[8px] hover:bg-primary/90 transition-colors"
                  >
                    <p className="font-['Inter:Regular',_sans-serif] font-normal leading-[20px] not-italic text-[14px] text-center text-primary-foreground">
                      Pay Now
                    </p>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
