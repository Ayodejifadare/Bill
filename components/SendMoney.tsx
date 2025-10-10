import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Search,
  Building2,
  Copy,
  Send,
  CheckCircle,
  Smartphone,
  Users,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { toast } from "sonner";
import { useUserProfile } from "./UserProfileContext";
import {
  getCurrencySymbol,
  formatCurrencyForRegion,
  getBankIdentifierLabel,
  requiresRoutingNumber,
} from "../utils/regions";

import { PaymentMethodSelector, PaymentMethod } from "./PaymentMethodSelector";
import { useFriends, Friend as BaseFriend } from "../hooks/useFriends";

interface Friend extends BaseFriend {
  defaultPaymentMethod?: PaymentMethod;
  paymentMethods?: PaymentMethod[];
}

interface Group {
  id: string;
  name: string;
  members: Friend[];
  color: string;
}

interface SendMoneyProps {
  onNavigate: (screen: string) => void;
  prefillData?: {
    recipientId?: string;
    recipientName?: string;
    prefillAmount?: number;
    description?: string;
  };
}

export function SendMoney({ onNavigate, prefillData }: SendMoneyProps) {
  const { appSettings } = useUserProfile();
  const currencySymbol = getCurrencySymbol(appSettings.region);
  const fmt = (n: number) => formatCurrencyForRegion(appSettings.region, n);

  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showGroupSelection, setShowGroupSelection] = useState(false);
  const { friends: baseFriends, refetch: refetchFriends } = useFriends();
  const friends = baseFriends as Friend[];

  useEffect(() => {
    const handleRefresh = () => refetchFriends();
    window.addEventListener("focus", handleRefresh);
    return () => {
      window.removeEventListener("focus", handleRefresh);
    };
  }, [refetchFriends]);

  // Mock groups
  const groups: Group[] = [
    {
      id: "1",
      name: "Work Team",
      members: friends.slice(0, 3),
      color: "bg-blue-500",
    },
    {
      id: "2",
      name: "College Friends",
      members: friends.slice(1, 4),
      color: "bg-green-500",
    },
    {
      id: "3",
      name: "Roommates",
      members: friends.slice(2, 5),
      color: "bg-purple-500",
    },
  ];

  // Handle prefill data
  useEffect(() => {
    if (prefillData) {
      if (prefillData.prefillAmount) {
        setAmount(prefillData.prefillAmount.toString());
      }
      if (prefillData.description) {
        setMessage(prefillData.description);
      }
      if (prefillData.recipientId && prefillData.recipientName) {
        // Find and set the friend based on the prefill data
        const matchingFriend = friends.find(
          (friend) => friend.id === prefillData.recipientId,
        );
        if (matchingFriend) {
          setSelectedFriend(matchingFriend);
          const defaultMethod =
            matchingFriend.paymentMethods?.find((m) => m.isDefault) || null;
          setSelectedPaymentMethod(defaultMethod);
        } else {
          // Create a temporary friend object if not found in the list
          const tempFriend: Friend = {
            id: prefillData.recipientId,
            name: prefillData.recipientName,
            phoneNumber: "Not available",
            status: "active",
          };
          setSelectedFriend(tempFriend);
          setSelectedPaymentMethod(null);
        }
      }
    }
  }, [prefillData, friends]);

  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSendMoney = () => {
    if (!selectedFriend) {
      toast.error("Please select a friend");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error("Selected friend has no payment method on file");
      return;
    }

    // Create the money transfer
    toast.success(
      `Payment instructions sent! Transfer ${formatCurrencyForRegion(appSettings.region, parseFloat(amount))} to ${selectedFriend.name} using their payment details.`,
    );

    // Reset form
    setSelectedFriend(null);
    setSelectedPaymentMethod(null);
    setAmount("");
    setMessage("");
    setSearchTerm("");

    onNavigate("home");
  };

  const sharePaymentDetails = () => {
    if (!selectedFriend || !selectedPaymentMethod || !amount) {
      toast.error("Please complete all required fields");
      return;
    }

    const amt = formatCurrencyForRegion(appSettings.region, parseFloat(amount));
    let details = `Send Payment: ${amt}
To: ${selectedFriend.name}`;
    if (message)
      details += `
Message: ${message}`;

    if (selectedPaymentMethod.type === "bank") {
      const label = getBankIdentifierLabel(appSettings.region);
      const idValue = requiresRoutingNumber(appSettings.region)
        ? selectedPaymentMethod.routingNumber
        : selectedPaymentMethod.sortCode;
      details += `

Bank Details:
${selectedPaymentMethod.bankName}
- ${selectedPaymentMethod.accountHolderName}
${label}: ${idValue}
Account: ${selectedPaymentMethod.accountNumber}`;
    } else {
      details += `

Mobile Money:
${selectedPaymentMethod.provider}
Phone: ${selectedPaymentMethod.phoneNumber}`;
    }

    details += `

Contact: ${selectedFriend.phoneNumber || "Phone not available"}`;

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      toast.error("Clipboard not supported. Please copy manually.");
      return;
    }

    navigator.clipboard
      .writeText(details)
      .then(() => toast.success("Payment details copied to clipboard"))
      .catch(() =>
        toast.error("Failed to copy payment details. Please copy manually."),
      );
  };

  return (
    <div className="pb-20">
      {/* Static Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("home")}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1>Send Money</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Amount */}
        <Card>
          <CardHeader>
            <CardTitle>Send Amount</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-lg pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's this payment for?"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Select Friend */}
        <Card>
          <CardHeader>
            <CardTitle>Send To</CardTitle>
            <CardDescription>Select a friend to send money to</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Group Browse */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search friends..."
                  className="pl-10"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGroupSelection(!showGroupSelection)}
                  className="h-8 px-3"
                >
                  <Users className="h-3 w-3 mr-1" />
                  {showGroupSelection ? "Hide Groups" : "Browse Groups"}
                </Button>
              </div>

              {/* Group Browse */}
              {showGroupSelection && !selectedFriend && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Browse friends by group:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {groups.map((group) => (
                      <div key={group.id} className="border rounded-lg p-3">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className={`w-6 h-6 rounded-full ${group.color} flex items-center justify-center`}
                          >
                            <Users className="h-3 w-3 text-white" />
                          </div>
                          <p className="font-medium text-sm">{group.name}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {group.members.map((friend) => (
                            <Button
                              key={friend.id}
                              variant="ghost"
                              onClick={() => {
                                setSelectedFriend(friend);
                                const defaultMethod =
                                  friend.paymentMethods?.find(
                                    (m) => m.isDefault,
                                  ) || null;
                                setSelectedPaymentMethod(defaultMethod);
                                setShowGroupSelection(false);
                              }}
                              className="h-auto p-2 justify-start"
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={friend.avatar} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(friend.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{friend.name}</span>
                                {friend.defaultPaymentMethod && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs ml-auto"
                                  >
                                    {friend.defaultPaymentMethod.type === "bank"
                                      ? friend.defaultPaymentMethod.bankName
                                      : friend.defaultPaymentMethod.provider}
                                  </Badge>
                                )}
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Friend */}
            {selectedFriend && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedFriend.avatar} />
                        <AvatarFallback>
                          {getInitials(selectedFriend.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedFriend.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedFriend.phoneNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFriend(null);
                          setSelectedPaymentMethod(null);
                        }}
                        className="text-xs h-6 px-2"
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Friends List */}
            {!selectedFriend && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted"
                    onClick={() => {
                      setSelectedFriend(friend);
                      const defaultMethod =
                        friend.paymentMethods?.find((m) => m.isDefault) || null;
                      setSelectedPaymentMethod(defaultMethod);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback>
                          {getInitials(friend.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{friend.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            {friend.phoneNumber}
                          </p>
                          {friend.defaultPaymentMethod && (
                            <Badge variant="secondary" className="text-xs">
                              {friend.defaultPaymentMethod.type === "bank"
                                ? friend.defaultPaymentMethod.bankName
                                : friend.defaultPaymentMethod.provider}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {!friend.defaultPaymentMethod && (
                      <Badge variant="outline" className="text-xs">
                        No Payment Info
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {filteredFriends.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No friends found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Destination */}
        {selectedFriend &&
          selectedFriend.paymentMethods &&
          selectedFriend.paymentMethods.length > 0 &&
          selectedPaymentMethod && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {selectedPaymentMethod.type === "bank" ? (
                    <Building2 className="h-5 w-5" />
                  ) : (
                    <Smartphone className="h-5 w-5" />
                  )}
                  Payment Destination
                </CardTitle>
                <CardDescription>
                  Send your payment to {selectedFriend.name}'s{" "}
                  {selectedPaymentMethod.type === "bank"
                    ? "bank account"
                    : "mobile money"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PaymentMethodSelector
                  methods={selectedFriend.paymentMethods}
                  selectedId={selectedPaymentMethod.id}
                  onSelect={(m) => setSelectedPaymentMethod(m)}
                />

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg
                        className="h-4 w-4 text-amber-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-amber-800 font-medium">
                        Payment Instructions
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Use your{" "}
                        {selectedPaymentMethod.type === "bank"
                          ? "bank"
                          : "mobile money"}{" "}
                        app to send a transfer to the{" "}
                        {selectedPaymentMethod.type === "bank"
                          ? "account"
                          : "number"}{" "}
                        above. Include "
                        {message ||
                          `Payment from SplitPay - ${formatCurrencyForRegion(appSettings.region, parseFloat(amount || "0"))}`}
                        " in the transfer memo.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        {/* No Payment Method Warning */}
        {selectedFriend &&
          (!selectedFriend.paymentMethods ||
            selectedFriend.paymentMethods.length === 0) && (
            <Card className="border-warning">
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="h-5 w-5 text-warning"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-warning font-medium">
                      No Payment Method
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedFriend.name} hasn't added their payment
                      information yet. You'll need to ask them for their payment
                      details to send this payment.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Payment Summary */}
        {selectedFriend && amount && selectedPaymentMethod && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-base">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">{fmt(parseFloat(amount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To:</span>
                <span className="font-medium">{selectedFriend.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {selectedPaymentMethod.type === "bank"
                    ? "Bank:"
                    : "Provider:"}
                </span>
                <span className="font-medium">
                  {selectedPaymentMethod.type === "bank"
                    ? selectedPaymentMethod.bankName
                    : selectedPaymentMethod.provider}
                </span>
              </div>
              {message && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Message:</span>
                  <span className="font-medium text-right max-w-[200px] truncate">
                    {message}
                  </span>
                </div>
              )}

              <Separator />

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Next steps:</strong> Use your{" "}
                  {selectedPaymentMethod.type === "bank"
                    ? "bank"
                    : "mobile money"}{" "}
                  app to transfer{" "}
                  {formatCurrencyForRegion(
                    appSettings.region,
                    parseFloat(amount),
                  )}{" "}
                  to {selectedFriend.name}'s account using the details above.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={sharePaymentDetails}
            className="flex-1"
            disabled={!selectedFriend || !amount || !selectedPaymentMethod}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Details
          </Button>
          <Button
            onClick={handleSendMoney}
            className="flex-1"
            disabled={!selectedFriend || !amount || !selectedPaymentMethod}
          >
            <Send className="h-4 w-4 mr-2" />
            Send Instructions
          </Button>
        </div>
      </div>
    </div>
  );
}
import { getInitials } from "../utils/name";
