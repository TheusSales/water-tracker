import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { addEntry } from '@/db/queries';
import { getHeadlessDb, loadWidgetProps } from './data';
import { ADD_ACTION, HydrationWidget } from './HydrationWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  const db = await getHeadlessDb();

  if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === ADD_ACTION) {
    const ml = Number(props.clickActionData?.ml);
    if (ml > 0) await addEntry(db, ml);
  }

  // Every other action (added, periodic update, resize) just re-renders, which
  // is also what rolls the total back to zero after midnight.
  props.renderWidget(<HydrationWidget {...await loadWidgetProps(db)} />);
}
