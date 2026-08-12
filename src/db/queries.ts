import type { SQLiteDatabase } from 'expo-sqlite';

import { addDays, dayKey } from '@/lib/date';
import { DEFAULT_SETTINGS } from './schema';

export type Entry = {
  id: number;
  amount_ml: number;
  logged_at: string;
  day: string;
};

export type Container = {
  id: number;
  label: string;
  amount_ml: number;
  icon: string;
  position: number;
};

export type Settings = {
  goalMl: number;
  remindersEnabled: boolean;
  reminderStartHour: number;
  reminderEndHour: number;
  reminderIntervalMin: number;
};

// ---------------------------------------------------------------- entries

export async function addEntry(
  db: SQLiteDatabase,
  amountMl: number,
  when: Date = new Date()
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO entries (amount_ml, logged_at, day) VALUES (?, ?, ?)',
    amountMl,
    when.toISOString(),
    dayKey(when)
  );
  return result.lastInsertRowId;
}

export async function deleteEntry(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM entries WHERE id = ?', id);
}

export async function getEntriesForDay(db: SQLiteDatabase, day: string): Promise<Entry[]> {
  return db.getAllAsync<Entry>(
    'SELECT * FROM entries WHERE day = ? ORDER BY logged_at DESC',
    day
  );
}

export async function getDayTotal(db: SQLiteDatabase, day: string): Promise<number> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(amount_ml) AS total FROM entries WHERE day = ?',
    day
  );
  return row?.total ?? 0;
}

/**
 * Totals per day across an inclusive range, as a `YYYY-MM-DD` → ml map.
 * Days with no entries are absent from the map, not zero.
 */
export async function getTotalsInRange(
  db: SQLiteDatabase,
  fromDay: string,
  toDay: string
): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ day: string; total: number }>(
    `SELECT day, SUM(amount_ml) AS total
       FROM entries
      WHERE day >= ? AND day <= ?
      GROUP BY day`,
    fromDay,
    toDay
  );

  const totals: Record<string, number> = {};
  for (const row of rows) totals[row.day] = row.total;
  return totals;
}

/**
 * Consecutive days meeting the goal, counting back from today. Today not being
 * done *yet* doesn't break the streak — only a missed yesterday does.
 */
export function computeStreak(totals: Record<string, number>, goalMl: number): number {
  const today = new Date();
  let cursor = (totals[dayKey(today)] ?? 0) >= goalMl ? today : addDays(today, -1);

  let streak = 0;
  while ((totals[dayKey(cursor)] ?? 0) >= goalMl) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// ------------------------------------------------------------- containers

export function listContainers(db: SQLiteDatabase): Promise<Container[]> {
  return db.getAllAsync<Container>('SELECT * FROM containers ORDER BY position, id');
}

export async function addContainer(
  db: SQLiteDatabase,
  label: string,
  amountMl: number,
  icon: string
): Promise<void> {
  const row = await db.getFirstAsync<{ next: number | null }>(
    'SELECT MAX(position) + 1 AS next FROM containers'
  );
  await db.runAsync(
    'INSERT INTO containers (label, amount_ml, icon, position) VALUES (?, ?, ?, ?)',
    label,
    amountMl,
    icon,
    row?.next ?? 0
  );
}

export async function deleteContainer(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM containers WHERE id = ?', id);
}

// --------------------------------------------------------------- settings

export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings');

  const raw: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const row of rows) raw[row.key] = row.value;

  return {
    goalMl: Number(raw.goal_ml),
    remindersEnabled: raw.reminders_enabled === '1',
    reminderStartHour: Number(raw.reminder_start_hour),
    reminderEndHour: Number(raw.reminder_end_hour),
    reminderIntervalMin: Number(raw.reminder_interval_min),
  };
}

export async function setSetting(
  db: SQLiteDatabase,
  key: string,
  value: string | number | boolean
): Promise<void> {
  const stored = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    key,
    stored,
    stored
  );
}
