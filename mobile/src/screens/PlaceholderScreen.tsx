import { View, Text } from 'react-native';
import { colors, spacing, fontSizes } from '../theme';

export default function PlaceholderScreen({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ flex: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <Text style={{ color: colors.green, fontFamily: 'JetBrainsMono_500Medium', fontSize: fontSizes.xs, letterSpacing: 1.4, marginBottom: spacing.sm }}>COMING NEXT</Text>
      <Text style={{ color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: fontSizes.xl, marginBottom: 4, textAlign: 'center' }}>{title}</Text>
      {subtitle && <Text style={{ color: colors.muted, fontSize: fontSizes.sm, textAlign: 'center', maxWidth: 320 }}>{subtitle}</Text>}
    </View>
  );
}
