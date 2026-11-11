import { useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { Btn } from './ui';
import { colors, spacing, radius, fontSizes } from '../theme';
import { api, type EngineOutput } from '../lib/api';

const PRESETS = [
  { label: 'Baseline', irr: 550, fer: 180, offset: 0 },
  { label: '20% less water', irr: 440, fer: 180, offset: 0 },
  { label: 'Max fertiliser', irr: 550, fer: 300, offset: 0 },
  { label: 'Late planting', irr: 550, fer: 180, offset: 30 },
];

export default function EngineModal({ farmName, scenarioName, onClose }: {
  farmName: string; scenarioName?: string; onClose: () => void;
}) {
  const [irr, setIrr] = useState(550);
  const [fer, setFer] = useState(180);
  const [offset, setOffset] = useState(0);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<{ scenario: EngineOutput; baseline: EngineOutput } | null>(null);

  const run = async () => {
    setErr(''); setRes(null); setPending(true);
    try {
      const d = new Date('2026-10-15T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + offset);
      const r = await api.demoRun({ irrigationMm: irr, fertiliserKgHa: fer, plantingDate: d.toISOString().slice(0,10) });
      setRes(r);
    } catch (e: any) { setErr(e.message); }
    finally { setPending(false); }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }}>
            <View style={s.header}>
              <View style={{ flex: 1 }}>
                <Text style={s.eyebrow}>A14 ENGINE</Text>
                <Text style={s.title} numberOfLines={1}>{farmName}{scenarioName ? ` · ${scenarioName}` : ''}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}><Text style={s.close}>×</Text></Pressable>
            </View>

            <View style={s.presets}>
              {PRESETS.map(p => {
                const active = p.irr === irr && p.fer === fer && p.offset === offset;
                return (
                  <Pressable key={p.label} onPress={() => { setIrr(p.irr); setFer(p.fer); setOffset(p.offset); }} style={[s.preset, active && s.presetActive]}>
                    <Text style={[s.presetT, active && s.presetTA]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Slider label="Irrigation" value={irr} min={0} max={900} step={10} unit=" mm" onChange={setIrr} />
            <Slider label="Fertiliser" value={fer} min={0} max={300} step={10} unit=" kg/ha" onChange={setFer} />
            <Slider label="Planting offset" value={offset} min={-30} max={60} step={1} unit=" days" signed onChange={setOffset} />

            <Btn variant="primary" onPress={run} disabled={pending} style={{ justifyContent: 'center', marginTop: spacing.md }}>
              {pending ? 'Running…' : 'Run engine'}
            </Btn>

            {!!err && <Text style={s.err}>{err}</Text>}

            {res && (
              <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                <Text style={s.eyebrow}>ENGINE OUTPUT · vs baseline</Text>
                <View style={s.grid}>
                  <Cell label="Yield"        value={res.scenario.yieldTha} baseline={res.baseline.yieldTha} unit="t/ha" prec={2} />
                  <Cell label="Water use"    value={res.scenario.waterUseM3Ha} baseline={res.baseline.waterUseM3Ha} unit="m³/ha" prec={0} />
                  <Cell label="Cost"         value={res.scenario.costPerHa} baseline={res.baseline.costPerHa} unit="R/ha" prec={0} />
                  <Cell label="Gross margin" value={res.scenario.grossMarginPerHa} baseline={res.baseline.grossMarginPerHa} unit="R/ha" prec={0} />
                </View>
                <Text style={s.disclaimer}>{res.scenario.disclaimer}</Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Slider({ label, value, min, max, step, unit, signed, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; signed?: boolean; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <View style={{ marginTop: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={s.sLabel}>{label}</Text>
        <Text style={s.sVal}>{signed && value >= 0 ? '+' : ''}{value}{unit}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable onPress={dec} style={s.sBtn}><Text style={s.sBtnT}>−</Text></Pressable>
        <View style={s.sTrack}><View style={[s.sFill, { width: `${pct}%` }]} /></View>
        <Pressable onPress={inc} style={s.sBtn}><Text style={s.sBtnT}>+</Text></Pressable>
      </View>
    </View>
  );
}

function Cell({ label, value, baseline, unit, prec }: { label: string; value: number; baseline: number; unit: string; prec: number }) {
  const diff = value - baseline;
  const pct = baseline !== 0 ? (diff / baseline) * 100 : 0;
  const tone = diff > 0.005 ? colors.green : diff < -0.005 ? colors.red : colors.muted;
  const arrow = diff > 0.005 ? '↑' : diff < -0.005 ? '↓' : '·';
  return (
    <View style={s.cell}>
      <Text style={s.cellLabel}>{label}</Text>
      <Text style={s.cellValue}>{value.toFixed(prec)}<Text style={s.cellUnit}> {unit}</Text></Text>
      <Text style={[s.cellDelta, { color: tone }]}>{arrow} {pct === 0 ? 'no change' : `${Math.abs(pct).toFixed(1)}%`}</Text>
      <Text style={s.cellBase}>baseline {baseline.toFixed(prec)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.panel, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg, maxHeight: '85%' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
  eyebrow: { color: colors.muted, fontSize: fontSizes.xs, fontFamily: 'JetBrainsMono_500Medium', letterSpacing: 1.2 },
  title: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: fontSizes.lg, marginTop: 2 },
  close: { color: colors.muted, fontSize: 28, lineHeight: 28 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  preset: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2 },
  presetActive: { backgroundColor: 'rgba(85,216,139,0.12)', borderColor: colors.green },
  presetT: { color: colors.muted, fontSize: fontSizes.sm },
  presetTA: { color: colors.green, fontFamily: 'DMSans_500Medium' },
  sLabel: { color: colors.muted, fontSize: fontSizes.sm, fontFamily: 'JetBrainsMono_500Medium' },
  sVal: { color: colors.text, fontSize: fontSizes.sm, fontFamily: 'JetBrainsMono_500Medium' },
  sBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.line },
  sBtnT: { color: colors.text, fontSize: 18 },
  sTrack: { flex: 1, height: 6, backgroundColor: colors.panel2, borderRadius: 3, overflow: 'hidden' },
  sFill: { height: '100%', backgroundColor: colors.green },
  err: { color: colors.red, fontSize: fontSizes.sm, marginTop: spacing.sm, padding: spacing.sm, backgroundColor: 'rgba(230,110,102,0.1)', borderRadius: radius.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: '48%', padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.line },
  cellLabel: { color: colors.muted, fontSize: fontSizes.xs, fontFamily: 'JetBrainsMono_500Medium', letterSpacing: 1 },
  cellValue: { color: colors.text, fontSize: fontSizes.lg, fontFamily: 'Manrope_700Bold', marginTop: 4 },
  cellUnit: { fontSize: fontSizes.xs, color: colors.muted },
  cellDelta: { fontSize: fontSizes.xs, marginTop: 2, fontFamily: 'JetBrainsMono_500Medium' },
  cellBase: { color: colors.faint, fontSize: fontSizes.xs, marginTop: 2 },
  disclaimer: { color: colors.amber, fontSize: fontSizes.xs, padding: spacing.sm, backgroundColor: 'rgba(220,173,81,0.08)', borderLeftWidth: 3, borderLeftColor: colors.amber, borderRadius: radius.sm, marginTop: spacing.sm },
});
