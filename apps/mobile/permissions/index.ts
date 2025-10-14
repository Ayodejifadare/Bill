import * as Contacts from 'expo-contacts';
import * as LocalAuthentication from 'expo-local-authentication';

export async function ensureContactsPermission(): Promise<boolean> {
  const { status, canAskAgain } = await Contacts.getPermissionsAsync();
  if (status === 'granted') return true;
  if (!canAskAgain) return false;
  const req = await Contacts.requestPermissionsAsync();
  return req.status === 'granted';
}

export async function authenticateBiometric(promptMessage = 'Authenticate') {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return { success: false, error: 'no_hardware' } as const;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) return { success: false, error: 'not_enrolled' } as const;
  const result = await LocalAuthentication.authenticateAsync({ promptMessage });
  return result;
}

