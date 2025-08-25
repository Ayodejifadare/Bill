import { useState, useReducer, Suspense, useCallback, memo, useEffect } from 'react';
import { lazy } from 'react';
import { UserProfileProvider } from './components/UserProfileContext';
import { BottomNavigation } from './components/BottomNavigation';
import { ThemeProvider } from './components/ThemeContext';
import { LoadingStateProvider } from './components/LoadingStateContext';
import { ErrorBoundary, PageErrorBoundary, CriticalErrorBoundary } from './components/ErrorBoundary';
import { NetworkErrorHandler, useNetworkStatus } from './components/NetworkErrorHandler';
import { PageLoading } from './components/ui/loading';
import { toast } from 'sonner';
import { saveAuth, loadAuth, clearAuth } from './utils/auth';
import { apiClient } from './utils/apiClient';

// Lazy load components for code splitting
const HomeScreen = lazy(() => import('./components/HomeScreen').then(m => ({ default: m.HomeScreen })));
const SendMoney = lazy(() => import('./components/SendMoney').then(m => ({ default: m.SendMoney })));
const SplitBill = lazy(() => import('./components/SplitBill').then(m => ({ default: m.SplitBill })));
const FriendsList = lazy(() => import('./components/FriendsList').then(m => ({ default: m.FriendsList })));
const BillsScreen = lazy(() => import('./components/BillsScreen').then(m => ({ default: m.BillsScreen })));
const ProfileScreen = lazy(() => import('./components/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const RequestMoney = lazy(() => import('./components/RequestMoney').then(m => ({ default: m.RequestMoney })));
const SettingsScreen = lazy(() => import('./components/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const NotificationsScreen = lazy(() => import('./components/NotificationsScreen').then(m => ({ default: m.NotificationsScreen })));
const LoginScreen = lazy(() => import('./components/LoginScreen').then(m => ({ default: m.LoginScreen })));
const RegisterScreen = lazy(() => import('./components/RegisterScreen').then(m => ({ default: m.RegisterScreen })));
const KycVerificationScreen = lazy(() => import('./components/KycVerificationScreen').then(m => ({ default: m.KycVerificationScreen })));

// Lazy load secondary screens
const AccountSettingsScreen = lazy(() => import('./components/AccountSettingsScreen').then(m => ({ default: m.AccountSettingsScreen })));
const PaymentMethodsScreen = lazy(() => import('./components/PaymentMethodsScreen').then(m => ({ default: m.PaymentMethodsScreen })));
const SecurityScreen = lazy(() => import('./components/SecurityScreen').then(m => ({ default: m.SecurityScreen })));
const TransactionDetailsScreen = lazy(() => import('./components/TransactionDetailsScreen').then(m => ({ default: m.TransactionDetailsScreen })));
const BillSplitDetailsScreen = lazy(() => import('./components/BillSplitDetailsScreen').then(m => ({ default: m.BillSplitDetailsScreen })));
const EditBillSplitScreen = lazy(() => import('./components/EditBillSplitScreen').then(m => ({ default: m.EditBillSplitScreen })));
const BillPaymentScreen = lazy(() => import('./components/BillPaymentScreen').then(m => ({ default: m.BillPaymentScreen })));
const UpcomingPaymentsScreen = lazy(() => import('./components/UpcomingPaymentsScreen').then(m => ({ default: m.UpcomingPaymentsScreen })));
const PaymentFlowScreen = lazy(() => import('./components/PaymentFlowScreen').then(m => ({ default: m.PaymentFlowScreen })));
const TransactionHistoryScreen = lazy(() => import('./components/TransactionHistoryScreen').then(m => ({ default: m.TransactionHistoryScreen })));
const SpendingInsightsScreen = lazy(() => import('./components/SpendingInsightsScreen').then(m => ({ default: m.SpendingInsightsScreen })));

// Lazy load group-related screens
const CreateGroupScreen = lazy(() => import('./components/CreateGroupScreen').then(m => ({ default: m.CreateGroupScreen })));
const GroupDetailsScreen = lazy(() => import('./components/GroupDetailsScreen').then(m => ({ default: m.GroupDetailsScreen })));
const GroupAccountScreen = lazy(() => import('./components/GroupAccountScreen').then(m => ({ default: m.GroupAccountScreen })));
const GroupMembersScreen = lazy(() => import('./components/GroupMembersScreen').then(m => ({ default: m.GroupMembersScreen })));
const AddGroupMemberScreen = lazy(() => import('./components/AddGroupMemberScreen').then(m => ({ default: m.AddGroupMemberScreen })));
const MemberInviteScreen = lazy(() => import('./components/MemberInviteScreen').then(m => ({ default: m.MemberInviteScreen })));

// Lazy load friend-related screens
const SendReminderScreen = lazy(() => import('./components/SendReminderScreen').then(m => ({ default: m.SendReminderScreen })));
const FriendProfileScreen = lazy(() => import('./components/FriendProfileScreen').then(m => ({ default: m.FriendProfileScreen })));
const AddFriendScreen = lazy(() => import('./components/AddFriendScreen').then(m => ({ default: m.AddFriendScreen })));
const ContactSyncScreen = lazy(() => import('./components/ContactSyncScreen').then(m => ({ default: m.ContactSyncScreen })));

// Lazy load remaining screens
const RecurringPaymentsScreen = lazy(() => import('./components/RecurringPaymentsScreen').then(m => ({ default: m.RecurringPaymentsScreen })));
const SetupRecurringPaymentScreen = lazy(() => import('./components/SetupRecurringPaymentScreen').then(m => ({ default: m.SetupRecurringPaymentScreen })));
const VirtualAccountScreen = lazy(() => import('./components/VirtualAccountScreen').then(m => ({ default: m.VirtualAccountScreen })));
const BankingRedirectScreen = lazy(() => import('./components/BankingRedirectScreen').then(m => ({ default: m.BankingRedirectScreen })));
const PaymentConfirmationScreen = lazy(() => import('./components/PaymentConfirmationScreen').then(m => ({ default: m.PaymentConfirmationScreen })));
const SettlementScreen = lazy(() => import('./components/SettlementScreen').then(m => ({ default: m.SettlementScreen })));

// Navigation state management using useReducer
interface NavigationState {
  activeTab: string;
  selectedTransactionId: string | null;
  selectedBillSplitId: string | null;
  editBillSplitId: string | null;
  payBillId: string | null;
  paymentRequest: any;
  selectedFriendId: string | null;
  currentGroupId: string | null;
  groupNavigationContext: string | null;
  recurringPaymentId: string | null;
  recurringPaymentEditMode: boolean;
  bankingRedirectData: any;
  paymentConfirmationData: any;
  settlementBillSplitId: string | null;
  requestMoneyData: any;
  sendMoneyData: any;
  reminderData: any;
}

type NavigationAction = 
  | { type: 'SET_TAB'; payload: string }
  | { type: 'SET_TRANSACTION_ID'; payload: string | null }
  | { type: 'SET_BILL_SPLIT_ID'; payload: string | null }
  | { type: 'SET_EDIT_BILL_SPLIT_ID'; payload: string | null }
  | { type: 'SET_PAY_BILL_ID'; payload: string | null }
  | { type: 'SET_PAYMENT_REQUEST'; payload: any }
  | { type: 'SET_FRIEND_ID'; payload: string | null }
  | { type: 'SET_GROUP_ID'; payload: string | null }
  | { type: 'SET_GROUP_CONTEXT'; payload: string | null }
  | { type: 'SET_RECURRING_PAYMENT'; payload: { id: string | null; editMode: boolean } }
  | { type: 'SET_BANKING_REDIRECT'; payload: any }
  | { type: 'SET_PAYMENT_CONFIRMATION'; payload: any }
  | { type: 'SET_SETTLEMENT_ID'; payload: string | null }
  | { type: 'SET_REQUEST_DATA'; payload: any }
  | { type: 'SET_SEND_DATA'; payload: any }
  | { type: 'SET_REMINDER_DATA'; payload: any }
  | { type: 'CLEAR_ALL' }
  | { type: 'CLEAR_PREVIOUS_STATE'; payload: string };

const initialState: NavigationState = {
  activeTab: 'home',
  selectedTransactionId: null,
  selectedBillSplitId: null,
  editBillSplitId: null,
  payBillId: null,
  paymentRequest: null,
  selectedFriendId: null,
  currentGroupId: null,
  groupNavigationContext: null,
  recurringPaymentId: null,
  recurringPaymentEditMode: false,
  bankingRedirectData: null,
  paymentConfirmationData: null,
  settlementBillSplitId: null,
  requestMoneyData: null,
  sendMoneyData: null,
  reminderData: null,
};

const navigationReducer = (state: NavigationState, action: NavigationAction): NavigationState => {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_TRANSACTION_ID':
      return { ...state, selectedTransactionId: action.payload };
    case 'SET_BILL_SPLIT_ID':
      return { ...state, selectedBillSplitId: action.payload };
    case 'SET_EDIT_BILL_SPLIT_ID':
      return { ...state, editBillSplitId: action.payload };
    case 'SET_PAY_BILL_ID':
      return { ...state, payBillId: action.payload };
    case 'SET_PAYMENT_REQUEST':
      return { ...state, paymentRequest: action.payload };
    case 'SET_FRIEND_ID':
      return { ...state, selectedFriendId: action.payload };
    case 'SET_GROUP_ID':
      return { ...state, currentGroupId: action.payload };
    case 'SET_GROUP_CONTEXT':
      return { ...state, groupNavigationContext: action.payload };
    case 'SET_RECURRING_PAYMENT':
      return { 
        ...state, 
        recurringPaymentId: action.payload.id,
        recurringPaymentEditMode: action.payload.editMode
      };
    case 'SET_BANKING_REDIRECT':
      return { ...state, bankingRedirectData: action.payload };
    case 'SET_PAYMENT_CONFIRMATION':
      return { ...state, paymentConfirmationData: action.payload };
    case 'SET_SETTLEMENT_ID':
      return { ...state, settlementBillSplitId: action.payload };
    case 'SET_REQUEST_DATA':
      return { ...state, requestMoneyData: action.payload };
    case 'SET_SEND_DATA':
      return { ...state, sendMoneyData: action.payload };
    case 'SET_REMINDER_DATA':
      return { ...state, reminderData: action.payload };
    case 'CLEAR_ALL':
      return initialState;
    case 'CLEAR_PREVIOUS_STATE':
      // Clear state based on previous tab
      const newState = { ...state };
      const previousTab = action.payload;
      
      switch (previousTab) {
        case 'transaction-details':
          newState.selectedTransactionId = null;
          break;
        case 'bill-split-details':
          newState.selectedBillSplitId = null;
          break;
        case 'edit-bill-split':
          newState.editBillSplitId = null;
          break;
        case 'pay-bill':
          newState.payBillId = null;
          break;
        case 'payment-flow':
          newState.paymentRequest = null;
          break;
        case 'friend-profile':
          newState.selectedFriendId = null;
          break;
        case 'request':
          newState.requestMoneyData = null;
          break;
        case 'send':
          newState.sendMoneyData = null;
          break;
        case 'send-reminder':
          newState.reminderData = null;
          break;
        case 'recurring-payments':
        case 'setup-recurring-payment':
          newState.recurringPaymentId = null;
          newState.recurringPaymentEditMode = false;
          break;
        case 'banking-redirect':
          newState.bankingRedirectData = null;
          break;
        case 'payment-confirmation':
          newState.paymentConfirmationData = null;
          break;
        case 'settlement':
          newState.settlementBillSplitId = null;
          break;
      }
      return newState;
    default:
      return state;
  }
};

// Memoized loading component
const MemoizedPageLoading = memo(PageLoading);

// Performance monitoring hook
const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Performance observer for monitoring navigation timing
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            console.log('Navigation timing:', entry);
          } else if (entry.entryType === 'measure') {
            console.log('Custom measure:', entry);
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation', 'measure'] });
      
      return () => observer.disconnect();
    }
  }, []);
};

