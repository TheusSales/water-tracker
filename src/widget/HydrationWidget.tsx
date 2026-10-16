import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { Container } from '@/db/queries';
import { formatVolume } from '@/lib/date';
import { colors } from '@/lib/theme';

export const WIDGET_NAME = 'Hydration';

/** `clickAction` emitted by the quick-add buttons; `clickActionData` is `{ ml }`. */
export const ADD_ACTION = 'ADD';

/** Buttons beyond this don't fit the default 4×2 size. */
const MAX_BUTTONS = 4;

export type HydrationWidgetProps = {
  totalMl: number;
  goalMl: number;
  containers: Container[];
};

/**
 * Widget layouts are rendered to Android RemoteViews, so only the library's
 * primitives work here — no View/Text, no vector icons.
 */
export function HydrationWidget({ totalMl, goalMl, containers }: HydrationWidgetProps) {
  const progress = goalMl > 0 ? Math.min(totalMl / goalMl, 1) : 0;
  const percent = goalMl > 0 ? Math.round((totalMl / goalMl) * 100) : 0;
  // The bar is two flex children; a zero-flex child renders oddly, so drop it.
  const filled = Math.round(progress * 100);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel="Abrir o app Água"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 14,
      }}
    >
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text={`💧 ${formatVolume(totalMl)} / ${formatVolume(goalMl)}`}
          style={{ fontSize: 16, fontWeight: '700', color: colors.text }}
        />
        <TextWidget
          text={percent >= 100 ? 'Meta batida!' : `${percent}%`}
          style={{ fontSize: 14, fontWeight: '700', color: colors.primaryDark }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          width: 'match_parent',
          height: 8,
          flexDirection: 'row',
          backgroundColor: colors.track,
          borderRadius: 4,
        }}
      >
        {filled > 0 ? (
          <FlexWidget
            style={{ flex: filled, height: 'match_parent', backgroundColor: colors.primary, borderRadius: 4 }}
          />
        ) : null}
        {filled < 100 ? <FlexWidget style={{ flex: 100 - filled, height: 'match_parent' }} /> : null}
      </FlexWidget>

      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', flexGap: 8 }}>
        {containers.slice(0, MAX_BUTTONS).map((container) => (
          <FlexWidget
            key={container.id}
            clickAction={ADD_ACTION}
            clickActionData={{ ml: container.amount_ml }}
            accessibilityLabel={`Registrar ${formatVolume(container.amount_ml)}`}
            style={{
              flex: 1,
              flexDirection: 'column',
              alignItems: 'center',
              paddingVertical: 8,
              backgroundColor: colors.primarySoft,
              borderRadius: 14,
            }}
          >
            <TextWidget
              text={`+${formatVolume(container.amount_ml)}`}
              style={{ fontSize: 13, fontWeight: '700', color: colors.primaryDark }}
            />
            <TextWidget
              text={container.label}
              maxLines={1}
              truncate="END"
              style={{ fontSize: 11, color: colors.textMuted }}
            />
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}
