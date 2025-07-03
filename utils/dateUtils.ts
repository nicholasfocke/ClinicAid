import { format, parse, parseISO } from 'date-fns';

export const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  let d = parse(dateStr, 'yyyy-MM-dd', new Date());
  if (!isNaN(d.getTime())) return d;
  d = parseISO(dateStr);
  if (!isNaN(d.getTime())) return d;
  d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return null;
};

export const formatDateSafe = (dateStr: string, fmt = 'dd/MM/yyyy'): string => {
  const d = parseDate(dateStr);
  if (!d) return '-';
  return format(d, fmt);
};
