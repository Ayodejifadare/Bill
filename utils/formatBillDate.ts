import { formatDueDate } from './formatDueDate';

export function formatBillDate(dateString?: string): string {
  if (!dateString) {
    return '';
  }

  const relative = formatDueDate(dateString);
  if (relative) {
    return relative;
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const now = new Date();
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: parsed.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}
