import { mockMatchedContacts } from '../components/contact-sync/constants';

export async function handle(_path: string, _init?: RequestInit) {
  return { contacts: mockMatchedContacts };
}
