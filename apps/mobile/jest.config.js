module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-reanimated|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|expo|expo-modules-core|expo-constants|expo-asset|expo-font|expo-status-bar|expo-haptics|expo-contacts|expo-notifications|expo-local-authentication|expo-barcode-scanner|react-native-qrcode-svg)/)'
  ],
};
