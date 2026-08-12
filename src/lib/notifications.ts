import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Settings } from '@/db/queries';

export const ANDROID_CHANNEL_ID = 'reminders';

/** Android caps scheduled alarms; a sane ceiling keeps us far below it. */
const MAX_SLOTS = 24;

const MESSAGES = [
  'Hora de beber água 💧',
  'Bora hidratar? 🚰',
  'Um copo agora cai bem 💦',
  'Lembrete: água!',
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Lembretes de hidratação',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 150, 200],
    lightColor: '#2E90FA',
  });
}

export async function requestPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return requested.granted;
}

/**
 * Reminder times inside the active window, e.g. 8h→22h every 120min gives
 * 8:00, 10:00 … 22:00. Returns `{hour, minute}` pairs.
 */
export function reminderSlots(settings: Settings): Array<{ hour: number; minute: number }> {
  const { reminderStartHour, reminderEndHour, reminderIntervalMin } = settings;

  if (reminderIntervalMin <= 0 || reminderEndHour < reminderStartHour) return [];

  const slots: Array<{ hour: number; minute: number }> = [];
  const endMinutes = reminderEndHour * 60;

  for (
    let m = reminderStartHour * 60;
    m <= endMinutes && slots.length < MAX_SLOTS;
    m += reminderIntervalMin
  ) {
    slots.push({ hour: Math.floor(m / 60), minute: m % 60 });
  }
  return slots;
}

/**
 * Replaces every scheduled reminder with a fresh set derived from `settings`.
 * Each slot becomes its own DAILY notification, because a repeating interval
 * trigger would keep firing through the night.
 */
export async function rescheduleReminders(settings: Settings): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!settings.remindersEnabled) return 0;

  const granted = await requestPermissions();
  if (!granted) return 0;

  await setupAndroidChannel();

  const slots = reminderSlots(settings);
  for (const [i, slot] of slots.entries()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: MESSAGES[i % MESSAGES.length],
        body: 'Toque para registrar o que você bebeu.',
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: slot.hour,
        minute: slot.minute,
      },
    });
  }

  return slots.length;
}
