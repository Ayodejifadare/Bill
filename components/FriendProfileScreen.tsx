import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { formatCurrencyForRegion } from "../utils/regions";
import { useUserProfile } from "./UserProfileContext";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  ArrowLeft,
  Send,
  Users,
  MessageCircle,
  UserMinus,
  MoreVertical,
  DollarSign,
  Receipt,
  Bell,
  CreditCard,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { TransactionCard } from "./TransactionCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { toast } from "sonner";
import { apiClient } from "../utils/apiClient";

interface FriendProfileScreenProps {
  friendId: string | null;
  onNavigate: (tab: string, data?: any) => void;
}

interface Transaction {
  id: string;
  type: "sent" | "received" | "request" | "split" | "bill_split";
  amount: number;
  description: string;
  date: string;
  status: "completed" | "pending" | "failed";
  sender?: { name: string; avatar?: string };
  recipient?: { name: string; avatar?: string };
}

interface Friend {
  id: string;
  name: string;
  username: string;
  status: "active" | "pending" | "blocked";
  avatar?: string;
  joinedDate: string;
  totalTransactions: number;
  currentBalance: {
    amount: number;
    type: "owes" | "owed";
  } | null;
}

interface SharedGroup {
  id: string;
  name: string;
  memberCount: number;
  totalSpent: number;
  color: string;
}

