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

function mergeReserved(reserved: string[], step: number): { start: number; end: number }[] {
  const times = reserved
    .map(r => parseTime(r))
    .sort((a, b) => a - b);
  const intervals: { start: number; end: number }[] = [];
  for (let i = 0; i < times.length; i++) {
    let start = times[i];
    let end = start + step;
    while (i + 1 < times.length && times[i + 1] === end) {
      end += step;
      i++;
    }
    intervals.push({ start, end });
  }
  return intervals;
}

export function calculateAvailableSlots(
  config: ScheduleConfig,
  duration: number,
  step: number
): string[] {
  const start = parseTime(config.start);
  const end = parseTime(config.end);
  const lunchStart = config.lunchStart ? parseTime(config.lunchStart) : null;
  const lunchEnd = config.lunchEnd ? parseTime(config.lunchEnd) : null;
  const reservedIntervals = config.reserved
    ? mergeReserved(config.reserved, step)
    : [];

  const slots: string[] = [];
  for (let current = start; current + duration <= end; current += step) {
    if (
      lunchStart !== null &&
      lunchEnd !== null &&
      ((current >= lunchStart && current < lunchEnd) ||
        (current < lunchStart && current + duration > lunchStart))
    ) {
      continue;
    }
    const candidateEnd = current + duration;
    const overlap = reservedIntervals.some(
      r => current < r.end && candidateEnd > r.start
    );
    if (!overlap) {
      slots.push(formatTime(current));
    }
  }
  return slots;
}
