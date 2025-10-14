import React, { createContext, useContext, useReducer, type ReactNode } from 'react';

interface LoadingState {
  [key: string]: { isLoading: boolean; error: string | null; lastUpdated: number; retryCount: number };
}
interface LoadingAction {
  type: 'START_LOADING' | 'STOP_LOADING' | 'SET_ERROR' | 'CLEAR_ERROR' | 'INCREMENT_RETRY' | 'RESET_STATE';
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
  withLoading: <T>(key: string, asyncOperation: () => Promise<T>) => Promise<T>;
}

const LoadingStateContext = createContext<LoadingContextValue | undefined>(undefined);

const loadingReducer = (state: LoadingState, action: LoadingAction): LoadingState => {
  const { key } = action;
  const current = state[key] || { isLoading: false, error: null, lastUpdated: 0, retryCount: 0 };
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, [key]: { ...current, isLoading: true, error: null, lastUpdated: Date.now() } };
    case 'STOP_LOADING':
      return { ...state, [key]: { ...current, isLoading: false, lastUpdated: Date.now() } };
    case 'SET_ERROR':
      return { ...state, [key]: { ...current, isLoading: false, error: action.error || null, lastUpdated: Date.now() } };
    case 'CLEAR_ERROR':
      return { ...state, [key]: { ...current, error: null, lastUpdated: Date.now() } };
    case 'INCREMENT_RETRY':
      return { ...state, [key]: { ...current, retryCount: current.retryCount + 1, lastUpdated: Date.now() } };
    case 'RESET_STATE':
      return { ...state, [key]: { isLoading: false, error: null, lastUpdated: Date.now(), retryCount: 0 } };
    default:
      return state;
  }
};

export const LoadingStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loadingStates, dispatch] = useReducer(loadingReducer, {});
  const setLoading = (key: string, isLoading: boolean) => dispatch({ type: isLoading ? 'START_LOADING' : 'STOP_LOADING', key });
  const setError = (key: string, error: string | null | undefined) => dispatch({ type: 'SET_ERROR', key, error });
  const clearError = (key: string) => dispatch({ type: 'CLEAR_ERROR', key });
  const incrementRetry = (key: string) => dispatch({ type: 'INCREMENT_RETRY', key });
  const resetState = (key: string) => dispatch({ type: 'RESET_STATE', key });
  const isLoading = (key: string) => loadingStates[key]?.isLoading || false;
  const getError = (key: string) => (loadingStates[key]?.error ?? undefined) || undefined;
  const getRetryCount = (key: string) => loadingStates[key]?.retryCount || 0;
  const withLoading = async <T,>(key: string, op: () => Promise<T>) => {
    try {
      setLoading(key, true);
      clearError(key);
      const res = await op();
      setLoading(key, false);
      return res;
    } catch (e) {
      setError(key, e instanceof Error ? e.message : 'Unexpected error');
      throw e;
    }
  };
  return (
    <LoadingStateContext.Provider value={{ loadingStates, setLoading, setError, clearError, incrementRetry, resetState, isLoading, getError, getRetryCount, withLoading }}>
      {children}
    </LoadingStateContext.Provider>
  );
};

export function useLoadingState() {
  const ctx = useContext(LoadingStateContext);
  if (!ctx) throw new Error('useLoadingState must be used within LoadingStateProvider');
  return ctx;
}

