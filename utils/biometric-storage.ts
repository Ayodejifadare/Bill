import { loadAuth } from "./auth";

const STORAGE_KEY = "biltip_biometric_credential";

interface BiometricUserSnapshot {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface BiometricCredential {
  token: string;
  userId: string;
  storedAt: number;
  expiresAt?: number;
  user?: BiometricUserSnapshot;
}

const getStorage = () =>
  typeof window === "undefined" ? null : window.localStorage;

export function getBiometricCredential(): BiometricCredential | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BiometricCredential;
    if (!parsed?.token || !parsed?.userId) return null;
    return parsed;
  } catch (error) {
    console.warn("Failed to read biometric credential:", error);
    return null;
  }
}

export function saveBiometricCredential(credential: BiometricCredential) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(credential));
  } catch (error) {
    console.warn("Failed to store biometric credential:", error);
  }
}

export function clearBiometricCredential() {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear biometric credential:", error);
  }
}

interface BiometricProfileLike {
  id: string;
  name: string;
  email: string;
  phone?: string;
  preferences: { biometrics: boolean };
}

export function syncBiometricCredential(profile: BiometricProfileLike) {
  if (!profile?.preferences) return;
  const storage = getStorage();
  if (!storage) return;

  if (!profile.preferences.biometrics) {
    clearBiometricCredential();
    return;
  }

  const authData = loadAuth();
  const token = authData?.auth?.token;
  if (!token) return;

  const credential: BiometricCredential = {
    token,
    userId: profile.id,
    storedAt: Date.now(),
    expiresAt: authData?.auth?.expiresAt,
    user: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
    },
  };

  saveBiometricCredential(credential);
}
