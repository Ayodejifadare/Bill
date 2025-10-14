import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'biltip_auth';
const USER_KEY = 'biltip_user';

export async function saveAuth(token: string, user?: any) {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ token }));
  if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function loadAuthToken(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return typeof parsed?.token === 'string' ? parsed.token : null;
  } catch {
    return null;
  }
}

export async function loadUserId(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    const id = parsed?.id ?? parsed?._id;
    return id ? String(id) : null;
  } catch {
    return null;
  }
}

export async function clearAuth() {
  await AsyncStorage.multiRemove([AUTH_KEY, USER_KEY]);
}

