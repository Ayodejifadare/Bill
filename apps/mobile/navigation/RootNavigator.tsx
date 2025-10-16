import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { Icon } from '../icons/Icon';
import HomeScreen from '../screens/Home';
import BillsScreen from '../screens/Bills';
import FriendsScreen from '../screens/Friends';
import ProfileScreen from '../screens/Profile';
import SplitScreen from '../screens/Split';
import PendingScreen from '../screens/Pending';
import TransactionDetailsScreen from '../screens/TransactionDetails';
import TransactionsScreen from '../screens/Transactions';
import RecurringPaymentsScreen from '../screens/RecurringPayments';
import SetupRecurringPaymentScreen from '../screens/SetupRecurringPayment';
import NotificationsScreen from '../screens/Notifications';
import { BillsStackParamList, FriendsStackParamList, RootTabParamList, HomeStackParamList } from './types';
import QRCodeShareScreen from '../screens/QRCodeShare';
import QRCodeScanScreen from '../screens/QRCodeScan';
import OnboardingScreen, { isOnboardingComplete } from '../screens/Onboarding';

const PERSISTENCE_KEY = 'nav-state-v1';

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const BillsStack = createNativeStackNavigator<BillsStackParamList>();
const FriendsStack = createNativeStackNavigator<FriendsStackParamList>();

function BillsNavigator() {
  return (
    <BillsStack.Navigator>
      <BillsStack.Screen name="BillsHome" component={BillsScreen} options={{ title: 'Bills' }} />
      {/* Phase 2 routes */}
      <BillsStack.Screen name="BillDetails" component={TransactionDetailsScreen as any} options={{ title: 'Transaction' }} />
    </BillsStack.Navigator>
  );
}

function FriendsNavigator() {
  return (
    <FriendsStack.Navigator>
      <FriendsStack.Screen name="FriendsHome" component={FriendsScreen} options={{ title: 'Friends' }} />
      <FriendsStack.Screen name="FriendDetails" component={FriendsScreen} options={{ title: 'Friend' }} />
      {/* Phase 3 advanced entries */}
      <FriendsStack.Screen name="QRCodeShare" component={QRCodeShareScreen as any} options={{ title: 'My QR' }} />
      <FriendsStack.Screen name="QRCodeScan" component={QRCodeScanScreen as any} options={{ title: 'Scan QR' }} />
    </FriendsStack.Navigator>
  );
}

function TabsInner() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tab.Screen name="HomeTab" component={HomeNavigator} options={{ title: 'Home' }} />
      <Tab.Screen name="FriendsTab" component={FriendsNavigator} options={{ title: 'Friends' }} />
      <Tab.Screen name="SplitTab" component={SplitScreen} options={{ title: 'Split' }} />
      <Tab.Screen name="BillsTab" component={BillsNavigator} options={{ title: 'Bills' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
      {/* Phase 2 extra entry points through deep links or future menu */}
    </Tab.Navigator>
  );
}

// no-op

const linking: LinkingOptions<RootTabParamList> = {
  prefixes: ['biltip://', 'https://biltip.app'],
  config: {
    screens: {
      HomeTab: '',
      SplitTab: 'split',
      BillsTab: 'bills',
      FriendsTab: 'friends',
      ProfileTab: 'profile',
    },
  },
};

export default function RootNavigator() {
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    const restore = async () => {
      try {
        const saved = await AsyncStorage.getItem(PERSISTENCE_KEY);
        if (saved) setInitialState(JSON.parse(saved));
        setOnboarded(await isOnboardingComplete());
      } finally {
        setIsReady(true);
      }
    };
    restore();
  }, []);

  const onStateChange = useCallback((state: any) => {
    AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state)).catch(() => {});
  }, []);

  if (!isReady || onboarded === null) return null;

  return (
    <ThemeProvider>
      {onboarded ? (
        <InnerNav initialState={initialState as any} onStateChange={onStateChange} />
      ) : (
        <OnboardingScreen onDone={() => setOnboarded(true)} />
      )}
    </ThemeProvider>
  );
}

function InnerNav({ initialState, onStateChange }: { initialState: any; onStateChange: (s: any) => void }) {
  const { actualTheme, colors } = useTheme();
  const navTheme = useMemo(() => {
    const base = actualTheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      // Preserve all fields from the base theme (fonts, animation, etc.)
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        border: colors.border,
        card: colors.card,
        primary: colors.primary,
        text: colors.foreground,
      },
    } as typeof DefaultTheme;
  }, [actualTheme, colors]);

  return (
    <NavigationContainer linking={linking} initialState={initialState} onStateChange={onStateChange} theme={navTheme as any}>
      <TabsInner />
    </NavigationContainer>
  );
}
function HomeNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Home' }} />
      <HomeStack.Screen name="Pending" component={PendingScreen} options={{ title: 'Pending' }} />
      <HomeStack.Screen name="Transactions" component={TransactionsScreen} options={{ title: 'Transactions' }} />
      <HomeStack.Screen name="TransactionDetails" component={TransactionDetailsScreen as any} options={{ title: 'Transaction' }} />
      <HomeStack.Screen name="RecurringPayments" component={RecurringPaymentsScreen as any} options={{ title: 'Recurring' }} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen as any} options={{ title: 'Notifications' }} />
    </HomeStack.Navigator>
  );
}
import BottomTabBar from './BottomTabBar';
