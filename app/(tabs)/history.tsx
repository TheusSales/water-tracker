import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart, type Bar } from '@/components/BarChart';
import { computeStreak, getSettings, getTotalsInRange } from '@/db/queries';
import { dayOfMonthLabel, formatVolume, lastNDayKeys, weekdayLabel } from '@/lib/date';
import { colors, radius, shadow, spacing } from '@/lib/theme';

const RANGES = [
  { key: 'week', label: '7 dias', days: 7 },
  { key: 'month', label: '30 dias', days: 30 },
] as const;

type RangeKey = (typeof RANGES)[number]['key'];

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const [range, setRange] = useState<RangeKey>('week');
  const [goalMl, setGoalMl] = useState(2500);
  const [bars, setBars] = useState<Bar[]>([]);
  const [streak, setStreak] = useState(0);
  const [average, setAverage] = useState(0);
  const [daysMet, setDaysMet] = useState(0);

  const days = RANGES.find((r) => r.key === range)!.days;

  const load = useCallback(async () => {
    const settings = await getSettings(db);
    const keys = lastNDayKeys(days);
    const totals = await getTotalsInRange(db, keys[0], keys[keys.length - 1]);

    setGoalMl(settings.goalMl);
    setBars(
      keys.map((key) => ({
        key,
        label: days <= 7 ? weekdayLabel(key) : dayOfMonthLabel(key),
        value: totals[key] ?? 0,
      }))
    );

    const sum = keys.reduce((acc, key) => acc + (totals[key] ?? 0), 0);
    setAverage(Math.round(sum / keys.length));
    setDaysMet(keys.filter((key) => (totals[key] ?? 0) >= settings.goalMl).length);

    // The streak can reach further back than the visible window.
    const streakKeys = lastNDayKeys(365);
    const streakTotals = await getTotalsInRange(
      db,
      streakKeys[0],
      streakKeys[streakKeys.length - 1]
    );
    setStreak(computeStreak(streakTotals, settings.goalMl));
  }, [db, days]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl },
      ]}
    >
      <Text style={styles.title}>Histórico</Text>

      <View style={styles.segment}>
        {RANGES.map((option) => {
          const active = option.key === range;
          return (
            <Pressable
              key={option.key}
              onPress={() => setRange(option.key)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.statsRow}>
        <Stat label="Sequência" value={`${streak}d`} highlight />
        <Stat label="Média/dia" value={formatVolume(average)} />
        <Stat label="Metas batidas" value={`${daysMet}/${days}`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Consumo diário</Text>
        <Text style={styles.cardHint}>
          Linha tracejada = meta de {formatVolume(goalMl)}
        </Text>
        <View style={styles.chartWrap}>
          <BarChart bars={bars} goal={goalMl} labelEvery={days <= 7 ? 1 : 3} />
        </View>
      </View>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, highlight && { color: colors.primary }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, gap: spacing.md },
  title: { fontSize: 32, fontWeight: '800', color: colors.text },

  segment: {
    flexDirection: 'row',
    backgroundColor: colors.track,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  segmentItemActive: { backgroundColor: colors.card, ...shadow },
  segmentText: { fontWeight: '600', color: colors.textMuted, fontSize: 13 },
  segmentTextActive: { color: colors.text },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    ...shadow,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, ...shadow },
  cardTitle: { fontWeight: '700', color: colors.text, fontSize: 15 },
  cardHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chartWrap: { marginTop: spacing.md },
});
