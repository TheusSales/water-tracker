import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgressRing } from '@/components/ProgressRing';
import {
  addEntry,
  deleteEntry,
  getDayTotal,
  getEntriesForDay,
  getSettings,
  listContainers,
  type Container,
  type Entry,
} from '@/db/queries';
import { dayKey, formatTime, formatVolume } from '@/lib/date';
import { colors, radius, shadow, spacing } from '@/lib/theme';

export default function TodayScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const [total, setTotal] = useState(0);
  const [goalMl, setGoalMl] = useState(2500);
  const [containers, setContainers] = useState<Container[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);

  const load = useCallback(async () => {
    const today = dayKey();
    const [settings, list, todayEntries, todayTotal] = await Promise.all([
      getSettings(db),
      listContainers(db),
      getEntriesForDay(db, today),
      getDayTotal(db, today),
    ]);

    setGoalMl(settings.goalMl);
    setContainers(list);
    setEntries(todayEntries);
    setTotal(todayTotal);
  }, [db]);

  // Re-reads on every focus so goal/container edits show up immediately.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleAdd(amountMl: number) {
    await addEntry(db, amountMl);
    await load();
  }

  async function handleDelete(id: number) {
    await deleteEntry(db, id);
    await load();
  }

  const progress = goalMl > 0 ? total / goalMl : 0;
  const remaining = Math.max(goalMl - total, 0);
  const percent = Math.round(progress * 100);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl },
      ]}
    >
      <Text style={styles.title}>Hoje</Text>

      <View style={styles.ringWrap}>
        <ProgressRing progress={progress}>
          <Text style={styles.ringTotal}>{formatVolume(total)}</Text>
          <Text style={styles.ringGoal}>de {formatVolume(goalMl)}</Text>
          <View style={styles.percentPill}>
            <Text style={styles.percentText}>{percent}%</Text>
          </View>
        </ProgressRing>

        <Text style={styles.remaining}>
          {remaining > 0 ? `Faltam ${formatVolume(remaining)}` : 'Meta batida! 🎉'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Adicionar</Text>
      <View style={styles.grid}>
        {containers.map((container) => (
          <Pressable
            key={container.id}
            onPress={() => handleAdd(container.amount_ml)}
            style={({ pressed }) => [styles.quickButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons
              name={container.icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={26}
              color={colors.primary}
            />
            <Text style={styles.quickAmount}>{formatVolume(container.amount_ml)}</Text>
            <Text style={styles.quickLabel} numberOfLines={1}>
              {container.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Registros de hoje</Text>
      {entries.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="water-off-outline" size={28} color={colors.textMuted} />
          <Text style={styles.emptyText}>Nada registrado ainda.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {entries.map((entry, i) => (
            <View
              key={entry.id}
              style={[styles.entryRow, i > 0 && styles.entryRowDivider]}
            >
              <MaterialCommunityIcons name="water" size={20} color={colors.primary} />
              <Text style={styles.entryAmount}>{formatVolume(entry.amount_ml)}</Text>
              <Text style={styles.entryTime}>{formatTime(entry.logged_at)}</Text>
              <Pressable
                onPress={() => handleDelete(entry.id)}
                hitSlop={12}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, gap: spacing.md },
  title: { fontSize: 32, fontWeight: '800', color: colors.text },

  ringWrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  ringTotal: { fontSize: 36, fontWeight: '800', color: colors.text },
  ringGoal: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  percentPill: {
    marginTop: spacing.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  percentText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  remaining: { fontSize: 15, fontWeight: '600', color: colors.textMuted },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: spacing.sm },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickButton: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 78,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    ...shadow,
  },
  quickAmount: { fontWeight: '700', color: colors.text, fontSize: 14 },
  quickLabel: { fontSize: 11, color: colors.textMuted },
  pressed: { opacity: 0.55 },

  card: { backgroundColor: colors.card, borderRadius: radius.md, ...shadow },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  entryRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  entryAmount: { flex: 1, fontWeight: '600', color: colors.text },
  entryTime: { color: colors.textMuted, fontSize: 13 },

  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  emptyText: { color: colors.textMuted },
});
