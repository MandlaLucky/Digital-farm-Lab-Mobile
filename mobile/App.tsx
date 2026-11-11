import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import FarmSetupScreen from './src/screens/FarmSetupScreen';
import FarmBuilderScreen from './src/screens/FarmBuilderScreen';
import ScenariosScreen from './src/screens/ScenariosScreen';
import SimulationScreen from './src/screens/SimulationScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import TrainerScreen from './src/screens/TrainerScreen';
import { colors, fontSizes, spacing } from './src/theme';
import { emptyFarm, type FarmConfig, type PersistedFarm, type ScenarioRecord, type RunRecord } from './src/types';
import { api, toFarm, toScenarioRecord } from './src/lib/api';

type Section = 'setup' | 'builder' | 'scenarios' | 'simulation' | 'results' | 'trainer';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'setup',      label: 'Farm Setup' },
  { id: 'builder',    label: 'Farm Builder' },
  { id: 'scenarios',  label: 'Scenarios' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'results',    label: 'Results' },
  { id: 'trainer',    label: 'Trainer' },
];

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular, DMSans_500Medium, DMSans_700Bold,
    JetBrainsMono_500Medium, Manrope_700Bold, Manrope_800ExtraBold,
  });
  const [section, setSection] = useState<Section>('setup');
  const [farm, setFarm] = useState<FarmConfig>(emptyFarm);
  const [savedFarms, setSavedFarms] = useState<PersistedFarm[]>([]);
  const [presets, setPresets] = useState<ScenarioRecord[]>([]);
  const [backendMsg, setBackendMsg] = useState('');
  const [currentRun, setCurrentRun] = useState<RunRecord | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [activeScenario, setActiveScenario] = useState<ScenarioRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.listFarms().catch(() => [] as any[]),
      api.listPresets().catch(() => [] as any[]),
      api.getDemoFarm().catch(() => null),
    ]).then(([farms, presetsApi, demo]) => {
      if (cancelled) return;
      const mapped = (farms as any[]).map(toFarm);
      if (demo) { const d = toFarm(demo as any); if (!mapped.some((f: any) => f.id === d.id)) mapped.unshift(d); }
      setSavedFarms(mapped);
      if (Array.isArray(presetsApi)) setPresets((presetsApi as any[]).map(toScenarioRecord));
      setBackendMsg('');
    }).catch((err: any) => { if (!cancelled) setBackendMsg(`Backend: ${err.message}`); });
    return () => { cancelled = true; };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  const patch = (p: Partial<FarmConfig>) => setFarm(f => ({ ...f, ...p }));
  const loadFarm = (f: PersistedFarm) => { const { id, ...rest } = f; setFarm(rest); };

  const saveFarm = async () => {
    try {
      const created = await api.createFarm(farm as any);
      const nf = toFarm(created as any);
      setSavedFarms(list => list.some(f => f.id === nf.id) ? list : [nf, ...list]);
    } catch (err: any) {
      setBackendMsg('Save failed: ' + err.message);
    }
  };

  const finishRun = (run: RunRecord) => {
    setRuns(list => [run, ...list]);
    setCurrentRun(run);
    setSection('results');
  };

  const runScenario = (sc: ScenarioRecord) => {
    setActiveScenario(sc);
    setSection('simulation');
  };

  const simulateCurrent = () => {
    setActiveScenario(null);
    setSection('simulation');
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#091411" />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
        <View style={s.topbar}>
          <Text style={s.brand}>DIGITAL FARM LAB</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: spacing.md }}>
            {SECTIONS.map((sec, i) => {
              const active = section === sec.id;
              return (
                <Pressable key={sec.id} onPress={() => setSection(sec.id)} style={[s.tab, active && s.tabActive]}>
                  <Text style={[s.tabIndex, active && s.tabIndexActive]}>{i + 1}</Text>
                  <Text style={[s.tabLabel, active && s.tabLabelActive]}>{sec.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {backendMsg ? <View style={s.banner}><Text style={s.bannerText}>{backendMsg}</Text></View> : null}

        <View style={{ flex: 1 }}>
          {section === 'setup' && (
            <FarmSetupScreen farm={farm} farms={savedFarms} onChange={patch} onLoad={loadFarm} onNext={() => setSection('builder')} />
          )}
          {section === 'builder' && (
            <FarmBuilderScreen farm={farm} onChange={patch} onSave={saveFarm} onLoad={loadFarm} farms={savedFarms} onSimulate={simulateCurrent} />
          )}
          {section === 'scenarios' && (
            <ScenariosScreen onRun={runScenario} />
          )}
          {section === 'simulation' && (
            <SimulationScreen farm={farm} scenario={activeScenario ?? undefined} onFinish={finishRun} />
          )}
          {section === 'results' && (
            <ResultsScreen run={currentRun} runs={runs} onSelect={setCurrentRun} />
          )}
          {section === 'trainer' && <TrainerScreen />}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = {
  topbar: { paddingTop: spacing.sm, paddingBottom: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: '#091411', gap: spacing.sm },
  brand: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: fontSizes.sm, letterSpacing: 1.2 },
  tab: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  tabActive: { borderColor: colors.green, backgroundColor: 'rgba(85,216,139,0.06)' },
  tabIndex: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: colors.lineStrong, textAlign: 'center' as const, fontSize: 9, lineHeight: 16, color: colors.muted, fontFamily: 'JetBrainsMono_500Medium' },
  tabIndexActive: { backgroundColor: colors.green, color: colors.bg, borderColor: colors.green },
  tabLabel: { color: colors.muted, fontSize: fontSizes.sm, fontFamily: 'DMSans_500Medium' },
  tabLabelActive: { color: colors.text },
  banner: { backgroundColor: 'rgba(230,110,102,0.15)', borderBottomWidth: 1, borderBottomColor: 'rgba(230,110,102,0.4)', paddingHorizontal: spacing.md, paddingVertical: 6 },
  bannerText: { color: '#fca5a5', fontSize: fontSizes.sm, fontFamily: 'JetBrainsMono_500Medium' },
};
