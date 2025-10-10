import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScreenHeader } from "./ui/screen-header";
import { SearchInput } from "./ui/search-input";
import { EmptyState } from "./ui/empty-state";
import { FilterTabs } from "./ui/filter-tabs";
import {
  Users,
  UserPlus,
  Crown,
  MoreHorizontal,
  UserMinus,
  Shield,
  MessageCircle,
  Activity,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner";
import { apiClient } from "../utils/apiClient";

interface GroupMember {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  role: "admin" | "member";
  joinedAt: string;
  lastActive: string;
  totalSpent: number;
  totalOwed: number;
  isYou: boolean;
  status: "active" | "pending" | "inactive";
  permissions: {
    canAddMembers: boolean;
    canRemoveMembers: boolean;
    canCreateSplits: boolean;
    canEditGroup: boolean;
  };
}

interface PendingInvite {
  id: string;
  name: string;
  username: string;
  invitedBy: string;
  invitedAt: string;
  method: "whatsapp" | "sms" | "app";
  status?: string;
  attempts?: number;
  contact?: string;
  expiresAt?: string;
  lastAttempt?: string;
}

interface GroupMembersScreenProps {
  groupId: string | null;
  onNavigate: (tab: string, data?: any) => void;
}

export function GroupMembersScreen({
  groupId,
  onNavigate,
}: GroupMembersScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "pending"
  >("all");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [inviteActionState, setInviteActionState] = useState<
    Record<string, { canceling: boolean; resending: boolean }>
  >({});

  useEffect(() => {
    const fetchData = async () => {
      if (!groupId) return;
      try {
        const [membersData, invitesData] = await Promise.all([
          apiClient(`/groups/${groupId!}/members`),
          apiClient(`/groups/${groupId!}/invites`),
        ]);
        setMembers(
          Array.isArray(membersData.members) ? membersData.members : [],
        );
        setPendingInvites(
          Array.isArray(invitesData.invites) ? invitesData.invites : [],
        );
      } catch {
        setMembers([]);
        setPendingInvites([]);
      }
    };
    fetchData();
  }, [groupId]);

  // Find current user to check permissions
  const currentUser = members.find((m) => m.isYou);
  const canManageMembers = currentUser?.permissions.canAddMembers || false;

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.username.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      activeFilter === "all" || member.status === activeFilter;

    return matchesSearch && matchesFilter;
  });

  const filteredPendingInvites = pendingInvites.filter(
    (invite) =>
      invite.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invite.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const allFilteredResults = [
    ...filteredMembers,
    ...(activeFilter === "all" || activeFilter === "pending"
      ? filteredPendingInvites.map((invite) => ({
          ...invite,
          status: "pending" as const,
          role: "member" as const,
          isYou: false,
          totalSpent: 0,
          totalOwed: 0,
          lastActive: "",
          joinedAt: invite.invitedAt,
          permissions: {
            canAddMembers: false,
            canRemoveMembers: false,
            canCreateSplits: false,
            canEditGroup: false,
          },
        }))
      : []),
  ];

  const handleRemoveMember = async (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (member?.isYou) {
      toast.error("You can't remove yourself from the group");
      return;
    }
    try {
      await apiClient(`/groups/${groupId!}/members/${memberId}`, {
        method: "DELETE",
      });
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success(`${member?.name} removed from group`);
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleMakeAdmin = async (memberId: string) => {
    try {
      await apiClient(`/groups/${groupId!}/members/${memberId}/promote`, {
        method: "POST",
      });
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? {
                ...m,
                role: "admin" as const,
                permissions: {
                  canAddMembers: true,
                  canRemoveMembers: true,
                  canCreateSplits: true,
                  canEditGroup: true,
                },
              }
            : m,
        ),
      );
      const member = members.find((m) => m.id === memberId);
      toast.success(`${member?.name} is now an admin`);
    } catch {
      toast.error("Failed to promote member");
    }
  };

  const handleRemoveAdmin = async (memberId: string) => {
    try {
      await apiClient(`/groups/${groupId!}/members/${memberId}/demote`, {
        method: "POST",
      });
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? {
                ...m,
                role: "member" as const,
                permissions: {
                  canAddMembers: false,
                  canRemoveMembers: false,
                  canCreateSplits: true,
                  canEditGroup: false,
                },
              }
            : m,
        ),
      );
      const member = members.find((m) => m.id === memberId);
      toast.success(`${member?.name} is now a regular member`);
    } catch {
      toast.error("Failed to update member");
    }
  };

  const updateInviteActionState = (
    inviteId: string,
    action: Partial<{ canceling: boolean; resending: boolean }>,
  ) => {
    setInviteActionState((prev) => ({
      ...prev,
      [inviteId]: {
        canceling: prev[inviteId]?.canceling ?? false,
        resending: prev[inviteId]?.resending ?? false,
        ...action,
      },
    }));
  };

  const getInviteDisplayName = (
    invite?: Partial<PendingInvite> & { contact?: string },
  ) => {
    if (!invite) return "member";
    return invite.name || invite.username || invite.contact || "member";
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!groupId) return;
    const invite = pendingInvites.find((i) => i.id === inviteId);
    updateInviteActionState(inviteId, { canceling: true });
    try {
      await apiClient(`/groups/${groupId}/invites/${inviteId}`, {
        method: "DELETE",
      });
      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
      toast.success(`Invitation to ${getInviteDisplayName(invite)} cancelled`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel invitation";
      toast.error(message);
    } finally {
      updateInviteActionState(inviteId, { canceling: false });
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    if (!groupId) return;
    const existingInvite = pendingInvites.find((i) => i.id === inviteId);
    updateInviteActionState(inviteId, { resending: true });
    try {
      const data = await apiClient(
        `/groups/${groupId}/invites/${inviteId}/resend`,
        {
          method: "POST",
        },
      );
      if (data?.invite) {
        setPendingInvites((prev) =>
          prev.map((invite) =>
            invite.id === inviteId ? { ...invite, ...data.invite } : invite,
          ),
        );
      }
      const updatedInvite = data?.invite
        ? { ...existingInvite, ...data.invite }
        : existingInvite;
      toast.success(
        `Invitation resent to ${getInviteDisplayName(updatedInvite)}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to resend invitation";
      toast.error(message);
    } finally {
      updateInviteActionState(inviteId, { resending: false });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  const getStatusBadge = (member: any) => {
    if (member.status === "pending") {
      return (
        <Badge variant="outline" className="text-xs text-warning">
          Pending
        </Badge>
      );
    }
    if (member.status === "inactive") {
      return (
        <Badge variant="secondary" className="text-xs">
          Inactive
        </Badge>
      );
    }
    return null;
  };

  const getRoleIcon = (role: string) => {
    return role === "admin" ? <Crown className="h-3 w-3 text-warning" /> : null;
  };

  const getMemberActions = (member: GroupMember | any) => {
    if (member.status === "pending") {
      const actionState = inviteActionState[member.id];
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleResendInvite(member.id)}
            disabled={actionState?.resending || actionState?.canceling}
          >
            Resend
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleCancelInvite(member.id)}
            disabled={actionState?.resending || actionState?.canceling}
          >
            Cancel
          </Button>
        </div>
      );
    }

    if (!canManageMembers || member.isYou) {
      return null;
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Member actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              onNavigate("friend-profile", { friendId: member.id })
            }
          >
            View Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => toast.info("Message feature coming soon")}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Send Message
          </DropdownMenuItem>
          {member.role === "member" ? (
            <DropdownMenuItem onClick={() => handleMakeAdmin(member.id)}>
              <Shield className="h-4 w-4 mr-2" />
              Make Admin
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleRemoveAdmin(member.id)}>
              <Shield className="h-4 w-4 mr-2" />
              Remove Admin
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => handleRemoveMember(member.id)}
            className="text-destructive"
          >
            <UserMinus className="h-4 w-4 mr-2" />
            Remove from Group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const activeMembers = members.filter((m) => m.status === "active");
  const pendingCount = pendingInvites.length;

  if (!groupId) {
    return (
      <EmptyState
        icon={Users}
        title="No Group Selected"
        description="Please select a group to view members"
        actionLabel="Go to Groups"
        onAction={() => onNavigate("friends")}
      />
    );
  }

  return (
    <div>
      <ScreenHeader
        title="Group Members"
        subtitle={`${activeMembers.length} members, ${pendingCount} pending`}
        showBackButton
        onBack={() => onNavigate("group-details", { groupId })}
        rightAction={
          canManageMembers ? (
            <Button
              size="sm"
              onClick={() => onNavigate("add-group-member", { groupId })}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          ) : null
        }
      />

      <div className="p-4 space-y-6 pb-20">
        {/* Search */}
        <SearchInput
          placeholder="Search members..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Filter Tabs */}
        <FilterTabs
          tabs={[
            {
              id: "all",
              label: "All",
              count: members.length + pendingInvites.length,
            },
            { id: "active", label: "Active", count: activeMembers.length },
            { id: "pending", label: "Pending", count: pendingCount },
          ]}
          activeTab={activeFilter}
          onTabChange={(tab) =>
            setActiveFilter(tab as "all" | "active" | "pending")
          }
        />

        {/* Group Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-medium">{activeMembers.length}</p>
            <p className="text-sm text-muted-foreground">Active Members</p>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity className="h-5 w-5 text-success" />
            </div>
            <p className="text-2xl font-medium">
              {
                activeMembers.filter(
                  (m) =>
                    m.lastActive.includes("minutes") ||
                    m.lastActive.includes("hour"),
                ).length
              }
            </p>
            <p className="text-sm text-muted-foreground">Recently Active</p>
          </Card>
        </div>

        {/* Members List */}
        {allFilteredResults.length > 0 ? (
          <div className="space-y-3">
            {allFilteredResults.map((member) => (
              <Card key={`${member.status}-${member.id}`} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        {"avatar" in member && (member as any).avatar ? (
                          <AvatarImage src={(member as any).avatar} />
                        ) : null}
                        <AvatarFallback>
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      {member.status === "active" && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">
                          {member.name} {member.isYou && "(You)"}
                        </h3>
                        {getRoleIcon(member.role)}
                        {getStatusBadge(member)}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {member.username}
                      </p>

                      {member.status === "pending" ? (
                        <p className="text-xs text-muted-foreground">
                          Invited {formatDate((member as any).invitedAt)} by{" "}
                          {(member as any).invitedBy}
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground">
                            Joined {formatDate(member.joinedAt)} • Last active{" "}
                            {member.lastActive}
                          </p>

                          {member.status === "active" && (
                            <div className="flex gap-4 mt-2">
                              <div className="text-xs">
                                <span className="text-muted-foreground">
                                  Spent:{" "}
                                </span>
                                <span className="font-medium">
                                  ${member.totalSpent.toFixed(2)}
                                </span>
                              </div>
                              {member.totalOwed > 0 && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">
                                    Owes:{" "}
                                  </span>
                                  <span className="font-medium text-warning">
                                    ${member.totalOwed.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {getMemberActions(member)}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title={searchQuery ? "No members found" : "No members"}
            description={
              searchQuery
                ? "Try adjusting your search"
                : "This group doesn't have any members yet"
            }
            actionLabel={canManageMembers ? "Add Members" : undefined}
            onAction={
              canManageMembers
                ? () => onNavigate("add-group-member", { groupId })
                : undefined
            }
          />
        )}

        {/* Member Management Actions */}
        {canManageMembers && (
          <Card className="p-4">
            <h3 className="font-medium mb-3">Member Management</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onNavigate("add-group-member", { groupId })}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onNavigate("member-invites", { groupId })}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Manage Invites
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
import { getInitials } from "../utils/name";
