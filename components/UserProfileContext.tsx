import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiClient, ApiRedirectError } from '../utils/apiClient';

interface LinkedBankAccount {
  id: string;
  bankId: string;
  bankName: string;
  accountType: 'checking' | 'savings';
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
  kycStatus?: 'pending' | 'verified' | 'rejected';
  stats: UserStats;
  preferences: UserPreferences;
  linkedBankAccounts: LinkedBankAccount[];
}

interface AppSettings {
  region: 'US' | 'NG';
  currency: 'USD' | 'NGN';
}

interface UserProfileContextType {
  userProfile: UserProfile | null;
  appSettings: AppSettings;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateAppSettings: (settings: Partial<AppSettings>) => void;
  addBankAccount: (account: Omit<LinkedBankAccount, 'id' | 'addedDate'>) => void;
  removeBankAccount: (accountId: string) => void;
  setDefaultBankAccount: (accountId: string) => void;
  saveSettings: (settings: UserSettings) => Promise<UserSettings | undefined>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

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

const getStoredUserId = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem('biltip_user');
    return raw ? JSON.parse(raw).id : undefined;
  } catch {
    return undefined;
  }
};

// Helper function to get saved settings from localStorage
export const getSavedSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem('biltip-app-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      // Validate the saved settings
      if (settings.region && settings.currency && 
          ['US', 'NG'].includes(settings.region) &&
          ['USD', 'NGN'].includes(settings.currency)) {
        return settings;
      }
    }
  } catch (error) {
    console.warn('Error loading saved settings:', error);
  }
  
  // Default settings - detect region from browser locale if possible
  const locale = navigator.language.toLowerCase();
  const isNigerianLocale = locale.includes('ng') || locale.includes('nigeria');
  
  return {
    region: isNigerianLocale ? 'NG' : 'US',
    currency: isNigerianLocale ? 'NGN' : 'USD'
  };
};

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(getSavedSettings());
  const [loading, setLoading] = useState(true);

  const refreshUserProfile = async () => {
    try {
      const userId = getStoredUserId() || userProfile?.id;
      if (!userId) return;
      const [profileData, statsData] = await Promise.all([
        apiClient(`/api/users/${userId}`),
        apiClient(`/api/users/${userId}/stats`).catch(() => ({ stats: defaultStats }))
      ]);
      const fetched = profileData.user;
      const stats = statsData?.stats ?? defaultStats;
      setUserProfile(prev => ({
        id: fetched.id,
        name: fetched.name,
        email: fetched.email,
        phone: fetched.phone,
        firstName: fetched.firstName,
        lastName: fetched.lastName,
        dateOfBirth: fetched.dateOfBirth,
        address: fetched.address,
        bio: fetched.bio,
        avatar: fetched.avatar,
        joinDate: fetched.createdAt ? new Date(fetched.createdAt).toLocaleDateString() : prev?.joinDate,
        kycStatus: fetched.kycStatus ?? 'pending',

        stats,
        preferences: {
          ...defaultPreferences,
          ...(fetched.preferences || {}),
          notificationSettings: {
            ...defaultPreferences.notificationSettings,
            ...(fetched.preferences?.notificationSettings || {}),
          },
        },

        linkedBankAccounts: prev?.linkedBankAccounts ?? [],
      }));
      if (fetched.region && fetched.currency) {
        const settings = { region: fetched.region, currency: fetched.currency };
        setAppSettings(settings);
        try {
          localStorage.setItem('biltip-app-settings', JSON.stringify(settings));
        } catch (error) {
          console.warn('Error saving app settings:', error);
        }
      }
    } catch (error) {
      if (error instanceof ApiRedirectError) {
        window.dispatchEvent(new CustomEvent('onboarding-required', { detail: error.redirect }));
      } else {
        console.error('Error fetching user profile:', error);
      }
    }
  };

  useEffect(() => {
    (async () => {
      await refreshUserProfile();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUserProfile = async (profileUpdate: Partial<UserProfile>) => {
    setUserProfile(prev => (prev ? { ...prev, ...profileUpdate } : prev));

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
      if (preferences !== undefined) payload.preferences = preferences;

      await apiClient(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (error instanceof ApiRedirectError) {
        window.dispatchEvent(new CustomEvent('onboarding-required', { detail: error.redirect }));
      } else {
        console.error('Error updating user profile:', error);
      }
    }
  };

  const updateAppSettings = (settingsUpdate: Partial<AppSettings>) => {
    const newSettings = {
      ...appSettings,
      ...settingsUpdate
    };

    setAppSettings(newSettings);

    try {
      localStorage.setItem('biltip-app-settings', JSON.stringify(newSettings));
    } catch (error) {
      console.warn('Error saving app settings:', error);
    }

    void (async () => {
      try {
        const userId = userProfile?.id || getStoredUserId();
        if (!userId) return;
        await apiClient(`/api/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            region: newSettings.region,
            currency: newSettings.currency,
          }),
        });
      } catch (error) {
        if (error instanceof ApiRedirectError) {
          window.dispatchEvent(new CustomEvent('onboarding-required', { detail: error.redirect }));
        } else {
          console.warn('Error updating app settings:', error);
        }
      }
    })();
  };

  const saveSettings = async (settings: UserSettings) => {
    try {
      const userId = userProfile?.id || getStoredUserId();
      if (!userId) return;

      const data = await apiClient(`/api/users/${userId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      return data.settings as UserSettings;
    } catch (error) {
      if (error instanceof ApiRedirectError) {
        window.dispatchEvent(new CustomEvent('onboarding-required', { detail: error.redirect }));
      } else {
        console.error('Error saving settings:', error);
      }
    }
  };

  const addBankAccount = (account: Omit<LinkedBankAccount, 'id' | 'addedDate'>) => {
    const newAccount: LinkedBankAccount = {
      ...account,
      id: `bank-${Date.now()}`,
      addedDate: new Date().toISOString().split('T')[0],
    };

    setUserProfile(prev =>
      prev ? { ...prev, linkedBankAccounts: [...prev.linkedBankAccounts, newAccount] } : prev,
    );
  };

  const removeBankAccount = (accountId: string) => {
    setUserProfile(prev =>
      prev
        ? {
            ...prev,
            linkedBankAccounts: prev.linkedBankAccounts.filter(
              account => account.id !== accountId,
            ),
          }
        : prev,
    );
  };

  const setDefaultBankAccount = (accountId: string) => {
    setUserProfile(prev =>
      prev
        ? {
            ...prev,
            linkedBankAccounts: prev.linkedBankAccounts.map(account => ({
              ...account,
              isDefault: account.id === accountId,
            })),
          }
        : prev,
    );
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

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
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}
