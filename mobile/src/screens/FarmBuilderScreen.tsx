import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Screen, Card, Btn, Icon, LabeledInput, Stepper } from '../components/ui';
import { colors, spacing, radius, fontSizes } from '../theme';
import type { FarmConfig, FarmField, PersistedFarm, SoilType, CropType, IrrigationType, WaterSource, WaterSourceType } from '../types';

const SOILS: SoilType[] = ['sandy','clay','loamy','silt'];
const CROPS: CropType[] = ['maize','wheat','soybean','sunflower','vegetables','none'];
const IRS: IrrigationType[] = ['drip','sprinkler','flood','none'];
const WATERS: WaterSourceType[] = ['dam','borehole','river','reservoir'];
const SOIL_COLORS: Record<SoilType,string> = { sandy:'#665d36', clay:'#684436', loamy:'#345e35', silt:'#596148' };
const WATER_SLOTS = [[78,68],[78,14],[8,72],[50,76],[88,40],[60,4]];

export default function FarmBuilderScreen({ farm, onChange, onSave, onLoad, farms, onSimulate }: {
  farm: FarmConfig;
  onChange: (patch: Partial<FarmConfig>) => void;
  onSave: () => Promise<void>;
  onLoad: (f: PersistedFarm) => void;
  farms: PersistedFarm[];
  onSimulate: () => void;
}) {
  const { width: winW } = useWindowDimensions();
  const canvasW = winW - spacing.lg * 2;
  const canvasH = canvasW * 0.75;
  const [selection, setSelection] = useState<{type:'field'|'water', id:string}|null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const selField = selection?.type === 'field' ? farm.fields.find(f => f.id === selection.id) : undefined;
  const selWater = selection?.type === 'water' ? farm.waterSources.find(w => w.id === selection.id) : undefined;

  const addField = () => {
    if (farm.fields.length >= 6) return;
    const i = farm.fields.length;
    const f: FarmField = { id:`field-${Date.now()}`, name:`Field ${String.fromCharCode(65+i)}`, size:5, soil:'loamy', crop:'none', irrigation:'none', x:8+(i%3)*28, y:10+Math.floor(i/3)*39, width:24, height:30 };
    onChange({ fields: [...farm.fields, f] });
    setSelection({ type:'field', id:f.id });
  };
  const addWater = (type: WaterSourceType) => {
    const [x,y] = WATER_SLOTS[farm.waterSources.length % WATER_SLOTS.length];
    const w: WaterSource = { id:`water-${Date.now()}`, type, x, y };
    onChange({ waterSources: [...farm.waterSources, w] });
    setSelection({ type:'water', id:w.id });
  };
  const upField = (id: string, patch: Partial<FarmField>) => { onChange({ fields: farm.fields.map(f => f.id === id ? { ...f, ...patch } : f) }); setSaved(false); };
  const upWater = (id: string, patch: Partial<WaterSource>) => { onChange({ waterSources: farm.waterSources.map(w => w.id === id ? { ...w, ...patch } : w) }); setSaved(false); };
  const rmField = (id: string) => { onChange({ fields: farm.fields.filter(f => f.id !== id) }); setSelection(null); };
  const rmWater = (id: string) => { onChange({ waterSources: farm.waterSources.filter(w => w.id !== id) }); setSelection(null); };

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(); setSaved(true); } catch {}
    finally { setSaving(false); }
  };

  const canEnter = farm.fields.length > 0 && farm.waterSources.length > 0;
  const usedSize = farm.fields.reduce((s, f) => s + f.size, 0);

  return (
    <Screen>
      <View style={{ gap: 4, marginBottom: spacing.md }}>
        <Text style={s.eyebrow}>2 · FARM BUILDER</Text>
        <Text style={s.title}>Lay out your farm</Text>
        <Text style={s.hint}>{farm.fields.length} fields · {farm.waterSources.length} water · {usedSize}/{farm.totalSize} ha</Text>
      </View>

      <View style={[s.canvas, { width: canvasW, height: canvasH }]}>
        <Svg style={StyleSheet.absoluteFillObject} width={canvasW} height={canvasH}>
          {farm.waterSources.flatMap(w => farm.fields.filter(f => f.irrigation !== 'none').map(f => (
            <Line key={`${w.id}-${f.id}`}
              x1={(w.x/100)*canvasW} y1={(w.y/100)*canvasH}
              x2={((f.x+f.width/2)/100)*canvasW} y2={((f.y+f.height/2)/100)*canvasH}
              stroke="rgba(78,141,123,0.5)" strokeWidth={1} strokeDasharray="3 2" />
          )))}
        </Svg>

        {farm.fields.length === 0 && (
          <View style={s.empty}>
            <Icon name="field" size={32} color={colors.green} />
            <Text style={s.emptyTitle}>Your farm is empty</Text>
            <Text style={s.emptyHint}>Tap "Add field" to start</Text>
          </View>
        )}

        {farm.fields.map(f => {
          const active = selection?.type === 'field' && selection.id === f.id;
          return (
            <Pressable key={f.id} onPress={() => setSelection({ type:'field', id:f.id })}
              style={[s.field, { left:`${f.x}%`, top:`${f.y}%`, width:`${f.width}%`, height:`${f.height}%`, backgroundColor: SOIL_COLORS[f.soil] }, active && s.fieldActive]}>
              <Text style={s.fName} numberOfLines={1}>{f.name}</Text>
              <Text style={s.fMeta}>{f.size} ha</Text>
            </Pressable>
          );
        })}

        {farm.waterSources.map(w => {
          const active = selection?.type === 'water' && selection.id === w.id;
          return (
            <Pressable key={w.id} onPress={() => setSelection({ type:'water', id:w.id })}
              style={[s.wDot, { left:`${w.x}%`, top:`${w.y}%` }, active && s.wDotActive]}>
              <Icon name="water" size={16} color={colors.blue} />
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        <Btn onPress={addField} disabled={farm.fields.length >= 6 || usedSize >= farm.totalSize} style={{ flex:1, justifyContent:'center' }}>+ Field</Btn>
        <Btn onPress={() => addWater('dam')} style={{ flex:1, justifyContent:'center' }}>+ Water source</Btn>
      </View>

      {selField && (
        <View style={{ marginTop: spacing.md }}>
          <Card title="FIELD" subtitle={selField.name}>
            <LabeledInput label="Name" value={selField.name} onChange={v => upField(selField.id, { name:v })} />
            <View style={{ gap: spacing.xs }}>
              <Text style={s.label}>Size</Text>
              <Stepper value={selField.size} unit=" ha" min={1} max={Math.max(1, farm.totalSize - usedSize + selField.size)}
                onChange={v => upField(selField.id, { size:v, width:Math.min(40,18+v*0.7), height:Math.min(42,22+v*0.65) })} />
            </View>
            <Text style={s.label}>Soil</Text>
            <View style={s.chipRow}>
              {SOILS.map(x => <Pressable key={x} onPress={() => upField(selField.id,{soil:x})} style={[s.chip, selField.soil===x && s.chipActive]}><Text style={[s.chipT, selField.soil===x && s.chipTA]}>{x}</Text></Pressable>)}
            </View>
            <Text style={s.label}>Crop</Text>
            <View style={s.chipRow}>
              {CROPS.map(x => <Pressable key={x} onPress={() => upField(selField.id,{crop:x})} style={[s.chip, selField.crop===x && s.chipActive]}><Text style={[s.chipT, selField.crop===x && s.chipTA]}>{x}</Text></Pressable>)}
            </View>
            <Text style={s.label}>Irrigation</Text>
            <View style={s.chipRow}>
              {IRS.map(x => <Pressable key={x} onPress={() => upField(selField.id,{irrigation:x})} style={[s.chip, selField.irrigation===x && s.chipActive]}><Text style={[s.chipT, selField.irrigation===x && s.chipTA]}>{x}</Text></Pressable>)}
            </View>
            <Text style={s.label}>Position</Text>
            <View style={{ flexDirection:'row', gap: spacing.sm }}>
              <View style={{ flex:1, gap: spacing.xs }}><Text style={s.labelSmall}>X</Text><Stepper value={Math.round(selField.x)} unit="%" min={0} max={90} onChange={v => upField(selField.id,{x:v})} /></View>
              <View style={{ flex:1, gap: spacing.xs }}><Text style={s.labelSmall}>Y</Text><Stepper value={Math.round(selField.y)} unit="%" min={0} max={90} onChange={v => upField(selField.id,{y:v})} /></View>
            </View>
            <Btn onPress={() => rmField(selField.id)} style={{ justifyContent:'center', borderColor:'rgba(230,110,102,0.35)' }}><Text style={{ color: colors.red }}>Remove field</Text></Btn>
          </Card>
        </View>
      )}

      {selWater && (
        <View style={{ marginTop: spacing.md }}>
          <Card title="WATER SOURCE" subtitle={selWater.type}>
            <Text style={s.label}>Type</Text>
            <View style={s.chipRow}>
              {WATERS.map(x => <Pressable key={x} onPress={() => upWater(selWater.id,{type:x})} style={[s.chip, selWater.type===x && s.chipActive]}><Text style={[s.chipT, selWater.type===x && s.chipTA]}>{x}</Text></Pressable>)}
            </View>
            <Text style={s.label}>Position</Text>
            <View style={{ flexDirection:'row', gap: spacing.sm }}>
              <View style={{ flex:1, gap: spacing.xs }}><Text style={s.labelSmall}>X</Text><Stepper value={Math.round(selWater.x)} unit="%" min={0} max={90} onChange={v => upWater(selWater.id,{x:v})} /></View>
              <View style={{ flex:1, gap: spacing.xs }}><Text style={s.labelSmall}>Y</Text><Stepper value={Math.round(selWater.y)} unit="%" min={0} max={90} onChange={v => upWater(selWater.id,{y:v})} /></View>
            </View>
            <Btn onPress={() => rmWater(selWater.id)} style={{ justifyContent:'center', borderColor:'rgba(230,110,102,0.35)' }}><Text style={{ color: colors.red }}>Remove source</Text></Btn>
          </Card>
        </View>
      )}

      <View style={{ flexDirection:'row', gap: spacing.sm, marginTop: spacing.md }}>
        <Btn onPress={handleSave} disabled={!canEnter || saving} style={{ flex:1, justifyContent:'center' }}>{saving ? 'Saving…' : (saved ? 'Saved ✓' : 'Save farm')}</Btn>
        <Btn variant="primary" onPress={onSimulate} disabled={!canEnter} style={{ flex:1, justifyContent:'center' }}>Simulate →</Btn>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  eyebrow: { color: colors.green, fontFamily: 'JetBrainsMono_500Medium', fontSize: fontSizes.xs, letterSpacing: 1.4 },
  title: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: fontSizes.xxl },
  hint: { color: colors.muted, fontSize: fontSizes.sm },
  canvas: { backgroundColor: '#0f2018', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', position: 'relative' },
  empty: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyTitle: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: fontSizes.md },
  emptyHint: { color: colors.muted, fontSize: fontSizes.xs },
  field: { position: 'absolute', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(145,184,131,0.4)', padding: 6, justifyContent: 'flex-end' },
  fieldActive: { borderColor: colors.green, borderWidth: 2 },
  fName: { color: 'white', fontSize: 10, fontFamily: 'JetBrainsMono_500Medium' },
  fMeta: { color: 'rgba(255,255,255,0.75)', fontSize: 9 },
  wDot: { position: 'absolute', width: 32, height: 32, borderRadius: 16, backgroundColor: '#173e45', borderWidth: 2, borderColor: '#4b92a0', alignItems: 'center', justifyContent: 'center', transform: [{ translateX: -16 }, { translateY: -16 }] },
  wDotActive: { borderColor: colors.blue, borderWidth: 3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs, marginBottom: spacing.sm },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2 },
  chipActive: { backgroundColor: 'rgba(85,216,139,0.08)', borderColor: colors.green },
  chipT: { color: colors.muted, fontSize: fontSizes.xs },
  chipTA: { color: colors.green },
  label: { color: colors.muted, fontSize: fontSizes.sm, marginTop: spacing.sm },
  labelSmall: { color: colors.muted, fontSize: fontSizes.xs },
});
