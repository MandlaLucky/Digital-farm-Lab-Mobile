import { ReactNode } from 'react';
import { Pressable, Text, TextInput, View, ScrollView, StyleSheet, KeyboardTypeOptions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors, spacing, radius, fontSizes } from '../theme';

const S = (c: string) => ({ fill: 'none', stroke: c, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export function Icon({ name, size = 20, color = colors.text }: { name: string; size?: number; color?: string }) {
  const c = S(color);
  const icons: Record<string, ReactNode> = {
    arrow: <><Path d="M5 12h14" {...c} /><Path d="m14 7 5 5-5 5" {...c} /></>,
    field: <><Path d="M3 19c5-7 10-10 18-12" {...c} /><Path d="M4 14c5-4 10-6 15-7" {...c} /><Path d="M8 21c4-7 7-10 12-12" {...c} /></>,
    water: <><Path d="M3 15c3-2 5 2 8 0s5 2 10 0M3 19c3-2 5 2 8 0s5 2 10 0" {...c} /><Path d="M12 3s-4 4-4 7a4 4 0 0 0 8 0c0-3-4-7-4-7Z" {...c} /></>,
    trash: <><Path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" {...c} /></>,
    leaf: <><Path d="M20 4c-8 0-14 4-14 10 0 3 2 5 5 5 6 0 9-7 9-15Z" {...c} /><Path d="M4 21c2-6 7-10 13-13" {...c} /></>,
    sun: <><Circle cx="12" cy="12" r="4" {...c} /><Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...c} /></>,
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24">{icons[name] || null}</Svg>;
}

export function Btn({ children, onPress, disabled, variant = 'default', style }: {
  children: ReactNode; onPress?: () => void; disabled?: boolean; variant?: 'default' | 'primary'; style?: any;
}) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable onPress={onPress} disabled={disabled}
      style={({ pressed }) => [s.btn, isPrimary && s.btnPrimary, disabled && s.btnDisabled, pressed && !disabled && { opacity: 0.85 }, style]}>
      <Text style={[s.btnText, isPrimary && s.btnTextPrimary]}>{children}</Text>
    </Pressable>
  );
}

export function Card({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }) {
  return (
    <View style={s.card}>
      {title && <View style={{ gap: 2 }}>
        <Text style={s.eyebrow}>{title}</Text>
        {subtitle && <Text style={s.cardStrong}>{subtitle}</Text>}
      </View>}
      {children}
    </View>
  );
}

export function LabeledInput({ label, value, onChange, placeholder, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: KeyboardTypeOptions;
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput style={s.input} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.faint} keyboardType={keyboardType} />
    </View>
  );
}

export function Stepper({ value, min, max, step = 1, unit = '', onChange }: {
  value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <View style={s.stepper}>
      <Pressable onPress={() => onChange(Math.max(min, value - step))} style={s.stepperBtn}><Text style={s.stepperBtnText}>−</Text></Pressable>
      <Text style={s.stepperValue}>{value}{unit}</Text>
      <Pressable onPress={() => onChange(Math.min(max, value + step))} style={s.stepperBtn}><Text style={s.stepperBtnText}>+</Text></Pressable>
    </View>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
      {children}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 12, paddingHorizontal: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.panel2 },
  btnPrimary: { backgroundColor: colors.green, borderColor: colors.green },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontFamily: 'DMSans_500Medium', fontSize: fontSizes.md, color: colors.text },
  btnTextPrimary: { color: colors.bg, fontFamily: 'DMSans_700Bold' },
  card: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md, marginBottom: spacing.lg },
  eyebrow: { color: colors.green, fontFamily: 'JetBrainsMono_500Medium', fontSize: fontSizes.xs, letterSpacing: 1.2 },
  cardStrong: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: fontSizes.lg },
  field: { gap: spacing.xs, marginBottom: spacing.md },
  fieldLabel: { color: colors.muted, fontSize: fontSizes.sm },
  input: { height: 44, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: '#08120f', color: colors.text, fontSize: fontSizes.md, fontFamily: 'DMSans_400Regular' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: '#08120f', height: 42 },
  stepperBtn: { width: 42, height: '100%', alignItems: 'center', justifyContent: 'center' },
  stepperBtnText: { color: colors.muted, fontSize: 20 },
  stepperValue: { flex: 1, textAlign: 'center', color: colors.text, fontFamily: 'JetBrainsMono_500Medium', fontSize: fontSizes.sm },
});
