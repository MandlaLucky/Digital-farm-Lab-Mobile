import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Screen, Card, Btn, Icon } from '../components/ui';
import { colors, spacing, radius, fontSizes } from '../theme';
import { api } from '../lib/api';
import type { FarmConfig, ScenarioRecord, RunRecord } from '../types';

const SOIL_COLORS: Record<string,string> = { sandy:'#665d36', clay:'#684436', loamy:'#345e35', silt:'#596148' };
type Status = 'idle' | 'running' | 'paused' | 'complete';

export default function SimulationScreen({ farm, scenario, onFinish }: {
  farm: FarmConfig;
  scenario?: ScenarioRecord;
  onFinish: (run: RunRecord) => void;
}) {
  const { width: winW } = useWindowDimensions();
  const canvasW = winW - spacing.lg * 2;
  const canvasH = canvasW * 0.65;

  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [flowRate, setFlowRate] = useState(22);
  const [nitrogen, setNitrogen] = useState(118);
  const [targetMoisture, setTargetMoisture] = useState(62);
  const [finishing, setFinishing] = useState(false);
  const [msg, setMsg] = useState('');

  const samplesRef = useRef<{ day:number; moisture:number; growth:number; water:number }[]>([]);
  const moistureAccRef = useRef({ sum:0, n:0 });
  const lastSampleRef = useRef(-10);

  useEffect(() => {
    if (status !== 'running') return;
    const t = setInterval(() => {
      setProgress(p => {
        const n = Math.min(100, p + 0.4 * speed);
        if (n >= 100) setStatus('complete');
        return n;
      });
    }, 80);
    return () => clearInterval(t);
  }, [status, speed]);

  const startingMoisture = scenario?.startingConditions.soilMoisture ?? 37;
  const startingTemp = scenario?.startingConditions.temperature ?? farm.temperature;
  const moisture = Math.round(Math.min(92, startingMoisture + progress * 0.18 + Math.sin(progress/5) * 5));
  const temperature = Number((startingTemp + Math.sin(progress/13) * (farm.weather==='hot'?6.2:4.1)).toFixed(1));
  const humidity = Math.round(Math.max(0, Math.min(100, farm.humidity - Math.sin(progress/11) * 10)));
  const growth = Math.round(Math.min(100, progress * 0.92));
  const waterUsed = Math.round(progress * flowRate * 0.84);
  const stage = progress < 10 ? 'Seedbed' : progress < 28 ? 'Emergence' : progress < 55 ? 'Vegetative' : progress < 78 ? 'Tasseling' : 'Maturity';

  useEffect(() => {
    if (progress === 0) { samplesRef.current = []; lastSampleRef.current = -10; moistureAccRef.current = { sum:0, n:0 }; return; }
    moistureAccRef.current.sum += Math.abs(moisture - targetMoisture);
    moistureAccRef.current.n += 1;
    if (progress - lastSampleRef.current >= 2 || progress >= 100) {
      lastSampleRef.current = progress;
      const duration = scenario?.duration ?? 120;
      samplesRef.current.push({ day: Math.max(1, Math.ceil(progress * (duration/100))), moisture, growth, water: waterUsed });
    }
  }, [progress]);

  const finish = async () => {
    setFinishing(true); setMsg('');
    const clamp = (n:number) => Math.max(0, Math.min(100, Math.round(n)));
    const avgGap = moistureAccRef.current.n ? moistureAccRef.current.sum / moistureAccRef.current.n : 0;
    const teachingScores = {
      moisture: clamp(100 - avgGap * 2.2),
      water: clamp(100 - Math.abs(flowRate - 22) * 3.5),
      nutrients: clamp(100 - Math.abs(nitrogen - 120) * 0.9),
      overall: 0,
    };
    teachingScores.overall = Math.round((teachingScores.moisture + teachingScores.water + teachingScores.nutrients) / 3);

    let engineResults = undefined, engineBaseline = undefined, scores = { ...teachingScores };
    try {
      const res = await api.demoRun({ irrigationMm: Math.round(flowRate*20), fertiliserKgHa: Math.round(nitrogen), plantingDate: '2026-10-15' });
      engineResults = res.scenario; engineBaseline = res.baseline;
      const yR = res.scenario.yieldTha / Math.max(0.01, res.baseline.yieldTha);
      const wR = res.baseline.waterUseM3Ha / Math.max(0.01, res.scenario.waterUseM3Ha);
      const mR = res.scenario.grossMarginPerHa / Math.max(0.01, res.baseline.grossMarginPerHa);
      scores = {
        moisture: clamp(yR*100),
        water: clamp(wR*100),
        nutrients: clamp(mR*100),
        overall: clamp(((yR+wR+mR)/3)*100),
      };
    } catch (e:any) { setMsg('Engine offline: ' + e.message); }

    const duration = scenario?.duration ?? 120;
    const localId = `run-${Date.now()}`;
    const localRun: RunRecord = {
      id: localId,
      scenarioId: scenario?.id,
      finishedAt: new Date().toISOString(),
      complete: progress >= 100,
      farmName: farm.name || 'Unnamed farm',
      scenarioName: scenario?.name || 'Free simulation',
      category: scenario?.category || 'Free play',
      difficulty: scenario?.difficulty || 'Open',
      duration,
      dayReached: Math.max(1, Math.ceil(progress * (duration/100))),
      series: samplesRef.current.length ? samplesRef.current : [{ day:1, moisture, growth, water:waterUsed }],
      decisions: { targetMoisture, flowRate, nitrogen },
      metrics: { moisture, growth, waterUsed, yieldTHa: engineResults ? engineResults.yieldTha : Number((3.5 + growth/100*8.5).toFixed(1)), stress: Math.max(2, 18 - Math.round(progress/8)) },
      scores,
      objectives: (scenario?.learningObjectives || []).map((text, i) => ({ text, achieved: progress >= 60 && scores.overall >= 55 + i*6 })),
      engineResults, engineBaseline,
    };

    try {
      const saved = await api.createRun({
        scenarioId: scenario?.id || null,
        params: { irrigationMm: Math.round(flowRate*20), fertiliserKgHa: Math.round(nitrogen), plantingDate: '2026-10-15', irrigationReductionPct: Math.max(0, Math.min(100, Math.round(((22-flowRate)/22)*100))) },
        record: localRun,
      });
      localRun.serverId = saved.id;
      localRun.engineResults = saved.results;
      localRun.engineBaseline = saved.baseline;
    } catch (e:any) { setMsg('Run save failed: ' + e.message); }

    setFinishing(false);
    onFinish(localRun);
  };

  const reset = () => { setStatus('idle'); setProgress(0); samplesRef.current = []; lastSampleRef.current = -10; moistureAccRef.current = { sum:0, n:0 }; };

  return (
    <Screen>
      <View style={{ gap: 4, marginBottom: spacing.md }}>
        <Text style={s.eyebrow}>4 · SIMULATION WORKSPACE</Text>
        <Text style={s.title}>{scenario?.name || farm.name || 'Free simulation'}</Text>
        <Text style={s.hint}>Day {Math.max(1, Math.ceil(progress * ((scenario?.duration ?? 120)/100)))} of {scenario?.duration ?? 120} · {stage}</Text>
      </View>

      {!!msg && <Text style={{ color: colors.amber, fontSize: fontSizes.xs, marginBottom: spacing.sm }}>{msg}</Text>}

      {/* Canvas */}
      <View style={[s.canvas, { width: canvasW, height: canvasH }]}>
        {farm.fields.map(f => (
          <View key={f.id} style={[s.field, { left:`${f.x}%`, top:`${f.y}%`, width:`${f.width}%`, height:`${f.height}%`, backgroundColor: SOIL_COLORS[f.soil] || '#345e35' }]}>
            <Text style={s.fName}>{f.name}</Text>
            <Text style={s.fMoisture}>{Math.max(25, Math.min(88, moisture))}%</Text>
          </View>
        ))}
        {farm.waterSources.map(w => (
          <View key={w.id} style={[s.water, { left:`${w.x}%`, top:`${w.y}%` }]}>
            <Icon name="water" size={16} color={colors.blue} />
            <Text style={s.wLabel}>{Math.round(84 - progress*0.12)}%</Text>
          </View>
        ))}
        {status === 'running' && <View style={s.liveDot} />}
      </View>

      {/* Live measurements */}
      <View style={{ marginTop: spacing.md, flexDirection:'row', flexWrap:'wrap', gap: spacing.sm }}>
        <Kpi label="SOIL MOISTURE" value={moisture} unit="%" sub={`Target ${targetMoisture}%`} />
        <Kpi label="GROWTH" value={growth} unit="%" sub={stage} />
        <Kpi label="TEMP" value={temperature} unit="°C" sub={`RH ${humidity}%`} />
        <Kpi label="WATER USED" value={waterUsed} unit="m³" sub={`Flow ${flowRate} L/min`} />
      </View>

      {/* Progress */}
      <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
        <Text style={s.label}>PROGRESS · {Math.round(progress)}%</Text>
        <View style={s.track}><View style={[s.fill, { width:`${progress}%` }]} /></View>
      </View>

      {/* Parameters */}
      {status === 'idle' && (
        <Card title="PARAMETERS" subtitle="adjust before starting">
          <View style={{ gap: spacing.xs }}><Text style={s.label}>Flow rate</Text><MiniStepper value={flowRate} unit=" L/min" min={0} max={60} onChange={setFlowRate} /></View>
          <View style={{ gap: spacing.xs }}><Text style={s.label}>Nitrogen</Text><MiniStepper value={nitrogen} unit=" kg/ha" min={0} max={300} step={5} onChange={setNitrogen} /></View>
          <View style={{ gap: spacing.xs }}><Text style={s.label}>Target moisture</Text><MiniStepper value={targetMoisture} unit="%" min={20} max={90} onChange={setTargetMoisture} /></View>
        </Card>
      )}

      {/* Speed */}
      {status === 'running' && (
        <View style={{ flexDirection:'row', gap: 4, marginTop: spacing.sm }}>
          <Text style={s.label}>SPEED</Text>
          {[1,2,5,10].map(x => <Pressable key={x} onPress={() => setSpeed(x)} style={[s.speedChip, speed===x && s.speedChipActive]}><Text style={[s.speedT, speed===x && s.speedTA]}>{x}×</Text></Pressable>)}
        </View>
      )}

      {/* Controls */}
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap: spacing.sm, marginTop: spacing.md }}>
        <Btn variant="primary" onPress={() => { if (progress>=100) reset(); setStatus('running'); }} disabled={status==='running'} style={{ flex:1, justifyContent:'center' }}>▶ Start</Btn>
        <Btn onPress={() => setStatus('paused')} disabled={status!=='running'} style={{ flex:1, justifyContent:'center' }}>⏸ Pause</Btn>
        <Btn onPress={() => setStatus('running')} disabled={status!=='paused'} style={{ flex:1, justifyContent:'center' }}>▶ Resume</Btn>
        <Btn onPress={reset} style={{ flex:1, justifyContent:'center' }}>↻ Reset</Btn>
      </View>

      <View style={{ marginTop: spacing.sm }}>
        <Btn onPress={finish} disabled={progress <= 0 || finishing} style={{ justifyContent:'center', backgroundColor: progress>0?colors.green:undefined, borderColor: progress>0?colors.green:undefined }}>
          <Text style={{ color: progress>0 ? colors.bg : colors.text, fontFamily:'DMSans_700Bold' }}>
            {finishing ? 'Finishing…' : (status==='complete' ? 'View results →' : 'Finish & view results →')}
          </Text>
        </Btn>
      </View>
    </Screen>
  );
}

