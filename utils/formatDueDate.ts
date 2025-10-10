const MS_IN_DAY = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

export function formatDueDate(isoDate: string): string {
  if (!isoDate) {
    return "";
  }

  const dueDate = new Date(isoDate);

  if (Number.isNaN(dueDate.getTime())) {
    return "";
  }

  const today = new Date();
  const diffInDays = Math.round(
    (startOfDay(dueDate).getTime() - startOfDay(today).getTime()) / MS_IN_DAY,
  );

  if (diffInDays === 0) {
    return "Today";
  }

  if (diffInDays === 1) {
    return "Tomorrow";
  }

  if (diffInDays > 1) {
    return `in ${diffInDays} days`;
  }

  const daysOverdue = Math.abs(diffInDays);

  if (daysOverdue === 1) {
    return "Overdue";
  }

  return `Overdue by ${daysOverdue} days`;
}
