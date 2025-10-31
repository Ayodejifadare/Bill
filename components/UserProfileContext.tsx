import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { apiClient } from "../utils/apiClient";

interface LinkedBankAccount {
  id: string;
  bankId: string;
  bankName: string;
  accountType: "checking" | "savings";
  accountName: string;
  last4: string;
  routingNumber: string;
  accountNumber: string;
  isVerified: boolean;
  isDefault: boolean;
  backgroundColor: string;
  logoUrl?: string;
  deepLink: string;
  addedDate: string;
}

interface UserStats {
  totalSent: number;
  totalReceived: number;
  totalSplits: number;
  friends: number;
}

interface UserPreferences {
  notifications: boolean;
  emailAlerts: boolean;
  whatsappAlerts: boolean;
  darkMode: boolean;
  biometrics: boolean;
  notificationSettings: Record<string, unknown>;
}

interface UserSettings {
  notifications: Record<string, boolean>;
  privacy: Record<string, boolean>;
  preferences: Record<string, string | boolean>;
}

interface UserProfile {
  id: string;
  /** Display name - typically first and last name combined */
  name: string;
  email: string;
  phone?: string;
  /** Optional separated name fields */
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  address?: string;
  bio?: string;
  avatar?: string;
  joinDate?: string;
  kycStatus?: "pending" | "verified" | "rejected";
  stats: UserStats;
  preferences: UserPreferences;
  linkedBankAccounts: LinkedBankAccount[];
}

import { getCurrencyCode, resolveRegionFromLocale } from "../utils/regions";

interface AppSettings {
  region: string; // ISO country code preferred (e.g., 'US', 'NG', 'GB')
  currency: string; // ISO 4217 code (e.g., 'USD', 'NGN', 'GBP')
}

interface UserProfileContextType {
  userProfile: UserProfile | null;
  appSettings: AppSettings;
  loading: boolean;
  refreshUserProfile: (
    options?: { waitForStats?: boolean; silent?: boolean },
  ) => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateAppSettings: (settings: Partial<AppSettings>) => void;
  addBankAccount: (
    account: Omit<LinkedBankAccount, "id" | "addedDate">,
  ) => void;
  removeBankAccount: (accountId: string) => void;
  setDefaultBankAccount: (accountId: string) => void;
  saveSettings: (settings: UserSettings) => Promise<UserSettings | undefined>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(
  undefined,
);

const defaultStats: UserStats = {
  totalSent: 0,
  totalReceived: 0,
  totalSplits: 0,
  friends: 0,
};

const defaultPreferences: UserPreferences = {
  notifications: true,
  emailAlerts: false,
  whatsappAlerts: false,
  darkMode: false,
  biometrics: false,
  notificationSettings: {},
};

const PROFILE_CACHE_KEY = "biltip_profile_cache";

const normalizePreferences = (
  prefs?: Partial<UserPreferences> | null,
): UserPreferences => ({
  ...defaultPreferences,
  ...(prefs ?? {}),
  notificationSettings: {
    ...defaultPreferences.notificationSettings,
    ...((prefs?.notificationSettings as Record<string, unknown>) ?? {}),
  },
});

const buildProfileFromSource = (
  source: any,
  previous: UserProfile | null,
): UserProfile => {
  const fallback = previous ?? null;
  const statsSource = source?.stats;
  const stats =
    statsSource && typeof statsSource === "object"
      ? {
          ...defaultStats,
          ...(statsSource as Partial<UserStats>),
        }
      : fallback?.stats ?? defaultStats;

  return {
    id: String(source?.id ?? fallback?.id ?? ""),
    name: source?.name ?? fallback?.name ?? "",
    email: source?.email ?? fallback?.email ?? "",
    phone: source?.phone ?? fallback?.phone,
    firstName: source?.firstName ?? fallback?.firstName,
    lastName: source?.lastName ?? fallback?.lastName,
    dateOfBirth: source?.dateOfBirth ?? fallback?.dateOfBirth,
    address: source?.address ?? fallback?.address,
    bio: source?.bio ?? fallback?.bio,
    avatar: source?.avatar ?? fallback?.avatar,
    joinDate:
      source?.createdAt
        ? new Date(source.createdAt).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })
        : source?.joinDate ?? fallback?.joinDate,
    kycStatus: source?.kycStatus ?? fallback?.kycStatus ?? "pending",
    stats,
    preferences: normalizePreferences(
      (source?.preferences as Partial<UserPreferences>) ?? fallback?.preferences,
    ),
    linkedBankAccounts: Array.isArray(source?.linkedBankAccounts)
      ? (source.linkedBankAccounts as LinkedBankAccount[])
      : fallback?.linkedBankAccounts ?? [],
  };
};

