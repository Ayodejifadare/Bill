import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./UserProfileContext', () => ({
  useUserProfile: vi.fn(() => ({
    appSettings: { region: 'US' },
    userProfile: { name: 'Test User' },
  })),
}));

vi.mock('./UpcomingPayments', () => ({
  UpcomingPayments: () => <div />,
}));

import { useUserProfile } from './UserProfileContext';
import { HomeScreen } from './HomeScreen';
import * as TransactionsHook from '../hooks/useTransactions';

const useUserProfileSpy = useUserProfile as unknown as vi.Mock;
const useTransactionsSpy = vi.spyOn(TransactionsHook, 'useTransactions');

describe('HomeScreen header', () => {
  beforeEach(() => {
    useUserProfileSpy.mockReturnValue({
      appSettings: { region: 'US' },
      userProfile: { name: 'Test User' },
    });
    useTransactionsSpy.mockReturnValue({
      transactions: [],
      loading: false,
      error: null,
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 0 }),
    }) as any;
  });

  it('renders name and initials from profile', () => {
    useUserProfileSpy.mockReturnValue({
      appSettings: { region: 'US' },
      userProfile: { name: 'Alice Example' },
    });

    render(<HomeScreen onNavigate={() => {}} />);

    expect(screen.getByText('Alice Example')).toBeInTheDocument();
    expect(screen.getByText('AE')).toBeInTheDocument();
  });

  it('falls back when profile name missing', () => {
    useUserProfileSpy.mockReturnValue({
      appSettings: { region: 'US' },
      userProfile: { name: '' },
    });

    render(<HomeScreen onNavigate={() => {}} />);

    expect(screen.getByText('there')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});

describe('HomeScreen transaction filtering', () => {
  beforeEach(() => {
    useUserProfileSpy.mockReturnValue({
      appSettings: { region: 'US' },
      userProfile: { name: 'Alice Example' },
    });
    useTransactionsSpy.mockReturnValue({
      transactions: [
        {
          id: '1',
          type: 'sent',
          amount: 10,
          description: 'Paid Bob',
          recipient: { name: 'Bob' },
          date: '2023-01-01',
          status: 'completed',
        },
        {
          id: '2',
          type: 'received',
          amount: 20,
          description: 'Received from Carol',
          sender: { name: 'Carol' },
          date: '2023-01-02',
          status: 'completed',
        },
        {
          id: '3',
          type: 'split',
          amount: 30,
          description: 'Dinner with Dan',
          recipient: { name: 'Dan' },
          date: '2023-01-03',
          status: 'pending',
        },
      ],
      loading: false,
      error: null,
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 0 }),
    }) as any;
  });

  it('filters transactions based on selected filter and shows counts', () => {
    render(<HomeScreen onNavigate={() => {}} />);

    const allButton = screen.getAllByRole('button', { name: /^All/ }).pop()!;
    const sentButton = screen.getAllByRole('button', { name: /^Sent/ }).pop()!;
    const receivedButton = screen.getAllByRole('button', { name: /^Received/ }).pop()!;

    expect(allButton).toHaveTextContent('(3)');
    expect(sentButton).toHaveTextContent('(1)');
    expect(receivedButton).toHaveTextContent('(2)');

    expect(screen.getByText('Paid Bob')).toBeInTheDocument();
    expect(screen.getByText('Received from Carol')).toBeInTheDocument();
    expect(screen.getByText('Dinner with Dan')).toBeInTheDocument();

    fireEvent.click(sentButton);
    expect(screen.getByText('Paid Bob')).toBeInTheDocument();
    expect(screen.queryByText('Received from Carol')).not.toBeInTheDocument();
    expect(screen.queryByText('Dinner with Dan')).not.toBeInTheDocument();

    fireEvent.click(receivedButton);
    expect(screen.queryByText('Paid Bob')).not.toBeInTheDocument();
    expect(screen.getByText('Received from Carol')).toBeInTheDocument();
    expect(screen.getByText('Dinner with Dan')).toBeInTheDocument();

    fireEvent.click(allButton);
    expect(screen.getByText('Paid Bob')).toBeInTheDocument();
    expect(screen.getByText('Received from Carol')).toBeInTheDocument();
    expect(screen.getByText('Dinner with Dan')).toBeInTheDocument();
  });
});

describe('HomeScreen currency symbol', () => {
  beforeEach(() => {
    useUserProfileSpy.mockReturnValue({
      appSettings: { region: 'US' },
      userProfile: { name: 'Test User' },
    });
    useTransactionsSpy.mockReturnValue({
      transactions: [
        {
          id: '1',
          type: 'sent',
          amount: 10,
          description: 'Test payment',
          recipient: { name: 'Bob' },
          date: '2023-01-01',
          status: 'completed',
        },
      ],
      loading: false,
      error: null,
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 0 }),
    }) as any;
  });

  it('uses $ for US region', () => {
    useUserProfileSpy.mockReturnValue({
      appSettings: { region: 'US' },
      userProfile: { name: 'Test User' },
    });

    render(<HomeScreen onNavigate={() => {}} />);

    expect(screen.getAllByText(/\$10\.00/)[0]).toBeInTheDocument();
  });

  it('uses ₦ for NG region', () => {
    useUserProfileSpy.mockReturnValue({
      appSettings: { region: 'NG' },
      userProfile: { name: 'Test User' },
    });

    render(<HomeScreen onNavigate={() => {}} />);

    expect(screen.getAllByText(/₦10\.00/)[0]).toBeInTheDocument();
  });
});
