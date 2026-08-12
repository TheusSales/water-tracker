import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  addContainer,
  deleteContainer,
  getSettings,
  listContainers,
  setSetting,
  type Container,
  type Settings,
} from '@/db/queries';
import { formatVolume } from '@/lib/date';
import { rescheduleReminders } from '@/lib/notifications';
import { colors, radius, shadow, spacing } from '@/lib/theme';

/** Typed against the glyph map so a bad icon name fails at compile time. */
const ICON_CHOICES: ReadonlyArray<keyof typeof MaterialCommunityIcons.glyphMap> = [
  'cup-water',
  'coffee',
  'bottle-soda-outline',
  'bottle-soda-classic-outline',
  'bottle-tonic-outline',
  'glass-mug-variant',
];

const INTERVAL_CHOICES = [30, 60, 90, 120, 180] as const;

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [goalText, setGoalText] = useState('');
  const [containers, setContainers] = useState<Container[]>([]);

  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newIcon, setNewIcon] = useState<string>(ICON_CHOICES[0]);

  const load = useCallback(async () => {
    const [loaded, list] = await Promise.all([getSettings(db), listContainers(db)]);
    setSettings(loaded);
    setGoalText(String(loaded.goalMl));
    setContainers(list);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /**
   * Persists a settings patch and, when it touches reminders, rebuilds the
   * notification schedule from the *new* values.
   */
  async function patchSettings(patch: Partial<Settings>, reschedule = false) {
    if (!settings) return;

    const next = { ...settings, ...patch };
    setSettings(next);

    const columns: Record<keyof Settings, string> = {
      goalMl: 'goal_ml',
      remindersEnabled: 'reminders_enabled',
      reminderStartHour: 'reminder_start_hour',
      reminderEndHour: 'reminder_end_hour',
      reminderIntervalMin: 'reminder_interval_min',
    };

    for (const key of Object.keys(patch) as Array<keyof Settings>) {
      await setSetting(db, columns[key], next[key]);
    }

    if (reschedule) {
      const scheduled = await rescheduleReminders(next);
      if (next.remindersEnabled && scheduled === 0) {
        Alert.alert(
          'Permissão negada',
          'Ative as notificações para o app nas configurações do Android para receber lembretes.'
        );
        setSettings({ ...next, remindersEnabled: false });
        await setSetting(db, 'reminders_enabled', false);
      }
    }
  }

  async function commitGoal() {
    const parsed = Number(goalText.replace(/\D/g, ''));
    if (!parsed || parsed < 200) {
      setGoalText(String(settings?.goalMl ?? 2500));
      return;
    }
    await patchSettings({ goalMl: parsed });
  }

  async function handleAddContainer() {
    const amount = Number(newAmount.replace(/\D/g, ''));
    if (!newLabel.trim() || !amount) {
      Alert.alert('Dados incompletos', 'Informe um nome e uma quantidade em ml.');
      return;
    }
    await addContainer(db, newLabel.trim(), amount, newIcon);
    setNewLabel('');
    setNewAmount('');
    await load();
  }

  async function handleDeleteContainer(container: Container) {
    if (containers.length === 1) {
      Alert.alert('Não dá', 'Você precisa de pelo menos um copo cadastrado.');
      return;
    }
    Alert.alert('Remover copo', `Remover "${container.label}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await deleteContainer(db, container.id);
          await load();
        },
      },
    ]);
  }

  if (!settings) return <View style={styles.screen} />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Ajustes</Text>

      {/* ------------------------------------------------------------ meta */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Meta diária</Text>
        <View style={styles.goalRow}>
          <TextInput
            value={goalText}
            onChangeText={setGoalText}
            onBlur={commitGoal}
            onSubmitEditing={commitGoal}
            keyboardType="number-pad"
            returnKeyType="done"
            style={styles.goalInput}
          />
          <Text style={styles.goalUnit}>ml</Text>
        </View>
        <View style={styles.chipRow}>
          {[2000, 2500, 3000, 3500].map((preset) => (
            <Pressable
              key={preset}
              onPress={() => {
                setGoalText(String(preset));
                patchSettings({ goalMl: preset });
              }}
              style={[styles.chip, settings.goalMl === preset && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  settings.goalMl === preset && styles.chipTextActive,
                ]}
              >
                {formatVolume(preset)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* -------------------------------------------------------- lembretes */}
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Lembretes</Text>
            <Text style={styles.cardHint}>Notificações locais durante o dia</Text>
          </View>
          <Switch
            value={settings.remindersEnabled}
            onValueChange={(value) => patchSettings({ remindersEnabled: value }, true)}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        {settings.remindersEnabled && (
          <View style={styles.reminderBody}>
            <Stepper
              label="Começa às"
              value={settings.reminderStartHour}
              suffix="h"
              min={0}
              max={settings.reminderEndHour - 1}
              onChange={(value) => patchSettings({ reminderStartHour: value }, true)}
            />
            <Stepper
              label="Termina às"
              value={settings.reminderEndHour}
              suffix="h"
              min={settings.reminderStartHour + 1}
              max={23}
              onChange={(value) => patchSettings({ reminderEndHour: value }, true)}
            />

            <Text style={styles.fieldLabel}>Intervalo</Text>
            <View style={styles.chipRow}>
              {INTERVAL_CHOICES.map((minutes) => (
                <Pressable
                  key={minutes}
                  onPress={() => patchSettings({ reminderIntervalMin: minutes }, true)}
                  style={[
                    styles.chip,
                    settings.reminderIntervalMin === minutes && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      settings.reminderIntervalMin === minutes && styles.chipTextActive,
                    ]}
                  >
                    {minutes < 60 ? `${minutes}min` : `${minutes / 60}h`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* ----------------------------------------------------------- copos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Meus copos</Text>
        <Text style={styles.cardHint}>Aparecem como atalhos na tela Hoje</Text>

        <View style={styles.containerList}>
          {containers.map((container) => (
            <View key={container.id} style={styles.containerRow}>
              <MaterialCommunityIcons
                name={container.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={22}
                color={colors.primary}
              />
              <Text style={styles.containerLabel}>{container.label}</Text>
              <Text style={styles.containerAmount}>{formatVolume(container.amount_ml)}</Text>
              <Pressable onPress={() => handleDeleteContainer(container)} hitSlop={12}>
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={20}
                  color={colors.danger}
                />
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>Novo copo</Text>
        <View style={styles.newRow}>
          <TextInput
            value={newLabel}
            onChangeText={setNewLabel}
            placeholder="Nome"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { flex: 2 }]}
          />
          <TextInput
            value={newAmount}
            onChangeText={setNewAmount}
            placeholder="ml"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            style={[styles.input, { flex: 1 }]}
          />
        </View>

        <View style={styles.iconRow}>
          {ICON_CHOICES.map((icon) => (
            <Pressable
              key={icon}
              onPress={() => setNewIcon(icon)}
              style={[styles.iconChoice, newIcon === icon && styles.iconChoiceActive]}
            >
              <MaterialCommunityIcons
                name={icon}
                size={22}
                color={newIcon === icon ? colors.card : colors.primary}
              />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleAddContainer}
          style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons name="plus" size={18} color={colors.card} />
          <Text style={styles.addButtonText}>Adicionar copo</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Stepper({
  label,
  value,
  suffix,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => onChange(Math.max(value - 1, min))}
          disabled={value <= min}
          hitSlop={8}
          style={[styles.stepperButton, value <= min && { opacity: 0.3 }]}
        >
          <MaterialCommunityIcons name="minus" size={18} color={colors.primaryDark} />
        </Pressable>
        <Text style={styles.stepperValue}>
          {value}
          {suffix}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(value + 1, max))}
          disabled={value >= max}
          hitSlop={8}
          style={[styles.stepperButton, value >= max && { opacity: 0.3 }]}
        >
          <MaterialCommunityIcons name="plus" size={18} color={colors.primaryDark} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, gap: spacing.md },
  title: { fontSize: 32, fontWeight: '800', color: colors.text },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow,
  },
  cardTitle: { fontWeight: '700', color: colors.text, fontSize: 15 },
  cardHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  goalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  goalInput: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.primarySoft,
    minWidth: 110,
    paddingVertical: 2,
  },
  goalUnit: { color: colors.textMuted, fontSize: 16, paddingBottom: 6 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.track,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.card },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reminderBody: { gap: spacing.sm, marginTop: spacing.sm },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.track,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  stepperButton: { padding: 2 },
  stepperValue: { fontWeight: '700', color: colors.text, minWidth: 34, textAlign: 'center' },

  containerList: { gap: spacing.sm, marginTop: spacing.sm },
  containerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  containerLabel: { flex: 1, color: colors.text, fontWeight: '600' },
  containerAmount: { color: colors.textMuted, fontSize: 13 },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  newRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },

  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconChoice: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.track,
  },
  iconChoiceActive: { backgroundColor: colors.primary },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 12,
    marginTop: spacing.xs,
  },
  addButtonText: { color: colors.card, fontWeight: '700' },
});
