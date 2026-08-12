import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'water.db';

const DATABASE_VERSION = 1;

/** Containers seeded on first launch so the app is usable before any setup. */
const DEFAULT_CONTAINERS: ReadonlyArray<[label: string, ml: number, icon: string]> = [
  ['Copo', 250, 'cup-water'],
  ['Caneca', 350, 'coffee'],
  ['Garrafa', 500, 'bottle-soda-outline'],
  ['Garrafão', 750, 'bottle-tonic-outline'],
];

export const DEFAULT_SETTINGS = {
  goal_ml: '2500',
  reminders_enabled: '0',
  reminder_start_hour: '8',
  reminder_end_hour: '22',
  reminder_interval_min: '120',
} as const;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = row?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) return;

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount_ml INTEGER NOT NULL,
        logged_at TEXT NOT NULL,
        day TEXT NOT NULL
      );
      CREATE INDEX idx_entries_day ON entries (day);

      CREATE TABLE containers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        amount_ml INTEGER NOT NULL,
        icon TEXT NOT NULL,
        position INTEGER NOT NULL
      );

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    for (const [i, [label, ml, icon]] of DEFAULT_CONTAINERS.entries()) {
      await db.runAsync(
        'INSERT INTO containers (label, amount_ml, icon, position) VALUES (?, ?, ?, ?)',
        label,
        ml,
        icon,
        i
      );
    }

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', key, value);
    }

    currentDbVersion = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${currentDbVersion}`);
}
