import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FriendsList } from './FriendsList';
import { apiClient } from '../utils/apiClient';

vi.mock('../utils/apiClient', () => ({
  apiClient: vi.fn(),
}));

describe('FriendsList error handling', () => {
  it('shows error state and retries', async () => {
    const apiMock = apiClient as unknown as vi.Mock;
    apiMock
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ friends: [{ id: '1', name: 'Alice', username: 'alice', status: 'active' }] })
      .mockResolvedValueOnce({ outgoing: [] })
      .mockResolvedValueOnce({ owedToUser: 48.25, userOwes: 15 });

    render(<FriendsList onNavigate={() => {}} />);

    expect(await screen.findByRole('heading', { name: /failed to load friends/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(5));
    expect(screen.queryByRole('heading', { name: /failed to load friends/i })).not.toBeInTheDocument();
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('$48.25')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
  });
});

