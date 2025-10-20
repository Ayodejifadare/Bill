import { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { toast } from "sonner";
import { apiClient } from "../utils/apiClient";

interface PaymentRequestCancelScreenProps {
  requestId: string | null;
  onNavigate: (tab: string, data?: any) => void;
}

export function PaymentRequestCancelScreen({
  requestId,
  onNavigate,
}: PaymentRequestCancelScreenProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => onNavigate("upcoming-payments");

  const handleCancelRequest = async () => {
    if (!requestId) {
      toast.error("Missing request id");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient(`/requests/${requestId}`, { method: "DELETE" });
      toast.success("Payment request cancelled");
      // Ask lists to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("upcomingPaymentsUpdated"));
        window.dispatchEvent(new Event("notificationsUpdated"));
      }
      onNavigate("upcoming-payments");
    } catch (err: any) {
      const message = err?.message || "Failed to cancel request";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={handleBack} className="min-h-[44px] min-w-[44px] -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold">Cancel Request</h2>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-4">
        {!requestId && (
          <Alert variant="destructive">
            <AlertDescription>Request not found.</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to cancel this payment request? The recipient will be notified and won&apos;t be able to pay using this request anymore.
            </p>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleBack} disabled={isSubmitting}>
                Go Back
              </Button>
              <Button className="flex-1" onClick={handleCancelRequest} disabled={!requestId || isSubmitting}>
                <Trash2 className="h-4 w-4 mr-2" />
                {isSubmitting ? "Cancelling..." : "Cancel Request"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

