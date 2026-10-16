import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { loadWidgetProps } from './data';
import { HydrationWidget, WIDGET_NAME } from './HydrationWidget';

/** Pushes fresh data to any widget on the home screen after an in-app change. */
export function refreshWidget(db: SQLiteDatabase): void {
  if (Platform.OS !== 'android') return;

  requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: async () => <HydrationWidget {...await loadWidgetProps(db)} />,
  }).catch(() => {});
}