function AppContent() {
  const [navState, dispatch] = useReducer(navigationReducer, initialState);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Performance monitoring
  usePerformanceMonitoring();
  
  // Network status for connection-aware features
  const networkStatus = useNetworkStatus();

  // Check for existing authentication on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check for stored authentication token/session
        const stored = loadAuth();

        if (stored) {
          // Validate stored session (in real app, this would make an API call)
          const { auth, user } = stored;

          // Simple validation - in production, verify token with backend
          if (auth.token && auth.expiresAt > Date.now()) {
            setIsAuthenticated(true);
            console.log('Restored user session:', user.name);
          } else {
            // Clear invalid session
            clearAuth();
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Clear potentially corrupted data
        clearAuth();
      } finally {
        setIsInitializing(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Memoized navigation handler
  const handleNavigate = useCallback((tab: string, data?: any) => {
    try {
      performance.mark('navigation-start');
      
      console.log('Navigation:', tab, data);
      
      // Clear previous state
      dispatch({ type: 'CLEAR_PREVIOUS_STATE', payload: navState.activeTab });
      
      // Handle navigation with data
      if (data) {
        switch (tab) {
          case 'transaction-details':
            if (data.transactionId) {
              dispatch({ type: 'SET_TRANSACTION_ID', payload: data.transactionId });
            }
            break;
          case 'bill-split-details':
            if (data.billSplitId) {
              dispatch({ type: 'SET_BILL_SPLIT_ID', payload: data.billSplitId });
            }
            break;
          case 'edit-bill-split':
            if (data.billSplitId) {
              dispatch({ type: 'SET_EDIT_BILL_SPLIT_ID', payload: data.billSplitId });
            }
            break;
          case 'pay-bill':
            if (data.billId) {
              dispatch({ type: 'SET_PAY_BILL_ID', payload: data.billId });
            }
            break;
          case 'payment-flow':
            if (data.paymentRequest?.billSplitId) {
              dispatch({ type: 'SET_PAY_BILL_ID', payload: data.paymentRequest.billSplitId });
              dispatch({ type: 'SET_TAB', payload: 'pay-bill' });
              return;
            }
            dispatch({ type: 'SET_PAYMENT_REQUEST', payload: data.paymentRequest });
            break;
          case 'friend-profile':
            if (data.friendId) {
              dispatch({ type: 'SET_FRIEND_ID', payload: data.friendId });
            }
            break;
          case 'group-details':
          case 'group-account':
          case 'bills':
          case 'split':
          case 'virtual-account':
            if (data.groupId) {
              dispatch({ type: 'SET_GROUP_ID', payload: data.groupId });
              dispatch({ type: 'SET_GROUP_CONTEXT', payload: tab });
            }
            break;
          case 'setup-recurring-payment':
            dispatch({ 
              type: 'SET_RECURRING_PAYMENT', 
              payload: { 
                id: data.paymentId || null, 
                editMode: data.editMode || false 
              }
            });
            break;
          case 'banking-redirect':
            if (data.paymentRequest && data.method) {
              dispatch({ type: 'SET_BANKING_REDIRECT', payload: data });
            }
            break;
          case 'payment-confirmation':
            if (data.paymentRequest && data.status) {
              dispatch({ type: 'SET_PAYMENT_CONFIRMATION', payload: data });
            }
            break;
          case 'settlement':
            if (data.billSplitId) {
              dispatch({ type: 'SET_SETTLEMENT_ID', payload: data.billSplitId });
            }
            break;
          case 'request':
            if (data.requestData) {
              dispatch({ type: 'SET_REQUEST_DATA', payload: data.requestData });
            }
            break;
          case 'send':
            dispatch({ type: 'SET_SEND_DATA', payload: data });
            break;
          case 'send-reminder':
            dispatch({ type: 'SET_REMINDER_DATA', payload: data });
            break;
        }
      }
      
      dispatch({ type: 'SET_TAB', payload: tab });
      
      performance.mark('navigation-end');
      performance.measure('navigation-duration', 'navigation-start', 'navigation-end');
      
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('Navigation failed. Please try again.');
      
      if (tab !== 'home') {
        dispatch({ type: 'SET_TAB', payload: 'home' });
      }
    }
  }, [navState.activeTab]);

  // Memoized group navigation handler
  const handleGroupNavigation = useCallback((screen: string, groupId?: string, additionalData?: any) => {
    try {
      const targetGroupId = groupId || navState.currentGroupId;
      if (targetGroupId) {
        handleNavigate(screen, { groupId: targetGroupId, ...additionalData });
      } else {
        console.warn('No group ID available for group navigation');
        toast.error('Group information not available');
      }
    } catch (error) {
      console.error('Group navigation error:', error);
      toast.error('Group navigation failed');
    }
  }, [navState.currentGroupId, handleNavigate]);

  const handleLogin = useCallback((authResponse?: any) => {
    try {
      setIsInitializing(true);

      const token = authResponse?.token;
      const user = authResponse?.user || {};
      if (!token) {
        throw new Error('No token received');
      }

      const authData = {
        token,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        loginTime: new Date().toISOString(),
      };

      saveAuth({ auth: authData, user });

      setIsAuthenticated(true);
      dispatch({ type: 'SET_TAB', payload: 'home' });
      toast.success(`Welcome to Biltip, ${user.name || 'User'}!`);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const handleRegister = useCallback(async (userData?: any) => {
    try {
      setIsInitializing(true);

      const data = await apiClient('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const token = data?.token;
      const user = data?.user;
      if (!token || !user) {
        throw new Error('Invalid registration response');
      }

      const authData = {
        token,
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        loginTime: new Date().toISOString(),
        isNewUser: true,
      };

      saveAuth({ auth: authData, user });

      setIsAuthenticated(true);
      dispatch({ type: 'SET_TAB', payload: 'home' });
      toast.success(`Welcome to Biltip, ${user.name}! Account created successfully.`);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await apiClient('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }

    try {
      // Clear stored authentication data
      clearAuth();
      localStorage.removeItem('biltip_contacts_synced');

      // Reset app state
      setIsAuthenticated(false);
      setShowLogin(true);
      dispatch({ type: 'CLEAR_ALL' });

      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  }, []);

  // Show loading during initialization
  if (isInitializing) {
    return <MemoizedPageLoading message="Loading Biltip..." />;
  }

  // Show authentication screens if not logged in
  if (!isAuthenticated) {
    if (showLogin) {
      return (
        <div className="min-h-screen bg-background">
          <PageErrorBoundary onRetry={() => window.location.reload()}>
            <Suspense fallback={<MemoizedPageLoading />}>
              <LoginScreen 
                onLogin={handleLogin}
                onShowRegister={() => setShowLogin(false)}
              />
            </Suspense>
          </PageErrorBoundary>
        </div>
      );
    } else {
      return (
        <div className="min-h-screen bg-background">
          <PageErrorBoundary onRetry={() => window.location.reload()}>
            <Suspense fallback={<MemoizedPageLoading />}>
              <RegisterScreen 
                onRegister={handleRegister}
                onShowLogin={() => setShowLogin(true)}
              />
            </Suspense>
          </PageErrorBoundary>
        </div>
      );
    }
  }

  const renderContent = () => {
    try {
      switch (navState.activeTab) {
        case 'home':
          return <HomeScreen onNavigate={handleNavigate} />;
        case 'friends':
          return <FriendsList onNavigate={handleNavigate} />;
        case 'split':
          return <SplitBill onNavigate={handleNavigate} groupId={navState.currentGroupId} />;
        case 'bills':
          return <BillsScreen onNavigate={handleNavigate} groupId={navState.currentGroupId} />;
        case 'profile':
          return <ProfileScreen onNavigate={handleNavigate} onLogout={handleLogout} />;
        case 'send':
          return <SendMoney onNavigate={handleNavigate} prefillData={navState.sendMoneyData} />;
        case 'request':
          return <RequestMoney onNavigate={handleNavigate} prefillData={navState.requestMoneyData} />;
        case 'settings':
          return <SettingsScreen onNavigate={handleNavigate} />;
        case 'notifications':
          return <NotificationsScreen onNavigate={handleNavigate} />;
        case 'account-settings':
          return <AccountSettingsScreen onNavigate={handleNavigate} />;
        case 'payment-methods':
          return <PaymentMethodsScreen onNavigate={handleNavigate} />;
        case 'security':
          return <SecurityScreen onNavigate={handleNavigate} />;
        case 'kyc-verification':
          return <KycVerificationScreen onNavigate={handleNavigate} />;
        case 'transaction-details':
          return <TransactionDetailsScreen transactionId={navState.selectedTransactionId} onNavigate={handleNavigate} />;
        case 'bill-split-details':
          return <BillSplitDetailsScreen billSplitId={navState.selectedBillSplitId} onNavigate={handleNavigate} />;
        case 'edit-bill-split':
          return <EditBillSplitScreen billSplitId={navState.editBillSplitId} onNavigate={handleNavigate} />;
        case 'pay-bill':
          return <BillPaymentScreen billId={navState.payBillId} onNavigate={handleNavigate} />;
        case 'upcoming-payments':
          return <UpcomingPaymentsScreen onNavigate={handleNavigate} />;
        case 'payment-flow':
          return <PaymentFlowScreen paymentRequest={navState.paymentRequest} onNavigate={handleNavigate} />;
        case 'transaction-history':
          return <TransactionHistoryScreen onNavigate={handleNavigate} />;
        case 'spending-insights':
          return <SpendingInsightsScreen onNavigate={handleNavigate} />;
        case 'create-group':
          return <CreateGroupScreen onNavigate={handleNavigate} />;
        case 'group-details':
          return <GroupDetailsScreen groupId={navState.currentGroupId} onNavigate={handleNavigate} onGroupNavigation={handleGroupNavigation} />;
        case 'group-account':
          return <GroupAccountScreen groupId={navState.currentGroupId} onNavigate={handleNavigate} />;
        case 'send-reminder':
          return <SendReminderScreen 
            onNavigate={handleNavigate}
            billSplitId={navState.reminderData?.billSplitId}
            paymentType={navState.reminderData?.paymentType}
            friendId={navState.reminderData?.friendId}
            friendName={navState.reminderData?.friendName}
            amount={navState.reminderData?.amount}
          />;
        case 'friend-profile':
          return <FriendProfileScreen friendId={navState.selectedFriendId} onNavigate={handleNavigate} />;
        case 'add-friend':
          return <AddFriendScreen onNavigate={handleNavigate} />;
        case 'contact-sync':
          return <ContactSyncScreen onNavigate={handleNavigate} />;
        case 'group-members':
          return <GroupMembersScreen groupId={navState.currentGroupId} onNavigate={handleNavigate} />;
        case 'add-group-member':
          return <AddGroupMemberScreen groupId={navState.currentGroupId} onNavigate={handleNavigate} />;
        case 'member-invites':
          return <MemberInviteScreen groupId={navState.currentGroupId} onNavigate={handleNavigate} />;
        case 'recurring-payments':
          return <RecurringPaymentsScreen onNavigate={handleNavigate} />;
        case 'setup-recurring-payment':
          return <SetupRecurringPaymentScreen 
            onNavigate={handleNavigate}
            paymentId={navState.recurringPaymentId}
            editMode={navState.recurringPaymentEditMode}
          />;
        case 'virtual-account':
          return <VirtualAccountScreen groupId={navState.currentGroupId} onNavigate={handleNavigate} />;
        case 'banking-redirect':
          return <BankingRedirectScreen 
            paymentRequest={navState.bankingRedirectData?.paymentRequest || null}
            method={navState.bankingRedirectData?.method || null}
            onNavigate={handleNavigate}
          />;
        case 'payment-confirmation':
          return <PaymentConfirmationScreen 
            paymentRequest={navState.paymentConfirmationData?.paymentRequest || null}
            method={navState.paymentConfirmationData?.method}
            status={navState.paymentConfirmationData?.status || 'unknown'}
            onNavigate={handleNavigate}
          />;
        case 'settlement':
          return <SettlementScreen onNavigate={handleNavigate} billSplitId={navState.settlementBillSplitId} />;
        default:
          console.warn(`Unknown navigation tab: ${navState.activeTab}`);
          return <HomeScreen onNavigate={handleNavigate} />;
      }
    } catch (error) {
      console.error('Error rendering content for tab:', navState.activeTab, error);
      throw error;
    }
  };

  // Determine if bottom navigation should be shown
  const showBottomNav = isAuthenticated && ['home', 'friends', 'split', 'bills', 'profile'].includes(navState.activeTab);
  
  // Determine if padding should be applied
  const screensThatNeedPadding = new Set(['friends', 'split', 'bills', 'profile']);
  const applyPadding = isAuthenticated && screensThatNeedPadding.has(navState.activeTab);

  return (
    <div className="min-h-screen bg-background">
      {/* Network Status Indicator */}
      <NetworkErrorHandler 
        showStatus={false}
        autoRetry={false}
        className="fixed top-0 left-0 right-0 z-50"
      />

      {/* Main Content */}
      <main className="max-w-md mx-auto bg-background" style={{ 
        minHeight: '100vh',
        paddingBottom: showBottomNav ? '80px' : '0'
      }}>
        <div className={applyPadding ? "px-4 py-4" : ""}>
          <ErrorBoundary 
            level="page" 
            onRetry={() => window.location.reload()}
            onError={(error, errorInfo) => {
              console.error('App-level error:', { error, errorInfo });
            }}
          >
            <Suspense fallback={<MemoizedPageLoading />}>
              <PageErrorBoundary onRetry={() => handleNavigate(navState.activeTab)}>
                {renderContent()}
              </PageErrorBoundary>
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <ErrorBoundary level="component" showHomeButton={false}>
          <BottomNavigation activeTab={navState.activeTab} onTabChange={handleNavigate} />
        </ErrorBoundary>
      )}
    </div>
  );
}

const MemoizedAppContent = memo(AppContent);

export default function App() {
  return (
    <CriticalErrorBoundary>
      <ThemeProvider defaultTheme="system">
        <LoadingStateProvider>
          <UserProfileProvider>
            <MemoizedAppContent />
          </UserProfileProvider>
        </LoadingStateProvider>
      </ThemeProvider>
    </CriticalErrorBoundary>
  );
}