export function FriendProfileScreen({
  friendId,
  onNavigate,
}: FriendProfileScreenProps) {
  const { appSettings } = useUserProfile();
  const [activeTab, setActiveTab] = useState("activity");
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [friend, setFriend] = useState<Friend | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sharedGroups, setSharedGroups] = useState<SharedGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!friendId) return;
    const load = async () => {
      try {
        const data = await apiClient(`/friends/${friendId}`);
        setFriend(data.friend);
        setTransactions(data.transactions || []);
        setSharedGroups(data.sharedGroups || []);
      } catch (err) {
        console.error("Failed to load friend", err);
        setFriend(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [friendId]);

  if (!friendId || (!friend && !loading)) {
    return (
      <div className="min-h-screen">
        {/* Static Header */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="max-w-md mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("friends")}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1>Friend Profile</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="text-center py-8">
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <>
                <p className="text-muted-foreground">Friend not found</p>
                <Button onClick={() => onNavigate("friends")} className="mt-4">
                  Back to Friends
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!friend) {
    return null;
  }

  const handleSendMoney = () => {
    onNavigate("send", {
      recipientId: friend.id,
      recipientName: friend.name,
    });
  };

  const handleRequestMoney = () => {
    onNavigate("request", {
      requestData: {
        friendId: friend.id, // preferred key used by RequestMoney prefill
        recipientId: friend.id, // backward compat
        recipientName: friend.name,
      },
    });
  };

  const handleSplitBill = () => {
    // Prefill this friend as a participant in Split Bill
    onNavigate("split", { friendId: friend.id });
  };

  const handleSendReminder = () => {
    if (friend.currentBalance && friend.currentBalance.type === "owed") {
      onNavigate("send-reminder", {
        friendId: friend.id,
        friendName: friend.name,
        amount: friend.currentBalance.amount,
        paymentType: "outstanding_balance",
      });
    }
  };

  const handlePayOutstanding = () => {
    if (friend.currentBalance && friend.currentBalance.type === "owes") {
      onNavigate("send", {
        recipientId: friend.id,
        recipientName: friend.name,
        prefillAmount: friend.currentBalance.amount,
        description: "Outstanding balance payment",
      });
    }
  };

  const handleRemoveFriend = async () => {
    try {
      await apiClient(`/friends/${friend.id}`, {
        method: "DELETE",
      });
      toast.success("Friend removed");
      window.dispatchEvent(new Event("friendsUpdated"));
      onNavigate("friends");
    } catch (error) {
      console.error("Failed to remove friend", error);
      toast.error("Failed to remove friend");
    } finally {
      setShowRemoveDialog(false);
    }
  };

  const handleGroupClick = (groupId: string) => {
    onNavigate("group-details", { groupId });
  };

  // Derive filtered views per tab requirements
  const activityTransactions = transactions.filter(
    (t) =>
      (t.type === "sent" || t.type === "received") && t.status === "completed",
  );

  const billTransactions = transactions.filter(
    (t) => t.type === "bill_split" || t.type === "split",
  );

  return (
    <div className="min-h-screen">
      {/* Static Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("friends")}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1>Friend Profile</h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Message
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={() => setShowRemoveDialog(true)}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Remove Friend
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-20">
        {/* Friend Info */}
        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl">
                {getInitials(friend.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2>{friend.name}</h2>
              <p className="text-muted-foreground">{friend.username}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Friends since{" "}
                {new Date(friend.joinedDate).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Balance Info */}
          {friend.currentBalance && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1 text-center">
                  <p
                    className={`text-2xl ${friend.currentBalance.type === "owed" ? "text-success" : "text-destructive"}`}
                  >
                    {formatCurrencyForRegion(
                      appSettings.region,
                      friend.currentBalance.amount,
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {friend.currentBalance.type === "owed"
                      ? `${friend.name} owes you`
                      : `You owe ${friend.name}`}
                  </p>
                </div>
                <div className="flex flex-col space-y-2 ml-3">
                  {friend.currentBalance.type === "owed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSendReminder}
                      className="text-xs px-2 py-1"
                    >
                      <Bell className="h-3 w-3 mr-1" />
                      Remind
                    </Button>
                  )}
                  {friend.currentBalance.type === "owes" && (
                    <Button
                      size="sm"
                      onClick={handlePayOutstanding}
                      className="text-xs px-2 py-1"
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Pay Now
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Button
              onClick={handleSendMoney}
              className="flex flex-col items-center py-3 h-auto"
            >
              <Send className="h-5 w-5 mb-1" />
              <span className="text-xs">Send</span>
            </Button>
            <Button
              onClick={handleRequestMoney}
              variant="outline"
              className="flex flex-col items-center py-3 h-auto"
            >
              <DollarSign className="h-5 w-5 mb-1" />
              <span className="text-xs">Request</span>
            </Button>
            <Button
              onClick={handleSplitBill}
              variant="outline"
              className="flex flex-col items-center py-3 h-auto"
            >
              <Users className="h-5 w-5 mb-1" />
              <span className="text-xs">Split</span>
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl">{friend.totalTransactions}</p>
            <p className="text-sm text-muted-foreground">Total Transactions</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl text-success">
              {transactions.filter((t) => t.status === "completed").length}
            </p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </Card>
        </div>

        {/* Shared Groups Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3>Shared Groups</h3>
            {sharedGroups.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("create-group")}
              >
                Create New
              </Button>
            )}
          </div>

          {sharedGroups.length > 0 ? (
            <div className="grid gap-3 mb-6">
              {sharedGroups.map((group) => (
                <Card
                  key={group.id}
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleGroupClick(group.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`${group.color} p-2 rounded-full text-white`}
                      >
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {group.memberCount} members • $
                          {group.totalSpent.toFixed(2)} total spent
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center mb-6">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-2">No shared groups yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create a group to split expenses together!
              </p>
              <Button onClick={() => onNavigate("create-group")} size="sm">
                Create Group
              </Button>
            </Card>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="shared">Bills</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4 mt-4">
            {activityTransactions.length > 0 ? (
              <div className="space-y-3">
                {activityTransactions.map((transaction) => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No completed transfers yet</p>
                <p className="text-sm text-muted-foreground">
                  Start by sending money or splitting a bill!
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="shared" className="space-y-4 mt-4">
            {billTransactions.length > 0 ? (
              <div className="space-y-3">
                {billTransactions.map((transaction) => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No bill payments yet</p>
                <p className="text-sm text-muted-foreground">
                  Split your first bill together!
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      {/* Remove Friend Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {friend.name}? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFriend}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
import { getInitials } from "../utils/name";
