import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../utils/config', () => ({
  apiBaseUrl: '/api',
  useMockApi: true,
}));

import { UserProfileProvider } from './UserProfileContext';
import { ProfileScreen } from './ProfileScreen';
import { ThemeProvider } from './ThemeContext';
import { sign } from 'jsonwebtoken';
import { DEV_JWT_SECRET } from '../server/dev-jwt-secret.js';

describe('ProfileScreen with mock API', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('biltip_user', JSON.stringify({ id: 'demo-user' }));
    localStorage.setItem(
      'biltip_auth',
      JSON.stringify({ token: sign({ userId: 'demo-user' }, DEV_JWT_SECRET, { expiresIn: '1h' }) })
    );
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
