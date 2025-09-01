import type { Friend } from '../hooks/useFriends';

const friends: Friend[] = [
  { id: '1', name: 'Alice', status: 'active' },
  { id: '2', name: 'Bob', status: 'active' },
  { id: '3', name: 'Charlie', status: 'active' }
];

export async function handle(_path: string, _init?: RequestInit) {
  return { friends };
}
