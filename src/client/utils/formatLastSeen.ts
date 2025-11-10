// utils/formatLastSeen.ts
export function formatLastSeen(date: number | Date | string | undefined): string {
  if (!date) return "نامشخص";

  const now = new Date();
  const dateValue = typeof date === 'string' ? new Date(date).getTime() : (date instanceof Date ? date.getTime() : date);
  
  if (isNaN(dateValue)) return "نامشخص";

  const diff = Math.floor((now.getTime() - dateValue) / 1000);

  if (diff < 60) return "چند لحظه پیش";
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;

  const days = Math.floor(diff / 86400);
  if (days === 1) return "دیروز";
  if (days < 7) return `${days} روز پیش`;

  return new Date(dateValue).toLocaleDateString("fa-IR");
}