import type { Group } from '../hooks/useGroups';
import type { ExternalAccount } from '../utils/split-bill-api';

let groups: Group[] = [
  {
    id: '1',
    name: 'Weekend Trip',
    description: 'Friends getaway',
    memberCount: 3,
    totalSpent: 0,
    recentActivity: '',
    members: [],
    isAdmin: true,
    lastActive: new Date().toISOString(),
    pendingBills: 0,
    color: '#ff0000'
  }
];

const accounts: ExternalAccount[] = [
  {
    id: '1',
    name: 'Mock Bank',
    type: 'bank',
    bankName: 'Mock Bank',
    accountNumber: '12345678',
    accountHolderName: 'Mock User',
    routingNumber: '021000021',
    isDefault: true,
    createdBy: '1',
    createdDate: new Date().toISOString()
  }
];

export async function handle(path: string, init: RequestInit = {}) {
  if (path === '/groups' && (!init.method || init.method === 'GET')) {
    return { groups };
  }
  if (path === '/groups' && init.method === 'POST') {
    const body = init.body ? JSON.parse(init.body as string) : {};
    const newGroup: Group = {
      id: String(groups.length + 1),
      name: body.name,
      description: body.description,
      memberCount: body.memberIds?.length || 0,
      totalSpent: 0,
      recentActivity: '',
      members: [],
      isAdmin: true,
      lastActive: new Date().toISOString(),
      pendingBills: 0,
      color: body.color || '#000000'
    };
    groups.push(newGroup);
    return { group: newGroup };
  }
  if (/^\/groups\/[^/]+\/join$/.test(path)) {
    const groupId = path.split('/')[2];
    const group = groups.find(g => g.id === groupId);
    return { group };
  }
  if (/^\/groups\/[^/]+\/leave$/.test(path)) {
    const groupId = path.split('/')[2];
    groups = groups.filter(g => g.id !== groupId);
    return { success: true };
  }
  if (/^\/groups\/[^/]+\/accounts$/.test(path)) {
    return { accounts };
  }
  return null;
}