function Kpi({ label, value, unit, sub }: { label:string; value:any; unit:string; sub:string }) {
  return <View style={s.kpiBox}><Text style={s.kpiLabel}>{label}</Text><Text style={s.kpiValue}>{value}<Text style={s.kpiUnit}>{unit}</Text></Text><Text style={s.kpiSub}>{sub}</Text></View>;
}

function MiniStepper({ value, unit, min, max, step=1, onChange }: { value:number; unit:string; min:number; max:number; step?:number; onChange:(v:number)=>void }) {
  return (
    <View style={s.stepper}>
      <Pressable onPress={() => onChange(Math.max(min, value - step))} style={s.stepBtn}><Text style={s.stepT}>−</Text></Pressable>
      <Text style={s.stepVal}>{value}{unit}</Text>
      <Pressable onPress={() => onChange(Math.min(max, value + step))} style={s.stepBtn}><Text style={s.stepT}>+</Text></Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  eyebrow: { color: colors.green, fontFamily:'JetBrainsMono_500Medium', fontSize: fontSizes.xs, letterSpacing:1.4 },
  title: { color: colors.text, fontFamily:'Manrope_700Bold', fontSize: fontSizes.xxl },
  hint: { color: colors.muted, fontSize: fontSizes.sm },
  label: { color: colors.muted, fontSize: fontSizes.sm, fontFamily:'JetBrainsMono_500Medium' },
  canvas: { backgroundColor:'#0f2018', borderRadius: radius.lg, borderWidth:1, borderColor: colors.line, overflow:'hidden', position:'relative' },
  field: { position:'absolute', borderRadius:6, borderWidth:1, borderColor:'rgba(145,184,131,0.4)', padding:4 },
  fName: { color:'white', fontSize:9, fontFamily:'JetBrainsMono_500Medium' },
  fMoisture: { color:'#8ccbe5', fontSize:9, marginTop:2 },
  water: { position:'absolute', width:36, height:36, borderRadius:18, backgroundColor:'#173e45', borderWidth:2, borderColor:'#4b92a0', alignItems:'center', justifyContent:'center', transform:[{translateX:-18},{translateY:-18}] },
  wLabel: { color:'#71a3ab', fontSize:7, marginTop:1 },
  liveDot: { position:'absolute', top:8, right:8, width:8, height:8, borderRadius:4, backgroundColor: colors.green },
  kpiBox: { width:'48%', padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.panel2, borderWidth:1, borderColor: colors.line, gap:2 },
  kpiLabel: { color: colors.faint, fontSize:9, fontFamily:'JetBrainsMono_500Medium', letterSpacing:1 },
  kpiValue: { color: colors.text, fontSize: fontSizes.xl, fontFamily:'Manrope_700Bold' },
  kpiUnit: { fontSize: fontSizes.sm, color: colors.muted, fontFamily:'DMSans_400Regular' },
  kpiSub: { color: colors.muted, fontSize: fontSizes.xs },
  track: { height:8, backgroundColor: colors.panel2, borderRadius:4, overflow:'hidden' },
  fill: { height:'100%', backgroundColor: colors.green },
  speedChip: { paddingHorizontal:10, paddingVertical:5, borderRadius: radius.pill, borderWidth:1, borderColor: colors.line, backgroundColor: colors.panel2 },
  speedChipActive: { backgroundColor:'rgba(85,216,139,0.1)', borderColor: colors.green },
  speedT: { color: colors.muted, fontSize: fontSizes.xs },
  speedTA: { color: colors.green },
  stepper: { flexDirection:'row', alignItems:'center', borderWidth:1, borderColor: colors.line, borderRadius: radius.md, backgroundColor:'#08120f', height:40 },
  stepBtn: { width:40, height:'100%', alignItems:'center', justifyContent:'center' },
  stepT: { color: colors.muted, fontSize:18 },
  stepVal: { flex:1, textAlign:'center', color: colors.text, fontFamily:'JetBrainsMono_500Medium', fontSize: fontSizes.sm },
});
