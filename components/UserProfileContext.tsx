import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

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
  userProfile: UserProfile;
  appSettings: AppSettings;
  refreshUserProfile: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateAppSettings: (settings: Partial<AppSettings>) => void;
  addBankAccount: (account: Omit<LinkedBankAccount, 'id' | 'addedDate'>) => void;
  removeBankAccount: (accountId: string) => void;
  setDefaultBankAccount: (accountId: string) => void;
  saveSettings: (settings: UserSettings) => Promise<UserSettings | undefined>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

const mockUserProfile: UserProfile = {
  id: 'user-123',
  name: 'John Doe',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+2348012345678',
  dateOfBirth: '1990-01-15',
  address: '123 Main St, San Francisco, CA 94102',
  bio: 'Coffee enthusiast and frequent bill splitter',
  joinDate: 'March 2023',
  kycStatus: 'verified',
  stats: {
    totalSent: 1250.0,
    totalReceived: 890.5,
    totalSplits: 15,
    friends: 23,
  },
  preferences: {
    notifications: true,
    emailAlerts: false,
    whatsappAlerts: true,
    darkMode: false,
    biometrics: true,
  },
  linkedBankAccounts: [
    {
      id: 'bank-1',
      bankId: 'chase',
      bankName: 'Chase Bank',
      accountType: 'checking',
      accountName: 'Chase Total Checking',
      last4: '2345',
      routingNumber: '021000021',
      accountNumber: 'XXXXXX2345',
      isVerified: true,
      isDefault: true,
      backgroundColor: '#0066b2',
      deepLink: 'chase://payment',
      addedDate: '2024-01-15'
    },
    {
      id: 'bank-2',
      bankId: 'bofa',
      bankName: 'Bank of America',
      accountType: 'savings',
      accountName: 'BofA Advantage Savings',
      last4: '7890',
      routingNumber: '011401533',
      accountNumber: 'XXXXXX7890',
      isVerified: true,
      isDefault: false,
      backgroundColor: '#e31837',
      deepLink: 'bankofamerica://payment',
      addedDate: '2024-02-20'
    },
    {
      id: 'bank-3',
      bankId: 'wells',
      bankName: 'Wells Fargo',
      accountType: 'checking',
      accountName: 'Wells Everyday Checking',
      last4: '1234',
      routingNumber: '121000248',
      accountNumber: 'XXXXXX1234',
      isVerified: false,
      isDefault: false,
      backgroundColor: '#d71e2b',
      deepLink: 'wellsfargo://payment',
      addedDate: '2024-03-05'
    }
  ]
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
  const [userProfile, setUserProfile] = useState<UserProfile>(mockUserProfile);
  const [appSettings, setAppSettings] = useState<AppSettings>(getSavedSettings());
  const refreshUserProfile = async () => {
    try {
      const storedAuth = localStorage.getItem('biltip_auth');
      const token = storedAuth ? JSON.parse(storedAuth).token : null;
      const userId = userProfile.id;
      if (!token || !userId) return;

      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const data = await response.json();
      const fetched = data.user;
      setUserProfile(prev => ({
        ...prev,
        ...fetched,
        joinDate: fetched.createdAt ? new Date(fetched.createdAt).toLocaleDateString() : prev.joinDate,
      }));
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    refreshUserProfile();
  }, []);

  const updateUserProfile = async (profileUpdate: Partial<UserProfile>) => {
    setUserProfile(prev => ({
      ...prev,
      ...profileUpdate
    }));

    try {
      const storedAuth = localStorage.getItem('biltip_auth');
      const token = storedAuth ? JSON.parse(storedAuth).token : null;
      const userId = userProfile.id;
      if (!token || !userId) return;

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

      await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  };

  const updateAppSettings = (settingsUpdate: Partial<AppSettings>) => {
    const newSettings = {
      ...appSettings,
      ...settingsUpdate
    };
    
    setAppSettings(newSettings);
    
    // Persist to localStorage
    try {
      localStorage.setItem('biltip-app-settings', JSON.stringify(newSettings));
    } catch (error) {
      console.warn('Error saving app settings:', error);
    }
  };

  const saveSettings = async (settings: UserSettings) => {
    try {
      const storedAuth = localStorage.getItem('biltip_auth');
      const token = storedAuth ? JSON.parse(storedAuth).token : null;
      const userId = userProfile.id;
      if (!token || !userId) return;

      const response = await fetch(`/api/users/${userId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const data = await response.json();
      return data.settings as UserSettings;
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const addBankAccount = (account: Omit<LinkedBankAccount, 'id' | 'addedDate'>) => {
    const newAccount: LinkedBankAccount = {
      ...account,
      id: `bank-${Date.now()}`,
      addedDate: new Date().toISOString().split('T')[0]
    };

    setUserProfile(prev => ({
      ...prev,
      linkedBankAccounts: [...prev.linkedBankAccounts, newAccount]
    }));
  };

  const removeBankAccount = (accountId: string) => {
    setUserProfile(prev => ({
      ...prev,
      linkedBankAccounts: prev.linkedBankAccounts.filter(account => account.id !== accountId)
    }));
  };

  const setDefaultBankAccount = (accountId: string) => {
    setUserProfile(prev => ({
      ...prev,
      linkedBankAccounts: prev.linkedBankAccounts.map(account => ({
        ...account,
        isDefault: account.id === accountId
      }))
    }));
  };

  return (
    <UserProfileContext.Provider
      value={{
        userProfile,
        appSettings,
        refreshUserProfile,
        updateUserProfile,
        updateAppSettings,
        addBankAccount,
        removeBankAccount,
        setDefaultBankAccount,
        saveSettings
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