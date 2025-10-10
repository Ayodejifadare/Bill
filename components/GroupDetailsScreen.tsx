import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Users,
  Plus,
  MoreHorizontal,
  UserPlus,
  Receipt,
  Building2,
  Edit,
  UserMinus,
  LogOut,
  Crown,
  DollarSign,
  User,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./ui/sheet";
import { Separator } from "./ui/separator";
import { TransactionCard } from "./TransactionCard";
import { EmptyState } from "./ui/empty-state";
import { toast } from "sonner";
import { apiClient } from "../utils/apiClient";
import { useUserProfile } from "./UserProfileContext";
import { formatCurrencyForRegion } from "../utils/regions";

interface GroupDetailsScreenProps {
  groupId: string | null;
  onNavigate: (tab: string, data?: any) => void;
  onGroupNavigation?: (
    screen: string,
    groupId?: string,
    additionalData?: any,
  ) => void;
}

interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  email: string;
  isAdmin: boolean;
  balance?: number; // positive = owed money, negative = owes money
  totalSpent?: number;
  joinedDate: string;
}

interface GroupTransaction {
  id: string;
  type: "sent" | "received" | "bill_split";
  amount: number;
  description: string;
  date: string;
  status: "completed" | "pending";
  paidBy: string;
  participants: string[];
}

interface Group {
  id: string;
  name: string;
  description: string;
  totalSpent: number;
  totalMembers: number;
  isAdmin: boolean;
  createdDate: string;
  color: string;
  members: GroupMember[];
  recentTransactions: GroupTransaction[];
  hasMoreTransactions?: boolean;
}

