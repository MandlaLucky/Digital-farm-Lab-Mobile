import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Screen, Card, Icon } from '../components/ui';
import { colors, spacing, radius, fontSizes } from '../theme';
import { api, type TrainerExercise, type TrainerReport } from '../lib/api';

export default function TrainerScreen() {
  const [exercises, setExercises] = useState<TrainerExercise[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [report, setReport] = useState<TrainerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.trainerListExercises()
      .then(list => {
        setExercises(list);
        if (list.length > 0) setSelectedId(list[0].exerciseId);
      })
      .catch(err => setError(String(err.message || err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setReport(null);
    api.trainerExerciseReport(selectedId)
      .then(setReport)
      .catch(err => setError(String(err.message || err)));
  }, [selectedId]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} size="large" />
        <Text style={{ color: colors.muted, marginTop: spacing.md, fontFamily: 'JetBrainsMono_500Medium', fontSize: fontSizes.sm }}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', paddingVertical: 60, gap: spacing.md }}>
          <Icon name="chart" size={40} color={colors.red} />
          <Text style={s.eyebrow}>TRAINER · ERROR</Text>
          <Text style={s.title}>Could not load cohort data</Text>
          <Text style={[s.hint, { textAlign: 'center', maxWidth: 280, color: colors.red }]}>{error}</Text>
        </View>
      </Screen>
    );
  }

  if (exercises.length === 0) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', paddingVertical: 60, gap: spacing.md }}>
          <Icon name="leaf" size={40} color={colors.green} />
          <Text style={s.eyebrow}>TRAINER · NO DATA</Text>
          <Text style={s.title}>No exercises yet</Text>
          <Text style={[s.hint, { textAlign: 'center', maxWidth: 280 }]}>
            Exercises appear here once learners submit runs.
          </Text>
        </View>
      </Screen>
    );
  }

  const maxCount = report ? Math.max(1, ...report.distribution.map(b => b.count)) : 1;

  return (
    <Screen>
      <View style={{ gap: 4, marginBottom: spacing.lg }}>
        <Text style={s.eyebrow}>TRAINER · COHORT ANALYSIS</Text>
        <Text style={s.title}>Cohort Results</Text>
        <Text style={s.hint}>Performance, distribution and criterion breakdown.</Text>
      </View>

      {/* Exercise selector */}
      <Card title={`EXERCISES · ${exercises.length}`} subtitle="tap to switch">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: 4 }}>
          {exercises.map(ex => {
            const active = selectedId === ex.exerciseId;
            return (
              <Pressable key={ex.exerciseId} onPress={() => setSelectedId(ex.exerciseId)} style={[s.exBtn, active && s.exBtnActive]}>
                <Text style={[s.exTitle, active && s.exTitleActive]} numberOfLines={1}>{ex.title}</Text>
                <Text style={[s.exSub, active && s.exSubActive]}>{ex.moduleCode} · {ex.submissionCount} subs</Text>
                <Text style={[s.exAvg, active && s.exAvgActive]}>avg {ex.averageScore}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Card>

      {!report && <ActivityIndicator color={colors.green} style={{ marginTop: spacing.md }} />}

      {report && (
        <>
          <Card title="STATISTICS" subtitle="cohort at a glance">
            <View style={s.kpiGrid}>
              <KpiBox label="SUBMISSIONS" value={String(report.statistics.submissionCount)} sub={`${report.statistics.uniqueLearners} learners`} />
              <KpiBox label="AVG SCORE" value={String(report.statistics.averageScore)} sub={`median ${report.statistics.medianScore}`} />
              <KpiBox label="LEARNER PASS" value={`${report.statistics.learnerPassRate}%`} sub={`${report.statistics.passedLearners}/${report.statistics.uniqueLearners}`} />
              <KpiBox label="RANGE" value={`${report.statistics.minScore}–${report.statistics.maxScore}`} sub="of 100" />
            </View>
          </Card>

          <Card title="DISTRIBUTION" subtitle="score buckets">
            {report.distribution.map(b => (
              <View key={b.range} style={s.barRow}>
                <Text style={[s.barLabel, { color: b.meetsPassThreshold ? colors.green : colors.muted }]}>{b.range}</Text>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${(b.count / maxCount) * 100}%`, backgroundColor: b.meetsPassThreshold ? colors.green : colors.amber }]} />
                </View>
                <Text style={s.barValue}>{b.count}</Text>
              </View>
            ))}
          </Card>

          {report.criteria.length > 0 && (
            <Card title="CRITERIA" subtitle="satisfaction rates">
              {report.criteria.map(c => (
                <View key={c.key} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={s.critLabel}>{c.label}</Text>
                    <Text style={s.critValue}>{c.satisfactionRate}%</Text>
                  </View>
                  <View style={s.critTrack}>
                    <View style={[s.critFill, { width: `${c.satisfactionRate}%` }]} />
                  </View>
                </View>
              ))}
            </Card>
          )}

          <Card title="RECENT SUBMISSIONS" subtitle={`${report.recentSubmissions.length} latest`}>
            {report.recentSubmissions.length === 0 && <Text style={s.hint}>No submissions yet.</Text>}
            {report.recentSubmissions.map((sub, i) => (
              <View key={sub.submissionId} style={[s.subRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.subName}>{sub.displayName || 'Anonymous'}</Text>
                  <Text style={s.subTime}>{new Date(sub.createdAt).toLocaleString()}</Text>
                </View>
                <Text style={s.subScore}>{sub.score}/100</Text>
                <View style={[s.resultPill, { backgroundColor: sub.passed ? 'rgba(85,216,139,0.12)' : 'rgba(230,110,102,0.12)' }]}>
                  <Text style={[s.resultText, { color: sub.passed ? colors.green : colors.red }]}>{sub.passed ? 'PASS' : 'FAIL'}</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

function KpiBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={s.kpiBox}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{value}</Text>
      {!!sub && <Text style={s.kpiSub}>{sub}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  eyebrow: { color: colors.green, fontFamily: 'JetBrainsMono_500Medium', fontSize: fontSizes.xs, letterSpacing: 1.4 },
  title: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: fontSizes.xxl },
  hint: { color: colors.muted, fontSize: fontSizes.sm, lineHeight: 18 },
  exBtn: { minWidth: 160, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2, gap: 2 },
  exBtnActive: { borderColor: colors.green, backgroundColor: 'rgba(85,216,139,0.06)' },
  exTitle: { color: colors.text, fontSize: fontSizes.sm, fontFamily: 'DMSans_700Bold' },
  exTitleActive: { color: colors.text },
  exSub: { color: colors.muted, fontSize: fontSizes.xs, fontFamily: 'JetBrainsMono_500Medium' },
  exSubActive: { color: colors.muted },
  exAvg: { color: colors.faint, fontSize: fontSizes.xs },
  exAvgActive: { color: colors.green },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kpiBox: { width: '48%', padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.line, gap: 2 },
  kpiLabel: { color: colors.faint, fontSize: 9, fontFamily: 'JetBrainsMono_500Medium', letterSpacing: 1 },
  kpiValue: { color: colors.text, fontSize: fontSizes.xl, fontFamily: 'Manrope_700Bold' },
  kpiSub: { color: colors.muted, fontSize: fontSizes.xs },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  barLabel: { width: 56, fontSize: fontSizes.xs, fontFamily: 'JetBrainsMono_500Medium' },
  barTrack: { flex: 1, height: 8, backgroundColor: colors.panel2, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%' },
  barValue: { width: 26, textAlign: 'right', color: colors.text, fontSize: fontSizes.xs, fontFamily: 'JetBrainsMono_500Medium' },
  critLabel: { color: colors.text, fontSize: fontSizes.sm },
  critValue: { color: colors.green, fontSize: fontSizes.sm, fontFamily: 'JetBrainsMono_500Medium' },
  critTrack: { height: 4, backgroundColor: colors.panel2, borderRadius: 2, overflow: 'hidden' },
  critFill: { height: '100%', backgroundColor: colors.green },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  subName: { color: colors.text, fontSize: fontSizes.sm, fontFamily: 'DMSans_500Medium' },
  subTime: { color: colors.muted, fontSize: fontSizes.xs },
  subScore: { color: colors.text, fontSize: fontSizes.sm, fontFamily: 'JetBrainsMono_500Medium' },
  resultPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  resultText: { fontSize: fontSizes.xs, fontFamily: 'JetBrainsMono_500Medium', letterSpacing: 0.5 },
});
