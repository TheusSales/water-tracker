import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getSettings } from '@/db/queries';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/schema';
import { rescheduleReminders, setupAndroidChannel } from '@/lib/notifications';
import { colors } from '@/lib/theme';

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

async function initDb(db: SQLiteDatabase): Promise<void> {
  await migrateDbIfNeeded(db);

  // Reminders scheduled by older builds point at the legacy channel (no custom
  // sound). Rescheduling is cheap and idempotent, so just redo it every launch
  // instead of tracking whether the migration already happened.
  getSettings(db)
    .then((settings) => (settings.remindersEnabled ? rescheduleReminders(settings) : 0))
    .catch(() => {});
}

export default function RootLayout() {
  useEffect(() => {
    // The channel must exist before the first notification is posted, and
    // creating it early also makes the Android permission prompt look right.
    setupAndroidChannel();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SQLiteProvider
          databaseName={DATABASE_NAME}
          onInit={initDb}
          options={{ useNewConnection: false }}
        >
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
