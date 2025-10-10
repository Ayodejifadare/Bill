import { useEffect, useState } from "react";
import { ArrowLeft, Users, X, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { useGroups } from "../hooks/useGroups";
import { apiClient } from "../utils/apiClient";

interface CreateGroupScreenProps {
  onNavigate: (tab: string, data?: any) => void;
  initialSelectedFriendIds?: string[];
}

interface Friend {
  id: string;
  name: string;
  avatar: string;
  email?: string;
}

const groupTemplates = [
  {
    name: "Roommates",
    description: "Shared expenses and utilities",
    color: "bg-green-500",
  },
  {
    name: "Work Squad",
    description: "Office lunches and team events",
    color: "bg-blue-500",
  },
  {
    name: "Travel Buddies",
    description: "Weekend trips and adventures",
    color: "bg-purple-500",
  },
  {
    name: "Family",
    description: "Family events and gatherings",
    color: "bg-orange-500",
  },
];

export function CreateGroupScreen({
  onNavigate,
  initialSelectedFriendIds = [],
}: CreateGroupScreenProps) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState("bg-blue-500");
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(
    new Set(initialSelectedFriendIds),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [step, setStep] = useState(1); // 1: Basic info, 2: Add members
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendMap, setFriendMap] = useState<Record<string, Friend>>({});
  const { createGroup } = useGroups();

  useEffect(() => {
    let isCancelled = false;
    const loadFriends = async () => {
      try {
        const endpoint = searchQuery.trim()
          ? `/friends/search?q=${encodeURIComponent(searchQuery)}`
          : "/friends";
        const data = await apiClient(endpoint);
        const list: Friend[] = data.friends || data.users || [];
        if (!isCancelled) {
          setFriends(list);
          setFriendMap((prev) => {
            const updated = { ...prev };
            list.forEach((f) => {
              updated[f.id] = f;
            });
            return updated;
          });
        }
      } catch (error) {
        console.error("Failed to load friends", error);
      }
    };
    loadFriends();
    return () => {
      isCancelled = true;
    };
  }, [searchQuery]);

  const toggleFriend = (friend: Friend) => {
    const newSelected = new Set(selectedFriends);
    setFriendMap((prev) => ({ ...prev, [friend.id]: friend }));
    if (newSelected.has(friend.id)) {
      newSelected.delete(friend.id);
    } else {
      newSelected.add(friend.id);
    }
    setSelectedFriends(newSelected);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!groupName.trim()) {
        toast.error("Please enter a group name");
        return;
      }
      setStep(2);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    try {
      const payload: any = {
        name: groupName,
        description: groupDescription,
        color: selectedColor,
      };
      if (selectedFriends.size > 0) {
        payload.memberIds = Array.from(selectedFriends);
      }

      const newGroup = await createGroup(payload);
      toast.success(`Group "${groupName}" created successfully!`);
      const newGroupId = newGroup?.id;
      if (newGroupId) {
        onNavigate("group-details", { groupId: newGroupId });
      } else {
        onNavigate("friends");
      }
    } catch (error) {
      console.error("Create group error:", error);
      toast.error("Failed to create group");
    }
  };

  const applyTemplate = (template: (typeof groupTemplates)[0]) => {
    setGroupName(template.name);
    setGroupDescription(template.description);
    setSelectedColor(template.color);
  };

  const selectedFriendsData = Array.from(selectedFriends)
    .map((id) => friendMap[id])
    .filter(Boolean);

  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-red-500",
    "bg-teal-500",
    "bg-pink-500",
    "bg-indigo-500",
  ];

  if (step === 1) {
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
              <h2>Create Group</h2>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-24">
          {/* Progress Indicator */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-medium">
                1
              </div>
              <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                Group Info
              </span>
              <span className="text-xs font-medium sm:hidden">Info</span>
            </div>
            <div className="flex-1 h-1 bg-muted rounded"></div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm">
                2
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">
                Add Members
              </span>
              <span className="text-xs text-muted-foreground sm:hidden">
                Members
              </span>
            </div>
          </div>

          {/* Group Information Form */}
          <Card className="p-4 sm:p-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full ${selectedColor} text-white flex items-center justify-center mx-auto mb-3 sm:mb-4`}
                >
                  <Users className="h-8 w-8 sm:h-10 sm:w-10" />
                </div>
                <h3 className="font-medium">Group Details</h3>
                <p className="text-sm text-muted-foreground">
                  Give your group a name and choose a color
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="groupName">Group Name *</Label>
                  <Input
                    id="groupName"
                    placeholder="e.g., Work Squad, Roommates, Travel Buddies"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="groupDescription">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="groupDescription"
                    placeholder="What will you use this group for?"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    rows={3}
                    className="mt-1 resize-none"
                  />
                </div>

                <div>
                  <Label>Choose Color</Label>
                  <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${color} flex items-center justify-center transition-transform ${
                          selectedColor === color
                            ? "ring-2 ring-primary ring-offset-2 scale-110"
                            : "hover:scale-105"
                        }`}
                      >
                        {selectedColor === color && (
                          <Check className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Group Templates */}
          <Card className="p-4 sm:p-6">
            <h3 className="font-medium mb-3 sm:mb-4">Quick Templates</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groupTemplates.map((template, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-3 flex flex-col items-start text-left"
                  onClick={() => applyTemplate(template)}
                >
                  <div className="flex items-center space-x-2 mb-1 w-full">
                    <div
                      className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${template.color} flex-shrink-0`}
                    ></div>
                    <span className="font-medium text-sm sm:text-base">
                      {template.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {template.description}
                  </span>
                </Button>
              ))}
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <Button
              variant="outline"
              className="flex-1 order-2 sm:order-1"
              onClick={() => onNavigate("friends")}
            >
              Cancel
            </Button>
            <Button className="flex-1 order-1 sm:order-2" onClick={handleNext}>
              Next
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Static Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2>Add Members (Optional)</h2>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Progress Indicator */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-success text-success-foreground flex items-center justify-center">
              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">
              Group Info
            </span>
            <span className="text-xs text-muted-foreground sm:hidden">
              Info
            </span>
          </div>
          <div className="flex-1 h-1 bg-primary rounded"></div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-medium">
              2
            </div>
            <span className="text-xs sm:text-sm font-medium hidden sm:inline">
              Add Members (Optional)
            </span>
            <span className="text-xs font-medium sm:hidden">Members</span>
          </div>
        </div>

        {/* Group Preview */}
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${selectedColor} text-white flex items-center justify-center flex-shrink-0`}
            >
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium truncate">{groupName}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {groupDescription || "No description"}
              </p>
            </div>
          </div>
        </Card>

        {/* Selected Members */}
        {selectedFriends.size > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Selected ({selectedFriends.size})</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFriends(new Set())}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedFriendsData.map((friend) => (
                <Badge
                  key={friend.id}
                  variant="secondary"
                  className="flex items-center space-x-1 pr-1 text-xs"
                >
                  <span className="truncate max-w-[100px]">{friend.name}</span>
                  <button
                    onClick={() => toggleFriend(friend)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Search */}
        <div className="relative">
          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Friends List */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Your Friends</h3>
          <div className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => toggleFriend(friend)}
              >
                <Checkbox
                  checked={selectedFriends.has(friend.id)}
                  onChange={() => toggleFriend(friend)}
                  className="flex-shrink-0"
                />
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                  <AvatarFallback className="text-xs sm:text-sm">
                    {friend.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate">
                    {friend.name}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {friend.email}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {friends.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No friends found</p>
            </div>
          )}
        </Card>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <Button
            variant="outline"
            className="flex-1 order-2 sm:order-1"
            onClick={() => setStep(1)}
          >
            Back
          </Button>
          <Button
            className="flex-1 order-1 sm:order-2"
            onClick={handleCreateGroup}
          >
            Create Group
          </Button>
        </div>
      </div>
    </div>
  );
}
