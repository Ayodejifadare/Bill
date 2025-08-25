import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateMockToken } from '../mocks/auth';

vi.mock('../utils/config', () => ({
  apiBaseUrl: '/api',
  useMockApi: true,
}));

import { UserProfileProvider } from './UserProfileContext';
import { ProfileScreen } from './ProfileScreen';
import { ThemeProvider } from './ThemeContext';

describe('ProfileScreen with mock API', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('biltip_user', JSON.stringify({ id: 'demo-user' }));
    localStorage.setItem('biltip_auth', JSON.stringify({ token: generateMockToken('+123') }));
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads profile from mock handler without calling fetch', async () => {
    render(
      <ThemeProvider defaultTheme="light">
        <UserProfileProvider>
          <ProfileScreen onNavigate={() => {}} />
        </UserProfileProvider>
      </ThemeProvider>
    );

    expect(await screen.findByText('Demo User')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
