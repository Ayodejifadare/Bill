import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Clock,
  AlertTriangle,
  Calendar,
  Users,
  CreditCard,
  AlertCircle,
  Undo2,
} from "lucide-react";
import { useUserProfile } from "./UserProfileContext";
import { formatCurrencyForRegion } from "../utils/regions";
import { formatDueDate } from "../utils/formatDueDate";
import { ListSkeleton } from "./ui/loading";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { useUpcomingPayments } from "../hooks/useUpcomingPayments";

interface UpcomingPaymentsProps {
  onNavigate: (tab: string, data?: any) => void;
}

export function UpcomingPayments({ onNavigate }: UpcomingPaymentsProps) {
  const { appSettings } = useUserProfile();
  const { upcomingPayments, loading, error } = useUpcomingPayments();
  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

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
  };

  const getStatusLabel = (status: string) => {
    if (status === "overdue") return "Overdue";
    if (status === "due_soon" || status === "pending") return "Pending";
    return "Upcoming";
  };

  const shortDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
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

  if (upcomingPayments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3>Pending</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate("upcoming-payments")}
        >
          See All
        </Button>
      </div>

      <div className="space-y-3">
        {upcomingPayments
          .filter(
            (payment) =>
              payment.status === "upcoming" ||
              payment.status === "due_soon" ||
              payment.status === "overdue" ||
              payment.status === "pending",
          )
          .slice(0, 2)
          .map((payment) => {
            const duePhrase = formatDueDate(payment.dueDate);
            const dueText = duePhrase
              ? duePhrase.toLowerCase().startsWith("overdue")
                ? duePhrase
                : `Due ${duePhrase}`
              : "Due date unavailable";

            // Bill split: specialized card design with progress and urgency
            if (payment.type === "bill_split") {
              const participants = Array.isArray(payment.participants)
                ? payment.participants
                : [];
              const total = participants.length || 0;
              const paidCount = participants.filter((p: any) => p?.isPaid)
                .length;
              const percent = total > 0 ? Math.round((paidCount / total) * 100) : 0;
              const isOverdue = payment.status === "overdue";

              return (
                <Card
                  key={payment.id}
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
                    {/* Header: avatar + name + amount */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={payment.organizer.avatar} />
                            <AvatarFallback className="bg-secondary text-foreground/70">
                              {getInitials(payment.organizer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background shadow flex items-center justify-center">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{payment.organizer.name}</p>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">{payment.title}</p>
                        </div>
                      </div>
                      <p className="font-semibold whitespace-nowrap text-destructive">-
                        {formatCurrencyForRegion(appSettings.region, payment.amount)}
                      </p>
                    </div>

                    {/* Due text removed per latest design */}

                    {/* Progress caption */}
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {paidCount} of {total} paid
                      </span>
                      <span>{percent}%</span>
                    </div>

                    {/* Centered full-width progress bar */}
                    <div className="w-full mx-auto">
                      <Progress value={percent} className="h-2 w-full" />
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

            if (payment.type === "request") {
              return (
                <Card key={payment.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={payment.organizer.avatar} />
                            <AvatarFallback className="bg-secondary text-foreground/70">
                              {getInitials(payment.organizer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background shadow flex items-center justify-center">
                          <Undo2 className="h-3.5 w-3.5 text-success" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{payment.organizer.name}</p>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">{payment.title}</p>
                        </div>
                      </div>
                    <p className="font-semibold whitespace-nowrap text-success">+{formatCurrencyForRegion(appSettings.region, payment.amount)}</p>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{shortDate(payment.dueDate)}</span>
                      {payment.status === "overdue" && (
                        <Badge variant="destructive" className="text-xs">Overdue</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() =>
                          onNavigate("payment-request-cancel", {
                            requestId: payment.requestId || payment.id,
                          })
                        }
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          onNavigate("send-reminder", {
                            to: payment.organizer.id || payment.organizer.name,
                            requestId: payment.requestId || payment.id,
                          })
                        }
                      >
                        Remind
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            }

            return (
              <Card
                key={payment.id}
                className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => {
                  if (payment.type === "bill_split" && payment.billSplitId) {
                    // Take the user straight into the payment flow for better UX
                    onNavigate("pay-bill", { billId: payment.billSplitId });
                  } else if (payment.type === "request") {
                    // Direct money request – open the simplified payment flow
                    onNavigate("payment-flow", {
                      paymentRequest: {
                        id: `upcoming-${payment.id}`,
                        amount: payment.amount,
                        description: payment.title,
                        recipient: payment.organizer.name,
                        recipientId:
                          payment.organizer.id ?? payment.organizer.name,
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
                      <AvatarImage src={payment.organizer.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(payment.organizer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {getTypeIcon(payment.type)}
                        <p className="font-medium truncate">{payment.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payment.organizer.name} •{" "}
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
                    <p className="font-medium">
                      {formatCurrencyForRegion(
                        appSettings.region,
                        payment.amount,
                      )}
                    </p>
                    <Badge
                      className={`${getStatusColor(payment.status)} text-xs flex items-center gap-1`}
                    >
                      {getStatusIcon(payment.status)}
                      {dueText}
                    </Badge>
                    <Button
                      size="sm"
                      variant={
                        payment.status === "overdue" ||
                        payment.status === "due_soon"
                          ? "default"
                          : "outline"
                      }
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          payment.type === "bill_split" &&
                          payment.billSplitId
                        ) {
                          onNavigate("pay-bill", {
                            billId: payment.billSplitId,
                          });
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
          })}
      </div>
    </div>
  );
}
