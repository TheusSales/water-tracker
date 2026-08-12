/**
 * Every aggregation in this app is keyed by *local* calendar day, so we never
 * let SQLite compute dates — its date functions run in UTC and would roll the
 * day over at the wrong moment for anyone not on UTC.
 */

/** Local calendar day as `YYYY-MM-DD`. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses a `YYYY-MM-DD` key back into a Date at local midnight. */
export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Day keys for the last `count` days, oldest first, ending today. */
export function lastNDayKeys(count: number, today: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    keys.push(dayKey(addDays(today, -i)));
  }
  return keys;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function weekdayLabel(key: string): string {
  return WEEKDAYS[fromDayKey(key).getDay()];
}

export function dayOfMonthLabel(key: string): string {
  return String(fromDayKey(key).getDate());
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "1,2 L" above a litre, "750 ml" below it. */
export function formatVolume(ml: number): string {
  if (ml >= 1000) {
    return `${(ml / 1000).toFixed(1).replace('.', ',')} L`;
  }
  return `${ml} ml`;
}
