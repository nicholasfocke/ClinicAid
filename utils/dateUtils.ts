import { format } from 'date-fns';

export const formatDateSafe = (dateStr: string, fmt = 'dd/MM/yyyy'): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return format(d, fmt);
};
