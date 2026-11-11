import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, TextInput, Alert, StyleSheet } from 'react-native';
import Svg, { Polyline, Polygon, Path, Line } from 'react-native-svg';
import { Screen, Card, Btn, Icon } from '../components/ui';
import { colors, spacing, radius, fontSizes } from '../theme';
import { api } from '../lib/api';
import SensorPanel from '../components/SensorPanel';
import type { RunRecord, EngineOutput } from '../types';

type Exercise = { id: string; moduleCode: string; title: string; prompt: string; passScore: number };
type Criterion = { key: string; label: string; weight: number; earned: number; satisfied: boolean };
type SubmitResult = { score: number; passed: boolean; passScore: number; breakdown: Criterion[] };

export default function ResultsScreen({ run, runs, onSelect }: {
  run: RunRecord | null; runs: RunRecord[]; onSelect: (r: RunRecord) => void;
}) {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [reflection, setReflection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitRes, setSubmitRes] = useState<SubmitResult | null>(null);
  const [submitErr, setSubmitErr] = useState('');

  useEffect(() => {
    api.listExercises().then(list => { if (list.length > 0) setExercise(list[0]); }).catch(() => {});
  }, []);

  if (!run) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: spacing.md }}>
          <Icon name="chart" size={40} color={colors.green} />
          <Text style={s.eyebrow}>NO RESULTS YET</Text>
          <Text style={s.title}>Run a simulation first</Text>
          <Text style={[s.hint, { textAlign: 'center', maxWidth: 280 }]}>
            Results appear here when you finish a simulation run.
          </Text>
        </View>
      </Screen>
    );
  }

  const sc = run.scores;
  const dec = run.decisions;
  const eng = run.engineResults;
  const base = run.engineBaseline;
  const wordCount = reflection.trim().split(/\s+/).filter(Boolean).length;
  const canSubmit = !!run.serverId && wordCount >= 5 && !submitting;

  const submitReflection = async () => {
    if (!exercise || !run.serverId) return;
    setSubmitting(true); setSubmitErr('');
    try {
      const res = await api.submitExercise(exercise.id, { runId: run.serverId, reflection });
      setSubmitRes(res);
    } catch (e: any) { setSubmitErr(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <Screen>
      <View style={{ gap: 4, marginBottom: spacing.lg }}>
        <Text style={s.eyebrow}>5 · RESULTS & LEARNING</Text>
        <Text style={s.title}>{run.scenarioName}</Text>
        <Text style={s.hint}>{run.farmName} · {run.complete ? 'Completed' : `Day ${run.dayReached}/${run.duration}`}</Text>
      </View>

      {/* A14 ENGINE — real backend output */}
      {eng && base && (
        <Card title="A14 ENGINE · REAL FAO-56 OUTPUT" subtitle="scenario vs baseline">
          <KpiGrid items={[
            { label: 'YIELD',       value: eng.yieldTha.toFixed(2), unit: 't/ha',  sub: `baseline ${base.yieldTha.toFixed(2)}` },
            { label: 'WATER USE',   value: eng.waterUseM3Ha.toFixed(0), unit: 'm³/ha', sub: `baseline ${base.waterUseM3Ha.toFixed(0)}` },
            { label: 'COST',        value: 'R' + eng.costPerHa.toFixed(0), unit: '/ha', sub: `baseline R${base.costPerHa.toFixed(0)}` },
            { label: 'GROSS MARGIN',value: 'R' + eng.grossMarginPerHa.toFixed(0), unit: '/ha', sub: `baseline R${base.grossMarginPerHa.toFixed(0)}` },
          ]} />
          <Text style={s.disclaimer}>{eng.disclaimer}</Text>
        </Card>
      )}

      {/* Sensor readings */}
      {run.details?.fields?.[0]?.id && (
        <Card title="SENSOR READINGS" subtitle="90 days of synthetic field data">
          <SensorPanel fieldId={run.details.fields[0].id} />
        </Card>
      )}

      {/* Teaching scores */}
      <Card title="SIMULATOR SCORES" subtitle="teaching layer">
        <KpiGrid items={[
          { label: 'OVERALL',   value: sc.overall, unit: '/100', sub: grade(sc.overall) },
          { label: 'MOISTURE',  value: sc.moisture, unit: '/100', sub: grade(sc.moisture) },
          { label: 'WATER',     value: sc.water, unit: '/100', sub: grade(sc.water) },
          { label: 'NUTRIENTS', value: sc.nutrients, unit: '/100', sub: grade(sc.nutrients) },
        ]} />
      </Card>

      {/* Trends */}
      <Card title="WHAT HAPPENED" subtitle="season over time">
        <TrendChart title="Soil moisture (%)" points={run.series.map(p => p.moisture)} target={dec.targetMoisture} color={colors.green} />
        <TrendChart title="Crop growth (%)"   points={run.series.map(p => p.growth)}   color={colors.blue} />
        <TrendChart title="Water used (m³)"   points={run.series.map(p => p.water)}    color={colors.amber} />
      </Card>

      {/* Decisions */}
      <Card title="YOUR DECISIONS" subtitle="what you set">
        <DecisionRow label="Target moisture" value={dec.targetMoisture + '%'} />
        <DecisionRow label="Flow rate"       value={dec.flowRate + ' L/min'} />
        <DecisionRow label="Nitrogen"        value={dec.nitrogen + ' kg/ha'} />
      </Card>

      {/* Reflection */}
      {exercise && (
        <Card title={`SCORED EXERCISE · ${exercise.moduleCode}`} subtitle={exercise.title}>
          <Text style={s.hint}>{exercise.prompt}</Text>
          {!submitRes && (
            <>
              <TextInput
                style={s.textarea}
                value={reflection}
                onChangeText={setReflection}
                placeholder="Write your reflection (5+ words)..."
                placeholderTextColor={colors.faint}
                multiline
                editable={!submitting}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Btn variant="primary" onPress={submitReflection} disabled={!canSubmit}>
                  {submitting ? 'Submitting…' : 'Submit reflection'}
                </Btn>
                <Text style={s.hint}>{wordCount} words</Text>
              </View>
              {!run.serverId && <Text style={{ color: colors.amber, fontSize: fontSizes.xs }}>Waiting for backend to save this run…</Text>}
              {!!submitErr && <Text style={{ color: colors.red, fontSize: fontSizes.sm }}>{submitErr}</Text>}
            </>
          )}
          {submitRes && (
            <View style={{ gap: spacing.sm }}>
              <KpiGrid items={[
                { label: 'SCORE', value: submitRes.score, unit: '/100', sub: '' },
                { label: 'PASS MARK', value: submitRes.passScore, unit: '/100', sub: '' },
                { label: 'RESULT', value: submitRes.passed ? 'PASS' : 'FAIL', unit: '', sub: '' },
              ]} />
              {submitRes.breakdown.map(c => (
                <View key={c.key} style={s.breakdownRow}>
                  <Text style={[s.critLabel, { color: c.satisfied ? colors.green : colors.muted }]}>{c.label}</Text>
                  <Text style={s.critValue}>{c.earned}/{c.weight}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* Run history */}
      {runs.length > 1 && (
        <Card title="RUN HISTORY" subtitle={`${runs.length} saved`}>
          {runs.slice(0, 5).map(r => (
            <Pressable key={r.id} onPress={() => onSelect(r)} style={[s.histRow, r.id === run.id && s.histActive]}>
              <View style={{ flex: 1 }}>
                <Text style={s.histName}>{r.scenarioName}</Text>
                <Text style={s.hint}>{new Date(r.finishedAt).toLocaleString()}</Text>
              </View>
              <Text style={s.histScore}>{r.scores.overall}</Text>
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function KpiGrid({ items }: { items: { label: string; value: any; unit: string; sub: string }[] }) {
  return (
    <View style={s.kpiGrid}>
      {items.map(k => (
        <View key={k.label} style={s.kpiBox}>
          <Text style={s.kpiLabel}>{k.label}</Text>
          <Text style={s.kpiValue}>{k.value}<Text style={s.kpiUnit}>{k.unit}</Text></Text>
          {!!k.sub && <Text style={s.kpiSub}>{k.sub}</Text>}
        </View>
      ))}
    </View>
  );
}

function DecisionRow({ label, value }: { label: string; value: string }) {
  return <View style={s.decRow}><Text style={s.decLabel}>{label}</Text><Text style={s.decValue}>{value}</Text></View>;
}

function TrendChart({ title, points, target, color }: { title: string; points: number[]; target?: number; color: string }) {
  if (!points.length) return null;
  const W = 280, H = 80, PAD = 6;
  const max = Math.max(1, target ?? 0, ...points);
  const stepX = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const poly = points.map((v, i) => `${PAD + i * stepX},${H - PAD - (v / max) * (H - PAD * 2)}`).join(' ');
  const area = `${PAD},${H - PAD} ${poly} ${PAD + (points.length - 1) * stepX},${H - PAD}`;
  const targetY = target !== undefined ? H - PAD - (target / max) * (H - PAD * 2) : null;

  return (
    <View style={{ gap: 4, marginBottom: spacing.md }}>
      <Text style={s.chartTitle}>{title}{target !== undefined ? ` · target ${target}` : ''}</Text>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Path d={`M${PAD} ${H * 0.25}H${W - PAD}M${PAD} ${H * 0.5}H${W - PAD}M${PAD} ${H * 0.75}H${W - PAD}`} stroke="rgba(175,211,198,0.08)" strokeWidth={1} fill="none" />
        {targetY !== null && <Line x1={PAD} x2={W - PAD} y1={targetY} y2={targetY} stroke={colors.amber} strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />}
        <Polygon points={area} fill={color} opacity={0.12} />
        <Polyline points={poly} fill="none" stroke={color} strokeWidth={2} />
      </Svg>
    </View>
  );
}

const grade = (n: number) => n >= 85 ? 'Excellent' : n >= 70 ? 'Good' : n >= 55 ? 'Fair' : 'Needs work';

const s = StyleSheet.create({
  eyebrow: { color: colors.green, fontFamily: 'JetBrainsMono_500Medium', fontSize: fontSizes.xs, letterSpacing: 1.4 },
  title: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: fontSizes.xxl },
  hint: { color: colors.muted, fontSize: fontSizes.sm, lineHeight: 18 },
  disclaimer: { color: colors.amber, fontSize: fontSizes.xs, marginTop: spacing.sm, padding: spacing.sm, backgroundColor: 'rgba(220,173,81,0.08)', borderRadius: radius.sm, borderLeftWidth: 3, borderLeftColor: colors.amber },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kpiBox: { width: '48%', padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.line, gap: 2 },
  kpiLabel: { color: colors.faint, fontSize: 9, fontFamily: 'JetBrainsMono_500Medium', letterSpacing: 1 },
  kpiValue: { color: colors.text, fontSize: fontSizes.xl, fontFamily: 'Manrope_700Bold' },
  kpiUnit: { fontSize: fontSizes.sm, color: colors.muted, fontFamily: 'DMSans_400Regular' },
  kpiSub: { color: colors.muted, fontSize: fontSizes.xs },
  chartTitle: { color: colors.text, fontFamily: 'DMSans_500Medium', fontSize: fontSizes.sm },
  decRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
  decLabel: { color: colors.muted, fontSize: fontSizes.sm },
  decValue: { color: colors.text, fontSize: fontSizes.sm, fontFamily: 'JetBrainsMono_500Medium' },
  textarea: { minHeight: 100, backgroundColor: '#08120f', color: colors.text, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, fontSize: fontSizes.md, fontFamily: 'DMSans_400Regular', textAlignVertical: 'top' },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line },
  critLabel: { fontSize: fontSizes.sm },
  critValue: { fontSize: fontSizes.sm, fontFamily: 'JetBrainsMono_500Medium', color: colors.text },
  histRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2, marginBottom: spacing.xs },
  histActive: { borderColor: colors.green },
  histName: { color: colors.text, fontSize: fontSizes.sm, fontFamily: 'DMSans_500Medium' },
  histScore: { color: colors.green, fontSize: fontSizes.lg, fontFamily: 'Manrope_700Bold' },
});
