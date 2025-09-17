const MS_IN_DAY = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

export function formatDueDate(isoDate: string): string {
  if (!isoDate) {
    return '';
  }

  const dueDate = new Date(isoDate);

  if (Number.isNaN(dueDate.getTime())) {
    return '';
  }

  const now = new Date();
  const dueTimestamp = dueDate.getTime();
  const nowTimestamp = now.getTime();
  const dueStartOfDay = startOfDay(dueDate);
  const nowStartOfDay = startOfDay(now);
  const diffInDays = Math.round(
    (dueStartOfDay.getTime() - nowStartOfDay.getTime()) / MS_IN_DAY
  );

  if (dueTimestamp < nowTimestamp) {
    const daysOverdue = Math.max(
      0,
      Math.round((nowStartOfDay.getTime() - dueStartOfDay.getTime()) / MS_IN_DAY)
    );

    if (daysOverdue <= 1) {
      return 'Overdue';
    }

    return `Overdue by ${daysOverdue} days`;
  }

  if (diffInDays === 0) {
    return 'Today';
  }

  if (diffInDays === 1) {
    return 'Tomorrow';
  }

  if (diffInDays > 1) {
    return `in ${diffInDays} days`;
  }

  return 'Today';
}
