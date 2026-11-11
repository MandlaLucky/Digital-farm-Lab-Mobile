import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Card, Btn, Icon, LabeledInput, Stepper } from '../components/ui';
import { colors, spacing, radius, fontSizes } from '../theme';
import type { FarmConfig, PersistedFarm, WaterSourceType } from '../types';

const WATER_NOTES: Record<string, string> = {
  dam: 'Large surface storage',
  borehole: 'Groundwater, steady supply',
  river: 'Flowing, seasonal',
  reservoir: 'Engineered storage',
};
const SLOTS = [[78,68],[78,14],[8,72],[50,76],[88,40],[60,4]];

export default function FarmSetupScreen({ farm, farms, onChange, onLoad, onNext }: {
  farm: FarmConfig; farms: PersistedFarm[];
  onChange: (patch: Partial<FarmConfig>) => void;
  onLoad: (farm: PersistedFarm) => void;
  onNext: () => void;
}) {
  const checks = [
    { label: 'Farm named', ok: farm.name.trim().length > 0 },
    { label: 'Location set', ok: farm.location.trim().length > 0 },
    { label: `Water source added (${farm.waterSources.length})`, ok: farm.waterSources.length > 0 },
  ];
  const ready = checks.every(c => c.ok);

  const addWater = (type: WaterSourceType) => {
    const [x, y] = SLOTS[farm.waterSources.length % SLOTS.length];
    onChange({ waterSources: [...farm.waterSources, { id: `water-${Date.now()}`, type, x, y }] });
  };
  const removeWater = (id: string) => onChange({ waterSources: farm.waterSources.filter(w => w.id !== id) });

  return (
    <Screen>
      <View style={{ gap: 4, marginBottom: spacing.lg }}>
        <Text style={s.eyebrow}>1 · FARM SETUP</Text>
        <Text style={s.title}>Set up your farm</Text>
        <Text style={s.subtitle}>Describe the farm, its water supply and the baseline weather. You'll lay out fields next.</Text>
      </View>

      <Card title="FARM DETAILS" subtitle="Identity & size">
        <LabeledInput label="Farm name" value={farm.name} onChange={v => onChange({ name: v })} placeholder="e.g. Green Valley Farm" />
        <LabeledInput label="Location" value={farm.location} onChange={v => onChange({ location: v })} placeholder="Town, region or coordinates" />
        <View style={{ gap: spacing.xs }}>
          <Text style={s.fieldLabel}>Total farm size</Text>
          <Stepper value={farm.totalSize} unit=" ha" min={5} max={500} step={5} onChange={v => onChange({ totalSize: v })} />
        </View>
      </Card>

      <Card title="WATER SUPPLY" subtitle="Primary water source">
        <Text style={s.hint}>Add as many sources as the farm has.</Text>
        <View style={s.choiceGrid}>
          {(['dam','borehole','river','reservoir'] as const).map(src => (
            <Pressable key={src} onPress={() => addWater(src)} style={s.choice}>
              <Icon name="water" size={20} color={colors.green} />
              <Text style={s.choiceTitle}>+ {src}</Text>
              <Text style={s.choiceNote}>{WATER_NOTES[src]}</Text>
            </Pressable>
          ))}
        </View>
        {farm.waterSources.length > 0 && (
          <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
            {farm.waterSources.map((w, i) => (
              <View key={w.id} style={s.sourceRow}>
                <Icon name="water" size={16} color={colors.green} />
                <View style={{ flex: 1 }}>
                  <Text style={s.sourceTitle}>{w.type}</Text>
                  <Text style={s.sourceSub}>Source {i + 1}</Text>
                </View>
                <Pressable onPress={() => removeWater(w.id)} hitSlop={10}>
                  <Icon name="trash" size={18} color={colors.red} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card title="INITIAL WEATHER" subtitle="Simulation baseline">
        <View style={{ gap: spacing.xs }}>
          <Text style={s.fieldLabel}>Temperature</Text>
          <Stepper value={farm.temperature} unit="°C" min={-270} max={60} onChange={v => onChange({ temperature: v })} />
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text style={s.fieldLabel}>Relative humidity</Text>
          <Stepper value={farm.humidity} unit="%" min={0} max={100} onChange={v => onChange({ humidity: v })} />
        </View>
        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          <Text style={s.eyebrow}>READINESS</Text>
          {checks.map(c => (
            <View key={c.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={[s.checkDot, c.ok && s.checkDotOk]}>
                <Text style={{ color: c.ok ? colors.bg : colors.muted, fontSize: 11 }}>{c.ok ? '✓' : ''}</Text>
              </View>
              <Text style={{ color: c.ok ? colors.text : colors.muted, fontSize: fontSizes.sm }}>{c.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card title="FARM LIBRARY" subtitle="Start from a saved farm">
        {farms.length === 0 && <Text style={s.hint}>No saved farms yet. Farms you save will appear here.</Text>}
        {farms.map(f => (
          <Pressable key={f.id} onPress={() => onLoad(f)} style={s.libRow}>
            <View style={s.libIcon}><Icon name="field" size={16} color={colors.green} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.libTitle}>{f.name}</Text>
              <Text style={s.libSub}>{f.location} · {f.fields.length} fields · {f.totalSize} ha</Text>
            </View>
            <Text style={s.libEm}>Load</Text>
          </Pressable>
        ))}
      </Card>

      <Btn variant="primary" onPress={onNext} disabled={!ready} style={{ justifyContent: 'center' }}>
        Continue to Farm Builder  →
      </Btn>
    </Screen>
  );
}

const s = StyleSheet.create({
  eyebrow: { color: colors.green, fontFamily: 'JetBrainsMono_500Medium', fontSize: fontSizes.xs, letterSpacing: 1.4 },
  title: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: fontSizes.xxl },
  subtitle: { color: colors.muted, fontSize: fontSizes.sm, lineHeight: 18 },
  hint: { color: colors.muted, fontSize: fontSizes.sm, lineHeight: 18 },
  fieldLabel: { color: colors.muted, fontSize: fontSizes.sm },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  choice: { width: '48%', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2, gap: 4 },
  choiceTitle: { color: colors.text, fontFamily: 'DMSans_700Bold', fontSize: fontSizes.md, textTransform: 'capitalize', marginTop: 4 },
  choiceNote: { color: colors.muted, fontSize: fontSizes.xs },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2 },
  sourceTitle: { color: colors.text, fontSize: fontSizes.md, fontFamily: 'DMSans_700Bold', textTransform: 'capitalize' },
  sourceSub: { color: colors.muted, fontSize: fontSizes.xs },
  checkDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  checkDotOk: { backgroundColor: colors.green, borderColor: colors.green },
  libRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2, marginBottom: spacing.xs },
  libIcon: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: 'rgba(85,216,139,0.08)', alignItems: 'center', justifyContent: 'center' },
  libTitle: { color: colors.text, fontSize: fontSizes.md, fontFamily: 'DMSans_700Bold' },
  libSub: { color: colors.muted, fontSize: fontSizes.xs },
  libEm: { color: colors.green, fontSize: fontSizes.sm, fontFamily: 'JetBrainsMono_500Medium' },
});
