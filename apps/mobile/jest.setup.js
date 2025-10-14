// Basic timers shim used by some RN internals in test
if (!global.setImmediate) {
  // @ts-ignore
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}
if (!global.clearImmediate) {
  // @ts-ignore
  global.clearImmediate = (id) => clearTimeout(id);
}

// Minimal mock for expo-status-bar to avoid RN StatusBar side-effects in tests
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// AsyncStorage mock for React Navigation state persistence
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Expo modules basic mocks
jest.mock('expo-contacts', () => ({
  getPermissionsAsync: async () => ({ status: 'undetermined', canAskAgain: true }),
  requestPermissionsAsync: async () => ({ status: 'granted', canAskAgain: true }),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: async () => ({ status: 'undetermined' }),
  requestPermissionsAsync: async () => ({ status: 'granted' }),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: async () => true,
  isEnrolledAsync: async () => true,
  authenticateAsync: async () => ({ success: true }),
}));

jest.mock('expo-barcode-scanner', () => ({
  BarCodeScanner: ({ children }: any) => children || null,
  requestPermissionsAsync: async () => ({ status: 'granted' }),
}));
