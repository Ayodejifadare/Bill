import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootNavigator from '../navigation/RootNavigator';

const PERSISTENCE_KEY = 'nav-state-v1';
const ONBOARD_KEY = 'onboarding-complete';

async function renderReady(persistedState?: any) {
  if (persistedState) {
    await AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(persistedState));
  } else {
    await AsyncStorage.removeItem(PERSISTENCE_KEY);
  }
  await AsyncStorage.setItem(ONBOARD_KEY, '1');

  let tree: renderer.ReactTestRenderer | undefined;
  await act(async () => {
    tree = renderer.create(<RootNavigator />);
  });
  // allow useEffect + AsyncStorage promises to resolve
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });

  // @ts-ignore
  return tree as renderer.ReactTestRenderer;
}

function containsText(tree: renderer.ReactTestRenderer, expected: string) {
  const nodes = tree.root.findAll((n) => {
    if (!n.props) return false;
    const c = n.props.children;
    if (typeof c === 'string') return c.includes(expected);
    if (Array.isArray(c)) return c.some((x) => typeof x === 'string' && x.includes(expected));
    return false;
  });
  return nodes.length > 0;
}

describe('RootNavigator routing', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('shows Home tab by default when onboarded', async () => {
    const tree = await renderReady();
    expect(containsText(tree, 'Welcome')).toBe(true);
  });

  it('restores persisted tab state to Bills', async () => {
    // Minimal persisted navigation state with Bills tab focused
    const persisted = {
      index: 1,
      routes: [
        { name: 'HomeTab', state: { index: 0, routes: [{ name: 'HomeMain' }] } },
        { name: 'BillsTab', state: { index: 0, routes: [{ name: 'BillsHome' }] } },
        { name: 'FriendsTab', state: { index: 0, routes: [{ name: 'FriendsHome' }] } },
        { name: 'ProfileTab' },
      ],
    };

    const tree = await renderReady(persisted);
    expect(containsText(tree, 'Bills')).toBe(true);
  });

  it('can start on a nested Home stack route (Notifications)', async () => {
    const persisted = {
      index: 0,
      routes: [
        {
          name: 'HomeTab',
          state: {
            index: 3,
            routes: [
              { name: 'HomeMain' },
              { name: 'TransactionDetails' },
              { name: 'RecurringPayments' },
              { name: 'Notifications' },
            ],
          },
        },
        { name: 'BillsTab', state: { index: 0, routes: [{ name: 'BillsHome' }] } },
        { name: 'FriendsTab', state: { index: 0, routes: [{ name: 'FriendsHome' }] } },
        { name: 'ProfileTab' },
      ],
    };

    const tree = await renderReady(persisted);
    expect(containsText(tree, 'Notifications')).toBe(true);
  });
});

