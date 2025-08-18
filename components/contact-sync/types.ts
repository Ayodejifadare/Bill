export interface MatchedContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: 'existing_user' | 'not_on_app';
  userId?: string;
  username?: string;
  mutualFriends?: number;
  avatar?: string;
}

export interface ContactSyncScreenProps {
  onNavigate: (tab: string, data?: any) => void;
}

export type SyncStep = 'permission' | 'syncing' | 'results';
export type ActiveTab = 'on_app' | 'invite';

export interface ContactPermission {
  granted: boolean;
  userDenied?: boolean;
  message?: string;
}

export interface SyncProgress {
  step: number;
  total: number;
  message: string;
  percentage: number;
}