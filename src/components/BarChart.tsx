import { View, Text, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/lib/theme';

export type Bar = {
  key: string;
  label: string;
  value: number;
};

type Props = {
  bars: Bar[];
  goal: number;
  height?: number;
  /** Show every Nth label — keeps a 30-day axis from turning into mush. */
  labelEvery?: number;
};

export function BarChart({ bars, goal, height = 160, labelEvery = 1 }: Props) {
  const max = Math.max(goal, ...bars.map((b) => b.value)) || 1;
  const goalRatio = goal / max;

  return (
    <View>
      <View style={[styles.plot, { height }]}>
        <View style={[styles.goalLine, { bottom: goalRatio * height }]} />

        {bars.map((bar, i) => {
          const met = bar.value >= goal && goal > 0;
          return (
            <View key={bar.key} style={styles.column}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max((bar.value / max) * height, bar.value > 0 ? 3 : 0),
                      backgroundColor: met ? colors.primary : colors.primarySoft,
                    },
                  ]}
                />
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {i % labelEvery === 0 ? bar.label : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderColor: colors.primaryDark,
    borderStyle: 'dashed',
    opacity: 0.45,
  },
  column: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    minHeight: 0,
  },
  label: {
    marginTop: spacing.xs,
    fontSize: 10,
    color: colors.textMuted,
  },
});
