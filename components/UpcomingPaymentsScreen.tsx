import {
  ArrowLeft,
  Calendar,
  AlertCircle,
  Clock,
  CreditCard,
  Users,
  AlertTriangle,
  Undo2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useUserProfile } from "./UserProfileContext";
import { formatCurrencyForRegion } from "../utils/regions";
import { formatDueDate } from "../utils/formatDueDate";
import { ListSkeleton } from "./ui/loading";
import { Alert, AlertDescription } from "./ui/alert";
import { useUpcomingPayments } from "../hooks/useUpcomingPayments";
import { Progress } from "./ui/progress";

interface UpcomingPaymentsScreenProps {
  onNavigate: (tab: string, data?: any) => void;
}

export function UpcomingPaymentsScreen({
  onNavigate,
}: UpcomingPaymentsScreenProps) {
  const { appSettings, userProfile } = useUserProfile();
  const fmt = (n: number) => formatCurrencyForRegion(appSettings.region, n);
  const { upcomingPayments, loading, error } = useUpcomingPayments();
  const getInitials = (name: string) =>
    String(name || "")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const dueSoonTotal = upcomingPayments
    .filter((p) => p.status === "overdue" || p.status === "due_soon")
    .reduce((sum, p) => sum + p.amount, 0);

  const monthTotal = upcomingPayments
    .filter((p) => p.status !== "overdue")
    .reduce((sum, p) => sum + p.amount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "due_soon":
        return "bg-warning text-warning-foreground";
      case "overdue":
        return "bg-destructive text-destructive-foreground";
      case "pending":
        return "bg-primary text-primary-foreground";
      case "upcoming":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }

    if (payment.type === "request") {
      return (
        <Card className="p-4 hover:bg-muted/50 transition-colors">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-secondary text-foreground/70">
                      {payment.organizer?.avatar || ""}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background shadow flex items-center justify-center">
                    <Undo2 className="h-3.5 w-3.5 text-success" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{payment.organizer?.name}</p>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{payment.title}</p>
                </div>
              </div>
              <p className="font-semibold whitespace-nowrap text-success">+{fmt(payment.amount)}</p>
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{shortDate(payment.dueDate)}</span>
              {payment.status === "overdue" && (
                <Badge variant="destructive" className="text-xs">Overdue</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl"
                onClick={() => onNavigate("payment-request-cancel", { requestId: payment.requestId || payment.id })}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="w-full h-12 rounded-xl"
                onClick={() => onNavigate("send-reminder", { to: payment.organizer?.id || payment.organizer?.name, requestId: payment.requestId || payment.id })}
              >
                Remind
              </Button>
            </div>
          </div>
        </Card>
      );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "due_soon":
        return <AlertTriangle className="h-3 w-3" />;
      case "overdue":
        return <AlertCircle className="h-3 w-3" />;
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "upcoming":
        return <Calendar className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === "overdue") return "Overdue";
    if (status === "due_soon" || status === "pending") return "Pending";
    return "Upcoming";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bill_split":
        return <Users className="h-4 w-4" />;
      case "request":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const PaymentCard = ({ payment }: { payment: any }) => {
    const duePhrase = formatDueDate(payment.dueDate);
    const dueText = duePhrase
      ? duePhrase.toLowerCase().startsWith("overdue")
        ? duePhrase
        : `Due ${duePhrase}`
      : "Due date unavailable";

    // Specialized bill split design with progress, urgency, and full-width pay button
    if (payment.type === "bill_split") {
      const participants = Array.isArray(payment.participants)
        ? payment.participants
        : [];
      const total = participants.length || 0;
      const paidCount = participants.filter((p: any) => p?.isPaid).length;
      const percent = total > 0 ? Math.round((paidCount / total) * 100) : 0;
      const isOverdue = payment.status === "overdue";

      return (
        <Card
          className={`p-4 transition-colors cursor-pointer ${
            isOverdue ? "border-2 border-destructive" : "hover:bg-muted/50"
          }`}
          onClick={() => {
            if (payment.billSplitId) {
              onNavigate("pay-bill", { billId: payment.billSplitId });
            }
          }}
        >
          <div className="space-y-3">
            {/* Header: avatar + organizer + amount */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-secondary text-foreground/70">
                      {payment.organizer?.avatar || ""}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background shadow flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{payment.organizer?.name}</p>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{payment.title}</p>
                </div>
              </div>
              <p className="font-semibold whitespace-nowrap text-destructive">-
                {fmt(payment.amount)}
              </p>
            </div>

            {/* Due text removed per latest design */}

            {/* Progress caption */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {paidCount} of {total} paid
              </span>
              <span>{percent}%</span>
            </div>

            {/* Progress bar styled to match design */}
            <div className="w-full mx-auto">
              <Progress
                value={percent}
                className="h-[6px] w-full bg-muted"
                indicatorClassName="bg-foreground"
              />
            </div>

            {/* Pay button close to the bar */}
            <Button
              size="sm"
              className="w-full"
              variant={isOverdue ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation();
                if (payment.billSplitId) {
                  onNavigate("pay-bill", { billId: payment.billSplitId });
                }
              }}
            >
              Pay Now
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <Card
        className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => {
          if (payment.type === "bill_split" && payment.billSplitId) {
            // Go straight to the payment flow for a bill split
            onNavigate("pay-bill", { billId: payment.billSplitId });
          } else if (payment.type === "request") {
            // Direct request â†’ simplified payment flow
            onNavigate("payment-flow", {
              paymentRequest: {
                id: `upcoming-${payment.id}`,
                amount: payment.amount,
                description: payment.title,
                recipient: payment.organizer.name,
                recipientId: payment.organizer.id ?? payment.organizer.name,
                requestId: payment.requestId || payment.id,
                dueDate: payment.dueDate,
              },
            });
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {payment.organizer.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                {getTypeIcon(payment.type)}
                <p className="font-medium truncate">{payment.title}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {payment.organizer.name} â€¢{" "}
                {Array.isArray(payment.participants)
                  ? payment.participants.length
                  : payment.participants}{" "}
                people
              </p>

              {/* Show payment method info if available */}
              {payment.paymentMethod && (
                <p className="text-xs text-muted-foreground mt-1">
                  {payment.paymentMethod.type === "bank" ? (
                    <>Pay via {payment.paymentMethod.bankName}</>
                  ) : (
                    <>Pay via {payment.paymentMethod.provider}</>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="text-right space-y-2">
            <p className="font-medium">{fmt(payment.amount)}</p>
            <Badge
              className={`${getStatusColor(payment.status)} text-xs flex items-center gap-1`}
            >
              {getStatusIcon(payment.status)}
              {dueText}
            </Badge>
            <Button
              size="sm"
              variant={
                payment.status === "overdue" || payment.status === "due_soon"
                  ? "default"
                  : "outline"
              }
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                if (payment.type === "bill_split" && payment.billSplitId) {
                  onNavigate("pay-bill", { billId: payment.billSplitId });
                } else {
                  // For direct money requests, use the simplified payment flow
                  onNavigate("payment-flow", {
                    paymentRequest: {
                      id: `upcoming-${payment.id}`,
                      amount: payment.amount,
                      description: payment.title,
                      recipient: payment.organizer.name,
                      recipientId:
                        payment.organizer.id ?? payment.organizer.name,
                      // Pass through the underlying request transaction id if present
                      requestId: payment.requestId || payment.id,
                      dueDate: new Date(
                        Date.now() + 24 * 60 * 60 * 1000,
                      ).toISOString(),
                    },
                  });
                }
              }}
            >
              Pay Now
            </Button>
          </div>
        </div>
      </Card>
    );
  };
    const NewPaymentCard = ({ payment }: { payment: any }) => {
    const participants = Array.isArray(payment.participants)
      ? payment.participants
      : [];
    const total = participants.length || (typeof payment.participants === "number" ? payment.participants : 0);
    const paidCount = participants.filter((p: any) => p?.isPaid).length;
    const percent = total > 0 ? Math.round((paidCount / total) * 100) : 0;
    const initials = getInitials(payment.organizer?.name);
    const dateText = formatDueDate(payment.dueDate);

    if (payment.type === "bill_split") {
      return (
        <div className="bg-card box-border flex flex-col gap-[16px] pb-[20px] pl-[20px] pr-[20px] pt-[20px] relative rounded-[16px] shrink-0 w-full">
          <div aria-hidden="true" className="absolute border-[1.268px] border-border border-solid inset-0 pointer-events-none rounded-[16px]" />
          <div className="flex gap-[12px] items-start">
            <div className="relative shrink-0" style={{ width: "41.999px", height: "41.999px" }}>
              <Avatar className="h-[41.999px] w-[41.999px]">
                <AvatarImage src={payment.organizer?.avatar} />
                <AvatarFallback className="bg-muted text-foreground/70 text-[10.5px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-border">
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-[4px]">
              <div className="flex items-start justify-between w-full">
                <p className="font-['Roboto:Medium',_sans-serif] font-medium leading-[21px] text-[14px] text-foreground" style={{ fontVariationSettings: "'wdth' 100" }}>
                  {payment.organizer?.name}
                </p>
                <p className="font-['Roboto:Medium',_sans-serif] font-medium leading-[21px] text-[14px] text-destructive whitespace-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
                  -{fmt(Math.abs(payment.amount))}
                </p>
              </div>
              <p className="font-['Roboto:Regular',_sans-serif] font-normal leading-[17.5px] text-muted-foreground text-[12.25px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                {payment.title}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-[12px] ml-[54px]">
            <div className="flex items-center justify-between">
              <p className="font-['Inter:Regular',_sans-serif] font-normal leading-[20px] not-italic text-[14px] text-muted-foreground">
                {paidCount} of {total} paid
              </p>
              <p className="font-['Inter:Regular',_sans-serif] font-normal leading-[20px] not-italic text-[14px] text-foreground">
                {percent}%
              </p>
            </div>
            <div className="relative w-full">
              <div className="bg-muted h-[6px] rounded-[9999px] w-full" />
              <div className="absolute top-0 bg-foreground h-[6px] rounded-l-[9999px]" style={{ width: `${percent}%` }} />
            </div>
            <button
              onClick={() => payment.billSplitId && onNavigate("pay-bill", { billId: payment.billSplitId })}
              className="bg-primary h-[44px] py-[10px] rounded-[8px] hover:bg-primary/90 transition-colors w-full"
            >
              <p className="font-['Inter:Regular',_sans-serif] font-normal leading-[20px] not-italic text-[14px] text-center text-primary-foreground">
                Pay Now
              </p>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-card box-border flex flex-col gap-[16px] pb-[20px] pl-[20px] pr-[20px] pt-[20px] relative rounded-[16px] shrink-0 w-full">
        <div aria-hidden="true" className="absolute border-[1.268px] border-border border-solid inset-0 pointer-events-none rounded-[16px]" />
        <div className="flex gap-[12px] items-start">
          <div className="relative shrink-0" style={{ width: "41.999px", height: "41.999px" }}>
            <Avatar className="h-[41.999px] w-[41.999px]">
              <AvatarImage src={payment.organizer?.avatar} />
              <AvatarFallback className="bg-muted text-foreground/70 text-[10.5px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-border">
              <Clock className="h-3.5 w-3.5 text-warning" />
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-[4px]">
            <div className="flex items-start justify-between w-full">
              <p className="font-['Roboto:Medium',_sans-serif] font-medium leading-[21px] text-[14px] text-foreground" style={{ fontVariationSettings: "'wdth' 100" }}>
                {payment.organizer?.name}
              </p>
              <p className="font-['Roboto:Medium',_sans-serif] font-medium leading-[21px] text-[14px] text-success whitespace-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
                +{fmt(Math.abs(payment.amount))}
              </p>
            </div>
            <p className="font-['Roboto:Regular',_sans-serif] font-normal leading-[17.5px] text-muted-foreground text-[12.25px]" style={{ fontVariationSettings: "'wdth' 100" }}>
              {payment.title}
            </p>
          </div>
        </div>
        <div className="flex gap-[8px] items-center ml-[54px]">
          <p className="font-['Roboto:Regular',_sans-serif] font-normal leading-[14px] text-muted-foreground text-[10.5px]" style={{ fontVariationSettings: "'wdth' 100" }}>
            {dateText}
          </p>
          {payment.status === "overdue" && (
            <div className="bg-destructive h-[20px] rounded-[6px] px-[10px] flex items-center">
              <p className="font-['Roboto:Medium',_sans-serif] font-medium leading-[14px] text-[10.5px] text-destructive-foreground" style={{ fontVariationSettings: "'wdth' 100" }}>
                Overdue
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-[12px] flex-1 ml-[54px]">
          {/* Show Cancel/Remind if current user is the original requester (sender),
              not based on organizer which points to the debtor. */}
          {payment.senderId && userProfile?.id === payment.senderId ? (
            <>
              <button
                onClick={() => onNavigate("payment-request-cancel", { requestId: payment.requestId || payment.id })}
                className="flex-1 bg-background border border-solid border-border h-[44px] py-[10px] rounded-[8px] hover:bg-muted transition-colors"
              >
                <p className="font-['Inter:Regular',_sans-serif] font-normal leading-[20px] not-italic text-[14px] text-center text-foreground">
                  Cancel
                </p>
              </button>
              <button
                onClick={() => onNavigate("send-reminder", { to: payment.organizer?.id || payment.organizer?.name, requestId: payment.requestId || payment.id })}
                className="flex-1 bg-primary h-[44px] py-[10px] rounded-[8px] hover:bg-primary/90 transition-colors"
              >
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
                    id: String(payment.id), // keep raw id for reference display
                    directRequestId: payment.requestId ? undefined : String(payment.id),
                    amount: payment.amount,
                    description: payment.title,
                    recipient: payment.organizer?.name,
                    recipientId: payment.organizer?.id || payment.organizer?.name,
                    requestId: payment.requestId ?? undefined,
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
  };if (loading) {
    return (
      <div className="p-4 space-y-6 pb-20">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => onNavigate("home")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2>Pending</h2>
        </div>
        <ListSkeleton count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-6 pb-20">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => onNavigate("home")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2>Pending</h2>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => onNavigate("home")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2>Pending</h2>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-center space-y-2">
            <p className="font-medium text-destructive">{fmt(dueSoonTotal)}</p>
            <p className="text-sm text-muted-foreground">Due Soon</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center space-y-2">
            <p className="font-medium">{fmt(monthTotal)}</p>
            <p className="text-sm text-muted-foreground">This Month</p>
          </div>
        </Card>
      </div>

      {/* Payments List */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <div className="space-y-3">
            {upcomingPayments
              .filter((p) => p.status === "upcoming" || p.status === "due_soon")
              .map((payment) => (
                <NewPaymentCard key={payment.id} payment={payment} />
              ))}
            {upcomingPayments.filter(
              (p) => p.status === "upcoming" || p.status === "due_soon",
            ).length === 0 && (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No pending payments</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          <div className="space-y-3">
            {upcomingPayments
              .filter((p) => p.status === "overdue")
              .map((payment) => (
                <NewPaymentCard key={payment.id} payment={payment} />
              ))}
            {upcomingPayments.filter((p) => p.status === "overdue").length ===
              0 && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No overdue payments</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          <div className="space-y-3">
            {upcomingPayments
              .filter((p) => p.status === "upcoming")
              .map((payment) => (
                <NewPaymentCard key={payment.id} payment={payment} />
              ))}
            {upcomingPayments.filter((p) => p.status === "upcoming").length ===
              0 && (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No upcoming payments</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="space-y-3">
        <Button className="w-full" onClick={() => onNavigate("split")}>
          Create New Split
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onNavigate("split")}
        >
          Create Recurring Split
        </Button>
      </div>
    </div>
  );
}