const loadCachedProfile = (): UserProfile | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return buildProfileFromSource(parsed, null);
  } catch (error) {
    console.warn("Error loading cached user profile:", error);
    return null;
  }
};

const getStoredUserId = (): string | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem("biltip_user");
    return raw ? JSON.parse(raw).id : undefined;
  } catch {
    return undefined;
  }
};

// Helper function to get saved settings from localStorage
export const getSavedSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem("biltip-app-settings");
    if (saved) {
      const settings = JSON.parse(saved);
      // Basic validation: ensure strings exist; allow any region/currency for extensibility
      if (
        settings.region &&
        settings.currency &&
        typeof settings.region === "string" &&
        typeof settings.currency === "string"
      ) {
        return settings as AppSettings;
      }
    }
  } catch (error) {
    console.warn("Error loading saved settings:", error);
  }

  // Default settings - detect region from browser locale if possible
  const detectedRegion = resolveRegionFromLocale(
    typeof navigator !== "undefined" ? navigator.language : "",
  );
  return {
    region: detectedRegion,
    currency: getCurrencyCode(detectedRegion),
  };
};

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const cachedProfileRef = useRef<UserProfile | null>(
    typeof window !== "undefined" ? loadCachedProfile() : null,
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    cachedProfileRef.current,
  );
  const [appSettings, setAppSettings] =
    useState<AppSettings>(getSavedSettings());
  const [loading, setLoading] = useState(() => !cachedProfileRef.current);
  const initialUserIdRef = useRef<string | undefined>(
    getStoredUserId() || cachedProfileRef.current?.id,
  );

  const persistProfile = useCallback((profile: UserProfile) => {
    cachedProfileRef.current = profile;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        PROFILE_CACHE_KEY,
        JSON.stringify(profile),
      );
    } catch (error) {
      console.warn("Error caching user profile:", error);
    }
  }, []);

  const applyProfile = useCallback(
    (fetched: any) => {
      if (!fetched) return;
      setUserProfile((prev) => {
        const next = buildProfileFromSource(fetched, prev);
        persistProfile(next);
        return next;
      });

      if (fetched.region && fetched.currency) {
        const settings = {
          region: fetched.region as string,
          currency: fetched.currency as string,
        };
        setAppSettings(settings);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              "biltip-app-settings",
              JSON.stringify(settings),
            );
          } catch (error) {
            console.warn("Error saving app settings:", error);
          }
        }
      }
    },
    [persistProfile],
  );

  const applyStats = useCallback(
    (stats: Partial<UserStats> | null | undefined) => {
      if (!stats) return;
      setUserProfile((prev) => {
        if (!prev) return prev;
        const next: UserProfile = {
          ...prev,
          stats: {
            ...defaultStats,
            ...stats,
          },
        };
        persistProfile(next);
        return next;
      });
    },
    [persistProfile],
  );

  const fetchAndApplyProfile = useCallback(
    async (
      userId: string,
      {
        waitForStats = true,
        signal,
      }: { waitForStats?: boolean; signal?: { cancelled: boolean } } = {},
    ) => {
      const aborted = () => signal?.cancelled ?? false;
      try {
        const profileData = await apiClient(`/users/${userId}`);
        if (aborted()) return;
        const fetchedUser = profileData?.user ?? profileData;
        applyProfile(fetchedUser);
      } catch (error) {
        if (!aborted()) {
          throw error;
        }
        return;
      }

      const statsPromise = apiClient(`/users/${userId}/stats`)
        .then((statsData) => {
          if (aborted()) return;
          applyStats(statsData?.stats ?? defaultStats);
        })
        .catch((error) => {
          if (!aborted()) {
            console.warn("Error fetching user stats:", error);
          }
        });

      if (waitForStats) {
        await statsPromise;
      }
    },
    [applyProfile, applyStats],
  );

  useEffect(() => {
    const userId = initialUserIdRef.current;
    if (!userId) {
      setLoading(false);
      return;
    }

    const signal = { cancelled: false };
    if (!cachedProfileRef.current) {
      setLoading(true);
    }

    fetchAndApplyProfile(userId, { waitForStats: false, signal })
      .catch((error) => {
        if (!signal.cancelled) {
          console.error("Error fetching user profile:", error);
        }
      })
      .finally(() => {
        if (!signal.cancelled) {
          setLoading(false);
        }
      });

    return () => {
      signal.cancelled = true;
    };
  }, [fetchAndApplyProfile]);

  const refreshUserProfile = useCallback(
    async (
      options: { waitForStats?: boolean; silent?: boolean } = {},
    ) => {
      const { waitForStats = true, silent = false } = options;
      const userId =
        getStoredUserId() || userProfile?.id || initialUserIdRef.current;
      if (!userId) return;

      if (!silent) {
        setLoading(true);
      }

      try {
        await fetchAndApplyProfile(userId, { waitForStats });
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [fetchAndApplyProfile, userProfile?.id],
  );

  const updateUserProfile = useCallback(
    async (profileUpdate: Partial<UserProfile>) => {
      setUserProfile((prev) => {
        if (!prev) return prev;
        const next: UserProfile = {
          ...prev,
          ...profileUpdate,
          preferences:
            profileUpdate.preferences !== undefined
              ? normalizePreferences(profileUpdate.preferences)
              : prev.preferences,
        };
        persistProfile(next);
        return next;
      });

      try {
        const userId = userProfile?.id || getStoredUserId();
        if (!userId) return;

        const {
          name,
          email,
          phone,
          avatar,
          firstName,
          lastName,
          dateOfBirth,
          address,
          bio,
          preferences,
        } = profileUpdate;
        const payload: Record<string, unknown> = {};
        if (name !== undefined) payload.name = name;
        if (email !== undefined) payload.email = email;
        if (phone !== undefined) payload.phone = phone;
        if (avatar !== undefined) payload.avatar = avatar;
        if (firstName !== undefined) payload.firstName = firstName;
        if (lastName !== undefined) payload.lastName = lastName;
        if (dateOfBirth !== undefined) payload.dateOfBirth = dateOfBirth;
        if (address !== undefined) payload.address = address;
        if (bio !== undefined) payload.bio = bio;
        if (preferences !== undefined)
          payload.preferences = normalizePreferences(preferences);

        await apiClient(`/users/${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error("Error updating user profile:", error);
      }
    },
    [persistProfile, userProfile?.id],
  );

  const updateAppSettings = useCallback(
    (settingsUpdate: Partial<AppSettings>) => {
      const newSettings = {
        ...appSettings,
        ...settingsUpdate,
      };

      setAppSettings(newSettings);

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            "biltip-app-settings",
            JSON.stringify(newSettings),
          );
        } catch (error) {
          console.warn("Error saving app settings:", error);
        }
      }

      void (async () => {
        try {
          const userId = userProfile?.id || getStoredUserId();
          if (!userId) return;
          await apiClient(`/users/${userId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              region: newSettings.region,
              currency: newSettings.currency,
            }),
          });
        } catch (error) {
          console.warn("Error updating app settings:", error);
        }
      })();
    },
    [appSettings, userProfile?.id],
  );

  const saveSettings = useCallback(
    async (settings: UserSettings) => {
      try {
        const userId = userProfile?.id || getStoredUserId();
        if (!userId) return;

        const data = await apiClient(`/users/${userId}/settings`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        });
        return data.settings as UserSettings;
      } catch (error) {
        console.error("Error saving settings:", error);
      }
    },
    [userProfile?.id],
  );

  const addBankAccount = useCallback(
    (account: Omit<LinkedBankAccount, "id" | "addedDate">) => {
      const newAccount: LinkedBankAccount = {
        ...account,
        id: `bank-${Date.now()}`,
        addedDate: new Date().toISOString().split("T")[0],
      };

      setUserProfile((prev) => {
        if (!prev) return prev;
        const next: UserProfile = {
          ...prev,
          linkedBankAccounts: [...prev.linkedBankAccounts, newAccount],
        };
        persistProfile(next);
        return next;
      });
    },
    [persistProfile],
  );

  const removeBankAccount = useCallback(
    (accountId: string) => {
      setUserProfile((prev) => {
        if (!prev) return prev;
        const next: UserProfile = {
          ...prev,
          linkedBankAccounts: prev.linkedBankAccounts.filter(
            (account) => account.id !== accountId,
          ),
        };
        persistProfile(next);
        return next;
      });
    },
    [persistProfile],
  );

  const setDefaultBankAccount = useCallback(
    (accountId: string) => {
      setUserProfile((prev) => {
        if (!prev) return prev;
        const next: UserProfile = {
          ...prev,
          linkedBankAccounts: prev.linkedBankAccounts.map((account) => ({
            ...account,
            isDefault: account.id === accountId,
          })),
        };
        persistProfile(next);
        return next;
      });
    },
    [persistProfile],
  );

  return (
    <UserProfileContext.Provider
      value={{
        userProfile,
        appSettings,
        loading,
        refreshUserProfile,
        updateUserProfile,
        updateAppSettings,
        addBankAccount,
        removeBankAccount,
        setDefaultBankAccount,
        saveSettings,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return context;
}
