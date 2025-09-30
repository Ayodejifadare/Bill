import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../config', () => ({
  useMockApi: false
}));

const apiClientMock = vi.fn();

vi.mock('../apiClient', () => ({
  apiClient: apiClientMock
}));

describe('contactsAPI.matchContacts', () => {
  beforeEach(() => {
    apiClientMock.mockReset();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
      window.localStorage.setItem(
        'biltip-app-settings',
        JSON.stringify({ region: 'NG', currency: 'NGN' })
      );
    }
  });

  it('normalizes local numbers and returns both existing and invite buckets', async () => {
    const { contactsAPI } = await import('../contacts-api');

    const contacts = [
      {
        id: 'c1',
        name: 'Alice',
        displayName: 'Alice',
        phoneNumbers: ['08012345678'],
        emails: []
      },
      {
        id: 'c2',
        name: 'Bob',
        displayName: 'Bob',
        phoneNumbers: ['08098765432'],
        emails: []
      }
    ];

    apiClientMock.mockImplementationOnce(async (_path: string, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body ?? '{}'));
      expect(payload.contacts).toHaveLength(2);
      expect(payload.contacts[0].phoneNumbers?.[0]).toBe('+2348012345678');

      return {
        contacts: [
          {
            id: 'user123',
            name: 'Alice',
            phone: '+2348012345678',
            status: 'existing_user',
            userId: 'user123',
            username: 'alice@example.com'
          }
        ]
      };
    });

    const results = await contactsAPI.matchContacts(contacts as any);

    expect(results).toHaveLength(2);

    const onBiltip = results.find(contact => contact.status === 'existing_user');
    const invite = results.find(contact => contact.status === 'not_on_app' && contact.id === 'c2');

    expect(onBiltip).toBeTruthy();
    expect(onBiltip?.phone).toBe('+2348012345678');
    expect(onBiltip?.name).toBe('Alice');

    expect(invite).toBeTruthy();
    expect(invite?.status).toBe('not_on_app');
  });
});

