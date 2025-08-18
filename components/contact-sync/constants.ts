import { MatchedContact } from './types';

export const mockMatchedContacts: MatchedContact[] = [
  {
    id: 'c1',
    name: 'John Smith',
    phone: '+1234567890',
    email: 'john@example.com',
    status: 'existing_user',
    userId: 'u1',
    username: '@john_s',
    mutualFriends: 2
  },
  {
    id: 'c2',
    name: 'Lisa Chen',
    phone: '+1234567891',
    email: 'lisa@example.com',
    status: 'existing_user',
    userId: 'u2',
    username: '@lisa_c',
    mutualFriends: 0
  },
  {
    id: 'c3',
    name: 'Michael Johnson',
    phone: '+1234567892',
    email: 'michael@example.com',
    status: 'not_on_app'
  },
  {
    id: 'c4',
    name: 'Sarah Wilson',
    phone: '+1234567893',
    status: 'not_on_app'
  },
  {
    id: 'c5',
    name: 'David Brown',
    phone: '+1234567894',
    email: 'david@example.com',
    status: 'not_on_app'
  }
];

export const WHATSAPP_INVITE_MESSAGE = (contactName: string) => 
  `Hi ${contactName}! I'm using Biltip to easily split bills and manage group expenses. Want to join me? It makes splitting costs so much simpler! 💰✨`;