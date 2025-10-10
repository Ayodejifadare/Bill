import { createContext, useContext, useReducer, type ReactNode } from "react";

// Loading state types
interface LoadingState {
  [key: string]: {
    isLoading: boolean;
    error: string | null;
    lastUpdated: number;
    retryCount: number;
  };
}

interface LoadingAction {
  type:
    | "START_LOADING"
    | "STOP_LOADING"
    | "SET_ERROR"
    | "CLEAR_ERROR"
    | "INCREMENT_RETRY"
    | "RESET_STATE";
  key: string;
  error?: string | null;
}

interface LoadingContextValue {
  loadingStates: LoadingState;
  setLoading: (key: string, isLoading: boolean) => void;
  setError: (key: string, error: string | null | undefined) => void;
  clearError: (key: string) => void;
  incrementRetry: (key: string) => void;
  resetState: (key: string) => void;
  isLoading: (key: string) => boolean;
  getError: (key: string) => string | undefined;
  getRetryCount: (key: string) => number;
  // Convenience methods
  withLoading: <T>(key: string, asyncOperation: () => Promise<T>) => Promise<T>;
}

const LoadingStateContext = createContext<LoadingContextValue | undefined>(
  undefined,
);

// Reducer to manage loading states
const loadingReducer = (
  state: LoadingState,
  action: LoadingAction,
): LoadingState => {
  const { key } = action;
  const currentState = state[key] || {
    isLoading: false,
    error: null,
    lastUpdated: 0,
    retryCount: 0,
  };

  switch (action.type) {
    case "START_LOADING":
      return {
        ...state,
        [key]: {
          ...currentState,
          isLoading: true,
          error: null,
          lastUpdated: Date.now(),
        },
      };

    case "STOP_LOADING":
      return {
        ...state,
        [key]: {
          ...currentState,
          isLoading: false,
          lastUpdated: Date.now(),
        },
      };

    case "SET_ERROR":
      return {
        ...state,
        [key]: {
          ...currentState,
          isLoading: false,
          error: action.error || null,
          lastUpdated: Date.now(),
        },
      };

    case "CLEAR_ERROR":
      return {
        ...state,
        [key]: {
          ...currentState,
          error: null,
          lastUpdated: Date.now(),
        },
      };

    case "INCREMENT_RETRY":
      return {
        ...state,
        [key]: {
          ...currentState,
          retryCount: currentState.retryCount + 1,
          lastUpdated: Date.now(),
        },
      };

    case "RESET_STATE":
      return {
        ...state,
        [key]: {
          isLoading: false,
          error: null,
          lastUpdated: Date.now(),
          retryCount: 0,
        },
      };

    default:
      return state;
  }
};

// Provider component
export const LoadingStateProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [loadingStates, dispatch] = useReducer(loadingReducer, {});

  const setLoading = (key: string, isLoading: boolean) => {
    dispatch({
      type: isLoading ? "START_LOADING" : "STOP_LOADING",
      key,
    });
  };

  const setError = (key: string, error: string | null | undefined) => {
    dispatch({ type: "SET_ERROR", key, error });
  };

  const clearError = (key: string) => {
    dispatch({ type: "CLEAR_ERROR", key });
  };

  const incrementRetry = (key: string) => {
    dispatch({ type: "INCREMENT_RETRY", key });
  };

  const resetState = (key: string) => {
    dispatch({ type: "RESET_STATE", key });
  };

  const isLoading = (key: string) => {
    return loadingStates[key]?.isLoading || false;
  };

  const getError = (key: string) => {
    const e = loadingStates[key]?.error;
    return e === null ? undefined : (e ?? undefined);
  };

  const getRetryCount = (key: string) => {
    return loadingStates[key]?.retryCount || 0;
  };

  // Convenience method to wrap async operations
  const withLoading = async <T,>(
    key: string,
    asyncOperation: () => Promise<T>,
  ): Promise<T> => {
    try {
      setLoading(key, true);
      clearError(key);
      const result = await asyncOperation();
      setLoading(key, false);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(key, errorMessage);
      throw error;
    }
  };

  const contextValue: LoadingContextValue = {
    loadingStates,
    setLoading,
    setError,
    clearError,
    incrementRetry,
    resetState,
    isLoading,
    getError,
    getRetryCount,
    withLoading,
  };

  return (
    <LoadingStateContext.Provider value={contextValue}>
      {children}
    </LoadingStateContext.Provider>
  );
};

// Hook to use loading state
export const useLoadingState = () => {
  const context = useContext(LoadingStateContext);
  if (context === undefined) {
    throw new Error(
      "useLoadingState must be used within a LoadingStateProvider",
    );
  }
  return context;
};

// Hook for specific loading key
export const useLoading = (key: string) => {
  const {
    isLoading,
    getError,
    setLoading,
    setError,
    clearError,
    incrementRetry,
    resetState,
    withLoading,
  } = useLoadingState();

  return {
    isLoading: isLoading(key),
    error: getError(key),
    setLoading: (loading: boolean) => setLoading(key, loading),
    setError: (error: string | null | undefined) => setError(key, error),
    clearError: () => clearError(key),
    incrementRetry: () => incrementRetry(key),
    resetState: () => resetState(key),
    withLoading: <T,>(operation: () => Promise<T>) =>
      withLoading(key, operation),
  };
};

// Common loading keys for consistency
export const LoadingKeys = {
  // Authentication
  LOGIN: "auth.login",
  REGISTER: "auth.register",
  LOGOUT: "auth.logout",

  // User Profile
  PROFILE_LOAD: "profile.load",
  PROFILE_UPDATE: "profile.update",

  // Payments
  PAYMENT_SEND: "payment.send",
  PAYMENT_REQUEST: "payment.request",
  PAYMENT_CONFIRM: "payment.confirm",

  // Bill Splits
  BILL_SPLIT_CREATE: "billSplit.create",
  BILL_SPLIT_UPDATE: "billSplit.update",
  BILL_SPLIT_DELETE: "billSplit.delete",
  BILL_SPLIT_SETTLE: "billSplit.settle",

  // Friends
  FRIENDS_LOAD: "friends.load",
  FRIEND_ADD: "friend.add",
  FRIEND_REMOVE: "friend.remove",

  // Groups
  GROUPS_LOAD: "groups.load",
  GROUP_CREATE: "group.create",
  GROUP_UPDATE: "group.update",
  GROUP_DELETE: "group.delete",
  GROUP_JOIN: "group.join",
  GROUP_LEAVE: "group.leave",

  // Transactions
  TRANSACTIONS_LOAD: "transactions.load",
  TRANSACTION_DETAILS: "transaction.details",

  // Contact Sync
  CONTACTS_SYNC: "contacts.sync",
  CONTACTS_IMPORT: "contacts.import",

  // Banking
  BANK_VERIFY: "bank.verify",
  BANK_CONNECT: "bank.connect",

  // Recurring Payments
  RECURRING_CREATE: "recurring.create",
  RECURRING_UPDATE: "recurring.update",
  RECURRING_DELETE: "recurring.delete",

  // General
  DATA_REFRESH: "data.refresh",
  NETWORK_REQUEST: "network.request",
} as const;
