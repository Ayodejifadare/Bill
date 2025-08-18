import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AddGroupMemberScreen } from './AddGroupMemberScreen';
import { contactsAPI } from '../utils/contacts-api';
import { toast } from 'sonner';

vi.mock('../utils/contacts-api', () => ({
  contactsAPI: {
    isSupported: () => true,
    requestPermission: vi.fn(),
    getContacts: vi.fn(),
    checkPermissionStatus: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

afterEach(() => {
  vi.clearAllMocks();
  (global.fetch as any)?.mockClear?.();
  localStorage.clear();
});

describe('AddGroupMemberScreen', () => {
  it('handles permission denied', async () => {
    (contactsAPI.checkPermissionStatus as any).mockResolvedValue({ granted: false, denied: false });
    (contactsAPI.requestPermission as any).mockResolvedValue({ granted: false, denied: true, prompt: false });
    const fetchSpy = vi.spyOn(global, 'fetch');
    render(<AddGroupMemberScreen groupId="g1" onNavigate={vi.fn()} />);
    (toast.error as any).mockClear();
    fireEvent.click(screen.getAllByText('Sync Contacts')[0]);
    await waitFor(() => expect((toast.error as any)).toHaveBeenCalled());
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('syncs contacts successfully', async () => {
    (contactsAPI.checkPermissionStatus as any).mockResolvedValue({ granted: false, denied: false });
    (contactsAPI.requestPermission as any).mockResolvedValue({ granted: true, denied: false, prompt: false });
    (contactsAPI.getContacts as any).mockResolvedValue([{ id: '1', name: 'Alice', phoneNumbers: ['123'], emails: [] }]);
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({ contacts: [{ id: '1', name: 'Alice', phoneNumber: '123', status: 'existing_user' }] }) } as unknown as Response);
    render(<AddGroupMemberScreen groupId="g1" onNavigate={vi.fn()} />);
    (toast.error as any).mockClear();
    fireEvent.click(screen.getAllByText('Sync Contacts')[0]);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
  });

  it('submits invites', async () => {
    (contactsAPI.checkPermissionStatus as any).mockResolvedValue({ granted: false, denied: false });
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({}) } as unknown as Response);
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    localStorage.clear();
    render(<AddGroupMemberScreen groupId="g1" onNavigate={vi.fn()} initialMode="invite" />);
    (toast.error as any).mockClear();
    fireEvent.change(screen.getByPlaceholderText('Enter their name'), { target: { value: 'Charlie' } });
    fireEvent.change(screen.getByPlaceholderText('+1 (555) 123-4567'), { target: { value: '+1234567890' } });
    fireEvent.click(screen.getByText('Send Group WhatsApp Invitation'));
    await waitFor(() => expect((global.fetch as any)).toHaveBeenCalledTimes(1));
    expect((global.fetch as any).mock.calls[0][0]).toBe('/api/groups/g1/invite');
    openSpy.mockRestore();
  });
});

