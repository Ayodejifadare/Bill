import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HomeScreen } from './HomeScreen';

const mockUseUserProfile = vi.fn();

vi.mock('./UserProfileContext', () => ({
  useUserProfile: () => mockUseUserProfile(),
}));

vi.mock('../hooks/useTransactions', () => ({
  useTransactions: () => ({ transactions: [], loading: false, error: null }),
}));

vi.mock('./UpcomingPayments', () => ({
  UpcomingPayments: () => <div />, // simplify for tests
}));

describe('HomeScreen header', () => {
  beforeEach(() => {
    mockUseUserProfile.mockReset();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 0 }),
    }) as any;
  });

  it('renders name and initials from profile', () => {
    mockUseUserProfile.mockReturnValue({
      appSettings: { region: 'US' },
      userProfile: { name: 'Alice Example' },
    });

    render(<HomeScreen onNavigate={() => {}} />);

    expect(screen.getByText('Alice Example')).toBeInTheDocument();
    expect(screen.getByText('AE')).toBeInTheDocument();
  });

  it('falls back when profile name missing', () => {
    mockUseUserProfile.mockReturnValue({
      appSettings: { region: 'US' },
      userProfile: { name: '' },
    });

    render(<HomeScreen onNavigate={() => {}} />);

    expect(screen.getByText('there')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});

