import { NavigatorScreenParams } from '@react-navigation/native';

export type RootTabParamList = {
  HomeTab: undefined;
  BillsTab: undefined;
  FriendsTab: undefined;
  ProfileTab: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  TransactionDetails: { id: string } | undefined;
  RecurringPayments: undefined;
  Notifications: undefined;
};

export type BillsStackParamList = {
  BillsHome: undefined;
  BillDetails: { id: string } | undefined;
};

export type FriendsStackParamList = {
  FriendsHome: undefined;
  FriendDetails: { id: string } | undefined;
  QRCodeShare: undefined;
  QRCodeScan: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList>;
};
