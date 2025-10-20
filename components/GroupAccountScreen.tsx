import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { EmptyState } from "./ui/empty-state";
import { AccountCard } from "./AccountCard";
import {
  ArrowLeft,
  Plus,
  Building2,
  Smartphone,
  Copy,
  Trash2,
  Check,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { useUserProfile } from "./UserProfileContext";
import { getBankDirectoryForRegion } from "../utils/banks";
import { getMobileMoneyProviders } from "../utils/providers";
import {
  getRegionConfig,
  requiresRoutingNumber,
  validateBankAccountNumber,
  getBankAccountLength,
  getBankIdentifierLabel,
  formatBankAccountForRegion,
  normalizeMobileAccountNumber,
  formatMobileAccountNumberForRegion,
} from "../utils/regions";
import { apiClient } from "../utils/apiClient";

interface GroupAccount {
  id: string;
  name: string;
  type: "bank" | "mobile_money";
  // Bank fields
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  sortCode?: string;
  routingNumber?: string;
  accountType?: "checking" | "savings";
  // Mobile money fields
  provider?: string;
  phoneNumber?: string;
  // Metadata
  isDefault: boolean;
  createdBy: string;
  createdDate: string;
}

interface Group {
  id: string;
  name: string;
  isAdmin: boolean;
}

interface GroupAccountScreenProps {
  groupId: string | null;
  onNavigate: (tab: string, data?: any) => void;
}

// Bank directory is centralized in utils/banks; providers in utils/providers

export function GroupAccountScreen({
  groupId,
  onNavigate,
}: GroupAccountScreenProps) {
  const { appSettings } = useUserProfile();
  const banks = getBankDirectoryForRegion(appSettings.region);
  const providers = getMobileMoneyProviders(appSettings.region);
  const phoneCountryCode = getRegionConfig(appSettings.region).phoneCountryCode;

  const [group, setGroup] = useState<Group | null>(null);
  const [groupAccounts, setGroupAccounts] = useState<GroupAccount[]>([]);
  const [isGroupLoading, setIsGroupLoading] = useState(true);

  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [methodType, setMethodType] = useState<"bank" | "mobile_money">("bank");
  interface FormDataState {
    bank: string;
    accountNumber: string;
    accountName: string;
    accountType: "checking" | "savings";
    provider: string;
    phoneNumber: string;
  }
  const [formData, setFormData] = useState<FormDataState>({
    bank: "",
    accountNumber: "",
    accountName: "",
    accountType: "checking",
    provider: "",
    phoneNumber: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchAccounts = async () => {
    if (!groupId) return;
    try {
      const data = await apiClient(`/groups/${groupId}/accounts`);
      const accounts = (data.accounts || []).map((a: any) => ({
        ...a,
        createdDate: a.createdDate || a.createdAt,
      }));
      setGroupAccounts(accounts);
    } catch (error) {
      toast.error("Failed to load group accounts");
    }
  };

  const fetchGroup = async () => {
    if (!groupId) {
      setGroup(null);
      setIsGroupLoading(false);
      return;
    }
    setIsGroupLoading(true);
    try {
      const data = await apiClient(`/groups/${groupId}`);
      if (data?.group) {
        setGroup({
          id: data.group.id,
          name: data.group.name,
          isAdmin: data.group.isAdmin,
        });
      } else {
        setGroup(null);
      }
    } catch (error) {
      toast.error("Failed to load group");
      setGroup(null);
    } finally {
      setIsGroupLoading(false);
    }
  };

  useEffect(() => {
    fetchGroup();
    fetchAccounts();
  }, [groupId]);

  if (isGroupLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("friends")}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1>Group Accounts</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("friends")}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1>Group Accounts</h1>
            <p className="text-muted-foreground">Group not found</p>
          </div>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setFormData({
      bank: "",
      accountNumber: "",
      accountName: "",
      accountType: "checking",
      provider: "",
      phoneNumber: "",
    });
  };

  const handleAddMethod = async () => {
    if (methodType === "bank") {
      if (!formData.bank || !formData.accountNumber || !formData.accountName) {
        toast.error("Please fill in all bank details");
        return;
      }
      const selectedBank = banks.find((bank) => bank.name === formData.bank);
      if (!selectedBank) {
        toast.error("Please select a valid bank");
        return;
      }
      if (
        !validateBankAccountNumber(appSettings.region, formData.accountNumber)
      ) {
        toast.error("Please enter a valid account number");
        return;
      }
    } else {
      if (!formData.provider || !formData.phoneNumber) {
        toast.error("Please fill in all mobile money details");
        return;
      }
      const provider = providers.find((p) => p.name === formData.provider);
      if (!provider) {
        toast.error("Please select a valid provider");
        return;
      }
      const normalizedMobile = normalizeMobileAccountNumber(
        appSettings.region,
        formData.phoneNumber,
      );
      if (
        appSettings.region?.toUpperCase() === "NG" &&
        normalizedMobile.length !== 10
      ) {
        toast.error("Enter a valid mobile number (10 digits)");
        return;
      }
    }

    setIsLoading(true);

    try {
      const selectedBank = banks.find((bank) => bank.name === formData.bank);
      const payload: any = {
        type: methodType,
        ...(methodType === "bank"
          ? {
              bank: formData.bank,
              accountNumber: formData.accountNumber,
              accountName: formData.accountName,
              accountType: formData.accountType,
              ...(requiresRoutingNumber(appSettings.region)
                ? { routingNumber: selectedBank?.code }
                : { sortCode: selectedBank?.code }),
            }
          : {
              provider: formData.provider,
              phoneNumber: normalizeMobileAccountNumber(
                appSettings.region,
                formData.phoneNumber,
              ),
            }),
      };

      await apiClient(`/groups/${groupId}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success("Group account added successfully!");
      setIsAddingMethod(false);
      resetForm();
      await fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || "Failed to add group account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (accountId: string) => {
    if (!groupId) return;
    try {
      await apiClient(`/groups/${groupId}/accounts/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      toast.success("Default group account updated");
      await fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || "Failed to update default account");
    }
  };

  const handleDeleteMethod = async (accountId: string) => {
    if (!groupId) return;
    try {
      await apiClient(`/groups/${groupId}/accounts/${accountId}`, {
        method: "DELETE",
      });
      setGroupAccounts((prev) =>
        prev.filter((account) => account.id !== accountId),
      );
      toast.success("Group account removed");
      await fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove group account");
    }
  };

  const copyToClipboard = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    toast.success(
      label ? `${label} copied to clipboard!` : "Copied to clipboard!",
    );
  };

  const copyFullAccountInfo = (account: GroupAccount) => {
    if (account.type === "bank") {
      const usesRouting = requiresRoutingNumber(appSettings.region);
      const label = getBankIdentifierLabel(appSettings.region);
      const idValue = usesRouting ? account.routingNumber : account.sortCode;
      const accountInfo = `${account.bankName}\nAccount Name: ${account.accountHolderName}\n${label}: ${idValue ?? ""}\nAccount Number: ${account.accountNumber}`;
      copyToClipboard(accountInfo);
    } else {
      copyToClipboard(
        `${account.provider}\nPhone: ${formatMobileAccountNumberForRegion(
          appSettings.region,
          account.phoneNumber || "",
        )}`,
      );
    }
  };

  const formatAccountNumber = (accountNumber: string) =>
    formatBankAccountForRegion(appSettings.region, accountNumber);

  const handleBankChange = (bankName: string) => {
    setFormData((prev) => ({ ...prev, bank: bankName }));
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen">
      {/* Static Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-md mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("group-details", { groupId })}
                className="p-1.5 sm:p-2 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base truncate">
                  Group Accounts
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {group.name} •{" "}
                  {group.isAdmin ? "Manage accounts" : "View accounts"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {group.isAdmin && (
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}

              {group.isAdmin && (
                <Dialog open={isAddingMethod} onOpenChange={setIsAddingMethod}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 px-2 sm:px-3">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-md mx-auto">
                    <DialogHeader>
                      <DialogTitle className="text-base sm:text-lg">
                        Add Group Account
                      </DialogTitle>
                      <DialogDescription className="text-sm">
                        Add a payment account that group members can use as a
                        destination when creating splits.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto">
                      {/* Method Type Selection - Only show when mobile money is supported */}
                      {providers.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <Button
                            variant={
                              methodType === "bank" ? "default" : "outline"
                            }
                            onClick={() => setMethodType("bank")}
                            className="h-auto p-2 sm:p-3 flex flex-col gap-1 sm:gap-2"
                          >
                            <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="text-xs sm:text-sm">
                              Bank Account
                            </span>
                          </Button>
                          <Button
                            variant={
                              methodType === "mobile_money"
                                ? "default"
                                : "outline"
                            }
                            onClick={() => setMethodType("mobile_money")}
                            className="h-auto p-2 sm:p-3 flex flex-col gap-1 sm:gap-2"
                          >
                            <Smartphone className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="text-xs sm:text-sm">
                              Mobile Money
                            </span>
                          </Button>
                        </div>
                      )}

                      {providers.length === 0 || methodType === "bank" ? (
                        <>
                          <div className="space-y-1 sm:space-y-2">
                            <Label className="text-sm">Bank</Label>
                            <Select
                              value={formData.bank}
                              onValueChange={handleBankChange}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select your bank" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {banks.map((bank) => (
                                  <SelectItem
                                    key={bank.code}
                                    value={bank.name}
                                    className="text-sm"
                                  >
                                    {bank.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1 sm:space-y-2">
                            <Label className="text-sm">
                              Account Holder Name
                            </Label>
                            <Input
                              value={formData.accountName}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  accountName: e.target.value,
                                }))
                              }
                              placeholder={"Full name as it appears on account"}
                              className="h-10 text-sm"
                            />
                          </div>

                          {requiresRoutingNumber(appSettings.region) && (
                            <div className="space-y-1 sm:space-y-2">
                              <Label className="text-sm">Account Type</Label>
                              <Select
                                value={formData.accountType}
                                onValueChange={(
                                  value: "checking" | "savings",
                                ) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    accountType: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem
                                    value="checking"
                                    className="text-sm"
                                  >
                                    Checking
                                  </SelectItem>
                                  <SelectItem
                                    value="savings"
                                    className="text-sm"
                                  >
                                    Savings
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-1 sm:space-y-2">
                            <Label className="text-sm">Account Number</Label>
                            <Input
                              type={
                                getBankAccountLength(appSettings.region)
                                  ? "number"
                                  : "password"
                              }
                              value={formData.accountNumber}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  accountNumber: getBankAccountLength(
                                    appSettings.region,
                                  )
                                    ? e.target.value.slice(
                                        0,
                                        getBankAccountLength(
                                          appSettings.region,
                                        ),
                                      )
                                    : e.target.value,
                                }))
                              }
                              placeholder={
                                getBankAccountLength(appSettings.region)
                                  ? "1234567890"
                                  : "Account number"
                              }
                              maxLength={getBankAccountLength(
                                appSettings.region,
                              )}
                              className="h-10 text-sm"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1 sm:space-y-2">
                            <Label className="text-sm">Provider</Label>
                            <Select
                              value={formData.provider}
                              onValueChange={(value) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  provider: value,
                                }))
                              }
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                              <SelectContent>
                                {providers.map((provider) => (
                                  <SelectItem
                                    key={provider.code}
                                    value={provider.name}
                                    className="text-sm"
                                  >
                                    {provider.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1 sm:space-y-2">
                            <Label className="text-sm">Phone Number</Label>
                            <Input
                              type="tel"
                              value={formData.phoneNumber}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  phoneNumber: e.target.value,
                                }))
                              }
                              placeholder={`${phoneCountryCode || "+Country"} 801 234 5678`}
                              className="h-10 text-sm"
                            />
                          </div>
                        </>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
                        <Button
                          className="flex-1 h-10 order-1 sm:order-1"
                          onClick={handleAddMethod}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              <span className="text-sm">Verifying...</span>
                            </>
                          ) : (
                            <span className="text-sm">Add Account</span>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsAddingMethod(false)}
                          className="flex-1 h-10 order-2 sm:order-2"
                        >
                          <span className="text-sm">Cancel</span>
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-md mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24">
        {/* Admin Info Card */}
        {!group.isAdmin && (
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>Group Account Access:</strong> Only group
                  administrators can manage group accounts. These accounts are
                  available as payment destinations when creating group splits.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Group Accounts List */}
        <div className="space-y-3 sm:space-y-4">
          {groupAccounts.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No group accounts"
              description={
                group.isAdmin
                  ? "Add payment accounts that group members can use when creating splits"
                  : "No payment accounts have been added to this group yet"
              }
              actionLabel={group.isAdmin ? "Add First Group Account" : undefined}
              onAction={group.isAdmin ? () => setIsAddingMethod(true) : undefined}
            />
          ) : (
            groupAccounts.map((account) => {
              const mapped = {
                id: account.id,
                type: account.type,
                bankName: account.bankName,
                accountNumber: account.accountNumber,
                accountHolderName: account.accountHolderName,
                sortCode: account.sortCode,
                routingNumber: account.routingNumber,
                accountType: account.accountType,
                provider: account.provider,
                phoneNumber: account.phoneNumber,
                isDefault: account.isDefault,
                name: account.name,
                createdBy: account.createdBy,
                createdDate: account.createdDate,
              } as any;
              return (
                <AccountCard
                  key={account.id}
                  account={mapped}
                  variant="group"
                  showAdminActions={group.isAdmin}
                  onSetDefault={handleSetDefault}
                  onDelete={handleDeleteMethod}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
