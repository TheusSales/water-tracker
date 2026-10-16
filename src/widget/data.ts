import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { getDayTotal, getSettings, listContainers } from '@/db/queries';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/schema';
import { dayKey } from '@/lib/date';
import type { HydrationWidgetProps } from './HydrationWidget';

let headlessDb: Promise<SQLiteDatabase> | null = null;

/**
 * The widget task can run with no UI mounted (app killed), so it opens its own
 * connection instead of relying on SQLiteProvider. WAL mode makes a second
 * connection safe alongside the app's. Migrating here covers a widget added
 * before the app was ever opened.
 */
export function getHeadlessDb(): Promise<SQLiteDatabase> {
  headlessDb ??= openDatabaseAsync(DATABASE_NAME).then(async (db) => {
    await migrateDbIfNeeded(db);
    return db;
  });
  return headlessDb;
}

export async function loadWidgetProps(db: SQLiteDatabase): Promise<HydrationWidgetProps> {
  const [totalMl, settings, containers] = await Promise.all([
    getDayTotal(db, dayKey()),
    getSettings(db),
    listContainers(db),
  ]);
  return { totalMl, goalMl: settings.goalMl, containers };
}
