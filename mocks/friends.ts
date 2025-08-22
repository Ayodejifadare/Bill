import type { Friend } from '../hooks/useFriends';

const friends: Friend[] = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' }
];

export async function handle(_path: string, _init?: RequestInit) {
  return { friends };
}
