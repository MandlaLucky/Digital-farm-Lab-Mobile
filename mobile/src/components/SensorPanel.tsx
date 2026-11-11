import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../lib/api';
import { colors, spacing, radius, fontSizes } from '../theme';

type Reading = { id: number; type: string; value: number; recordedAt: string };

export default function SensorPanel({ fieldId }: { fieldId: string }) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    api.sensorReadings(fieldId)
      .then(page => setReadings(page.readings || []))
      .catch((e: any) => setError(String(e.message || e)))
      .finally(() => setLoading(false));
  }, [fieldId]);

  const grouped: Record<string, Reading[]> = {};
  for (const r of readings) { if (!grouped[r.type]) grouped[r.type] = []; grouped[r.type].push(r); }

  return (
    <View style={s.wrap}>
      <Text style={s.title}>SENSOR HISTORY</Text>
      {loading && <Text style={s.note}>Loading…</Text>}
      {!!error && <Text style={[s.note, { color: colors.red }]}>{error}</Text>}
      {!loading && !error && readings.length === 0 && <Text style={s.note}>No readings for this field yet</Text>}
      {!loading && !error && readings.length > 0 && (<>
        <Text style={s.note}>{readings.length} real readings from backend</Text>
        {Object.entries(grouped).map(([type, list]) => (
          <View key={type} style={{ marginBottom: spacing.sm }}>
            <Text style={s.typeLabel}>{type}</Text>
            <View style={s.chips}>
              {list.slice(0, 7).map(r => (<View key={r.id} style={s.chip}><Text style={s.chipValue}>{Number(r.value).toFixed(0)}</Text></View>))}
            </View>
          </View>
        ))}
      </>)}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingVertical: spacing.sm },
  title: { color: colors.muted, fontSize: fontSizes.xs, fontFamily: 'JetBrainsMono_500Medium', letterSpacing: 1, marginBottom: 4 },
  note: { color: colors.muted, fontSize: fontSizes.xs, marginBottom: spacing.xs },
  typeLabel: { color: colors.muted, fontSize: fontSizes.xs, marginBottom: 4, fontFamily: 'JetBrainsMono_500Medium' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { minWidth: 36, paddingVertical: 4, paddingHorizontal: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  chipValue: { color: colors.green, fontSize: fontSizes.xs, fontFamily: 'JetBrainsMono_500Medium' },
});