export function GroupDetailsScreen({
  groupId,
  onNavigate,
  onGroupNavigation: _onGroupNavigation,
}: GroupDetailsScreenProps) {
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showMemberActions, setShowMemberActions] = useState(false);
  const [selectedMemberForActions, setSelectedMemberForActions] =
    useState<GroupMember | null>(null);

  const [group, setGroup] = useState<Group | null>(null);
  const [transactions, setTransactions] = useState<GroupTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const { appSettings } = useUserProfile();
  const fmt = (n: number) => formatCurrencyForRegion(appSettings.region, n);

  useEffect(() => {
    const fetchGroup = async () => {
      if (!groupId) return;
      try {
        const data = await apiClient(`/groups/${groupId}`);
        // Normalize missing numeric member fields to 0 to prevent runtime errors
        const normalizedMembers = Array.isArray(data.group?.members)
          ? data.group.members.map((m: any) => ({
              ...m,
              balance: typeof m.balance === "number" ? m.balance : 0,
              totalSpent: typeof m.totalSpent === "number" ? m.totalSpent : 0,
            }))
          : [];
        const normalized = {
          ...data.group,
          members: normalizedMembers,
        };
        setGroup(normalized);
        setTransactions(data.group?.recentTransactions ?? []);
        setHasMoreTransactions(data.group?.hasMoreTransactions ?? false);
      } catch {
        setGroup(null);
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, [groupId]);

  const openEdit = () => {
    if (!group) return;
    setEditName(group.name || "");
    setEditDescription(group.description || "");
    setShowEditDialog(true);
  };

  const saveEdits = async () => {
    if (!group) return;
    try {
      const data = await apiClient(`/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDescription }),
      });
      if (data?.group) {
        setGroup({ ...group, ...data.group });
      }
      setShowEditDialog(false);
    } catch (e: any) {
      console.error("Edit group error:", e);
    }
  };

  if (loading) {
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
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2>Group Details</h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
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
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2>Group Details</h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Group not found</p>
          </div>
        </div>
      </div>
    );
  }

  const totalOwed = group.members.reduce(
    (sum, member) => sum + Math.max(0, Number(member.balance ?? 0)),
    0,
  );
  const totalOwe = group.members.reduce(
    (sum, member) => sum + Math.abs(Math.min(0, Number(member.balance ?? 0))),
    0,
  );

  const handleSplitBill = () => {
    if (!group) return;
    // Navigate to the full SplitBill flow with this group preselected
    onNavigate("split", { groupId: group.id });
  };

  const handleLeaveGroup = async () => {
    try {
      await apiClient(`/groups/${group.id}/leave`, { method: "POST" });
      toast.success("Left group successfully");
      onNavigate("friends");
    } catch {
      toast.error("Failed to leave group");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await apiClient(`/groups/${group.id}/members/${memberId}`, {
        method: "DELETE",
      });
      setGroup((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.filter((m) => m.id !== memberId),
              totalMembers: prev.totalMembers - 1,
            }
          : prev,
      );
      toast.success("Removed member from group");
      setShowRemoveMemberDialog(false);
      setSelectedMemberId(null);
      setShowMemberActions(false);
      setSelectedMemberForActions(null);
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const loadMoreTransactions = async () => {
    try {
      const data = await apiClient(
        `/groups/${group.id}/transactions?page=${page + 1}`,
      );
      const newTx = Array.isArray(data.transactions) ? data.transactions : [];
      setTransactions((prev) => [...prev, ...newTx]);
      setPage((p) => p + 1);
      if (newTx.length === 0) setHasMoreTransactions(false);
    } catch {
      toast.error("Failed to load more transactions");
    }
  };

  const handleMemberClick = (member: GroupMember) => {
    setSelectedMemberForActions(member);
    setShowMemberActions(true);
  };

  const handleMemberAction = (action: string, member: GroupMember) => {
    switch (action) {
      case "request":
        onNavigate("request", {
          requestData: {
            friendId: member.id,
            friendName: member.name,
            groupId: group.id,
            groupName: group.name,
          },
        });
        setShowMemberActions(false);
        break;
      case "profile":
        onNavigate("friend-profile", { friendId: member.id });
        setShowMemberActions(false);
        break;
      case "remove":
        setSelectedMemberId(member.id);
        setShowRemoveMemberDialog(true);
        setShowMemberActions(false);
        break;
      default:
        break;
    }
  };

  // const formatDate = (dateString: string) => {
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString('en-US', {
  //     month: 'short',
  //     day: 'numeric',
  //     hour: 'numeric',
  //     minute: '2-digit'
  //   });
  // };

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
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2>{group.name}</h2>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {group.isAdmin && (
                  <>
                    <DropdownMenuItem onClick={openEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Group
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        onNavigate("add-group-member", { groupId: group.id })
                      }
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Members
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => setShowLeaveDialog(true)}
                  className="text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24">
        {/* Group Overview */}
        <Card className="p-4 sm:p-6">
          <div className="text-center space-y-3 sm:space-y-4">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${group.color} text-white flex items-center justify-center mx-auto`}
            >
              <Users className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h3 className="font-medium">{group.name}</h3>
              <p className="text-sm text-muted-foreground px-2">
                {group.description}
              </p>
              <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 mt-2 text-xs sm:text-sm">
                <span className="text-muted-foreground whitespace-nowrap">
                  {group.totalMembers} members
                </span>
                <span className="text-muted-foreground hidden sm:inline">
                  •
                </span>
                <span className="text-muted-foreground whitespace-nowrap">
                  Created {group.createdDate}
                </span>
                {group.isAdmin && (
                  <>
                    <span className="text-muted-foreground hidden sm:inline">
                      •
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="p-3 sm:p-4 text-center">
            <p className="text-lg sm:text-xl font-bold">
              {fmt(group.totalSpent)}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              Total Spent
            </p>
          </Card>
          <Card className="p-3 sm:p-4 text-center">
            <p className="text-lg sm:text-xl font-bold text-success">
              {fmt(totalOwed)}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              You're Owed
            </p>
          </Card>
          <Card className="p-3 sm:p-4 text-center">
            <p className="text-lg sm:text-xl font-bold text-destructive">
              {fmt(totalOwe)}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              You Owe
            </p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button className="w-full h-12" onClick={handleSplitBill}>
            <Plus className="h-4 w-4 mr-2" />
            Split Bill
          </Button>
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={() => onNavigate("group-account", { groupId })}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Group Accounts
          </Button>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="activity" className="text-sm">
              Activity
            </TabsTrigger>
            <TabsTrigger value="members" className="text-sm">
              Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-3 sm:space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Recent Activity</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("bills", { groupId })}
                className="text-xs sm:text-sm h-8"
              >
                View All
              </Button>
            </div>

            {transactions.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {transactions.map((transaction, index) => {
                  const tx = transaction as any;
                  if (!tx || typeof tx !== "object") {
                    return null;
                  }

                  const transactionType: GroupTransaction["type"] =
                    typeof tx.type === "string" &&
                    ["sent", "received", "bill_split"].includes(tx.type)
                      ? (tx.type as GroupTransaction["type"])
                      : "received";
                  const amount =
                    typeof tx.amount === "number"
                      ? tx.amount
                      : Number(tx.amount) || 0;
                  const description =
                    typeof tx.description === "string" ? tx.description : "";
                  const date =
                    typeof tx.date === "string"
                      ? tx.date
                      : new Date().toISOString();
                  const status: GroupTransaction["status"] =
                    tx.status === "pending" ? "pending" : "completed";
                  const paidBy =
                    typeof tx.paidBy === "string" ? tx.paidBy : "Unknown";
                  const id = typeof tx.id === "string" ? tx.id : `txn_${index}`;

                  return (
                    <TransactionCard
                      key={id}
                      transaction={{
                        id,
                        type: transactionType,
                        amount,
                        description,
                        date,
                        status,
                        sender: { name: paidBy, avatar: "PB" },
                      }}
                      onClick={() => {
                        if (transactionType === "bill_split") {
                          if (status === "pending") {
                            onNavigate("pay-bill", { billId: id });
                          } else {
                            onNavigate("bill-split-details", {
                              billSplitId: id,
                            });
                          }
                        } else {
                          onNavigate("transaction-details", {
                            transactionId: id,
                          });
                        }
                      }}
                    />
                  );
                })}
                {hasMoreTransactions && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={loadMoreTransactions}
                  >
                    Load more
                  </Button>
                )}
              </div>
            ) : (
              <EmptyState
                icon={Receipt}
                title="No activity yet"
                description="Start splitting bills with your group"
                actionLabel="Split First Bill"
                onAction={handleSplitBill}
              />
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-3 sm:space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Members ({group.members.length})</h3>
              {group.isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm h-8"
                  onClick={() =>
                    onNavigate("add-group-member", { groupId: group.id })
                  }
                >
                  <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Invite</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )}
            </div>

            {group.members.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {group.members.map((member) => (
                  <Card
                    key={member.id}
                    className="p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleMemberClick(member)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                          <AvatarFallback className="text-sm">
                            {member.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-sm sm:text-base truncate">
                              {member.name}
                            </p>
                            {member.isAdmin && (
                              <Badge
                                variant="secondary"
                                className="text-xs flex-shrink-0"
                              >
                                <Crown className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Admin</span>
                                <span className="sm:hidden">A</span>
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {member.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="hidden sm:inline">
                              Joined {member.joinedDate} �{" "}
                            </span>
                            <span className="sm:hidden">
                              {member.joinedDate} •{" "}
                            </span>
                            Spent {fmt(Number(member.totalSpent ?? 0))}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-2">
                        <div>
                          <p
                            className={`font-medium text-sm sm:text-base ${Number(member.balance ?? 0) >= 0 ? "text-success" : "text-destructive"}`}
                          >
                            {Number(member.balance ?? 0) >= 0 ? "+" : ""}
                            {fmt(Number(member.balance ?? 0))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Number(member.balance ?? 0) >= 0
                              ? "gets back"
                              : "owes"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No members yet"
                description="Invite friends to join this group"
                actionLabel={group.isAdmin ? "Invite Members" : undefined}
                onAction={
                  group.isAdmin
                    ? () =>
                        onNavigate("add-group-member", { groupId: group.id })
                    : undefined
                }
              />
            )}

            {/* View All Members Button */}
            <div className="text-center mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onNavigate("group-members", { groupId: group.id })
                }
                className="text-xs sm:text-sm h-8"
              >
                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                View All Members
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Leave Group Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave "{group.name}"? You'll no longer be
              able to participate in group activities or see group transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Group Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Update the group details so everyone stays in sync.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={saveEdits}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Actions Sheet */}
      <Sheet open={showMemberActions} onOpenChange={setShowMemberActions}>
        <SheetContent side="bottom" className="h-auto">
          {selectedMemberForActions && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg">
                      {selectedMemberForActions.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <SheetTitle className="flex items-center space-x-2">
                      <span>{selectedMemberForActions.name}</span>
                      {selectedMemberForActions.isAdmin && (
                        <Badge variant="secondary" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </SheetTitle>
                    <SheetDescription>
                      {selectedMemberForActions.email}
                    </SheetDescription>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span>Joined {selectedMemberForActions.joinedDate}</span>
                      <span className="mx-2">•</span>
                      <span>
                        Spent {fmt(selectedMemberForActions.totalSpent ?? 0)}
                      </span>
                      <span className="mx-2">•</span>
                      <span
                        className={
                          (selectedMemberForActions.balance ?? 0) >= 0
                            ? "text-success"
                            : "text-destructive"
                        }
                      >
                        {(selectedMemberForActions.balance ?? 0) >= 0
                          ? "Gets back"
                          : "Owes"}{" "}
                        {fmt(Math.abs(selectedMemberForActions.balance ?? 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-2 px-4 pb-6">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12"
                  onClick={() =>
                    handleMemberAction("request", selectedMemberForActions)
                  }
                >
                  <DollarSign className="h-5 w-5 mr-3" />
                  Request from {selectedMemberForActions.name}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start h-12"
                  onClick={() =>
                    handleMemberAction("profile", selectedMemberForActions)
                  }
                >
                  <User className="h-5 w-5 mr-3" />
                  View Profile
                </Button>

                {(selectedMemberForActions.balance ?? 0) < 0 && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12"
                    onClick={() => {
                      toast.success("Reminder sent!");
                      setShowMemberActions(false);
                    }}
                  >
                    <Receipt className="h-5 w-5 mr-3" />
                    Send Payment Reminder
                  </Button>
                )}

                {group.isAdmin && !selectedMemberForActions.isAdmin && (
                  <>
                    <Separator className="my-2" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 text-destructive hover:text-destructive"
                      onClick={() =>
                        handleMemberAction("remove", selectedMemberForActions)
                      }
                    >
                      <UserMinus className="h-5 w-5 mr-3" />
                      Remove from Group
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Remove Member Dialog */}
      <AlertDialog
        open={showRemoveMemberDialog}
        onOpenChange={setShowRemoveMemberDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the group? They
              will no longer have access to group activities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedMemberId && handleRemoveMember(selectedMemberId)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
