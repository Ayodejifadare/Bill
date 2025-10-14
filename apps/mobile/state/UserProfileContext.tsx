import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../utils/apiClient';
function resolveRegionFromLocale(locale?: string | null): string {
  if (!locale) return 'NG';
  const lower = locale.toLowerCase();
  const parts = lower.split(/[-_]/);
  const country = parts[1]?.toUpperCase();
  if (country && country.length === 2) return country;
  if (lower.includes('nigeria')) return 'NG';
  if (lower.includes('us') || lower.includes('united states')) return 'US';
  return 'NG';
}
function getCurrencyCode(region?: string | null): string {
  const map: Record<string, string> = { NG: 'NGN', US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', EU: 'EUR' };
  const key = (region || 'NG').toUpperCase();
  return map[key] || 'NGN';
}

type KycStatus = 'pending' | 'verified' | 'rejected';

export interface UserStats { totalSent: number; totalReceived: number; totalSplits: number; friends: number }
export interface UserPreferences { notifications: boolean; emailAlerts: boolean; whatsappAlerts: boolean; darkMode: boolean; biometrics: boolean; notificationSettings: Record<string, unknown> }
export interface LinkedBankAccount { id: string; bankId: string; bankName: string; accountType: 'checking' | 'savings'; accountName: string; last4: string; routingNumber: string; accountNumber: string; isVerified: boolean; isDefault: boolean; backgroundColor: string; logoUrl?: string; deepLink: string; addedDate: string }
export interface UserProfile {
  id: string; name: string; email: string; phone?: string; firstName?: string; lastName?: string; dateOfBirth?: string; address?: string; bio?: string; avatar?: string; joinDate?: string; kycStatus?: KycStatus; stats: UserStats; preferences: UserPreferences; linkedBankAccounts: LinkedBankAccount[];
}
export interface AppSettings { region: string; currency: string }

interface Ctx {
  userProfile: UserProfile | null;
  appSettings: AppSettings;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateAppSettings: (settings: Partial<AppSettings>) => void;
}

const defaultStats: UserStats = { totalSent: 0, totalReceived: 0, totalSplits: 0, friends: 0 };
const defaultPreferences: UserPreferences = { notifications: true, emailAlerts: false, whatsappAlerts: false, darkMode: false, biometrics: false, notificationSettings: {} };
const SETTINGS_KEY = 'biltip-app-settings';

const UserProfileContext = createContext<Ctx | undefined>(undefined);

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}

async function getSavedSettings(): Promise<AppSettings> {
  try {
    const saved = await AsyncStorage.getItem(SETTINGS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  const region = resolveRegionFromLocale();
  const currency = getCurrencyCode(region);
  return { region, currency };
}

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>({ region: 'US', currency: 'USD' });
  const [loading, setLoading] = useState(true);

  const refreshUserProfile = async () => {
    try {
      const data = await apiClient('/users/me');
      if (!data) return;
      const stats: UserStats = {
        totalSent: data?.stats?.totalSent ?? defaultStats.totalSent,
        totalReceived: data?.stats?.totalReceived ?? defaultStats.totalReceived,
        totalSplits: data?.stats?.totalSplits ?? defaultStats.totalSplits,
        friends: data?.stats?.friends ?? defaultStats.friends,
      };
      setUserProfile((prev) => ({
        id: String(data.id || data._id || prev?.id || ''),
        name: data.name ?? prev?.name ?? '',
        email: data.email ?? prev?.email ?? '',
        phone: data.phone ?? prev?.phone,
        firstName: data.firstName ?? prev?.firstName,
        lastName: data.lastName ?? prev?.lastName,
        dateOfBirth: data.dateOfBirth ?? prev?.dateOfBirth,
        address: data.address ?? prev?.address,
        bio: data.bio ?? prev?.bio,
        avatar: data.avatar ?? prev?.avatar,
        joinDate: data.createdAt ? new Date(data.createdAt).toISOString() : prev?.joinDate,
        kycStatus: (data.kycStatus as KycStatus) ?? 'pending',
        stats,
        preferences: { ...defaultPreferences, ...(data.preferences || {}) },
        linkedBankAccounts: prev?.linkedBankAccounts ?? [],
      }));
      if (data.region && data.currency) {
        const settings = { region: data.region, currency: data.currency };
        setAppSettings(settings);
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      }
    } catch (e) {
      // swallow for now; consumers can show toast from error boundary
    }
  };

  useEffect(() => {
    (async () => {
      const s = await getSavedSettings();
      setAppSettings(s);
      await refreshUserProfile();
      setLoading(false);
    })();
  }, []);

  const updateUserProfile = async (profile: Partial<UserProfile>) => {
    setUserProfile((prev) => (prev ? { ...prev, ...profile } : prev));
    try {
      const payload: Record<string, unknown> = {};
      const copyKeys: (keyof UserProfile)[] = ['name','email','phone','avatar','firstName','lastName','dateOfBirth','address','bio','preferences'];
      for (const k of copyKeys) {
        const v = (profile as any)[k];
        if (v !== undefined) (payload as any)[k] = v;
      }
      await apiClient('/users/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } catch {}
  };

  const updateAppSettings = (settingsUpdate: Partial<AppSettings>) => {
    const newSettings = { ...appSettings, ...settingsUpdate };
    setAppSettings(newSettings);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings)).catch(() => {});
    void apiClient('/users/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSettings) }).catch(() => {});
  };

  return (
    <UserProfileContext.Provider value={{ userProfile, appSettings, loading, refreshUserProfile, updateUserProfile, updateAppSettings }}>
      {children}
    </UserProfileContext.Provider>
  );
};
