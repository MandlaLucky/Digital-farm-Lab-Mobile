import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Screen, Card, Btn, Icon, LabeledInput, Stepper } from '../components/ui';
import { colors, spacing, radius, fontSizes } from '../theme';
import { api, toScenarioRecord } from '../lib/api';
import type { ScenarioRecord, FarmConfig } from '../types';

type Tab = 'browse' | 'mine' | 'create';

const CATEGORIES = [
  'Drought Management','Irrigation Scheduling','Soil Type Comparison',
  'Changing Weather','Fertiliser Management','Planting Date Optimisation',
  'Over-irrigation','Pest Outbreak','Crop Rotation','Harvest Timing',
  'Farm Budget Management','Maximum Yield Challenge',
];
const VARIABLES = ['Irrigation volume','Irrigation interval','Fertiliser rate','Planting date','Crop variety','Pesticide use','Harvest date','Labour budget'];

export default function ScenariosScreen({ onRun, farm }: { onRun: (s: ScenarioRecord) => void; farm?: FarmConfig }) {
  const [tab, setTab] = useState<Tab>('browse');
  const [loading, setLoading] = useState(true);
  const [presets, setPresets] = useState<ScenarioRecord[]>([]);
  const [mine, setMine] = useState<ScenarioRecord[]>([]);
  const [msg, setMsg] = useState('');
  

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[1]);
  const [difficulty, setDifficulty] = useState<'Beginner'|'Intermediate'|'Advanced'>('Intermediate');
  const [duration, setDuration] = useState(120);
  const [variables, setVariables] = useState<string[]>(['Irrigation volume','Fertiliser rate']);

  const reload = async () => {
    setLoading(true); setMsg('');
    try {
      const [p, m] = await Promise.all([
        api.listPresets().catch(() => [] as any[]),
        api.listScenarios().catch(() => [] as any[]),
      ]);
      setPresets(p.map(toScenarioRecord));
      setMine(m.map(toScenarioRecord));
    } catch (e: any) { setMsg('Load failed: ' + e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);

  const save = async () => {
    if (!name.trim() || !description.trim()) return;
    try {
      const payload = {
        name, description, category, difficulty, duration,
        farmId: farm?.id ?? '',
        adjustableVariables: variables,
        learningObjectives: ['Evaluate how management decisions affect crop health.'],
        startingConditions: { soilMoisture: 55, temperature: 24, rainfall: 8, budget: 25000, pestPressure: 5 },
        participatingFields: farm?.fields.map(f => f.id) ?? [],
        crops: farm?.fields.map(f => ({ fieldId: f.id, crop: f.crop })) ?? [],
        fields: farm?.fields.map(f => ({
          id: f.id, name: f.name, size: f.size, soil: f.soil, crop: f.crop,
          irrigation: f.irrigation, x: f.x, y: f.y, width: f.width, height: f.height,
        })) ?? [],
        waterSources: farm?.waterSources.map(w => ({ id: w.id, type: w.type, x: w.x, y: w.y })) ?? [],
        weather: farm?.weather ?? 'clear',
        temperature: farm?.temperature ?? 24,
        humidity: farm?.humidity ?? 62,
      };
      const created = await api.createScenario(payload);
      setMine(list => [toScenarioRecord(created), ...list]);
      setName(''); setDescription('');
      setTab('mine');
    } catch (e: any) { setMsg('Save failed: ' + e.message); }
  };

  const remove = (id: string) => {
    Alert.alert('Delete scenario?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.deleteScenario(id); setMine(list => list.filter(s => s.id !== id)); }
        catch (e: any) { setMsg('Delete failed: ' + e.message); }
      }},
    ]);
  };

  const toggleVar = (v: string) => setVariables(vs => vs.includes(v) ? vs.filter(x => x !== v) : [...vs, v]);

  return (
    <Screen>
      <View style={{ gap: 4, marginBottom: spacing.lg }}>
        <Text style={s.eyebrow}>3 · SCENARIO MANAGEMENT</Text>
        <Text style={s.title}>Scenarios</Text>
      </View>

      <View style={s.tabs}>
        {(['browse','mine','create'] as const).map((id, i) => {
          const label = i === 0 ? `Browse (${presets.length})` : i === 1 ? `Mine (${mine.length})` : '+ Create';
          return (
            <Pressable key={id} onPress={() => setTab(id)} style={[s.tab, tab === id && s.tabActive]}>
              <Text style={[s.tabLabel, tab === id && s.tabLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {!!msg && <Text style={{ color: colors.red, fontSize: fontSizes.sm, marginBottom: spacing.sm }}>{msg}</Text>}

      {tab === 'browse' && (loading ? <ActivityIndicator color={colors.green} /> : (
        <>
          {presets.length === 0 && <Text style={s.hint}>No presets. Check the backend is running.</Text>}
          {presets.map(sc => <ScenarioCard key={sc.id} sc={sc} onRun={() => onRun(sc)} action="Run scenario" />)}
        </>
      ))}

      {tab === 'mine' && (loading ? <ActivityIndicator color={colors.green} /> : (
        <>
          {mine.length === 0 && <Text style={s.hint}>No scenarios yet. Tap + Create to make one.</Text>}
          {mine.map(sc => (
            <ScenarioCard key={sc.id} sc={sc} onRun={() => onRun(sc)} action="Run scenario"
              extraActions={<Pressable onPress={() => remove(sc.id)} hitSlop={10}><Icon name="trash" size={18} color={colors.red} /></Pressable>} />
          ))}
        </>
      ))}

      {tab === 'create' && (
        <View>
          <Card title="IDENTITY" subtitle="Name and describe">
            <LabeledInput label="Scenario name" value={name} onChange={setName} placeholder="e.g. Dry Season Survival" />
            <LabeledInput label="Description" value={description} onChange={setDescription} placeholder="What challenge does this scenario pose?" />
          </Card>

          <Card title="CATEGORY & DIFFICULTY" subtitle="Theme of the challenge">
            <Text style={s.fieldLabel}>Category</Text>
            <View style={s.chipWrap}>
              {CATEGORIES.map(c => (
                <Pressable key={c} onPress={() => setCategory(c)} style={[s.chip, category === c && s.chipActive]}>
                  <Text style={[s.chipText, category === c && s.chipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm }}>
              {(['Beginner','Intermediate','Advanced'] as const).map(d => (
                <Pressable key={d} onPress={() => setDifficulty(d)} style={[s.chip, difficulty === d && s.chipActive, { flex: 1 }]}>
                  <Text style={[s.chipText, difficulty === d && s.chipTextActive, { textAlign: 'center' }]}>{d}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Card title="DURATION" subtitle="How many sim days">
            <Stepper value={duration} unit=" days" min={1} max={730} step={10} onChange={setDuration} />
          </Card>

          <Card title="ADJUSTABLE VARIABLES" subtitle="What the learner can change">
            <View style={s.chipWrap}>
              {VARIABLES.map(v => (
                <Pressable key={v} onPress={() => toggleVar(v)} style={[s.chip, variables.includes(v) && s.chipActive]}>
                  <Text style={[s.chipText, variables.includes(v) && s.chipTextActive]}>{v}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Btn variant="primary" onPress={save} disabled={!name.trim() || !description.trim() || !variables.length} style={{ justifyContent: 'center' }}>
            Save scenario
          </Btn>
        </View>
      )}
    </Screen>
  );
}

function ScenarioCard({ sc, onRun, action, extraActions }: { sc: ScenarioRecord; onRun: () => void; action: string; extraActions?: any }) {
  return (
    <View style={s.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={s.iconBox}><Icon name="leaf" size={20} color={colors.green} /></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={s.diffTag}><Text style={s.diffText}>{sc.difficulty}</Text></View>
          {extraActions}
        </View>
      </View>
      <Text style={s.cat}>{sc.category}</Text>
      <Text style={s.name}>{sc.name}</Text>
      <Text style={s.desc} numberOfLines={3}>{sc.description}</Text>
      <View style={s.metaRow}>
        <Text style={s.meta}>{sc.duration} days</Text>
        <Text style={s.meta}>·</Text>
        <Text style={s.meta}>{sc.participatingFields.length} fields</Text>
      </View>
      <Btn onPress={onRun} style={{ justifyContent: 'center' }}>{action}</Btn>
    </View>
  );
}

const s = StyleSheet.create({
  eyebrow: { color: colors.green, fontFamily: 'JetBrainsMono_500Medium', fontSize: fontSizes.xs, letterSpacing: 1.4 },
  title: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: fontSizes.xxl },
  hint: { color: colors.muted, fontSize: fontSizes.sm, marginBottom: spacing.sm },
  tabs: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2 },
  tabActive: { backgroundColor: 'rgba(85,216,139,0.08)', borderColor: colors.green },
  tabLabel: { color: colors.muted, fontSize: fontSizes.sm, fontFamily: 'DMSans_500Medium' },
  tabLabelActive: { color: colors.green, fontFamily: 'DMSans_700Bold' },
  card: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: radius.xl, padding: spacing.md, gap: spacing.xs, marginBottom: spacing.md },
  iconBox: { width: 40, height: 40, borderRadius: radius.lg, backgroundColor: 'rgba(85,216,139,0.08)', alignItems: 'center', justifyContent: 'center' },
  diffTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: 'rgba(220,173,81,0.12)' },
  diffText: { color: colors.amber, fontSize: fontSizes.xs, fontFamily: 'JetBrainsMono_500Medium' },
  cat: { color: colors.green, fontSize: fontSizes.xs, fontFamily: 'JetBrainsMono_500Medium', letterSpacing: 0.8, marginTop: spacing.xs },
  name: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: fontSizes.md },
  desc: { color: colors.muted, fontSize: fontSizes.sm, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: spacing.xs, marginVertical: spacing.xs },
  meta: { color: colors.muted, fontSize: fontSizes.xs, fontFamily: 'JetBrainsMono_500Medium' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2 },
  chipActive: { backgroundColor: 'rgba(85,216,139,0.08)', borderColor: colors.green },
  chipText: { color: colors.muted, fontSize: fontSizes.xs },
  chipTextActive: { color: colors.green },
  fieldLabel: { color: colors.muted, fontSize: fontSizes.sm },
});
