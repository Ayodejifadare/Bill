import { useState } from "react";
import { Plus, Users, MoreHorizontal, Crown } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { EmptyState } from "./ui/empty-state";
import { ListSkeleton, ErrorRetry } from "./ui/loading";
import { useGroups } from "../hooks/useGroups";
import { useUserProfile } from "./UserProfileContext";
import { formatCurrencyForRegion } from "../utils/regions";

interface GroupSectionProps {
  onNavigate: (tab: string, data?: any) => void;
}

export function GroupSection({ onNavigate }: GroupSectionProps) {
  const [showAllGroups, setShowAllGroups] = useState(false);
  const { groups, loading, error, refetch } = useGroups();
  const { appSettings } = useUserProfile();
  const fmt = (n: number) => formatCurrencyForRegion(appSettings.region, n);

  const displayedGroups = showAllGroups ? groups : groups.slice(0, 2);
  const totalPendingBills = groups.reduce(
    (sum, group) => sum + group.pendingBills,
    0,
  );

  const handleGroupClick = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    onNavigate("group-details", { groupId, group });
  };

  const handleCreateGroup = () => {
    onNavigate("create-group");
  };

  const handleSplitWithGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const group = groups.find((g) => g.id === groupId);
    onNavigate("split", { groupId, group });
  };

  return (
    <div className="space-y-4">
      {/* Groups Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <h3>Groups ({groups.length})</h3>
          {totalPendingBills > 0 && (
            <Badge variant="outline" className="text-warning">
              {totalPendingBills} pending
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={handleCreateGroup}>
          <Plus className="h-4 w-4 mr-1" />
          Create
        </Button>
      </div>

      {/* Groups List */}
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorRetry error={error} onRetry={refetch} />
      ) : groups.length > 0 ? (
        <div className="space-y-3">
          {displayedGroups.map((group) => (
            <Card
              key={group.id}
              className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handleGroupClick(group.id)}
            >
              <div className="space-y-3">
                {/* Group Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-12 h-12 rounded-full ${group.color} flex items-center justify-center text-white`}
                    >
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{group.name}</h4>
                        {group.isAdmin && (
                          <Crown className="h-4 w-4 text-warning" />
                        )}
                        {group.pendingBills > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs text-warning"
                          >
                            {group.pendingBills} pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {group.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {group.memberCount} members • {group.lastActive}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGroupClick(group.id);
                        }}
                      >
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleSplitWithGroup(group.id, e)}
                      >
                        Split Bill
                      </DropdownMenuItem>
                      {group.isAdmin && (
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          Manage Group
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Members Preview */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex -space-x-1">
                      {group.members.slice(0, 3).map((initials, index) => (
                        <Avatar
                          key={index}
                          className="h-6 w-6 border-2 border-background"
                        >
                          <AvatarFallback className="text-xs bg-muted">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {group.memberCount > 3 && (
                        <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">
                            +{group.memberCount - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {fmt(group.totalSpent)} spent
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {group.recentActivity}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {/* Show More/Less Button */}
          {groups.length > 2 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAllGroups(!showAllGroups)}
            >
              {showAllGroups
                ? "Show Less"
                : `Show ${groups.length - 2} More Groups`}
            </Button>
          )}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No Groups Yet"
          description="Create groups to easily split bills with the same people"
          actionLabel="Create Your First Group"
          onAction={handleCreateGroup}
        />
      )}

      {/* Quick Actions removed per request: hide 'New Group' above balance card */}
    </div>
  );
}
