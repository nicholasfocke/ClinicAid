export interface ScheduleConfig {
  start: string;
  end: string;
  lunchStart?: string | null;
  lunchEnd?: string | null;
  reserved?: string[];
}

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(min: number): string {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function calculateAvailableSlots(
  config: ScheduleConfig,
  duration: number
): string[] {
  const start = parseTime(config.start);
  const end = parseTime(config.end);
  const lunchStart = config.lunchStart ? parseTime(config.lunchStart) : null;
  const lunchEnd = config.lunchEnd ? parseTime(config.lunchEnd) : null;
  const reserved = config.reserved?.map(r => parseTime(r)) || [];

  const slots: string[] = [];
  let current = start;
  while (current + duration <= end) {
    if (
      lunchStart !== null &&
      lunchEnd !== null &&
      ((current >= lunchStart && current < lunchEnd) ||
        (current < lunchStart && current + duration > lunchStart))
    ) {
      current = lunchEnd;
      continue;
    }

    const formatted = formatTime(current);
    if (!reserved.includes(current)) {
      slots.push(formatted);
    }
    current += duration;
  }
  return slots;
}