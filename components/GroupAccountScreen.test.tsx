import { render, screen, waitFor, within, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GroupAccountScreen } from './GroupAccountScreen';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('./UserProfileContext', () => ({ useUserProfile: () => ({ appSettings: { region: 'US' } }) }));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GroupAccountScreen', () => {
  it('switches default account', async () => {
    let accounts = [
      {
        id: '1',
        name: 'Account1',
        type: 'bank' as const,
        bankName: 'Chase Bank',
        accountNumber: '1234567890',
        accountHolderName: 'A1',
        routingNumber: '021000021',
        accountType: 'checking' as const,
        isDefault: true,
        createdBy: 'A',
        createdDate: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        name: 'Account2',
        type: 'bank' as const,
        bankName: 'Chase Bank',
        accountNumber: '1234567891',
        accountHolderName: 'A2',
        routingNumber: '021000021',
        accountType: 'checking' as const,
        isDefault: false,
        createdBy: 'A',
        createdDate: '2024-01-02T00:00:00Z'
      }
    ];

    const fetchMock = vi.fn((url: any, options?: any) => {
      if (url === '/api/groups/1/accounts' && (!options || !options.method)) {
        return Promise.resolve({ ok: true, json: async () => ({ accounts }) } as Response);
      }
      if (url === '/api/groups/1/accounts/2' && options?.method === 'PUT') {
        accounts = accounts.map(a => ({ ...a, isDefault: a.id === '2' }));
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
      }
      return Promise.reject(new Error('unknown url'));
    });

    vi.spyOn(global, 'fetch').mockImplementation(fetchMock as any);

    render(<GroupAccountScreen groupId="1" onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Account1')).toBeInTheDocument());

    const button = screen.getByRole('button', { name: /Set as Default/i });
    const user = userEvent.setup();
    await user.click(button);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/groups/1/accounts/2', expect.objectContaining({ method: 'PUT' })));

    await waitFor(() => {
      const headerContainer = screen.getByText('Account2').closest('div')!.parentElement!.parentElement!;
      expect(within(headerContainer).getByText('Default')).toBeInTheDocument();
    });
  });

  it('deletes an account', async () => {
    let accounts = [
      {
        id: '1',
        name: 'Account1',
        type: 'bank' as const,
        bankName: 'Chase Bank',
        accountNumber: '1234567890',
        accountHolderName: 'A1',
        routingNumber: '021000021',
        accountType: 'checking' as const,
        isDefault: true,
        createdBy: 'A',
        createdDate: '2024-01-01T00:00:00Z'
      }
    ];

    const fetchMock = vi.fn((url: any, options?: any) => {
      if (url === '/api/groups/1/accounts' && (!options || !options.method)) {
        return Promise.resolve({ ok: true, json: async () => ({ accounts }) } as Response);
      }
      if (url === '/api/groups/1/accounts/1' && options?.method === 'DELETE') {
        accounts = [];
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
      }
      return Promise.reject(new Error('unknown url'));
    });

    vi.spyOn(global, 'fetch').mockImplementation(fetchMock as any);
    const user = userEvent.setup();

    render(<GroupAccountScreen groupId="1" onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Account1')).toBeInTheDocument());

    const del = screen
      .getAllByRole('button')
      .find(b => b.getAttribute('aria-label') === 'Delete account')!;
    await user.click(del);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/groups/1/accounts/1', { method: 'DELETE' })
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/groups/1/accounts')
    );
  });
});

